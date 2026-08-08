// Same pattern as mark-sold.js / update-price.js: verifies the admin password
// server-side, then commits the consignor's name straight to data.json via
// the GitHub API. This tracks WHO is selling each slab (consignment control)
// and is admin-only — it is never rendered for visitors.

const OWNER = 'KaiqueEditor';
const REPO = 'catalogodecartasgraduadas';
const FILE_PATH = 'data.json';
const BRANCH = 'main';
const MAX_LEN = 120;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var body = req.body || {};
  var password = body.password;
  var cert = body.cert;
  var vendedor = body.vendedor == null ? '' : String(body.vendedor);

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!cert) {
    res.status(400).json({ error: 'Missing cert' });
    return;
  }
  if (vendedor.length > MAX_LEN) {
    res.status(400).json({ error: 'Seller name too long (max ' + MAX_LEN + ' chars)' });
    return;
  }
  if (!process.env.GITHUB_TOKEN) {
    res.status(500).json({ error: 'Server missing GITHUB_TOKEN' });
    return;
  }

  var ghHeaders = {
    Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'catalogodecartasgraduadas-admin',
  };

  try {
    var getUrl = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH + '?ref=' + BRANCH;
    var getRes = await fetch(getUrl, { headers: ghHeaders });
    if (!getRes.ok) {
      var getErr = await getRes.text();
      res.status(502).json({ error: 'Failed to read data.json from GitHub', detail: getErr });
      return;
    }
    var fileData = await getRes.json();
    var content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    var data = JSON.parse(content);

    var item = data.itens.find(function (it) {
      return it.cert === cert || String(it.id) === String(cert);
    });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    if (vendedor.trim() === '') {
      delete item.vendedor;
    } else {
      item.vendedor = vendedor.trim();
    }

    var newContent = JSON.stringify(data, null, 0);
    var putRes = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders),
      body: JSON.stringify({
        message: 'chore: atualiza vendedor de "' + item.nome + '" (' + cert + ')',
        content: Buffer.from(newContent).toString('base64'),
        sha: fileData.sha,
        branch: BRANCH,
      }),
    });
    if (!putRes.ok) {
      var putErr = await putRes.text();
      res.status(502).json({ error: 'Failed to update data.json on GitHub', detail: putErr });
      return;
    }

    res.status(200).json({ ok: true, vendedor: item.vendedor || '' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
