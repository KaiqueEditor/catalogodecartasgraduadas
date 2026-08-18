// Shared server-side auth. Files prefixed with "_" are not routed by Vercel,
// so this is a helper module, not an endpoint.
//
// Why this exists: the admin gate used to be a SHA-256 hash shipped inside
// assets/admin.js. Anyone could read that hash from the page source, and the
// password was short enough to brute-force from it — which also meant the
// write endpoints were effectively unprotected. Now the password never leaves
// the server: the browser exchanges it for a short-lived signed token here,
// and every privileged endpoint verifies that token.

const crypto = require('crypto');

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function secret() {
  var pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  // Derived from the password so that rotating the password immediately
  // invalidates every previously issued token.
  return crypto.createHash('sha256').update('session-key:' + pw).digest();
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payloadB64, key) {
  return b64url(crypto.createHmac('sha256', key).update(payloadB64).digest());
}

function issueToken() {
  var key = secret();
  if (!key) return null;
  var payload = b64url(JSON.stringify({ exp: Date.now() + TTL_MS }));
  return payload + '.' + sign(payload, key);
}

function verifyToken(token) {
  var key = secret();
  if (!key || typeof token !== 'string') return false;

  var parts = token.split('.');
  if (parts.length !== 2) return false;

  var expected = sign(parts[0], key);
  var a = Buffer.from(parts[1]);
  var b = Buffer.from(expected);
  // Constant-time compare so a wrong token can't be refined by timing.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    var payload = JSON.parse(Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch (err) {
    return false;
  }
}

// Every privileged endpoint funnels through this. Returns true when the
// request carries a valid token; otherwise it has already answered with 401.
function requireAuth(req, res) {
  var body = req.body || {};
  var header = req.headers && req.headers.authorization;
  var token = body.token || (header && header.replace(/^Bearer\s+/i, ''));

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Server missing ADMIN_PASSWORD' });
    return false;
  }
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Fields that exist purely for the owner's bookkeeping and must never be
// served to the public catalog.
const PRIVATE_FIELDS = ['vendedor', 'taxaVenda', 'obs'];

function stripPrivate(data) {
  return Object.assign({}, data, {
    itens: (data.itens || []).map(function (it) {
      var copy = Object.assign({}, it);
      PRIVATE_FIELDS.forEach(function (f) { delete copy[f]; });
      return copy;
    }),
  });
}

module.exports = { issueToken, verifyToken, requireAuth, stripPrivate, PRIVATE_FIELDS };
