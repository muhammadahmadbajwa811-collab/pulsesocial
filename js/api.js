// js/api.js — Shared utility imported by every page
// Provides: API calls, auth helpers, render helpers, toast, time formatting

const API_BASE = 'http://localhost:5000/api';

/* ── Auth helpers ──────────────────────────────── */
function getToken() { return localStorage.getItem('pulse_token'); }
function getMe()    {
  const raw = localStorage.getItem('pulse_user');
  return raw ? JSON.parse(raw) : null;
}
function logout() {
  localStorage.removeItem('pulse_token');
  localStorage.removeItem('pulse_user');
  window.location.href = '../index.html';
}
function requireLogin() {
  if (!getToken()) window.location.href = '../index.html';
}

/* ── API fetch wrapper ─────────────────────────── */
async function apiFetch(path, options = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (res.status === 401) { logout(); return; }
  return { ok: res.ok, status: res.status, data };
}

const API = {
  get:    path       => apiFetch(path),
  post:   (path, b)  => apiFetch(path, { method: 'POST',   body: JSON.stringify(b) }),
  put:    (path, b)  => apiFetch(path, { method: 'PUT',    body: JSON.stringify(b) }),
  delete: path       => apiFetch(path, { method: 'DELETE' }),
};

/* ── Helpers ───────────────────────────────────── */
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n/1000).toFixed(1) + 'K';
  return n;
}

