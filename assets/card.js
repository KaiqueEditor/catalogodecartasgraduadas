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

  function generateInstagramImage(it, imgSrc) {
    var W = 1080, H = 1440;
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
      var glow = ctx.createRadialGradient(W / 2, 560, 80, W / 2, 560, 620);
      glow.addColorStop(0, 'rgba(198,161,91,0.16)');
      glow.addColorStop(1, 'rgba(198,161,91,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // eyebrow
      ctx.fillStyle = '#e8c878';
      ctx.font = '600 26px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GRADED COLLECTION', W / 2, 90);

      // slab image, contain-fit inside box
      var boxX = 90, boxY = 140, boxW = W - 180, boxH = 860;
      var scale = Math.min(boxW / cardImg.width, boxH / cardImg.height);
      var drawW = cardImg.width * scale, drawH = cardImg.height * scale;
      var drawX = boxX + (boxW - drawW) / 2, drawY = boxY + (boxH - drawH) / 2;

      ctx.save();
      roundRect(ctx, drawX - 16, drawY - 16, drawW + 32, drawH + 32, 18);
      ctx.fillStyle = '#050506';
      ctx.fill();
      ctx.strokeStyle = 'rgba(198,161,91,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.clip();
      ctx.drawImage(cardImg, drawX, drawY, drawW, drawH);
      ctx.restore();

      var y = boxY + boxH + 70;

      // category + grade pill
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8d8d95';
      ctx.font = '500 24px "IBM Plex Mono", monospace';
      ctx.fillText(it.cat.toUpperCase(), 90, y);

      ctx.textAlign = 'right';
      var gradeText = it.grade;
      ctx.font = '600 24px "IBM Plex Mono", monospace';
      var gradeW = ctx.measureText(gradeText).width;
      var pillPad = 20, pillH = 44;
      var pillX = W - 90 - gradeW - pillPad * 2;
      roundRect(ctx, pillX, y - pillH + 12, gradeW + pillPad * 2, pillH, pillH / 2);
      ctx.strokeStyle = 'rgba(198,161,91,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e8c878';
      ctx.textAlign = 'center';
      ctx.fillText(gradeText, pillX + (gradeW + pillPad * 2) / 2, y);

      y += 66;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f1ede2';
      ctx.font = '600 58px Oswald, sans-serif';
      ctx.fillText(it.nome, 90, y);

      y += 46;
      ctx.fillStyle = '#8d8d95';
      ctx.font = '400 26px "IBM Plex Sans", sans-serif';
      wrapText(ctx, it.det, 90, y, W - 180, 34);

      // price block
      var priceY = 1230;
      if (it.brl != null) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4fae74';
        ctx.font = '700 84px "IBM Plex Mono", monospace';
        ctx.fillText(brl(it.brl), 90, priceY);

        ctx.fillStyle = '#5c5c63';
        ctx.font = '500 30px "IBM Plex Mono", monospace';
        ctx.fillText(usd(it.usd), 92, priceY + 42);
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8d8d95';
        ctx.font = 'italic 400 40px "IBM Plex Sans", sans-serif';
        ctx.fillText('Price on request', 90, priceY);
      }

      // footer divider + domain
      ctx.strokeStyle = '#2a2a30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(90, 1330);
      ctx.lineTo(W - 90, 1330);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#5c5c63';
      ctx.font = '500 26px "IBM Plex Mono", monospace';
      ctx.fillText('catalogodecartasgraduadas.com.br', 90, 1380);

      if (it.cert) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#5c5c63';
        ctx.fillText('CERT ' + it.cert, W - 90, 1380);
      }

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          var a = document.createElement('a');
          var slug = it.cert || ('p' + it.id);
          a.href = URL.createObjectURL(blob);
          a.download = slug + '-' + it.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          resolve();
        }, 'image/png');
      });
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
    var lines = [];
    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    lines = lines.slice(0, 2);
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), x, y + i * lineHeight);
    }
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
            '<button type="button" id="igDownloadBtn" class="detail-btn ig-btn">&#8681; Download for Instagram</button>' +
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
      var igBtn = document.getElementById('igDownloadBtn');
      igBtn.addEventListener('click', function () {
        igBtn.disabled = true;
        var originalLabel = igBtn.textContent;
        igBtn.textContent = 'Generating…';
        generateInstagramImage(it, img.src).then(function () {
          igBtn.textContent = originalLabel;
          igBtn.disabled = false;
        }).catch(function (err) {
          console.error(err);
          igBtn.textContent = 'Failed — try again';
          igBtn.disabled = false;
        });
      });
    })
    .catch(function (err) {
      root.innerHTML = '<div class="detail-loading">Could not load this card. <a href="index.html">Go back</a>.</div>';
      console.error(err);
    });
})();
