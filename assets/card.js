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

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = function () { resolve(image); };
      image.onerror = reject;
      image.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSoldStamp(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-16 * Math.PI / 180);

    ctx.fillStyle = 'rgba(10,10,11,0.55)';
    ctx.fillRect(-w / 2, -h / 2, w, h);

    ctx.strokeStyle = 'rgba(214,40,40,0.95)';
    ctx.lineWidth = 6;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);

    var dotR = 7;
    [[-w / 2 + 20, -h / 2 + 20], [w / 2 - 20, -h / 2 + 20], [-w / 2 + 20, h / 2 - 20], [w / 2 - 20, h / 2 - 20]].forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], dotR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214,40,40,0.95)';
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(214,40,40,0.98)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.round(h * 0.55) + 'px Oswald, sans-serif';
    ctx.fillText('SOLD', 0, 4);
    ctx.restore();
  }

  function generateInstagramImage(it, imgSrc, mode, sold, faceSuffix) {
    var W = 1080, H = 1440;
    var showPrice = mode !== 'cta';
    return Promise.all([loadImage(imgSrc), document.fonts.ready]).then(function (res) {
      var cardImg = res[0];
      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');

      // flat background — no gradient, no glow, keep it plain like a product shot
      ctx.fillStyle = '#0e0e0e';
      ctx.fillRect(0, 0, W, H);

      // slab image with generous breathing room — no frame, no badge on top
      // of it, the physical slab already shows its own grade
      var marginX = 90;
      var topMargin = 90;
      var bottomMargin = 60;
      var footerH = 34;
      var infoH = 58 + 34 + (showPrice ? 100 : 0);
      var boxX = marginX, boxY = topMargin, boxW = W - marginX * 2;
      var boxH = H - topMargin - infoH - footerH - bottomMargin;

      var scale = Math.min(boxW / cardImg.width, boxH / cardImg.height);
      var drawW = cardImg.width * scale, drawH = cardImg.height * scale;
      var drawX = boxX + (boxW - drawW) / 2, drawY = boxY + (boxH - drawH) / 2;

      if (sold) ctx.filter = 'grayscale(0.9) brightness(0.85)';
      ctx.drawImage(cardImg, drawX, drawY, drawW, drawH);
      ctx.filter = 'none';
      if (sold) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(drawX, drawY, drawW, drawH);
      }

      if (sold) {
        drawSoldStamp(ctx, drawX + drawW / 2, drawY + drawH / 2, drawW * 0.8, 176);
      }

      var y = boxY + boxH + 56;

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f1ede2';
      ctx.font = '700 44px Oswald, sans-serif';
      ctx.fillText(fitText(ctx, it.nome.toUpperCase(), W - marginX * 2), marginX, y);

      y += 34;
      ctx.fillStyle = '#8d8d95';
      ctx.font = '400 21px "IBM Plex Sans", sans-serif';
      ctx.fillText(fitText(ctx, it.det, W - marginX * 2), marginX, y);

      if (showPrice) {
        y += 66;
        if (it.brl != null) {
          ctx.fillStyle = '#4fae74';
          ctx.font = '700 64px "IBM Plex Mono", monospace';
          ctx.fillText(brl(it.brl), marginX, y);

          ctx.fillStyle = '#5c5c63';
          ctx.font = '500 24px "IBM Plex Mono", monospace';
          ctx.fillText(usd(it.usd), marginX + 2, y + 32);
        } else {
          ctx.fillStyle = '#8d8d95';
          ctx.font = 'italic 400 30px "IBM Plex Sans", sans-serif';
          ctx.fillText('Price on request', marginX, y);
        }
      }

      // footer: tiny domain + cert
      ctx.textAlign = 'left';
      ctx.fillStyle = '#48484c';
      ctx.font = '500 17px "IBM Plex Mono", monospace';
      ctx.fillText('catalogodecartasgraduadas.com.br', marginX, H - bottomMargin + 24);

      if (it.cert) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#48484c';
        ctx.fillText('CERT ' + it.cert, W - marginX, H - bottomMargin + 24);
      }

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          var a = document.createElement('a');
          var slug = it.cert || ('p' + it.id);
          var modeSuffix = showPrice ? '' : '-direct';
          var faceSuf = faceSuffix ? '-' + faceSuffix : '';
          a.href = URL.createObjectURL(blob);
          a.download = slug + '-' + it.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-') + modeSuffix + faceSuf + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          resolve();
        }, 'image/png');
      });
    });
  }

  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    var truncated = text;
    while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated.trim() + '…';
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
            '<div class="detail-imgwrap' + (it.sold ? ' is-sold' : '') + '">' +
              '<img id="detailImg" src="' + it.img_l + '" alt="' + esc(it.nome) + '">' +
              oficial +
              (it.sold ? '<div class="sold-badge"><span>SOLD</span></div>' : '') +
            '</div>' +
            faceToggle +
          '</div>' +
          '<div class="detail-info">' +
            '<div class="card-toprow"><span class="card-cat">' + esc(it.cat.toUpperCase()) + '</span><span class="card-grade">' + esc(it.grade) + '</span></div>' +
            '<h1 class="detail-name">' + esc(it.nome) + '</h1>' +
            '<p class="detail-det">' + esc(it.det) + '</p>' +
            '<div class="detail-pricebox">' + priceBlock + '</div>' +
            certRow +
            '<div class="admin-only admin-panel">' +
              '<div class="price-edit-row">' +
                '<input type="number" id="priceEditInput" class="price-edit-input" placeholder="USD, deixe vazio p/ sob consulta" value="' + (it.usd != null ? it.usd : '') + '" min="0" step="1">' +
                '<button type="button" id="priceEditBtn" class="detail-btn price-edit-btn">Salvar preco</button>' +
              '</div>' +
              '<button type="button" id="soldToggleBtn" class="detail-btn sold-toggle-btn">' + (it.sold ? 'Desmarcar vendido' : 'Marcar como vendido') + '</button>' +
              '<label class="sold-stamp-check"><input type="checkbox" id="soldStampCheck"' + (it.sold ? ' checked' : '') + '> Incluir carimbo SOLD no PNG</label>' +
              '<div class="ig-btn-row">' +
                '<button type="button" id="igDownloadBtn" class="detail-btn ig-btn" data-mode="price">&#8681; Download with price</button>' +
                '<button type="button" id="igDownloadCtaBtn" class="detail-btn ig-btn" data-mode="cta">&#8681; Download (call to DM)</button>' +
              '</div>' +
            '</div>' +
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

      // ---- Instagram PNG export (downloads both sides for a carousel when available) ----
      var soldStampCheck = document.getElementById('soldStampCheck');
      root.querySelectorAll('.ig-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.dataset.mode;
          var sold = soldStampCheck ? soldStampCheck.checked : false;
          root.querySelectorAll('.ig-btn').forEach(function (b) { b.disabled = true; });
          var originalLabel = btn.textContent;
          btn.textContent = 'Generating…';

          var chain = generateInstagramImage(it, it.img_l, mode, sold, hasBack ? 'front' : null);
          if (hasBack) {
            chain = chain.then(function () {
              return new Promise(function (r) { setTimeout(r, 500); });
            }).then(function () {
              return generateInstagramImage(it, it.img_back_l, mode, sold, 'back');
            });
          }
          chain.then(function () {
            btn.textContent = originalLabel;
            root.querySelectorAll('.ig-btn').forEach(function (b) { b.disabled = false; });
          }).catch(function (err) {
            console.error(err);
            btn.textContent = 'Failed — try again';
            root.querySelectorAll('.ig-btn').forEach(function (b) { b.disabled = false; });
          });
        });
      });

      // ---- Mark as sold (persists to data.json via GitHub, site-wide) ----
      var soldBtn = document.getElementById('soldToggleBtn');
      if (soldBtn) {
        soldBtn.addEventListener('click', function () {
          var nextSold = !it.sold;
          var pw = (window.AdminAuth && window.AdminAuth.getPassword()) || window.prompt('Senha admin:');
          if (!pw) return;
          soldBtn.disabled = true;
          soldBtn.textContent = 'Salvando…';
          fetch('/api/mark-sold', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw, cert: it.cert || it.id, sold: nextSold }),
          }).then(function (r) {
            if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Falhou'); });
            return r.json();
          }).then(function () {
            it.sold = nextSold;
            soldBtn.textContent = nextSold ? 'Desmarcar vendido' : 'Marcar como vendido';
            soldBtn.disabled = false;
            if (soldStampCheck) soldStampCheck.checked = nextSold;
            var imgwrap = root.querySelector('.detail-imgwrap');
            imgwrap.classList.toggle('is-sold', nextSold);
            var existingBadge = root.querySelector('.sold-badge');
            if (nextSold && !existingBadge) {
              var badge = document.createElement('div');
              badge.className = 'sold-badge';
              badge.innerHTML = '<span>SOLD</span>';
              imgwrap.appendChild(badge);
            } else if (!nextSold && existingBadge) {
              existingBadge.remove();
            }
          }).catch(function (err) {
            console.error(err);
            window.alert('Erro ao salvar: ' + err.message + '\n\n(Isso so funciona depois que GITHUB_TOKEN e ADMIN_PASSWORD forem configurados na Vercel.)');
            soldBtn.disabled = false;
            soldBtn.textContent = it.sold ? 'Desmarcar vendido' : 'Marcar como vendido';
          });
        });
      }

      // ---- Edit price (persists to data.json via GitHub, site-wide) ----
      var priceEditBtn = document.getElementById('priceEditBtn');
      var priceEditInput = document.getElementById('priceEditInput');
      if (priceEditBtn) {
        priceEditBtn.addEventListener('click', function () {
          var raw = priceEditInput.value.trim();
          var newUsd = raw === '' ? null : Number(raw);
          if (raw !== '' && (isNaN(newUsd) || newUsd < 0)) {
            window.alert('Valor invalido.');
            return;
          }
          var pw = (window.AdminAuth && window.AdminAuth.getPassword()) || window.prompt('Senha admin:');
          if (!pw) return;
          priceEditBtn.disabled = true;
          var originalLabel = priceEditBtn.textContent;
          priceEditBtn.textContent = 'Salvando…';
          fetch('/api/update-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw, cert: it.cert || it.id, usd: newUsd }),
          }).then(function (r) {
            if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Falhou'); });
            return r.json();
          }).then(function (data) {
            it.usd = data.usd;
            it.brl = data.brl;
            var priceBox = root.querySelector('.detail-pricebox');
            priceBox.innerHTML = it.brl != null
              ? '<div class="detail-price-usd">' + usd(it.usd) + '</div><div class="detail-price-brl">' + brl(it.brl) + '</div>'
              : '<div class="price-consult">Price on request</div>';
            priceEditBtn.textContent = originalLabel;
            priceEditBtn.disabled = false;
          }).catch(function (err) {
            console.error(err);
            window.alert('Erro ao salvar: ' + err.message);
            priceEditBtn.textContent = originalLabel;
            priceEditBtn.disabled = false;
          });
        });
      }
    })
    .catch(function (err) {
      root.innerHTML = '<div class="detail-loading">Could not load this card. <a href="index.html">Go back</a>.</div>';
      console.error(err);
    });
})();