function timeAgo(str) {
  const diff = (Date.now() - new Date(str + 'Z').getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return Math.floor(diff / 60) + 'm';
  if (diff < 86400)  return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return new Date(str).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

/* ── Avatar HTML ───────────────────────────────── */
function avatarHtml(user, size = 42) {
  const fs = Math.round(size * 0.37);
  if (user.avatar_url) {
    return `<img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.display_name)}"
              class="avatar-img" style="width:${size}px;height:${size}px;"
              onerror="this.replaceWith(makeFallback('${initials(user.display_name)}',${size},${fs}))" />`;
  }
  return `<span class="avatar-fallback" style="width:${size}px;height:${size}px;font-size:${fs}px;">${initials(user.display_name)}</span>`;
}

function makeFallback(text, size, fs) {
  const el = document.createElement('span');
  el.className = 'avatar-fallback';
  el.style.cssText = `width:${size}px;height:${size}px;font-size:${fs}px;`;
  el.textContent = text;
  return el;
}

/* ── Verified badge ────────────────────────────── */
function verifiedBadge(user) {
  if (!user.is_verified) return '';
  return `<svg class="verified-badge" width="14" height="14" viewBox="0 0 14 14" title="Verified">
    <circle cx="7" cy="7" r="7" fill="#00c9a7"/>
    <path d="M4 7l2 2 4-4" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ── Render a post card ────────────────────────── */
function renderPost(post, myId) {
  const isOwner = myId && post.user_id === myId;
  const liked   = post.user_liked;
  return `
  <article class="post-card" data-id="${post.id}">
    <a class="post-avatar-link" href="profile.html?u=${post.username}">
      ${avatarHtml(post, 42)}
    </a>
    <div class="post-body">
      <div class="post-header">
        <div class="post-meta">
          <a class="post-author" href="profile.html?u=${post.username}">${escapeHtml(post.display_name)}</a>
          ${verifiedBadge(post)}
          <span class="post-handle">@${post.username}</span>
          <span class="post-dot">·</span>
          <span class="post-time">${timeAgo(post.created_at)}</span>
        </div>
        ${isOwner ? `<button class="post-delete-btn" onclick="deletePost(${post.id},this)" title="Delete">✕</button>` : ''}
      </div>
      <p class="post-content">${escapeHtml(post.content)}</p>
      ${post.image_url ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="Post image" loading="lazy"/>` : ''}
      <div class="post-actions">
        <button class="action-btn like-btn ${liked?'liked':''}" onclick="toggleLike(${post.id},this)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="${liked?'currentColor':'none'}" stroke="currentColor" stroke-width="1.5">
            <path d="M8 13.5s-6-4-6-7.5a3 3 0 0 1 6 0 3 3 0 0 1 6 0c0 3.5-6 7.5-6 7.5z"/>
          </svg>
          <span class="like-count">${fmt(post.likes_count)}</span>
        </button>
        <button class="action-btn" onclick="openPost(${post.id})">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 10a2 2 0 0 1-2 2H5l-3 2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6z"/>
          </svg>
          <span>${fmt(post.comments_count)}</span>
        </button>
        <button class="action-btn" onclick="sharePost(${post.id})">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M11 3l3 3-3 3M14 6H6a3 3 0 0 0 0 6h1"/>
          </svg>
        </button>
      </div>
    </div>
  </article>`;
}

/* ── Global post actions ───────────────────────── */
async function toggleLike(postId, btn) {
  if (!getToken()) return (window.location.href = '../index.html');
  const res = await API.post(`/posts/${postId}/like`);
  if (!res || !res.ok) return;
  const { liked, likes_count } = res.data;
  btn.classList.toggle('liked', liked);
  btn.querySelector('path').setAttribute('fill', liked ? 'currentColor' : 'none');
  btn.querySelector('.like-count').textContent = fmt(likes_count);
}

function openPost(id)  { window.location.href = `post.html?id=${id}`; }
function sharePost(id) {
  const url = `${location.origin}${location.pathname.replace(/[^/]+$/, '')}post.html?id=${id}`;
  navigator.clipboard?.writeText(url).then(() => showToast('Link copied!')).catch(() => showToast('Copy link manually: ' + url, 'error'));
}

async function deletePost(postId, btn) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const res = await API.delete(`/posts/${postId}`);
  if (res && res.ok) {
    const card = btn.closest('.post-card');
    card.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => card.remove(), 300);
    showToast('Post deleted.');
  }
}

/* ── Toast ─────────────────────────────────────── */
function showToast(msg, type = 'success') {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 0.3s';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

/* ── Sidebar scaffold builder ──────────────────── */
function buildSidebar(activePage) {
  const me = getMe();
  if (!me) return;

  const links = [
    { id:'feed',          label:'Home',          href:'feed.html',          icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
    { id:'explore',       label:'Explore',       href:'explore.html',       icon:'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z' },
    { id:'notifications', label:'Notifications', href:'notifications.html', icon:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0' },
    { id:'profile',       label:'Profile',       href:`profile.html?u=${me.username}`, icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  ];

  // Desktop sidebar
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <a class="sidebar-logo" href="feed.html">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <path d="M4 18 Q8 4 14 14 Q20 24 24 10" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        Pulse
      </a>
      <nav class="sidebar-nav">
        ${links.map(l => `
          <a class="sidebar-link ${activePage===l.id?'active':''}" href="${l.href}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${l.icon.split(' M').map((d,i)=>`<path d="${i===0?d:'M'+d}"/>`).join('')}
            </svg>
            ${l.label}
            ${l.id==='notifications' ? `<span class="sidebar-badge" id="sb-notif-badge" style="display:none">0</span>` : ''}
          </a>`).join('')}
      </nav>
      <a class="btn-compose" href="feed.html#compose">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Pulse
      </a>
      <a class="sidebar-user" href="profile.html?u=${me.username}">
        ${avatarHtml(me, 36)}
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${escapeHtml(me.display_name)}</div>
          <div class="sidebar-user-handle">@${me.username}</div>
        </div>
        <button class="btn-logout" onclick="logout();event.stopPropagation();" title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </a>`;
  }

  // Mobile topbar
  const topbar = document.querySelector('.mobile-topbar');
  if (topbar) {
    const rightZone = topbar.querySelector('.topbar-right');
    if (rightZone) {
      rightZone.innerHTML = `
        <a class="topbar-icon-btn" href="notifications.html" title="Notifications">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="nav-badge" id="mob-notif-badge" style="display:none"></span>
        </a>
        <a class="topbar-icon-btn" href="profile.html?u=${me.username}">
          ${avatarHtml(me, 30)}
        </a>`;
    }
  }

  // Mobile bottom nav
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    const navIcons = {
      feed:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
      explore: 'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
      compose: '',
      notifications: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
      profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    };
    bottomNav.innerHTML = `
      <a class="nav-btn ${activePage==='feed'?'active':''}" href="feed.html">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Home</span>
      </a>
      <a class="nav-btn ${activePage==='explore'?'active':''}" href="explore.html">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>Explore</span>
      </a>
      <button class="nav-btn" onclick="focusCompose()" style="color:var(--pulse)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" stroke-width="1.5"/>
          <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span>Post</span>
      </button>
      <a class="nav-btn ${activePage==='notifications'?'active':''}" href="notifications.html">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span>Alerts</span>
      </a>
      <a class="nav-btn ${activePage==='profile'?'active':''}" href="profile.html?u=${me.username}">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Profile</span>
      </a>`;
  }

  // load notification badge
  loadNotifBadge();
}

async function loadNotifBadge() {
  const res = await API.get('/notifications/unread-count');
  if (!res || !res.ok) return;
  const { count } = res.data;
  if (count <= 0) return;
  const label = count > 9 ? '9+' : String(count);
  ['sb-notif-badge','mob-notif-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = label; el.style.display = ''; }
  });
}

function focusCompose() {
  const ta = document.getElementById('compose-text');
  if (ta) { ta.focus(); ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  else window.location.href = 'feed.html#compose';
}

/* ── Right aside suggestions ───────────────────── */
async function loadSuggestionsAside() {
  const list = document.getElementById('aside-suggestions-list');
  if (!list) return;
  const res = await API.get('/users/suggestions');
  if (!res || !res.ok || res.data.length === 0) {
    list.innerHTML = '<p style="color:var(--muted);font-size:13px">No suggestions right now.</p>';
    return;
  }
  list.innerHTML = res.data.map(u => `
    <div class="suggest-row">
      <a href="profile.html?u=${u.username}">${avatarHtml(u, 36)}</a>
      <div class="suggest-info">
        <a href="profile.html?u=${u.username}" class="suggest-name">${escapeHtml(u.display_name)}${verifiedBadge(u)}</a>
        <div class="suggest-handle">@${u.username}</div>
      </div>
      <button class="btn-follow" onclick="quickFollow('${u.username}',this)">Follow</button>
    </div>`).join('');
}

async function quickFollow(username, btn) {
  const res = await API.post(`/users/${username}/follow`);
  if (!res || !res.ok) return;
  btn.textContent = res.data.following ? 'Following' : 'Follow';
  btn.classList.toggle('following', res.data.following);
  showToast(res.data.following ? `Following @${username}` : `Unfollowed @${username}`);
}