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
  var saveBar = document.getElementById('salesSaveBar');
  var saveBarBtn = document.getElementById('salesSaveBtn');
  var saveBarStatus = document.getElementById('salesSaveStatus');

  var DATA = [];
  var view = 'sold';

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

  function syncLock() {
    var isAdmin = window.AdminAuth && window.AdminAuth.isAdmin();
    if (lockedEl) lockedEl.style.display = isAdmin ? 'none' : 'block';
  }

  function currentList() {
    return DATA.filter(function (it) {
      return view === 'sold' ? !!it.sold : !it.sold;
    }).sort(function (a, b) {
      return (b.usd || 0) - (a.usd || 0);
    });
  }

  function renderStats() {
    var sold = DATA.filter(function (it) { return it.sold; });
    var available = DATA.filter(function (it) { return !it.sold; });
    var soldUsd = sold.reduce(function (s, it) { return s + (it.usd || 0); }, 0);
    var soldBrl = sold.reduce(function (s, it) { return s + (it.brl || 0); }, 0);
    var availUsd = available.reduce(function (s, it) { return s + (it.usd || 0); }, 0);

    statsEl.innerHTML =
      '<div class="sales-stat"><span>VENDIDOS</span><strong>' + sold.length + '</strong></div>' +
      '<div class="sales-stat"><span>TOTAL VENDIDO (USD)</span><strong class="pos">' + usd(soldUsd) + '</strong></div>' +
      '<div class="sales-stat"><span>TOTAL VENDIDO (BRL)</span><strong class="pos">' + brl(soldBrl) + '</strong></div>' +
      '<div class="sales-stat"><span>EM ESTOQUE</span><strong>' + available.length + '</strong></div>' +
      '<div class="sales-stat"><span>ESTOQUE (USD)</span><strong>' + usd(availUsd) + '</strong></div>';
  }

  // Consignment control: how much each seller has sold, and how much of
  // their stock is still sitting unsold.
  function renderSellers() {
    var bySeller = {};
    DATA.forEach(function (it) {
      var name = (it.vendedor || '').trim() || '— sem vendedor —';
      if (!bySeller[name]) bySeller[name] = { soldCount: 0, soldUsd: 0, stockCount: 0, stockUsd: 0 };
      var b = bySeller[name];
      if (it.sold) {
        b.soldCount++;
        b.soldUsd += it.usd || 0;
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
      '<h2 class="sales-subtitle">Por vendedor</h2>' +
      '<div class="sales-table-wrap">' +
      '<table class="sales-table sellers-table">' +
        '<thead><tr>' +
          '<th>Vendedor</th>' +
          '<th class="num">Vendidas</th><th class="num">Total vendido</th>' +
          '<th class="num">Em estoque</th><th class="num">Valor em estoque</th>' +
        '</tr></thead>' +
        '<tbody>' +
        names.map(function (n) {
          var b = bySeller[n];
          return '<tr>' +
            '<td class="sales-td-seller">' + esc(n) + '</td>' +
            '<td class="num">' + b.soldCount + '</td>' +
            '<td class="num sales-td-usd">' + usd(b.soldUsd) + '</td>' +
            '<td class="num">' + b.stockCount + '</td>' +
            '<td class="num sales-td-brl">' + usd(b.stockUsd) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table></div>';
  }

  function renderTable() {
    var list = currentList();
    if (!list.length) {
      tableWrap.innerHTML = '<div class="empty-state" style="display:block">Nenhuma peça aqui ainda.</div>';
      return;
    }

    var rows = list.map(function (it) {
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
        '<td class="sales-td-brl num">' + brl(it.brl) + '</td>' +
        '<td class="sales-td-obs">' +
          '<input type="text" class="obs-cell" maxlength="120" placeholder="—" value="' + esc(it.vendedor || '') + '">' +
        '</td>' +
      '</tr>';
    }).join('');

    var totalUsd = list.reduce(function (s, it) { return s + (it.usd || 0); }, 0);
    var totalBrl = list.reduce(function (s, it) { return s + (it.brl || 0); }, 0);

    tableWrap.innerHTML =
      '<table class="sales-table">' +
        '<thead><tr>' +
          '<th></th><th>Peça</th><th>Grade</th><th>Certificado</th>' +
          '<th class="num">USD</th><th class="num">BRL</th><th>Vendedor</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr>' +
          '<td colspan="4">TOTAL &middot; ' + list.length + ' peça' + (list.length === 1 ? '' : 's') + '</td>' +
          '<td class="num">' + usd(totalUsd) + '</td>' +
          '<td class="num">' + brl(totalBrl) + '</td>' +
          '<td></td>' +
        '</tr></tfoot>' +
      '</table>';

    wireSellerInputs();
  }

  // Rows are marked dirty as you type and saved together by one explicit
  // button — one password check for the whole batch instead of one per field.
  function dirtyRows() {
    return Array.prototype.filter.call(
      tableWrap.querySelectorAll('.obs-cell'),
      function (input) {
        var it = itemForInput(input);
        return it && input.value.trim() !== (it.vendedor || '');
      }
    );
  }

  function itemForInput(input) {
    var tr = input.closest('tr');
    if (!tr) return null;
    return DATA.filter(function (x) { return slugFor(x) === tr.dataset.slug; })[0];
  }

  function refreshSaveBar() {
    var n = dirtyRows().length;
    if (!saveBar) return;
    saveBar.classList.toggle('visible', n > 0);
    if (n > 0) saveBarBtn.textContent = 'Salvar ' + n + ' alteraç' + (n === 1 ? 'ão' : 'ões');
  }

  function wireSellerInputs() {
    tableWrap.querySelectorAll('.obs-cell').forEach(function (input) {
      input.addEventListener('input', function () {
        var it = itemForInput(input);
        input.closest('tr').classList.toggle('is-dirty', !!it && input.value.trim() !== (it.vendedor || ''));
        refreshSaveBar();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { input.blur(); saveAll(); }
      });
    });
    refreshSaveBar();
  }

  function saveAll() {
    var pending = dirtyRows();
    if (!pending.length) return;

    var pw = (window.AdminAuth && window.AdminAuth.getPassword()) || window.prompt('Senha admin:');
    if (!pw) return;

    saveBarBtn.disabled = true;
    saveBarStatus.textContent = 'Salvando…';
    saveBarStatus.className = 'save-bar-status';

    var done = 0, failed = 0;
    var chain = Promise.resolve();

    pending.forEach(function (input) {
      chain = chain.then(function () {
        var it = itemForInput(input);
        if (!it) return;
        var next = input.value.trim();
        return fetch('/api/update-seller', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw, cert: it.cert || it.id, vendedor: next }),
        }).then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'falhou'); });
          return r.json();
        }).then(function () {
          it.vendedor = next;
          done++;
          input.closest('tr').classList.remove('is-dirty');
        }).catch(function (err) {
          console.error(err);
          failed++;
          input.closest('tr').classList.add('is-error');
        });
      });
    });

    chain.then(function () {
      saveBarBtn.disabled = false;
      renderSellers();
      refreshSaveBar();
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

  // CSV with a UTF-8 BOM and ";" separator so Excel (pt-BR) opens it with the
  // columns already split, no import wizard needed.
  function exportCsv() {
    var list = currentList();
    var headers = ['Peça', 'Detalhe', 'Grade', 'Certificado', 'USD', 'BRL', 'Vendedor'];

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
      return v == null ? '' : String(v).replace('.', ',');
    }

    var lines = [headers.join(';')];
    list.forEach(function (it) {
      lines.push([
        cell(it.nome), cell(it.det), cell(it.grade), cell(it.cert || ''),
        num(it.usd), num(it.brl), cell(it.vendedor || ''),
      ].join(';'));
    });

    var totalUsd = list.reduce(function (s, it) { return s + (it.usd || 0); }, 0);
    var totalBrl = list.reduce(function (s, it) { return s + (it.brl || 0); }, 0);
    lines.push(['TOTAL', '', '', String(list.length) + ' pecas', num(totalUsd), num(totalBrl), ''].join(';'));

    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    var today = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = (view === 'sold' ? 'vendidos' : 'estoque') + '-' + today + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  if (exportBtn) exportBtn.addEventListener('click', exportCsv);
  if (saveBarBtn) saveBarBtn.addEventListener('click', saveAll);

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
      renderStats();
      renderSellers();
      renderTable();
    })
    .catch(function (err) {
      tableWrap.innerHTML = '<div class="empty-state" style="display:block">Não foi possível carregar os dados.</div>';
      console.error(err);
    });
})();
