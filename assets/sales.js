(function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var footerUpdatedEl = document.getElementById('footerUpdated');
  if (footerUpdatedEl) {
    var now = new Date();
    footerUpdatedEl.textContent = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  }

  var tableWrap = document.getElementById('salesTableWrap');
  var statsEl = document.getElementById('salesStats');
  var sellersEl = document.getElementById('salesSellers');
  var lockedEl = document.getElementById('salesLocked');
  var exportBtn = document.getElementById('exportCsvBtn');
  var searchInput = document.getElementById('salesSearch');
  var filterBar = document.getElementById('salesFilterBar');
  var saveBar = document.getElementById('salesSaveBar');
  var saveBarBtn = document.getElementById('salesSaveBtn');
  var saveBarStatus = document.getElementById('salesSaveStatus');

  var DATA = [];
  var TAXA_PADRAO = 5.1;
  var view = 'sold';
  var sellerFilter = null;
  var query = '';

  var NO_SELLER = '— sem vendedor —';

  function usd(v) {
    if (v == null) return '—';
    return 'US$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function brl(v) {
    if (v == null) return '—';
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slugFor(it) {
    return it.cert ? it.cert : 'p' + it.id;
  }
  function sellerOf(it) {
    return (it.vendedor || '').trim() || NO_SELLER;
  }

  // A slab sold at its own recorded rate is worth what that rate says, not
  // what today's catalog rate says — that's the whole point of taxaVenda.
  function effectiveBrl(it) {
    if (it.usd == null) return it.brl == null ? null : it.brl;
    if (it.taxaVenda) return it.usd * it.taxaVenda;
    return it.brl == null ? null : it.brl;
  }
  function usesOwnRate(it) {
    return !!(it.taxaVenda && it.usd != null);
  }

  function syncLock() {
    var isAdmin = window.AdminAuth && window.AdminAuth.isAdmin();
    if (lockedEl) lockedEl.style.display = isAdmin ? 'none' : 'block';
  }

  function currentList() {
    var q = query.trim().toLowerCase();
    return DATA.filter(function (it) {
      if (view === 'sold' ? !it.sold : !!it.sold) return false;
      if (sellerFilter && sellerOf(it) !== sellerFilter) return false;
      if (q) {
        var hay = (it.nome + ' ' + it.det + ' ' + (it.cert || '') + ' ' + (it.vendedor || '') + ' ' + it.grade).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      return (b.usd || 0) - (a.usd || 0);
    });
  }

  function renderStats() {
    var sold = DATA.filter(function (it) { return it.sold; });
    var available = DATA.filter(function (it) { return !it.sold; });
    var soldUsd = sold.reduce(function (s, it) { return s + (it.usd || 0); }, 0);
    var soldBrl = sold.reduce(function (s, it) { return s + (effectiveBrl(it) || 0); }, 0);
    var availUsd = available.reduce(function (s, it) { return s + (it.usd || 0); }, 0);
    var comRate = sold.filter(usesOwnRate).length;

    statsEl.innerHTML =
      '<div class="sales-stat"><span>VENDIDOS</span><strong>' + sold.length + '</strong></div>' +
      '<div class="sales-stat"><span>TOTAL VENDIDO (USD)</span><strong class="pos">' + usd(soldUsd) + '</strong></div>' +
      '<div class="sales-stat"><span>TOTAL VENDIDO (BRL)</span><strong class="pos">' + brl(soldBrl) + '</strong>' +
        '<em class="sales-stat-note">' + comRate + '/' + sold.length + ' com câmbio próprio</em></div>' +
      '<div class="sales-stat"><span>EM ESTOQUE</span><strong>' + available.length + '</strong></div>' +
      '<div class="sales-stat"><span>ESTOQUE (USD)</span><strong>' + usd(availUsd) + '</strong></div>';
  }

  // Consignment control: how much each seller has sold, and how much of
  // their stock is still sitting unsold. Clicking a row filters the table.
  function renderSellers() {
    var bySeller = {};
    DATA.forEach(function (it) {
      var name = sellerOf(it);
      if (!bySeller[name]) bySeller[name] = { soldCount: 0, soldUsd: 0, soldBrl: 0, stockCount: 0, stockUsd: 0 };
      var b = bySeller[name];
      if (it.sold) {
        b.soldCount++;
        b.soldUsd += it.usd || 0;
        b.soldBrl += effectiveBrl(it) || 0;
      } else {
        b.stockCount++;
        b.stockUsd += it.usd || 0;
      }
    });

    var names = Object.keys(bySeller).sort(function (a, b) {
      return bySeller[b].soldUsd - bySeller[a].soldUsd;
    });

    if (!names.length) { sellersEl.innerHTML = ''; return; }

    sellersEl.innerHTML =
      '<h2 class="sales-subtitle">Por vendedor <em>— clique para filtrar</em></h2>' +
      '<div class="sales-table-wrap">' +
      '<table class="sales-table sellers-table">' +
        '<thead><tr>' +
          '<th>Vendedor</th>' +
          '<th class="num">Vendidas</th><th class="num">Total (USD)</th><th class="num">Total (BRL)</th>' +
          '<th class="num">Em estoque</th><th class="num">Valor em estoque</th>' +
        '</tr></thead>' +
        '<tbody>' +
        names.map(function (n) {
          var b = bySeller[n];
          return '<tr class="seller-row' + (sellerFilter === n ? ' is-active' : '') + '" data-seller="' + esc(n) + '">' +
            '<td class="sales-td-seller">' + esc(n) + '</td>' +
            '<td class="num">' + b.soldCount + '</td>' +
            '<td class="num sales-td-usd">' + usd(b.soldUsd) + '</td>' +
            '<td class="num sales-td-brl">' + brl(b.soldBrl) + '</td>' +
            '<td class="num">' + b.stockCount + '</td>' +
            '<td class="num sales-td-brl">' + usd(b.stockUsd) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table></div>';

    sellersEl.querySelectorAll('.seller-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var name = row.dataset.seller;
        sellerFilter = (sellerFilter === name) ? null : name;
        renderSellers();
        renderFilterBar();
        renderTable();
      });
    });
  }

  function renderFilterBar() {
    if (!filterBar) return;
    var chips = '';
    if (sellerFilter) {
      chips += '<button type="button" class="filter-chip" data-clear="seller">Vendedor: ' + esc(sellerFilter) + ' <span>&times;</span></button>';
    }
    if (query.trim()) {
      chips += '<button type="button" class="filter-chip" data-clear="query">Busca: &ldquo;' + esc(query.trim()) + '&rdquo; <span>&times;</span></button>';
    }
    filterBar.innerHTML = chips;
    filterBar.classList.toggle('visible', !!chips);
    filterBar.querySelectorAll('.filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (chip.dataset.clear === 'seller') sellerFilter = null;
        if (chip.dataset.clear === 'query') { query = ''; if (searchInput) searchInput.value = ''; }
        renderSellers();
        renderFilterBar();
        renderTable();
      });
    });
  }

  function renderTable() {
    var list = currentList();
    if (!list.length) {
      tableWrap.innerHTML = '<div class="empty-state" style="display:block">Nenhuma peça encontrada com esses filtros.</div>';
      refreshSaveBar();
      return;
    }

    var rows = list.map(function (it) {
      var eff = effectiveBrl(it);
      return '<tr data-slug="' + esc(slugFor(it)) + '">' +
        '<td class="sales-td-thumb">' +
          '<a href="/c/' + esc(slugFor(it)) + '">' +
            '<img src="' + esc(it.img_s) + '" alt="' + esc(it.nome) + '" loading="lazy" decoding="async">' +
          '</a>' +
        '</td>' +
        '<td class="sales-td-name"><a href="/c/' + esc(slugFor(it)) + '">' + esc(it.nome) + '</a>' +
          '<span class="sales-det">' + esc(it.det) + '</span></td>' +
        '<td class="sales-td-grade">' + esc(it.grade) + '</td>' +
        '<td class="sales-td-cert">' + esc(it.cert || '—') + '</td>' +
        '<td class="sales-td-usd num">' + usd(it.usd) + '</td>' +
        '<td class="sales-td-rate">' +
          '<input type="number" class="rate-cell" step="0.01" min="0" placeholder="' + TAXA_PADRAO + '" value="' + (it.taxaVenda != null ? it.taxaVenda : '') + '">' +
        '</td>' +
        '<td class="sales-td-brl num' + (usesOwnRate(it) ? ' own-rate' : '') + '" title="' +
          (usesOwnRate(it) ? 'Convertido pelo cambio da venda' : 'Convertido pelo cambio padrao do catalogo') + '">' + brl(eff) + '</td>' +
        '<td class="sales-td-obs">' +
          '<input type="text" class="obs-cell" maxlength="120" placeholder="—" value="' + esc(it.vendedor || '') + '">' +
        '</td>' +
      '</tr>';
    }).join('');

    var totalUsd = list.reduce(function (s, it) { return s + (it.usd || 0); }, 0);
    var totalBrl = list.reduce(function (s, it) { return s + (effectiveBrl(it) || 0); }, 0);

    tableWrap.innerHTML =
      '<table class="sales-table">' +
        '<thead><tr>' +
          '<th></th><th>Peça</th><th>Grade</th><th>Certificado</th>' +
          '<th class="num">USD</th><th>Câmbio</th><th class="num">BRL</th><th>Vendedor</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr>' +
          '<td colspan="4">TOTAL &middot; ' + list.length + ' peça' + (list.length === 1 ? '' : 's') + '</td>' +
          '<td class="num">' + usd(totalUsd) + '</td>' +
          '<td></td>' +
          '<td class="num">' + brl(totalBrl) + '</td>' +
          '<td></td>' +
        '</tr></tfoot>' +
      '</table>';

    wireCellInputs();
  }

  function itemForInput(input) {
    var tr = input.closest('tr');
    if (!tr) return null;
    return DATA.filter(function (x) { return slugFor(x) === tr.dataset.slug; })[0];
  }

  function pendingFor(input) {
    var it = itemForInput(input);
    if (!it) return null;
    if (input.classList.contains('obs-cell')) {
      var v = input.value.trim();
      return v !== (it.vendedor || '') ? { it: it, field: 'vendedor', value: v } : null;
    }
    var raw = input.value.trim();
    var cur = it.taxaVenda != null ? String(it.taxaVenda) : '';
    return raw !== cur ? { it: it, field: 'taxaVenda', value: raw === '' ? null : Number(raw) } : null;
  }

  // Rows are marked dirty as you type and saved together by one explicit
  // button — one password check for the whole batch instead of one per field.
  function dirtyInputs() {
    return Array.prototype.filter.call(
      tableWrap.querySelectorAll('.obs-cell, .rate-cell'),
      function (input) { return !!pendingFor(input); }
    );
  }

  function refreshSaveBar() {
    if (!saveBar) return;
    var n = dirtyInputs().length;
    saveBar.classList.toggle('visible', n > 0);
    if (n > 0) saveBarBtn.textContent = 'Salvar ' + n + ' alteraç' + (n === 1 ? 'ão' : 'ões');
  }

  function wireCellInputs() {
    tableWrap.querySelectorAll('.obs-cell, .rate-cell').forEach(function (input) {
      input.addEventListener('input', function () {
        input.closest('tr').classList.toggle('is-dirty', !!pendingFor(input));
        refreshSaveBar();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { input.blur(); saveAll(); }
      });
    });
    refreshSaveBar();
  }

  function saveAll() {
    var pending = dirtyInputs();
    if (!pending.length) return;

    var pw = (window.AdminAuth && window.AdminAuth.getPassword()) || window.prompt('Senha admin:');
    if (!pw) return;

    // Group by item so a row with both fields edited is one request.
    var byItem = {};
    pending.forEach(function (input) {
      var p = pendingFor(input);
      if (!p) return;
      var key = slugFor(p.it);
      if (!byItem[key]) byItem[key] = { it: p.it, payload: {} };
      byItem[key].payload[p.field] = p.value;
    });

    saveBarBtn.disabled = true;
    saveBarStatus.textContent = 'Salvando…';
    saveBarStatus.className = 'save-bar-status';

    var done = 0, failed = 0;
    var chain = Promise.resolve();

    Object.keys(byItem).forEach(function (key) {
      chain = chain.then(function () {
        var entry = byItem[key];
        var body = Object.assign({ password: pw, cert: entry.it.cert || entry.it.id }, entry.payload);
        return fetch('/api/update-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'falhou'); });
          return r.json();
        }).then(function (resp) {
          if ('vendedor' in entry.payload) entry.it.vendedor = resp.vendedor;
          if ('taxaVenda' in entry.payload) entry.it.taxaVenda = resp.taxaVenda;
          done++;
        }).catch(function (err) {
          console.error(err);
          failed++;
        });
      });
    });

    chain.then(function () {
      saveBarBtn.disabled = false;
      renderStats();
      renderSellers();
      renderTable();
      if (failed) {
        saveBarStatus.textContent = done + ' salvo(s), ' + failed + ' com erro';
        saveBarStatus.className = 'save-bar-status err';
      } else {
        saveBarStatus.textContent = done + ' salvo(s) ✓';
        saveBarStatus.className = 'save-bar-status ok';
        setTimeout(function () { saveBarStatus.textContent = ''; }, 2500);
      }
    });
  }

  // Hover preview: pointing at a thumbnail pops the full-size slab photo next
  // to the cursor, so you can read a slab without leaving the table. Pointer
  // devices only — on touch, tapping the thumb just opens the card page.
  function initThumbPreview() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

    var preview = document.createElement('div');
    preview.className = 'slab-preview';
    preview.innerHTML = '<img alt="">';
    document.body.appendChild(preview);
    var previewImg = preview.querySelector('img');

    function place(e) {
      var pad = 16;
      var w = preview.offsetWidth || 300;
      var h = preview.offsetHeight || 420;
      var x = e.clientX + pad;
      var y = e.clientY - h / 2;
      if (x + w > window.innerWidth - pad) x = e.clientX - w - pad;
      if (y < pad) y = pad;
      if (y + h > window.innerHeight - pad) y = window.innerHeight - h - pad;
      preview.style.left = x + 'px';
      preview.style.top = y + 'px';
    }

    tableWrap.addEventListener('mouseover', function (e) {
      var cell = e.target.closest('.sales-td-thumb');
      if (!cell) return;
      var tr = cell.closest('tr');
      var it = DATA.filter(function (x) { return slugFor(x) === tr.dataset.slug; })[0];
      if (!it) return;
      previewImg.src = it.img_l || it.img_s;
      preview.classList.add('visible');
      place(e);
    });

    tableWrap.addEventListener('mousemove', function (e) {
      if (preview.classList.contains('visible') && e.target.closest('.sales-td-thumb')) place(e);
    });

    tableWrap.addEventListener('mouseout', function (e) {
      var cell = e.target.closest('.sales-td-thumb');
      if (cell && !cell.contains(e.relatedTarget)) preview.classList.remove('visible');
    });

    tableWrap.addEventListener('scroll', function () { preview.classList.remove('visible'); });
  }

  // CSV with a UTF-8 BOM and ";" separator so Excel (pt-BR) opens it with the
  // columns already split, no import wizard needed.
  function exportCsv() {
    var list = currentList();
    var headers = ['Peça', 'Detalhe', 'Grade', 'Certificado', 'USD', 'Câmbio da venda', 'BRL', 'Vendedor'];

    function cell(v) {
      if (v == null) return '';
      var s = String(v);
      if (s.indexOf('"') !== -1 || s.indexOf(';') !== -1 || s.indexOf('\n') !== -1) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }
    function num(v) {
      // pt-BR Excel expects a comma as the decimal separator
      return v == null || v === '' ? '' : String(v).replace('.', ',');
    }

    var lines = [headers.join(';')];
    list.forEach(function (it) {
      var eff = effectiveBrl(it);
      lines.push([
        cell(it.nome), cell(it.det), cell(it.grade), cell(it.cert || ''),
        num(it.usd),
        num(it.taxaVenda != null ? it.taxaVenda : ''),
        num(eff == null ? '' : Math.round(eff * 100) / 100),
        cell(it.vendedor || ''),
      ].join(';'));
    });

    var totalUsd = list.reduce(function (s, it) { return s + (it.usd || 0); }, 0);
    var totalBrl = list.reduce(function (s, it) { return s + (effectiveBrl(it) || 0); }, 0);
    lines.push(['TOTAL', '', '', String(list.length) + ' pecas', num(totalUsd), '', num(Math.round(totalBrl * 100) / 100), ''].join(';'));

    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    var today = new Date().toISOString().slice(0, 10);
    var suffix = sellerFilter ? '-' + sellerFilter.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
    a.href = URL.createObjectURL(blob);
    a.download = (view === 'sold' ? 'vendidos' : 'estoque') + suffix + '-' + today + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  if (exportBtn) exportBtn.addEventListener('click', exportCsv);
  if (saveBarBtn) saveBarBtn.addEventListener('click', saveAll);

  if (searchInput) {
    var searchTimer;
    searchInput.addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      var val = e.target.value;
      searchTimer = setTimeout(function () {
        query = val;
        renderFilterBar();
        renderTable();
      }, 140);
    });
  }

  document.querySelectorAll('.sales-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.sales-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      view = tab.dataset.view;
      renderTable();
    });
  });

  var adminBtn = document.getElementById('adminToggleBtn');
  if (adminBtn) adminBtn.addEventListener('click', function () { setTimeout(syncLock, 50); });

  document.addEventListener('DOMContentLoaded', syncLock);
  syncLock();

  fetch('/api/data?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (json) {
      DATA = json.itens;
      if (json.taxa) TAXA_PADRAO = json.taxa;
      renderStats();
      renderSellers();
      renderFilterBar();
      renderTable();
      initThumbPreview();
    })
    .catch(function (err) {
      tableWrap.innerHTML = '<div class="empty-state" style="display:block">Não foi possível carregar os dados.</div>';
      console.error(err);
    });
})();
