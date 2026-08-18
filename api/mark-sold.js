// Serverless function (Vercel/Node). Verifies the admin password server-side,
// then commits the updated data.json straight to the GitHub repo via the
// GitHub REST API using a repo-scoped token stored as an env var. The site
// reads data through /api/data.js, which proxies GitHub live on every
// request, so this commit is visible to everyone immediately — no redeploy
// needed (this project isn't Git-connected on Vercel's side).

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
  var sold = !!body.sold;

  if (!enforce(req, res, 'write', 60, 60 * 1000)) return;
  if (!requireAuth(req, res)) return;
  if (!cert) {
    res.status(400).json({ error: 'Missing cert' });
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
    item.sold = sold;

    var newContent = JSON.stringify(data, null, 0);
    var putRes = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders),
      body: JSON.stringify({
        message: 'chore: marca "' + item.nome + '" (' + cert + ') como ' + (sold ? 'vendido' : 'disponivel'),
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

    res.status(200).json({ ok: true, sold: sold });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
