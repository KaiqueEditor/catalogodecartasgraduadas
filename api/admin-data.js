// Full catalog data INCLUDING the private bookkeeping fields. Requires a
// valid session token — this is the only route that exposes vendedor /
// taxaVenda / obs, and it is what the sales dashboard reads.

const { requireAuth } = require('./_auth');
const { enforce } = require('./_ratelimit');

const OWNER = 'KaiqueEditor';
const REPO = 'catalogodecartasgraduadas';
const FILE_PATH = 'data.json';
const BRANCH = 'main';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!enforce(req, res, 'admin', 60, 60 * 1000)) return;
  if (!requireAuth(req, res)) return;

  if (!process.env.GITHUB_TOKEN) {
    res.status(500).json({ error: 'Server missing GITHUB_TOKEN' });
    return;
  }

  try {
    var url = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH + '?ref=' + BRANCH;
    var ghRes = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.raw+json',
        'User-Agent': 'catalogodecartasgraduadas-admin',
        Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      },
    });
    if (!ghRes.ok) {
      res.status(502).json({ error: 'Failed to fetch data.json from GitHub' });
      return;
    }
    var text = await ghRes.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
