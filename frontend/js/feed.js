// js/feed.js — Home feed page (with image/video upload support)
requireLogin();
const me = getMe();
let currentTab   = 'feed';
let selectedFile = null; // holds the chosen image/video file

function init() {
  buildSidebar('feed');
  document.getElementById('compose-avatar').innerHTML = avatarHtml(me, 42);

  // Character counter
  document.getElementById('compose-text').addEventListener('input', updateCharCount);

  loadFeed();
  loadSuggestionsAside();
}

// ── Character counter ─────────────────────────
function updateCharCount() {
  const val = document.getElementById('compose-text').value;
  const rem = 500 - val.length;
  const el  = document.getElementById('char-count');
  el.textContent = rem;
  el.className   = 'compose-count' + (rem < 50 ? ' warn' : '') + (rem < 0 ? ' danger' : '');
  document.getElementById('btn-post').disabled = val.trim().length === 0 || rem < 0;
}

// ── Media file selected from input ────────────
function handleMediaSelect(input) {
  const file = input.files[0];
  if (!file) return;

  // Max 50MB
  if (file.size > 50 * 1024 * 1024) {
    showToast('File too large. Max size is 50MB.', 'error');
    input.value = '';
    return;
  }

  selectedFile = file;

  // Show preview
  const preview = document.getElementById('media-preview');
  const url     = URL.createObjectURL(file);

  if (file.type.startsWith('video/')) {
    preview.innerHTML = `
      <div style="position:relative;display:inline-block;max-width:100%">
        <video src="${url}" controls style="max-width:100%;max-height:220px;border-radius:12px;display:block;margin-top:10px"></video>
        <button onclick="clearMedia()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);border:none;color:white;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>`;
  } else {
    preview.innerHTML = `
      <div style="position:relative;display:inline-block;max-width:100%">
        <img src="${url}" style="max-width:100%;max-height:220px;border-radius:12px;display:block;margin-top:10px;object-fit:cover"/>
        <button onclick="clearMedia()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);border:none;color:white;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>`;
  }
}

function clearMedia() {
  selectedFile = null;
  document.getElementById('media-preview').innerHTML = '';
  document.getElementById('media-input').value = '';
}

// ── Submit post with optional media ──────────
async function submitPost() {
  const textarea = document.getElementById('compose-text');
  const content  = textarea.value.trim();
  if (!content) return;

  const btn = document.getElementById('btn-post');
  btn.disabled = true;
  btn.textContent = 'Posting…';

  try {
    // Use FormData so we can send both text AND a file
    const formData = new FormData();
    formData.append('content', content);
    if (selectedFile) {
      formData.append('media', selectedFile);
    }

    const token = getToken();
    const res   = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      // NOTE: do NOT set Content-Type manually — browser sets it automatically with the boundary for FormData
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to post.', 'error');
      return;
    }

    // Clear the form
    textarea.value = '';
    clearMedia();
    updateCharCount();

    // Prepend new post to top of feed
    const container = document.getElementById('feed-container');
    const empty     = container.querySelector('.empty-state');
    if (empty) container.innerHTML = '';
    container.insertAdjacentHTML('afterbegin', renderPost(data, me.id));
    showToast('Pulse posted! 🌊');

  } catch (err) {
    showToast('Cannot reach server. Is backend running?', 'error');
  } finally {
    btn.textContent = 'Pulse it';
    btn.disabled    = false;
  }
}

// ── Tab switch ────────────────────────────────
function switchFeedTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.feed-tab').forEach(t => {
    if ((t.getAttribute('onclick') || '').includes(`'${tab}'`)) t.classList.add('active');
  });
  loadFeed();
}

// ── Load feed ─────────────────────────────────
async function loadFeed() {
  const c   = document.getElementById('feed-container');
  c.innerHTML = '<div class="loading-state"><div class="spin"></div><p>Loading…</p></div>';
  const ep  = currentTab === 'feed' ? '/posts/feed' : '/posts/explore';
  const res = await API.get(ep);
  if (!res || !res.ok) {
    c.innerHTML = '<div class="empty-state"><p>Could not load posts.</p><small>Make sure backend is running (npm run dev)</small></div>';
    return;
  }
  if (!res.data.length) {
    c.innerHTML = `<div class="empty-state">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-linecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <p>Your feed is empty</p>
      <small>Follow people or create your first pulse!</small>
    </div>`;
    return;
  }
  c.innerHTML = res.data.map(p => renderPost(p, me.id)).join('');
}

// ── Search ────────────────────────────────────
let searchDebounce = null;
function handleSearch(q) {
  clearTimeout(searchDebounce);
  const card = document.getElementById('search-card');
  if (!q.trim()) { card.style.display = 'none'; return; }
  searchDebounce = setTimeout(async () => {
    const res  = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
    const list = document.getElementById('search-results-list');
    card.style.display = 'block';
    if (!res || !res.ok || !res.data.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:6px 0">No users found.</p>';
      return;
    }
    list.innerHTML = res.data.map(u => `
      <div class="suggest-row">
        <a href="profile.html?u=${u.username}">${avatarHtml(u, 34)}</a>
        <div class="suggest-info">
          <a href="profile.html?u=${u.username}" class="suggest-name">${escapeHtml(u.display_name)}${verifiedBadge(u)}</a>
          <div class="suggest-handle">@${u.username}</div>
        </div>
      </div>`).join('');
  }, 350);
}

init();