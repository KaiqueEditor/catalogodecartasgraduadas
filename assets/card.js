(function () {
  var root = document.getElementById('detailRoot');

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

  var pathMatch = location.pathname.match(/\/c\/([^/]+)/);
  var slug = root.dataset.slug || (pathMatch ? decodeURIComponent(pathMatch[1]) : null);
  var params = new URLSearchParams(location.search);
  var id = slug ? null : parseInt(params.get('id'), 10);

  fetch('data.json')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      var it = slug
        ? json.itens.filter(function (x) { return slugFor(x) === slug; })[0]
        : json.itens.filter(function (x) { return x.id === id; })[0];
      if (!it) {
        root.innerHTML = '<div class="detail-loading">Card not found. <a href="index.html">Go back</a>.</div>';
        return;
      }
      document.title = it.nome + ' — Graded Collection';

      var priceBlock = it.brl != null
        ? '<div class="detail-price-usd">' + usd(it.usd) + '</div><div class="detail-price-brl">' + brl(it.brl) + '</div>'
        : '<div class="price-consult">Price on request</div>';

      var oficial = it.oficial ? '<div class="badge-oficial">OFFICIAL PHOTO &middot; ' + esc(it.cert) + '</div>' : '';
      var hasBack = !!it.img_back_l;
      var faceToggle = hasBack
        ? '<div class="face-toggle"><button type="button" class="face-btn active" data-face="front">Front</button><button type="button" class="face-btn" data-face="back">Back</button></div>'
        : '';

      var about = it.about ? '<section class="detail-section"><h2>About this card</h2><p>' + esc(it.about) + '</p></section>' : '';
      var graderInfo = it.graderInfo ? '<section class="detail-section"><h2>About the grading</h2><p>' + esc(it.graderInfo) + '</p></section>' : '';

      var certRow = it.cert
        ? '<div class="detail-fact"><span>Certificate</span><strong>' + esc(it.cert) + '</strong></div>'
        : '';

      // find prev/next within same list order for simple navigation
      var idx = json.itens.findIndex(function (x) { return x.id === it.id; });
      var prevItem = json.itens[idx - 1];
      var nextItem = json.itens[idx + 1];
      var navHTML = '<div class="detail-nav">' +
        (prevItem ? '<a href="/c/' + esc(slugFor(prevItem)) + '">&larr; ' + esc(prevItem.nome) + '</a>' : '<span></span>') +
        (nextItem ? '<a href="/c/' + esc(slugFor(nextItem)) + '">' + esc(nextItem.nome) + ' &rarr;</a>' : '<span></span>') +
        '</div>';

      root.innerHTML =
        '<div class="detail-grid">' +
          '<div class="detail-media">' +
            '<div class="detail-imgwrap">' +
              '<img id="detailImg" src="' + it.img_l + '" alt="' + esc(it.nome) + '">' +
              oficial +
            '</div>' +
            faceToggle +
          '</div>' +
          '<div class="detail-info">' +
            '<div class="card-toprow"><span class="card-cat">' + esc(it.cat.toUpperCase()) + '</span><span class="card-grade">' + esc(it.grade) + '</span></div>' +
            '<h1 class="detail-name">' + esc(it.nome) + '</h1>' +
            '<p class="detail-det">' + esc(it.det) + '</p>' +
            '<div class="detail-pricebox">' + priceBlock + '</div>' +
            certRow +
          '</div>' +
        '</div>' +
        about +
        graderInfo +
        navHTML;

      var img = document.getElementById('detailImg');
      var toggle = root.querySelector('.face-toggle');
      var currentFace = 'front';

      function setFace(face) {
        if (face === 'back' && !hasBack) return;
        currentFace = face;
        img.src = face === 'back' ? it.img_back_l : it.img_l;
        if (toggle) {
          toggle.querySelectorAll('.face-btn').forEach(function (b) {
            b.classList.toggle('active', b.dataset.face === face);
          });
        }
        if (lightboxImg.style.display !== 'none') {
          lightboxImg.src = img.src;
        }
      }

      if (hasBack && toggle) {
        toggle.addEventListener('click', function (e) {
          var btn = e.target.closest('.face-btn');
          if (!btn) return;
          setFace(btn.dataset.face);
        });
      }

      // ---- lightbox ----
      var lightbox = document.getElementById('lightbox');
      var lightboxImg = document.getElementById('lightboxImg');
      var lightboxHint = lightbox.querySelector('.lightbox-hint');
      lightboxHint.style.display = hasBack ? '' : 'none';

      function openLightbox() {
        lightboxImg.src = img.src;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
      }

      root.querySelector('.detail-imgwrap').addEventListener('click', openLightbox);
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox || e.target.classList.contains('lightbox-close')) closeLightbox();
      });
      document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setFace(currentFace === 'front' ? 'back' : 'front');
      });

      var touchStartX = null;
      lightbox.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      lightbox.addEventListener('touchend', function (e) {
        if (touchStartX == null || !hasBack) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) setFace(currentFace === 'front' ? 'back' : 'front');
        touchStartX = null;
      }, { passive: true });
    })
    .catch(function (err) {
      root.innerHTML = '<div class="detail-loading">Could not load this card. <a href="index.html">Go back</a>.</div>';
      console.error(err);
    });
})();
