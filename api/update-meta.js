// Same pattern as mark-sold.js / update-price.js: verifies the admin password
// server-side, then commits admin-only bookkeeping fields to data.json via
// the GitHub API. Both are private and never rendered for visitors:
//   vendedor   - who is consigning/selling the slab
//   taxaVenda  - the USD->BRL rate at the moment of the sale, so the BRL
//                figure reflects the real rate that day instead of the
//                catalog's current global rate.
// Each field is only touched when its key is present in the request body.

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
  var hasVendedor = Object.prototype.hasOwnProperty.call(body, 'vendedor');
  var hasTaxa = Object.prototype.hasOwnProperty.call(body, 'taxaVenda');
  var vendedor = hasVendedor && body.vendedor != null ? String(body.vendedor) : '';
  var taxaRaw = hasTaxa && body.taxaVenda !== null && body.taxaVenda !== '' ? Number(body.taxaVenda) : null;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!cert) {
    res.status(400).json({ error: 'Missing cert' });
    return;
  }
  if (!hasVendedor && !hasTaxa) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  if (vendedor.length > MAX_LEN) {
    res.status(400).json({ error: 'Seller name too long (max ' + MAX_LEN + ' chars)' });
    return;
  }
  if (taxaRaw !== null && (isNaN(taxaRaw) || taxaRaw <= 0 || taxaRaw > 100)) {
    res.status(400).json({ error: 'Invalid exchange rate' });
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

    if (hasVendedor) {
      if (vendedor.trim() === '') {
        delete item.vendedor;
      } else {
        item.vendedor = vendedor.trim();
      }
    }
    if (hasTaxa) {
      if (taxaRaw === null) {
        delete item.taxaVenda;
      } else {
        item.taxaVenda = taxaRaw;
      }
    }

    var newContent = JSON.stringify(data, null, 0);
    var putRes = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders),
      body: JSON.stringify({
        message: 'chore: atualiza dados admin de "' + item.nome + '" (' + cert + ')',
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

    res.status(200).json({ ok: true, vendedor: item.vendedor || '', taxaVenda: item.taxaVenda == null ? null : item.taxaVenda });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
