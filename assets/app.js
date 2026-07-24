(function () {
  var grid = document.getElementById('grid');
  var chipsWrap = document.getElementById('chips');
  var searchInput = document.getElementById('searchInput');
  var sortSelect = document.getElementById('sortSelect');
  var countTag = document.getElementById('countTag');
  var emptyState = document.getElementById('emptyState');

  var DATA = [];
  var CATS = [];
  var activeCat = 'Todas';
  var query = '';
  var sortMode = 'cat';

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

  function cardHTML(it) {
    var priceBlock = it.brl != null
      ? '<div class="price-brl">' + brl(it.brl) + '</div><div class="price-usd">' + usd(it.usd) + '</div>'
      : '<div class="price-consult">Sob consulta</div><div></div>';
    var museum = it.brl != null && it.brl >= 100000 ? ' museum' : '';
    var oficial = it.oficial ? '<div class="badge-oficial">FOTO OFICIAL &middot; ' + esc(it.cert) + '</div>' : '';
    var ref = it.ref ? '<a class="card-ref" href="' + esc(it.ref) + '" target="_blank" rel="noopener">ver anuncio de referencia &rarr;</a>' : '';
    return (
      '<div class="card' + museum + '" data-id="' + it.id + '">' +
        '<div class="card-imgwrap">' +
          '<img src="' + it.img_s + '" srcset="' + it.img_s + ' 380w, ' + it.img_l + ' 760w" ' +
               'sizes="(min-width:920px) 360px, 45vw" ' +
               'loading="lazy" decoding="async" alt="' + esc(it.nome) + '">' +
          oficial +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-toprow">' +
            '<span class="card-cat">' + esc(it.cat.toUpperCase()) + '</span>' +
            '<span class="card-grade">' + esc(it.grade) + '</span>' +
          '</div>' +
          '<div class="card-name">' + esc(it.nome) + '</div>' +
          '<div class="card-det">' + esc(it.det) + '</div>' +
          '<div class="card-pricerow">' + priceBlock + '</div>' +
          ref +
        '</div>' +
      '</div>'
    );
  }

  function render() {
    var q = query.trim().toLowerCase();
    var list = DATA.filter(function (it) {
      var matchCat = activeCat === 'Todas' || it.cat === activeCat;
      var matchQuery = !q || (it.nome + ' ' + it.det + ' ' + it.cat).toLowerCase().indexOf(q) !== -1;
      return matchCat && matchQuery;
    });

    if (sortMode === 'price-desc') list = list.slice().sort(function (a, b) { return (b.brl == null ? -1 : b.brl) - (a.brl == null ? -1 : a.brl); });
    if (sortMode === 'price-asc') list = list.slice().sort(function (a, b) { return (a.brl == null ? 1e15 : a.brl) - (b.brl == null ? 1e15 : b.brl); });

    countTag.textContent = list.length + (list.length === 1 ? ' peca' : ' pecas');

    var html = '';
    if (sortMode === 'cat') {
      for (var c = 0; c < CATS.length; c++) {
        var cat = CATS[c];
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

  function revealCards() {
    var cards = document.querySelectorAll('.card:not(.show)');
    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('show'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, idx) {
        if (entry.isIntersecting) {
          setTimeout(function () { entry.target.classList.add('show'); }, (idx % 9) * 40);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '80px' });
    cards.forEach(function (c) { io.observe(c); });
  }

  chipsWrap.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
    activeCat = chip.dataset.cat;
    render();
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

  fetch('data.json')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      DATA = json.itens;
      CATS = json.categorias;
      var metaTotal = document.getElementById('metaTotal');
      var metaPrec = document.getElementById('metaPrecificadas');
      if (metaTotal) metaTotal.textContent = DATA.length;
      if (metaPrec) metaPrec.textContent = DATA.filter(function (it) { return it.usd != null; }).length;
      var chipsHTML = '<div class="chip active" data-cat="Todas">Todas</div>';
      CATS.forEach(function (c) {
        chipsHTML += '<div class="chip" data-cat="' + esc(c) + '">' + esc(c) + '</div>';
      });
      chipsWrap.innerHTML = chipsHTML;
      render();
    })
    .catch(function (err) {
      grid.innerHTML = '<div class="empty-state" style="display:block">Nao foi possivel carregar o acervo. Recarregue a pagina.</div>';
      console.error(err);
    });
})();
