(function () {
  // NOTE: this is a client-side gate only (no real backend auth). It hides
  // admin controls from casual visitors; it is not real security since the
  // hash below ships in the page source.
  var HASH = '86f788e2b98f2842c2008745d8d28ff0ef264287e1bb4be94045058e709112f0';

  function sha256(msg) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  function isAdmin() {
    return localStorage.getItem('admin_ok') === '1';
  }

  function applyState() {
    document.body.classList.toggle('is-admin', isAdmin());
    var btn = document.getElementById('adminToggleBtn');
    if (btn) btn.textContent = isAdmin() ? 'Admin: sair' : 'Admin';
  }

  function login() {
    var pw = window.prompt('Senha admin:');
    if (!pw) return;
    sha256(pw).then(function (h) {
      if (h === HASH) {
        localStorage.setItem('admin_ok', '1');
        sessionStorage.setItem('admin_pw', pw);
        applyState();
      } else {
        window.alert('Senha incorreta.');
      }
    });
  }

  function logout() {
    localStorage.removeItem('admin_ok');
    sessionStorage.removeItem('admin_pw');
    applyState();
  }

  function getPassword() {
    return sessionStorage.getItem('admin_pw') || '';
  }

  window.AdminAuth = { isAdmin: isAdmin, applyState: applyState, getPassword: getPassword };

  document.addEventListener('DOMContentLoaded', function () {
    applyState();
    var btn = document.getElementById('adminToggleBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (isAdmin()) { logout(); } else { login(); }
      });
    }
  });
})();
