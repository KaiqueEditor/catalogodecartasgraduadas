// Serves data.json straight from GitHub on every request, instead of the
// static file bundled into the current Vercel deployment. This project isn't
// Git-connected on Vercel's side, so a commit from the admin endpoints never
// triggers an auto-redeploy — the old static data.json would keep being
// served until someone manually runs `vercel --prod`. Proxying it live here
// means admin edits (price/sold) are visible to everyone immediately, with
// no redeploy step at all.
//
// This uses the GitHub Contents API (api.github.com), NOT
// raw.githubusercontent.com — the raw host sits behind a CDN (Fastly) that
// caches responses for several minutes regardless of cache-busting query
// params or request headers, which made fresh admin saves look like they
// "didn't stick" on reload. api.github.com always returns the current
// commit.

const OWNER = 'KaiqueEditor';
const REPO = 'catalogodecartasgraduadas';
const FILE_PATH = 'data.json';
const BRANCH = 'main';

module.exports = async function handler(req, res) {
  try {
    var url = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH + '?ref=' + BRANCH;
    var headers = {
      Accept: 'application/vnd.github.raw+json',
      'User-Agent': 'catalogodecartasgraduadas-admin',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    }
    var ghRes = await fetch(url, { headers: headers });
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
