(function () {
  var grid = document.getElementById('grid');
  var tcgChipsWrap = document.getElementById('tcgChips');
  var subChipsWrap = document.getElementById('subChips');
  var searchInput = document.getElementById('searchInput');
  var sortSelect = document.getElementById('sortSelect');
  var countTag = document.getElementById('countTag');
  var emptyState = document.getElementById('emptyState');

  var DATA = [];
  var SUBCATS = { Pokemon: [] };
  var activeTcg = 'All';
  var activeSub = 'All';
  var query = '';
  var sortMode = 'cat';

  var TCG_LABELS = { Pokemon: 'Pokemon', Lorcana: 'Lorcana', Magic: 'Magic' };

  function brl(v) {
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function usd(v) {
    return 'US$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slugFor(it) {
    return it.cert ? it.cert : 'p' + it.id;
  }

  function cardHTML(it) {
    var priceBlock = it.brl != null
      ? '<div class="price-usd">' + usd(it.usd) + '</div><div class="price-brl">' + brl(it.brl) + '</div>'
      : '<div class="price-consult">Price on request</div><div></div>';
    var museum = it.brl != null && it.brl >= 100000 ? ' museum' : '';
    var spotlight = it.spotlight ? ' spotlight' : '';
    var oficial = it.oficial ? '<div class="badge-oficial">OFFICIAL PHOTO &middot; ' + esc(it.cert) + '</div>' : '';
    var featureTag = it.tag ? '<div class="badge-feature">' + esc(it.tag) + '</div>' : '';
    var soldBadge = it.sold ? '<div class="sold-badge"><span>SOLD</span></div>' : '';
    return (
      '<div class="card' + museum + spotlight + (it.sold ? ' is-sold' : '') + '" data-slug="' + esc(slugFor(it)) + '">' +
        '<div class="card-imgwrap' + (it.sold ? ' is-sold' : '') + '">' +
          '<img src="' + it.img_s + '" srcset="' + it.img_s + ' 380w, ' + it.img_l + ' 760w" ' +
               'sizes="(min-width:920px) 360px, 45vw" ' +
               'decoding="async" alt="' + esc(it.nome) + '">' +
          oficial +
          featureTag +
          soldBadge +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-toprow">' +
            '<span class="card-cat">' + esc(it.cat.toUpperCase()) + '</span>' +
            '<span class="card-grade">' + esc(it.grade) + '</span>' +
          '</div>' +
          '<div class="card-name">' + esc(it.nome) + '</div>' +
          '<div class="card-det">' + esc(it.det) + '</div>' +
          '<div class="card-pricerow">' + priceBlock + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function render() {
    var q = query.trim().toLowerCase();
    var list = DATA.filter(function (it) {
      var matchTcg = activeTcg === 'All' || it.tcg === activeTcg;
      var matchSub = activeTcg !== 'Pokemon' || activeSub === 'All' || it.cat === activeSub;
      var matchQuery = !q || (it.nome + ' ' + it.det + ' ' + it.cat).toLowerCase().indexOf(q) !== -1;
      return matchTcg && matchSub && matchQuery;
    });

    if (sortMode === 'price-desc') list = list.slice().sort(function (a, b) { return (b.brl == null ? -1 : b.brl) - (a.brl == null ? -1 : a.brl); });
    if (sortMode === 'price-asc') list = list.slice().sort(function (a, b) { return (a.brl == null ? 1e15 : a.brl) - (b.brl == null ? 1e15 : b.brl); });

    countTag.textContent = list.length + (list.length === 1 ? ' piece' : ' pieces');

    var html = '';
    if (sortMode === 'cat') {
      var groupOrder = activeTcg === 'Pokemon' ? SUBCATS.Pokemon : uniqueCats(list);
      for (var c = 0; c < groupOrder.length; c++) {
        var cat = groupOrder[c];
        var group = list.filter(function (it) { return it.cat === cat; });
        if (!group.length) continue;
        html += '<div class="cat-heading"><h2>' + esc(cat) + '</h2><div class="line"></div><span class="n">' +
          String(group.length).padStart(2, '0') + '</span></div>';
        html += '<div class="grid">' + group.map(cardHTML).join('') + '</div>';
      }
    } else {
      html = '<div class="grid">' + list.map(cardHTML).join('') + '</div>';
    }
    grid.innerHTML = html;
    emptyState.style.display = list.length ? 'none' : 'block';
    revealCards();
  }

  function uniqueCats(list) {
    var seen = [];
    list.forEach(function (it) { if (seen.indexOf(it.cat) === -1) seen.push(it.cat); });
    return seen;
  }

  function revealCards() {
    // Cards used to fade in only once scrolled into view (IntersectionObserver).
    // That leaves everything below the fold invisible (opacity:0) for anything
    // that renders the page without actually scrolling through it — e.g. a
    // phone's full-page screenshot capture. Show everything immediately
    // instead; a tiny stagger on initial paint still gives the fade-in feel.
    var cards = document.querySelectorAll('.card:not(.show)');
    cards.forEach(function (c, idx) {
      setTimeout(function () { c.classList.add('show'); }, (idx % 9) * 30);
    });
  }

  function renderSubChips() {
    if (activeTcg !== 'Pokemon') {
      subChipsWrap.innerHTML = '';
      subChipsWrap.style.display = 'none';
      return;
    }
    subChipsWrap.style.display = '';
    var html = '<div class="chip sub' + (activeSub === 'All' ? ' active' : '') + '" data-sub="All">All</div>';
    SUBCATS.Pokemon.forEach(function (c) {
      html += '<div class="chip sub' + (activeSub === c ? ' active' : '') + '" data-sub="' + esc(c) + '">' + esc(c) + '</div>';
    });
    subChipsWrap.innerHTML = html;
  }

  tcgChipsWrap.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#tcgChips .chip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
    activeTcg = chip.dataset.tcg;
    activeSub = 'All';
    renderSubChips();
    render();
  });

  subChipsWrap.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#subChips .chip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
    activeSub = chip.dataset.sub;
    render();
  });

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    window.location.href = '/c/' + card.dataset.slug;
  });

  var searchTimer;
  searchInput.addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    var val = e.target.value;
    searchTimer = setTimeout(function () { query = val; render(); }, 120);
  });

  sortSelect.addEventListener('change', function (e) {
    sortMode = e.target.value;
    render();
  });

  fetch('/api/data?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (json) {
      DATA = json.itens;
      SUBCATS.Pokemon = json.categorias.filter(function (c) {
        return DATA.some(function (it) { return it.cat === c && it.tcg === 'Pokemon'; });
      });
      var metaTotal = document.getElementById('metaTotal');
      var metaPrec = document.getElementById('metaPrecificadas');
      if (metaTotal) metaTotal.textContent = DATA.length;
      if (metaPrec) metaPrec.textContent = DATA.filter(function (it) { return it.usd != null; }).length;

      var tcgs = json.tcgs || ['Pokemon', 'Lorcana', 'Magic'];
      var tcgHTML = '<div class="chip tcg active" data-tcg="All">All</div>';
      tcgs.forEach(function (t) {
        var count = DATA.filter(function (it) { return it.tcg === t; }).length;
        tcgHTML += '<div class="chip tcg" data-tcg="' + esc(t) + '">' + esc(TCG_LABELS[t] || t) + ' <span class="chip-n">' + count + '</span></div>';
      });
      tcgChipsWrap.innerHTML = tcgHTML;
      renderSubChips();
      render();
    })
    .catch(function (err) {
      grid.innerHTML = '<div class="empty-state" style="display:block">Could not load the collection. Please reload the page.</div>';
      console.error(err);
    });
})();
