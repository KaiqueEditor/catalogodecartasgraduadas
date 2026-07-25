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

  function drawSoldStamp(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-16 * Math.PI / 180);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(214,40,40,0.92)';
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(0, 0, radius - 16, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(214,40,40,0.92)';
    ctx.stroke();

    ctx.fillStyle = 'rgba(214,40,40,0.94)';
    ctx.textAlign = 'center';
    ctx.font = '800 66px Oswald, sans-serif';
    ctx.fillText('VENDIDO', 0, 20);
    ctx.font = '600 24px "IBM Plex Mono", monospace';
    ctx.fillText('S O L D  O U T', 0, 60);
    ctx.restore();
  }

  function generateInstagramImage(it, imgSrc, mode, sold) {
    var W = 1080, H = 1440;
    var showPrice = mode !== 'cta';
    return Promise.all([loadImage(imgSrc), document.fonts.ready]).then(function (res) {
      var cardImg = res[0];
      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');

      // background
      var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#101012');
      bgGrad.addColorStop(1, '#0a0a0b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // subtle radial glow behind the slab
      var glow = ctx.createRadialGradient(W / 2, 540, 80, W / 2, 540, 620);
      glow.addColorStop(0, 'rgba(198,161,91,0.16)');
      glow.addColorStop(1, 'rgba(198,161,91,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // tiny eyebrow, kept minimal so the slab owns the frame
      ctx.fillStyle = '#e8c878';
      ctx.font = '600 22px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GRADED COLLECTION', W / 2, 56);

      // slab image, contain-fit inside a big box — the slab is the hero here
      var boxX = 60, boxY = 78, boxW = W - 120, boxH = 960;
      var scale = Math.min(boxW / cardImg.width, boxH / cardImg.height);
      var drawW = cardImg.width * scale, drawH = cardImg.height * scale;
      var drawX = boxX + (boxW - drawW) / 2, drawY = boxY + (boxH - drawH) / 2;

      ctx.save();
      roundRect(ctx, drawX - 14, drawY - 14, drawW + 28, drawH + 28, 16);
      ctx.fillStyle = '#050506';
      ctx.fill();
      ctx.strokeStyle = 'rgba(198,161,91,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.clip();
      ctx.drawImage(cardImg, drawX, drawY, drawW, drawH);
      ctx.restore();

      if (sold) {
        drawSoldStamp(ctx, boxX + boxW / 2, boxY + boxH / 2, Math.min(boxW, boxH) * 0.32);
      }

      var y = boxY + boxH + 60;

      // category + grade pill
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8d8d95';
      ctx.font = '500 23px "IBM Plex Mono", monospace';
      ctx.fillText(it.cat.toUpperCase(), 90, y);

      ctx.textAlign = 'right';
      var gradeText = it.grade;
      ctx.font = '600 23px "IBM Plex Mono", monospace';
      var gradeW = ctx.measureText(gradeText).width;
      var pillPad = 18, pillH = 42;
      var pillX = W - 90 - gradeW - pillPad * 2;
      roundRect(ctx, pillX, y - pillH + 12, gradeW + pillPad * 2, pillH, pillH / 2);
      ctx.strokeStyle = 'rgba(198,161,91,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e8c878';
      ctx.textAlign = 'center';
      ctx.fillText(gradeText, pillX + (gradeW + pillPad * 2) / 2, y);

      y += 58;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f1ede2';
      ctx.font = '600 50px Oswald, sans-serif';
      ctx.fillText(fitText(ctx, it.nome, W - 180), 90, y);

      y += 82;

      if (showPrice && it.brl != null) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4fae74';
        ctx.font = '700 76px "IBM Plex Mono", monospace';
        ctx.fillText(brl(it.brl), 90, y);

        ctx.fillStyle = '#5c5c63';
        ctx.font = '500 27px "IBM Plex Mono", monospace';
        ctx.fillText(usd(it.usd), 92, y + 38);
      } else if (showPrice) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8d8d95';
        ctx.font = 'italic 400 36px "IBM Plex Sans", sans-serif';
        ctx.fillText('Price on request', 90, y);
      } else {
        // call-to-action banner instead of a price
        var ctaW = W - 180, ctaH = 90;
        var ctaY = y - 60;
        roundRect(ctx, 90, ctaY, ctaW, ctaH, 14);
        var ctaGrad = ctx.createLinearGradient(90, 0, 90 + ctaW, 0);
        ctaGrad.addColorStop(0, 'rgba(232,200,120,0.10)');
        ctaGrad.addColorStop(1, 'rgba(232,200,120,0.04)');
        ctx.fillStyle = ctaGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(232,200,120,0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#e8c878';
        ctx.font = '600 32px "IBM Plex Mono", monospace';
        ctx.fillText('CHAME NO DIRECT PARA O VALOR', W / 2, ctaY + 57);
      }

      // footer divider + domain
      ctx.strokeStyle = '#2a2a30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(90, 1350);
      ctx.lineTo(W - 90, 1350);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#5c5c63';
      ctx.font = '500 25px "IBM Plex Mono", monospace';
      ctx.fillText('catalogodecartasgraduadas.com.br', 90, 1396);

      if (it.cert) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#5c5c63';
        ctx.fillText('CERT ' + it.cert, W - 90, 1396);
      }

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          var a = document.createElement('a');
          var slug = it.cert || ('p' + it.id);
          var suffix = showPrice ? '' : '-direct';
          a.href = URL.createObjectURL(blob);
          a.download = slug + '-' + it.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-') + suffix + '.png';
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
            '<div class="detail-imgwrap">' +
              '<img id="detailImg" src="' + it.img_l + '" alt="' + esc(it.nome) + '">' +
              oficial +
              (it.sold ? '<div class="sold-badge">VENDIDO</div>' : '') +
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
              '<button type="button" id="soldToggleBtn" class="detail-btn sold-toggle-btn">' + (it.sold ? 'Desmarcar vendido' : 'Marcar como vendido') + '</button>' +
              '<label class="sold-stamp-check"><input type="checkbox" id="soldStampCheck"' + (it.sold ? ' checked' : '') + '> Incluir carimbo VENDIDO no PNG</label>' +
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

      // ---- Instagram PNG export ----
      var soldStampCheck = document.getElementById('soldStampCheck');
      root.querySelectorAll('.ig-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.dataset.mode;
          var sold = soldStampCheck ? soldStampCheck.checked : false;
          root.querySelectorAll('.ig-btn').forEach(function (b) { b.disabled = true; });
          var originalLabel = btn.textContent;
          btn.textContent = 'Generating…';
          generateInstagramImage(it, img.src, mode, sold).then(function () {
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
            var existingBadge = root.querySelector('.sold-badge');
            if (nextSold && !existingBadge) {
              var badge = document.createElement('div');
              badge.className = 'sold-badge';
              badge.textContent = 'VENDIDO';
              root.querySelector('.detail-imgwrap').appendChild(badge);
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
    })
    .catch(function (err) {
      root.innerHTML = '<div class="detail-loading">Could not load this card. <a href="index.html">Go back</a>.</div>';
      console.error(err);
    });
})();
