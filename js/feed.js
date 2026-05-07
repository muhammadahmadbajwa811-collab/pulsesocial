// js/feed.js — Home feed page
requireLogin();
const me = getMe();
let currentTab = 'feed';
let searchTimer = null;

function init() {
  buildSidebar('feed');
  document.getElementById('compose-avatar').innerHTML = avatarHtml(me, 42);

  const ta = document.getElementById('compose-text');
  ta.addEventListener('input', () => {
    const rem = 500 - ta.value.length;
    const el  = document.getElementById('char-count');
    el.textContent = rem;
    el.className   = 'compose-count' + (rem < 50 ? ' warn' : '') + (rem < 0 ? ' danger' : '');
    document.getElementById('btn-post').disabled = ta.value.trim().length === 0 || rem < 0;
  });

  loadFeed();
  loadSuggestionsAside();
}

function switchFeedTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
  // highlight both desktop and mobile tabs
  document.querySelectorAll(`.feed-tab`).forEach(t => {
    if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${tab}'`)) t.classList.add('active');
  });
  loadFeed();
}

async function loadFeed() {
  const c = document.getElementById('feed-container');
  c.innerHTML = '<div class="loading-state"><div class="spin"></div><p>Loading…</p></div>';
  const ep  = currentTab === 'feed' ? '/posts/feed' : '/posts/explore';
  const res = await API.get(ep);
  if (!res || !res.ok) {
    c.innerHTML = '<div class="empty-state"><p>Could not load posts.</p><small>Is the backend running?</small></div>';
    return;
  }
  if (res.data.length === 0) {
    c.innerHTML = `<div class="empty-state">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>Your feed is empty</p><small>Follow people to see their pulses here!</small></div>`;
    return;
  }
  c.innerHTML = res.data.map(p => renderPost(p, me.id)).join('');
}

async function submitPost() {
  const ta      = document.getElementById('compose-text');
  const content = ta.value.trim();
  if (!content) return;

  const btn = document.getElementById('btn-post');
  btn.disabled = true; btn.textContent = 'Posting…';

  const res = await API.post('/posts', { content });
  btn.textContent = 'Pulse it';
  btn.disabled = content.length === 0;

  if (!res || !res.ok) { showToast(res?.data?.error || 'Failed to post.', 'error'); return; }

  ta.value = '';
  document.getElementById('char-count').textContent = 500;

  const c   = document.getElementById('feed-container');
  const emp = c.querySelector('.empty-state');
  if (emp) c.innerHTML = '';
  c.insertAdjacentHTML('afterbegin', renderPost(res.data, me.id));
  showToast('Pulse posted! 🌊');
}

let searchDebounce = null;
function handleSearch(q) {
  clearTimeout(searchDebounce);
  const card = document.getElementById('search-card');
  if (!q.trim()) { card.style.display = 'none'; return; }
  searchDebounce = setTimeout(async () => {
    const res = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
    const list = document.getElementById('search-results-list');
    card.style.display = 'block';
    if (!res || !res.ok || res.data.length === 0) {
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