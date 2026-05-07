// js/auth.js — Login & Register page logic

const API = 'http://localhost:5000/api';

// If already logged in, skip to feed
if (localStorage.getItem('pulse_token')) {
  window.location.href = 'pages/feed.html';
}

// ── Tab switching ─────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('form-login').style.display    = tab === 'login'    ? 'flex' : 'none';
    document.getElementById('form-register').style.display = tab === 'register' ? 'flex' : 'none';
    hideAlert();
  });
});

// ── Alert helpers ─────────────────────────────
function showAlert(msg, type = 'error') {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.className = 'alert ' + type;
  el.style.display = 'block';
}
function hideAlert() {
  document.getElementById('alert').style.display = 'none';
}

// ── Password visibility toggle ────────────────
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
}

// ── Loading state helper ──────────────────────
function setLoading(btnId, on) {
  const btn = document.getElementById(btnId);
  btn.querySelector('.btn-text').style.display = on ? 'none' : 'inline';
  btn.querySelector('.btn-spin').style.display = on ? 'flex' : 'none';
  btn.disabled = on;
}

// ── Save session & go to feed ─────────────────
function saveAndRedirect(token, user) {
  localStorage.setItem('pulse_token', token);
  localStorage.setItem('pulse_user', JSON.stringify(user));
  window.location.href = 'pages/feed.html';
}

// ── LOGIN ─────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const identifier = document.getElementById('login-id').value.trim();
  const password   = document.getElementById('login-pw').value;

  if (!identifier || !password) return showAlert('Please fill in all fields.');

  setLoading('btn-login', true);
  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Login failed.');
    } else {
      showAlert('Welcome back! Taking you in...', 'success');
      setTimeout(() => saveAndRedirect(data.token, data.user), 800);
    }
  } catch {
    showAlert('Cannot reach the server. Is the backend running?');
  } finally {
    setLoading('btn-login', false);
  }
});

// ── REGISTER ──────────────────────────────────
document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const display_name = document.getElementById('reg-name').value.trim();
  const username     = document.getElementById('reg-user').value.trim();
  const email        = document.getElementById('reg-email').value.trim();
  const password     = document.getElementById('reg-pw').value;

  if (!display_name || !username || !email || !password) return showAlert('Please fill in all fields.');

  setLoading('btn-register', true);
  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name, username, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Registration failed.');
    } else {
      showAlert('Account created! Taking you in...', 'success');
      setTimeout(() => saveAndRedirect(data.token, data.user), 800);
    }
  } catch {
    showAlert('Cannot reach the server. Is the backend running?');
  } finally {
    setLoading('btn-register', false);
  }
});