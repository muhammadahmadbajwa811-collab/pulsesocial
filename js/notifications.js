// js/notifications.js — Notifications page (FIXED)
requireLogin();
const me = getMe();

buildSidebar('notifications');

// Set profile nav link
const navProfile = document.getElementById('nav-profile');
if (navProfile) navProfile.href = `profile.html?u=${me.username}`;

// ── Load notifications ─────────────────────────────────────────
async function loadNotifications() {
  const el = document.getElementById('notif-list');
  if (!el) return;

  el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  // FIX 4: Use API.get() not ApiGet() — matches your api.js exports
  const res = await API.get('/notifications');

  if (!res || !res.ok) {
    el.innerHTML = `
      <div class="empty-state">
        <p>❌ Could not load notifications.<br>Is the server running?</p>
      </div>`;
    return;
  }

  const notifs = res.data;

  // FIX 5: Backend route is PUT /read-all, not /read — use correct path
  API.put('/notifications/read-all').catch(() => {});

  // Show/hide mark-all-read buttons
  const mobBtn  = document.getElementById('mob-mark-read');
  const deskBtn = document.getElementById('desk-mark-read');
  if (notifs.length > 0) {
    if (mobBtn)  mobBtn.style.display  = '';
    if (deskBtn) deskBtn.style.display = '';
  }

  if (notifs.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:12px">🔔</div>
        <p>No notifications yet.<br>Start posting and following people!</p>
      </div>`;
    return;
  }

  el.innerHTML = notifs.map(n => {
    const iconClass = n.type === 'like' ? 'like' : n.type === 'follow' ? 'follow' : 'comment';
    const iconEmoji = n.type === 'like' ? '❤️'  : n.type === 'follow' ? '👤'     : '💬';

    const text = n.type === 'like'
      ? `<strong>${escapeHtml(n.actor_name)}</strong> liked your pulse`
      : n.type === 'follow'
      ? `<strong>${escapeHtml(n.actor_name)}</strong> started following you`
      : `<strong>${escapeHtml(n.actor_name)}</strong> commented on your pulse`;

    const link = n.post_id
      ? `post.html?id=${n.post_id}`
      : `profile.html?u=${n.actor_username}`;

    const avatarSrc = n.actor_avatar
      || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_username}`;

    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}"
           onclick="location.href='${link}'" style="cursor:pointer">
        <img style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0"
             src="${avatarSrc}"
             onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_username}'"
             alt="${escapeHtml(n.actor_name)}" />
        <div class="notif-body">
          <div class="notif-icon ${iconClass}">${iconEmoji}</div>
          <div class="notif-text">${text}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
        ${!n.is_read ? '<div class="notif-dot"></div>' : ''}
      </div>`;
  }).join('');
}

// ── Mark all read ──────────────────────────────────────────────
async function markAllRead() {
  // FIX 5: Correct route name
  const res = await API.put('/notifications/read-all');
  if (!res || !res.ok) return;
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  document.querySelectorAll('.notif-dot').forEach(el => el.remove());
  showToast('All notifications marked as read ✅');

  const mobBtn  = document.getElementById('mob-mark-read');
  const deskBtn = document.getElementById('desk-mark-read');
  if (mobBtn)  mobBtn.style.display  = 'none';
  if (deskBtn) deskBtn.style.display = 'none';
}

// Helper
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

loadNotifications();