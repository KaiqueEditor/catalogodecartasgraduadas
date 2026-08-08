(function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var footerUpdatedEl = document.getElementById('footerUpdated');
  if (footerUpdatedEl) {
    var now = new Date();
    footerUpdatedEl.textContent = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  }

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

      // slab image, as large as possible — the text block overlaps its lower
      // portion on top of a gradient fade, so there's no hard-edged seam
      var marginX = 90;
      var topMargin = 90;
      var bottomMargin = 60;
      var footerH = 34;
      var overlapReserve = showPrice ? 100 : 240;
      var boxX = marginX, boxY = topMargin, boxW = W - marginX * 2;
      var boxH = H - topMargin - footerH - bottomMargin - overlapReserve;

      // zoom in past "contain" so the card's own black side-borders get
      // cropped off by the box edges — the readable part is what matters
      var zoom = 1.22;
      var scale = Math.min(boxW / cardImg.width, boxH / cardImg.height) * zoom;
      var drawW = cardImg.width * scale, drawH = cardImg.height * scale;
      var drawX = boxX + (boxW - drawW) / 2, drawY = boxY + (boxH - drawH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.clip();
      if (sold) ctx.filter = 'grayscale(0.9) brightness(0.85)';
      ctx.drawImage(cardImg, drawX, drawY, drawW, drawH);
      ctx.filter = 'none';
      if (sold) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }

      // gradient fade at the bottom of the photo so it blends into the
      // background instead of ending in a hard line
      var fadeH = boxH * 0.32;
      var fadeGrad = ctx.createLinearGradient(0, boxY + boxH - fadeH, 0, boxY + boxH);
      fadeGrad.addColorStop(0, 'rgba(14,14,14,0)');
      fadeGrad.addColorStop(1, 'rgba(14,14,14,1)');
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(boxX, boxY + boxH - fadeH, boxW, fadeH);
      ctx.restore();

      if (sold) {
        drawSoldStamp(ctx, boxX + boxW / 2, boxY + boxH / 2, boxW * 0.8, 176);
      }

      // name + details overlap the faded bottom of the photo
      var boxBottom = boxY + boxH;
      ctx.textAlign = 'left';

      if (showPrice) {
        var y = boxBottom - 148;
        ctx.fillStyle = '#f1ede2';
        ctx.font = '700 60px Oswald, sans-serif';
        ctx.fillText(fitText(ctx, it.nome.toUpperCase(), W - marginX * 2), marginX, y);

        y += 42;
        ctx.fillStyle = '#a9a9ae';
        ctx.font = '400 25px "IBM Plex Sans", sans-serif';
        ctx.fillText(fitText(ctx, it.det, W - marginX * 2), marginX, y);

        y += 30;
        ctx.strokeStyle = 'rgba(241,237,226,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginX, y);
        ctx.lineTo(W - marginX, y);
        ctx.stroke();

        y += 68;
        if (it.brl != null) {
          ctx.fillStyle = '#4fae74';
          ctx.font = '700 84px "IBM Plex Mono", monospace';
          ctx.fillText(brl(it.brl), marginX, y);

          ctx.fillStyle = '#8d8d95';
          ctx.font = '500 27px "IBM Plex Mono", monospace';
          ctx.fillText(usd(it.usd) + '  +frete', marginX + 3, y + 38);
        } else {
          ctx.fillStyle = '#8d8d95';
          ctx.font = 'italic 400 34px "IBM Plex Sans", sans-serif';
          ctx.fillText('Price on request', marginX, y);
        }
      } else {
        var y = boxBottom + 96;
        ctx.fillStyle = '#f1ede2';
        ctx.font = '700 72px Oswald, sans-serif';
        ctx.fillText(fitText(ctx, it.nome.toUpperCase(), W - marginX * 2), marginX, y);

        y += 56;
        ctx.fillStyle = '#a9a9ae';
        ctx.font = '400 30px "IBM Plex Sans", sans-serif';
        ctx.fillText(fitText(ctx, it.det, W - marginX * 2), marginX, y);
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

  fetch('/api/data?t=' + Date.now(), { cache: 'no-store' })
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
        ? '<div class="detail-price-usd">' + usd(it.usd) + '</div><div class="detail-price-brl">' + brl(it.brl) + ' <span class="price-freight">+ frete</span></div>'
        : '<div class="price-consult">Price on request</div>';

      var oficial = it.oficial ? '<div class="badge-oficial">OFFICIAL PHOTO &middot; ' + esc(it.cert) + '</div>' : '';
      var featureTag = it.tag ? '<div class="badge-feature">' + esc(it.tag) + '</div>' : '';
      var hasBack = !!it.img_back_l;
      var faceToggle = hasBack
        ? '<div class="face-toggle"><button type="button" class="face-btn active" data-face="front">Front</button><button type="button" class="face-btn" data-face="back">Back</button></div>'
        : '';

      var about = it.about ? '<section class="detail-section"><h2>About this card</h2><p>' + esc(it.about) + '</p></section>' : '';
      var graderInfo = it.graderInfo ? '<section class="detail-section"><h2>About the grading</h2><p>' + esc(it.graderInfo) + '</p></section>' : '';

      var certRow = it.cert
        ? '<div class="detail-fact"><span>Certificate</span><strong>' + esc(it.cert) + '</strong></div>'
        : '';

      var waMessage = 'Hi! I\'m interested in this slab: ' + it.nome + ' — ' + it.det + ', ' + it.grade +
        (it.cert ? ' (Cert #' + it.cert + ')' : '') +
        '. Is it still available?\n' + location.origin + '/c/' + slugFor(it);
      var buyBtn =
        '<div class="buy-share-row">' +
          '<a class="detail-btn buy-seller-btn" href="https://wa.me/5511978314215?text=' + encodeURIComponent(waMessage) + '" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.46-.15-.65.14-.2.3-.75.94-.92 1.13-.17.2-.34.22-.63.08-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.51-.08-.15-.65-1.58-.9-2.16-.24-.58-.48-.5-.65-.5-.17-.01-.37-.01-.56-.01-.2 0-.51.07-.78.37-.26.3-1.02 1-1.02 2.43 0 1.43 1.05 2.82 1.19 3.01.15.2 2.06 3.14 4.98 4.4.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.7-.7 1.94-1.37.24-.68.24-1.26.17-1.38-.07-.12-.26-.2-.55-.34z"/><path d="M12.02 2C6.5 2 2.02 6.48 2.02 12c0 1.87.5 3.65 1.45 5.2L2 22l4.93-1.42A9.96 9.96 0 0 0 12.02 22C17.53 22 22 17.52 22 12S17.53 2 12.02 2zm0 18.18c-1.62 0-3.2-.44-4.58-1.28l-.33-.2-3.13.9.9-3.05-.21-.34a8.17 8.17 0 0 1-1.25-4.4c0-4.53 3.68-8.2 8.2-8.2 4.52 0 8.2 3.67 8.2 8.2 0 4.52-3.68 8.2-8.2 8.2z"/></svg>' +
            ' Buy from Seller' +
          '</a>' +
          '<button type="button" id="shareBtn" class="share-btn" aria-label="Share this slab">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
          '</button>' +
        '</div>';

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
            '<div class="detail-imgwrap' + (it.sold ? ' is-sold' : '') + (it.spotlight ? ' spotlight' : '') + '">' +
              '<img id="detailImg" src="' + it.img_l + '" alt="' + esc(it.nome) + '">' +
              oficial +
              featureTag +
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
            buyBtn +
            '<div class="admin-only admin-panel">' +
              '<div class="price-edit-row">' +
                '<input type="number" id="priceEditInput" class="price-edit-input" placeholder="USD, deixe vazio p/ sob consulta" value="' + (it.usd != null ? it.usd : '') + '" min="0" step="1">' +
              '</div>' +
              '<label class="sold-stamp-check"><input type="checkbox" id="soldCheck"' + (it.sold ? ' checked' : '') + '> Marcar como vendido</label>' +
              '<label class="sold-stamp-check"><input type="checkbox" id="soldStampCheck"' + (it.sold ? ' checked' : '') + '> Incluir carimbo SOLD no PNG</label>' +
              '<input type="text" id="vendedorInput" class="obs-input" maxlength="120" placeholder="Vendedor / consignante (só admin vê)" value="' + esc(it.vendedor || '') + '">' +
              '<button type="button" id="saveChangesBtn" class="detail-btn price-edit-btn">Salvar alterações</button>' +
              '<div id="saveStatus" class="save-status"></div>' +
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

      // ---- Share ----
      // Native share sheet on mobile (lets you pick WhatsApp, Instagram,
      // Messages, etc.); falls back to opening a WhatsApp share link, then
      // to copying the URL if even that isn't available.
      var shareBtn = document.getElementById('shareBtn');
      if (shareBtn) {
        shareBtn.addEventListener('click', function () {
          var shareUrl = location.origin + '/c/' + slugFor(it);
          var shareText = it.nome + ' — ' + it.det + ', ' + it.grade;
          if (navigator.share) {
            navigator.share({ title: it.nome + ' — Graded Collection', text: shareText, url: shareUrl }).catch(function () {});
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(function () {
              var original = shareBtn.innerHTML;
              shareBtn.textContent = 'Copied!';
              setTimeout(function () { shareBtn.innerHTML = original; }, 1500);
            }).catch(function () {
              window.open('https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + shareUrl), '_blank');
            });
          } else {
            window.open('https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + shareUrl), '_blank');
          }
        });
      }

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

      // ---- Instagram PNG export ----
      // Downloads whichever face (front/back) is currently selected on
      // screen via the face toggle — one tap, one file, matching what you
      // see. Switch to the other side first if you want that one instead.
      var soldStampCheck = document.getElementById('soldStampCheck');
      root.querySelectorAll('.ig-btn').forEach(function (btn) {
        btn.dataset.originalLabel = btn.textContent;
        btn.addEventListener('click', function () {
          var mode = btn.dataset.mode;
          var sold = soldStampCheck ? soldStampCheck.checked : false;
          var otherBtns = Array.prototype.filter.call(root.querySelectorAll('.ig-btn'), function (b) { return b !== btn; });
          otherBtns.forEach(function (b) { b.disabled = true; });
          btn.disabled = true;
          btn.textContent = 'Generating…';

          var isBack = currentFace === 'back';
          var imgSrc = isBack ? it.img_back_l : it.img_l;
          var faceSuffix = hasBack ? (isBack ? 'back' : 'front') : null;

          generateInstagramImage(it, imgSrc, mode, sold, faceSuffix).then(function () {
            btn.textContent = btn.dataset.originalLabel;
            btn.disabled = false;
            otherBtns.forEach(function (b) { b.disabled = false; });
          }).catch(function (err) {
            console.error(err);
            btn.textContent = 'Failed — try again';
            btn.disabled = false;
            otherBtns.forEach(function (b) { b.disabled = false; });
          });
        });
      });

      // ---- Save changes (price + sold together, persists via GitHub, site-wide) ----
      // A single button so nothing gets forgotten mid-edit — important when
      // updating from a phone: one tap, one password prompt, one save.
      var saveBtn = document.getElementById('saveChangesBtn');
      var priceEditInput = document.getElementById('priceEditInput');
      var soldCheck = document.getElementById('soldCheck');
      var vendedorInput = document.getElementById('vendedorInput');
      var saveStatus = document.getElementById('saveStatus');

      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          var raw = priceEditInput.value.trim();
          var newUsd = raw === '' ? null : Number(raw);
          if (raw !== '' && (isNaN(newUsd) || newUsd < 0)) {
            window.alert('Valor invalido.');
            return;
          }
          var nextSold = soldCheck.checked;
          var nextVendedor = vendedorInput ? vendedorInput.value.trim() : '';
          var priceChanged = newUsd !== it.usd;
          var soldChanged = nextSold !== !!it.sold;
          var vendedorChanged = nextVendedor !== (it.vendedor || '');

          if (!priceChanged && !soldChanged && !vendedorChanged) {
            saveStatus.textContent = 'Nada para salvar.';
            saveStatus.className = 'save-status';
            return;
          }

          var pw = (window.AdminAuth && window.AdminAuth.getPassword()) || window.prompt('Senha admin:');
          if (!pw) return;

          saveBtn.disabled = true;
          saveStatus.className = 'save-status';
          saveStatus.textContent = 'Salvando…';

          var chain = Promise.resolve();

          if (priceChanged) {
            chain = chain.then(function () {
              return fetch('/api/update-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw, cert: it.cert || it.id, usd: newUsd }),
              }).then(function (r) {
                if (!r.ok) return r.json().then(function (j) { throw new Error('Preco: ' + (j.error || 'falhou')); });
                return r.json();
              }).then(function (data) {
                it.usd = data.usd;
                it.brl = data.brl;
                var priceBox = root.querySelector('.detail-pricebox');
                priceBox.innerHTML = it.brl != null
                  ? '<div class="detail-price-usd">' + usd(it.usd) + '</div><div class="detail-price-brl">' + brl(it.brl) + ' <span class="price-freight">+ frete</span></div>'
                  : '<div class="price-consult">Price on request</div>';
              });
            });
          }

          if (soldChanged) {
            chain = chain.then(function () {
              return fetch('/api/mark-sold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw, cert: it.cert || it.id, sold: nextSold }),
              }).then(function (r) {
                if (!r.ok) return r.json().then(function (j) { throw new Error('Vendido: ' + (j.error || 'falhou')); });
                return r.json();
              }).then(function () {
                it.sold = nextSold;
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
              });
            });
          }

          if (vendedorChanged) {
            chain = chain.then(function () {
              return fetch('/api/update-seller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw, cert: it.cert || it.id, vendedor: nextVendedor }),
              }).then(function (r) {
                if (!r.ok) return r.json().then(function (j) { throw new Error('Vendedor: ' + (j.error || 'falhou')); });
                return r.json();
              }).then(function () {
                it.vendedor = nextVendedor;
              });
            });
          }

          chain.then(function () {
            saveBtn.disabled = false;
            saveStatus.textContent = 'Salvo — já está no ar para todo mundo.';
            saveStatus.className = 'save-status save-status-ok';
          }).catch(function (err) {
            console.error(err);
            saveBtn.disabled = false;
            saveStatus.textContent = 'Erro ao salvar: ' + err.message;
            saveStatus.className = 'save-status save-status-err';
          });
        });
      }
    })
    .catch(function (err) {
      root.innerHTML = '<div class="detail-loading">Could not load this card. <a href="index.html">Go back</a>.</div>';
      console.error(err);
    });
})();
