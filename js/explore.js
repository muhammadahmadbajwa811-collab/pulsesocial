// js/explore.js — Explore page
requireLogin();
const me = getMe();
let exTab = 'posts';
let exTimer = null;

function init() {
  buildSidebar('explore');
  loadTrending();
  loadSuggestionsAside();
}

function switchExTab(tab, btn) {
  exTab = tab;
  document.querySelectorAll('.explore-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('explore-tabs').style.display = '';
  if (tab === 'posts')  loadTrending();
  else                  loadPeople();
}

async function loadTrending() {
  const c = document.getElementById('explore-content');
  c.innerHTML = '<div class="loading-state"><div class="spin"></div></div>';
  const res = await API.get('/posts/explore');
  if (!res || !res.ok || res.data.length === 0) {
    c.innerHTML = '<div class="empty-state"><p>Nothing trending yet.</p></div>'; return;
  }
  c.innerHTML = res.data.map(p => renderPost(p, me.id)).join('');
}

async function loadPeople() {
  const c = document.getElementById('explore-content');
  c.innerHTML = '<div class="loading-state"><div class="spin"></div></div>';
  const res = await API.get('/users/suggestions');
  if (!res || !res.ok || res.data.length === 0) {
    c.innerHTML = '<div class="empty-state"><p>No suggestions.</p></div>'; return;
  }
  c.innerHTML = res.data.map(u => `
    <div class="post-card" style="align-items:center">
      <a href="profile.html?u=${u.username}">${avatarHtml(u, 46)}</a>
      <div style="flex:1;min-width:0">
        <a href="profile.html?u=${u.username}" style="font-weight:700;display:flex;align-items:center;gap:5px">
          ${escapeHtml(u.display_name)}${verifiedBadge(u)}
        </a>
        <div style="font-size:13px;color:var(--muted)">@${u.username}</div>
        ${u.bio ? `<p style="font-size:14px;margin-top:5px;color:var(--muted)">${escapeHtml(u.bio)}</p>` : ''}
      </div>
      ${u.id !== me.id ? `<button class="btn-follow" onclick="quickFollow('${u.username}',this)">Follow</button>` : ''}
    </div>`).join('');
}

function handleExploreSearch(q) {
  clearTimeout(exTimer);
  if (!q.trim()) {
    document.getElementById('explore-tabs').style.display = '';
    if (exTab === 'posts') loadTrending(); else loadPeople();
    return;
  }
  document.getElementById('explore-tabs').style.display = 'none';
  exTimer = setTimeout(async () => {
    const c   = document.getElementById('explore-content');
    c.innerHTML = '<div class="loading-state"><div class="spin"></div></div>';
    const res = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
    if (!res || !res.ok || res.data.length === 0) {
      c.innerHTML = `<div class="empty-state"><p>No results for "${escapeHtml(q)}"</p></div>`; return;
    }
    c.innerHTML = res.data.map(u => `
      <div class="post-card" style="align-items:center">
        <a href="profile.html?u=${u.username}">${avatarHtml(u, 44)}</a>
        <div style="flex:1;min-width:0">
          <a href="profile.html?u=${u.username}" style="font-weight:700;display:flex;align-items:center;gap:5px">
            ${escapeHtml(u.display_name)}${verifiedBadge(u)}
          </a>
          <div style="font-size:13px;color:var(--muted)">@${u.username} · ${fmt(u.followers_count)} followers</div>
          ${u.bio ? `<p style="font-size:14px;margin-top:4px">${escapeHtml(u.bio)}</p>` : ''}
        </div>
        ${u.id !== me.id ? `<button class="btn-follow" onclick="quickFollow('${u.username}',this)">Follow</button>` : ''}
      </div>`).join('');
  }, 350);
}

init();