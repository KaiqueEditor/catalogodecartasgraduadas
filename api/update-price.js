// Same pattern as mark-sold.js: verifies the admin password server-side,
// then commits the updated price straight to data.json via the GitHub API.

const OWNER = 'KaiqueEditor';
const REPO = 'catalogodecartasgraduadas';
const FILE_PATH = 'data.json';
const BRANCH = 'main';

const { requireAuth } = require('./_auth');
const { enforce } = require('./_ratelimit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var body = req.body || {};
  var cert = body.cert;
  var usd = body.usd === null ? null : Number(body.usd);

  if (!enforce(req, res, 'write', 60, 60 * 1000)) return;
  if (!requireAuth(req, res)) return;
  if (!cert) {
    res.status(400).json({ error: 'Missing cert' });
    return;
  }
  if (usd !== null && (isNaN(usd) || usd < 0)) {
    res.status(400).json({ error: 'Invalid usd value' });
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

    var taxa = data.taxa || 5.1;
    if (usd === null) {
      item.usd = null;
      item.brl = null;
    } else {
      item.usd = usd;
      item.brl = Math.ceil((usd * taxa) / 100) * 100;
    }

    var newContent = JSON.stringify(data, null, 0);
    var putRes = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders),
      body: JSON.stringify({
        message: 'chore: atualiza preco de "' + item.nome + '" (' + cert + ') para ' + (usd === null ? 'sob consulta' : ('US$ ' + usd)),
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

    res.status(200).json({ ok: true, usd: item.usd, brl: item.brl });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
