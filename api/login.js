// Exchanges the admin password for a signed session token. The password is
// compared here, on the server — it is never embedded in any client file.

const crypto = require('crypto');
const { issueToken } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
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

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, token: issueToken() });
};
