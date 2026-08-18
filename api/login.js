// Exchanges the admin password for a signed session token. The password is
// compared here, on the server — it is never embedded in any client file.

const crypto = require('crypto');
const { issueToken } = require('./_auth');
const { enforce, reset } = require('./_ratelimit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  // 8 tentativas a cada 15 min por IP. Sem isso a senha pode ser adivinhada
  // por tentativa e erro, por mais forte que ela seja.
  if (!enforce(req, res, 'login', 8, 15 * 60 * 1000)) return;

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Server missing ADMIN_PASSWORD' });
    return;
  }

  var password = (req.body || {}).password;
  if (typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'Missing password' });
    return;
  }

  // Constant-time comparison, over hashes so differing lengths don't leak.
  var a = crypto.createHash('sha256').update(password).digest();
  var b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Senha incorreta' });
    return;
  }

  reset(req, 'login');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, token: issueToken() });
};
