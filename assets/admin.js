(function () {
  // The password is NEVER stored or checked here. Previously this file shipped
  // a SHA-256 hash of it, which anyone could read from the page source and
  // brute-force — that gave away write access to every admin endpoint. Now the
  // password is posted once to /api/login, verified server-side, and exchanged
  // for a signed token with an expiry. Only the token lives in the browser,
  // and every privileged endpoint validates it on the server.
  var TOKEN_KEY = 'admin_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function isAdmin() {
    return !!getToken();
  }

  function applyState() {
    document.body.classList.toggle('is-admin', isAdmin());
    var btn = document.getElementById('adminToggleBtn');
    if (btn) btn.textContent = isAdmin() ? 'Admin: sair' : 'Admin';
  }

  function login() {
    var pw = window.prompt('Senha admin:');
    if (!pw) return;
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Falha no login');
        return j;
      });
    }).then(function (j) {
      localStorage.setItem(TOKEN_KEY, j.token);
      applyState();
      // Reload so admin-only views fetch their data with the new token.
      window.location.reload();
    }).catch(function (err) {
      window.alert(err.message || 'Senha incorreta.');
    });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    // Clear credentials left over from the old client-side gate.
    localStorage.removeItem('admin_ok');
    localStorage.removeItem('admin_pw');
    sessionStorage.removeItem('admin_pw');
    applyState();
    window.location.reload();
  }

  // Any token the server rejects is dead weight — drop it so the UI stops
  // pretending we're logged in.
  function clearIfRejected(response) {
    if (response && response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      applyState();
    }
    return response;
  }

  // Wipe stale keys from the previous, insecure gate on first load.
  if (localStorage.getItem('admin_ok') || localStorage.getItem('admin_pw')) {
    localStorage.removeItem('admin_ok');
    localStorage.removeItem('admin_pw');
    sessionStorage.removeItem('admin_pw');
  }

  window.AdminAuth = {
    isAdmin: isAdmin,
    applyState: applyState,
    getToken: getToken,
    clearIfRejected: clearIfRejected,
  };

  document.addEventListener('DOMContentLoaded', function () {
    applyState();
    var btn = document.getElementById('adminToggleBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (isAdmin()) { logout(); } else { login(); }
      });
    }
  });
  applyState();
})();
