// frontend/js/post.js — Powers post.html

if (!requireLogin()) throw new Error('Not logged in');

const currentUser = getCurrentUser();
const params      = new URLSearchParams(window.location.search);
const postId      = params.get('id');

populateSidebarUser();
loadNotifCount();

const navProfile = document.getElementById('nav-profile');
if (navProfile) navProfile.href = `profile.html?u=${currentUser.username}`;
const mobProfile = document.getElementById('mob-profile-btn');
if (mobProfile) mobProfile.onclick = () => { location.href = `profile.html?u=${currentUser.username}`; };

// Set reply avatar
const replyAvatar = document.getElementById('reply-avatar');
replyAvatar.src = avatarSrc(currentUser);
replyAvatar.onerror = () => { replyAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`; };

if (!postId) {
  document.getElementById('post-container').innerHTML =
    '<div class="empty-state"><div class="emoji">❌</div><p>No post ID found.</p></div>';
} else {
  loadPost();
}

async function loadPost() {
  try {
    const data = await ApiGet(`/posts/${postId}`);
    renderPostDetail(data);
    document.getElementById('reply-box').style.display = 'block';
  } catch (err) {
    document.getElementById('post-container').innerHTML =
      `<div class="empty-state"><div class="emoji">❌</div><p>${err.message}</p></div>`;
  }
}

function renderPostDetail(data) {
  const liked   = data.liked_by_me === 1 || data.liked_by_me === true;
  const isOwner = data.user_id === currentUser.id;
  const avSrc   = data.avatar && data.avatar.trim()
    ? data.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`;

  let html = `
    <div class="post-card" style="border-bottom:2px solid var(--border)" data-post-id="${data.id}">
      <div class="post-header">
        <img src="${avSrc}" onclick="goProfile('${data.username}')"
             onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}'" />
        <div class="post-meta">
          <span class="name" onclick="goProfile('${data.username}')">${data.display_name}</span>
          <span class="username">@${data.username} · ${timeAgo(data.created_at)}</span>
        </div>
        ${isOwner ? `<button class="post-delete" onclick="deletePostAndRedirect(${data.id})">🗑</button>` : ''}
      </div>
      <p class="post-content" style="font-size:1.05rem">${escapeHtml(data.content)}</p>
      ${data.image_url ? `<img class="post-image" src="${data.image_url}" />` : ''}
      <div class="post-actions">
        <button class="action-btn ${liked ? 'liked' : ''}" onclick="toggleLike(${data.id}, this)">
          <span class="icon heart">${liked ? '❤️' : '🤍'}</span>
          <span class="like-count">${data.likes_count || 0}</span>
        </button>
        <button class="action-btn">
          <span class="icon">💬</span>
          <span id="comment-count">${data.comments ? data.comments.length : 0}</span>
        </button>
      </div>
    </div>
    <div id="comments-section">`;

  if (!data.comments || data.comments.length === 0) {
    html += `<div class="empty-state" style="padding:40px 20px"><div class="emoji">💬</div><p>No replies yet. Be the first!</p></div>`;
  } else {
    data.comments.forEach(c => {
      const cav = c.avatar && c.avatar.trim()
        ? c.avatar
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`;
      html += `
        <div class="comment">
          <img src="${cav}" onclick="goProfile('${c.username}')"
               onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}'" />
          <div class="comment-body">
            <div class="comment-meta">
              <span class="name" onclick="goProfile('${c.username}')" style="cursor:pointer">${c.display_name}</span>
              <span class="time">${timeAgo(c.created_at)}</span>
            </div>
            <p class="comment-text">${escapeHtml(c.content)}</p>
          </div>
        </div>`;
    });
  }

  html += `</div>`;
  document.getElementById('post-container').innerHTML = html;
}

// ── Reply ──────────────────────────────────────────
document.getElementById('reply-btn').addEventListener('click', async () => {
  const text = document.getElementById('reply-text').value.trim();
  if (!text) return;

  const btn = document.getElementById('reply-btn');
  btn.disabled = true; btn.textContent = 'Posting...';

  try {
    const comment = await ApiPost(`/posts/${postId}/comments`, { content: text });
    document.getElementById('reply-text').value = '';
    document.getElementById('reply-text').style.height = 'auto';

    // Add comment to UI
    const section = document.getElementById('comments-section');
    const empty   = section.querySelector('.empty-state');
    if (empty) empty.remove();

    const cav = avatarSrc(currentUser);
    section.insertAdjacentHTML('beforeend', `
      <div class="comment">
        <img src="${cav}" onclick="goProfile('${currentUser.username}')" />
        <div class="comment-body">
          <div class="comment-meta">
            <span class="name" onclick="goProfile('${currentUser.username}')" style="cursor:pointer">${currentUser.display_name}</span>
            <span class="time">just now</span>
          </div>
          <p class="comment-text">${escapeHtml(comment.content)}</p>
        </div>
      </div>`);

    // Update comment count
    const cc = document.getElementById('comment-count');
    if (cc) cc.textContent = parseInt(cc.textContent) + 1;

    showToast('Reply posted! 💬', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }

  btn.disabled = false; btn.textContent = 'Reply';
});

// Enter key to submit (Shift+Enter for new line)
document.getElementById('reply-text').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('reply-btn').click();
  }
});

async function deletePostAndRedirect(id) {
  if (!confirm('Delete this post?')) return;
  try {
    await ApiDelete(`/posts/${id}`);
    showToast('Post deleted', 'success');
    setTimeout(() => { window.location.href = 'feed.html'; }, 800);
  } catch (err) {
    showToast(err.message, 'error');
  }
}