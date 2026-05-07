// js/profile.js — Profile page (FIXED)
requireLogin();
const me       = getMe();
const username = new URLSearchParams(location.search).get('u') || me.username;
let profileData = null;

async function init() {
  buildSidebar('profile');
  await loadProfile();
  loadSuggestionsAside();
}

async function loadProfile() {
  const res = await API.get(`/users/${username}`);
  if (!res || !res.ok) {
    document.getElementById('profile-header').innerHTML =
      '<div class="empty-state"><p>User not found.</p></div>';
    return;
  }
  profileData = res.data;

  // FIX 1: Correct element IDs to match profile.html
  document.title = `Pulse — ${profileData.display_name}`;

  const headerName = document.getElementById('header-name');
  if (headerName) headerName.textContent = profileData.display_name;

  const headerPosts = document.getElementById('header-posts');
  if (headerPosts) headerPosts.textContent = `${fmt(profileData.posts_count)} posts`;

  renderProfileHeader();
  document.getElementById('profile-tabs').style.display = '';
  loadProfilePosts();
}

function renderProfileHeader() {
  const isMe = profileData.id === me.id;
  document.getElementById('profile-header').innerHTML = `
    <div class="profile-cover">
      ${profileData.cover_url
        ? `<img src="${escapeHtml(profileData.cover_url)}" alt="cover"/>`
        : ''}
      <div class="cover-overlay"></div>
    </div>
    <div class="profile-info-area">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar-ring">
          ${profileData.avatar_url
            ? `<img src="${escapeHtml(profileData.avatar_url)}"
                    alt="${escapeHtml(profileData.display_name)}"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
               <div class="avatar-fallback" style="display:none">${initials(profileData.display_name)}</div>`
            : `<div class="avatar-fallback">${initials(profileData.display_name)}</div>`}
        </div>
        ${isMe
          ? `<button class="btn-edit-profile" onclick="openEditModal()">Edit Profile</button>`
          : `<button class="btn-follow-profile ${profileData.is_following ? 'following' : ''}"
                    id="follow-profile-btn" onclick="toggleFollowProfile()">
               ${profileData.is_following ? 'Following' : 'Follow'}
             </button>`}
      </div>
      <div class="profile-display-name">
        ${escapeHtml(profileData.display_name)}
        ${profileData.is_verified
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--pulse)">
               <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
             </svg>`
          : ''}
      </div>
      <div class="profile-handle">@${profileData.username}</div>
      ${profileData.bio
        ? `<p class="profile-bio">${escapeHtml(profileData.bio)}</p>`
        : ''}
      <div class="profile-meta">
        ${profileData.location
          ? `<div class="profile-meta-item">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round">
                 <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                 <circle cx="12" cy="10" r="3"/>
               </svg>
               ${escapeHtml(profileData.location)}
             </div>`
          : ''}
        ${profileData.website
          ? `<div class="profile-meta-item">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round">
                 <circle cx="12" cy="12" r="10"/>
                 <line x1="2" y1="12" x2="22" y2="12"/>
                 <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"/>
               </svg>
               <a href="${escapeHtml(profileData.website)}" target="_blank" rel="noopener">
                 ${profileData.website.replace(/^https?:\/\//, '')}
               </a>
             </div>`
          : ''}
        <div class="profile-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Joined ${new Date(profileData.created_at).toLocaleDateString('en-US',
            { month: 'long', year: 'numeric' })}
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat"
             onclick="switchProfileTab('following', document.querySelectorAll('.profile-tab')[2])">
          <strong>${fmt(profileData.following_count)}</strong> Following
        </div>
        <div class="profile-stat"
             onclick="switchProfileTab('followers', document.querySelectorAll('.profile-tab')[1])">
          <strong>${fmt(profileData.followers_count)}</strong> Followers
        </div>
      </div>
    </div>`;
}

async function toggleFollowProfile() {
  const res = await API.post(`/users/${username}/follow`);
  if (!res || !res.ok) return;
  profileData.is_following = res.data.following;
  profileData.followers_count += res.data.following ? 1 : -1;
  const btn = document.getElementById('follow-profile-btn');
  if (btn) {
    btn.textContent = res.data.following ? 'Following' : 'Follow';
    btn.classList.toggle('following', res.data.following);
  }
  showToast(res.data.following ? `Following @${username}!` : `Unfollowed @${username}.`);
}

function switchProfileTab(tab, btn) {
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'posts')          loadProfilePosts();
  else if (tab === 'followers') loadFollowers();
  else                          loadFollowing();
}

async function loadProfilePosts() {
  const c = document.getElementById('profile-content');
  c.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  const res = await API.get(`/users/${username}/posts`);
  if (!res || !res.ok || !res.data || res.data.length === 0) {
    c.innerHTML = `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
           stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <p>No pulses yet</p>
    </div>`;
    return;
  }
  c.innerHTML = res.data.map(p => renderPost(p, me.id)).join('');
}

async function loadFollowers() {
  const c = document.getElementById('profile-content');
  c.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  const res = await API.get(`/users/${username}/followers`);
  if (!res || !res.ok) return;
  renderUserList(res.data, c, 'No followers yet.');
}

async function loadFollowing() {
  const c = document.getElementById('profile-content');
  c.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  const res = await API.get(`/users/${username}/following`);
  if (!res || !res.ok) return;
  renderUserList(res.data, c, 'Not following anyone yet.');
}

function renderUserList(users, c, emptyMsg) {
  if (!users || users.length === 0) {
    c.innerHTML = `<div class="empty-state"><p>${emptyMsg}</p></div>`;
    return;
  }
  c.innerHTML = users.map(u => `
    <div class="user-list-item">
      <a href="profile.html?u=${u.username}">${avatarHtml(u, 44)}</a>
      <div style="flex:1;min-width:0">
        <a href="profile.html?u=${u.username}"
           style="font-weight:700;display:flex;align-items:center;gap:5px">
          ${escapeHtml(u.display_name)}
        </a>
        <div style="font-size:13px;color:var(--text-muted)">@${u.username}</div>
        ${u.bio
          ? `<p style="font-size:13px;color:var(--text-muted);margin-top:3px">
               ${escapeHtml(u.bio)}
             </p>`
          : ''}
      </div>
      ${u.id !== me.id
        ? `<button class="btn-follow" onclick="quickFollow('${u.username}', this)">Follow</button>`
        : ''}
    </div>`).join('');
}

// FIX 2: Renamed to openEditModal() and closeEditModal() to match HTML onclick calls
// FIX 3: Fixed all input IDs to match profile.html (edit-display-name, edit-bio, etc.)
function openEditModal() {
  document.getElementById('edit-display-name').value = profileData.display_name || '';
  document.getElementById('edit-bio').value           = profileData.bio          || '';
  document.getElementById('edit-location').value      = profileData.location     || '';
  document.getElementById('edit-website').value       = profileData.website      || '';
  document.getElementById('edit-avatar').value        = profileData.avatar_url   || '';
  document.getElementById('edit-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function saveProfile() {
  const body = {
    display_name: document.getElementById('edit-display-name').value.trim(),
    bio:          document.getElementById('edit-bio').value.trim(),
    location:     document.getElementById('edit-location').value.trim(),
    website:      document.getElementById('edit-website').value.trim(),
    avatar_url:   document.getElementById('edit-avatar').value.trim(),
  };
  const res = await API.put('/users/profile/edit', body);
  if (!res || !res.ok) {
    showToast((res && res.data && res.data.error) || 'Save failed.', 'error');
    return;
  }
  localStorage.setItem('pulse_user', JSON.stringify({ ...me, ...res.data.user }));
  profileData = { ...profileData, ...res.data.user };
  closeEditModal();
  renderProfileHeader();
  showToast('Profile updated! ✨');
}

// Helpers
function fmt(n) {
  if (n == null) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

init();