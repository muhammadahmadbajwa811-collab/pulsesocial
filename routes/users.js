// routes/users.js  —  Profiles, follow/unfollow, search
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// ── GET /api/users/search?q= ──────────────────────────────────
router.get('/search', optionalAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);
  try {
    const term = `%${q.trim()}%`;
    const [rows] = await db.execute(
      `SELECT id, username, display_name, bio, avatar_url, is_verified,
              (SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS followers_count
       FROM users
       WHERE username LIKE ? OR display_name LIKE ?
       LIMIT 10`,
      [term, term]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /api/users/suggestions ────────────────────────────────
router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, username, display_name, bio, avatar_url, is_verified
       FROM users
       WHERE id != ?
         AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY RAND()
       LIMIT 5`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /api/users/:username ──────────────────────────────────
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, username, display_name, bio, avatar_url, cover_url,
              website, location, is_verified, created_at
       FROM users WHERE username = ?`,
      [req.params.username.toLowerCase()]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = rows[0];
    const [[{ count: followers_count }]] = await db.execute(
      'SELECT COUNT(*) AS count FROM follows WHERE following_id = ?', [user.id]
    );
    const [[{ count: following_count }]] = await db.execute(
      'SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?', [user.id]
    );
    const [[{ count: posts_count }]] = await db.execute(
      'SELECT COUNT(*) AS count FROM posts WHERE user_id = ?', [user.id]
    );

    let is_following = false;
    if (req.user) {
      const [f] = await db.execute(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, user.id]
      );
      is_following = f.length > 0;
    }

    res.json({ ...user, followers_count, following_count, posts_count, is_following });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /api/users/:username/posts ────────────────────────────
router.get('/:username/posts', optionalAuth, async (req, res) => {
  try {
    const [owner] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [req.params.username.toLowerCase()]
    );
    if (owner.length === 0) return res.status(404).json({ error: 'User not found.' });

    const userId = owner[0].id;
    const meId   = req.user ? req.user.id : 0;
    const page   = parseInt(req.query.page) || 1;
    const limit  = 20;
    const offset = (page - 1) * limit;

    const [posts] = await db.execute(
      `SELECT p.*,
              u.username, u.display_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) AS user_liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [meId, userId, limit, offset]
    );

    res.json(posts.map(p => ({ ...p, user_liked: !!p.user_liked })));
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /api/users/:username/followers ────────────────────────
router.get('/:username/followers', async (req, res) => {
  try {
    const [owner] = await db.execute(
      'SELECT id FROM users WHERE username = ?', [req.params.username.toLowerCase()]
    );
    if (owner.length === 0) return res.status(404).json({ error: 'User not found.' });

    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_verified
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [owner[0].id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /api/users/:username/following ────────────────────────
router.get('/:username/following', async (req, res) => {
  try {
    const [owner] = await db.execute(
      'SELECT id FROM users WHERE username = ?', [req.params.username.toLowerCase()]
    );
    if (owner.length === 0) return res.status(404).json({ error: 'User not found.' });

    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_verified
       FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [owner[0].id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── POST /api/users/:username/follow  (toggle) ────────────────
router.post('/:username/follow', requireAuth, async (req, res) => {
  try {
    const [target] = await db.execute(
      'SELECT id FROM users WHERE username = ?', [req.params.username.toLowerCase()]
    );
    if (target.length === 0) return res.status(404).json({ error: 'User not found.' });
    if (target[0].id === req.user.id)
      return res.status(400).json({ error: 'You cannot follow yourself.' });

    const tId = target[0].id;
    const [existing] = await db.execute(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, tId]
    );

    if (existing.length > 0) {
      await db.execute(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, tId]
      );
      return res.json({ following: false, message: 'Unfollowed.' });
    } else {
      await db.execute(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [req.user.id, tId]
      );
      await db.execute(
        `INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, 'follow')`,
        [tId, req.user.id]
      );
      return res.json({ following: true, message: 'Followed!' });
    }
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── PUT /api/users/profile/edit ───────────────────────────────
router.put('/profile/edit', requireAuth, async (req, res) => {
  const { display_name, bio, website, location, avatar_url, cover_url } = req.body;
  try {
    await db.execute(
      `UPDATE users SET
         display_name = COALESCE(?, display_name),
         bio          = COALESCE(?, bio),
         website      = COALESCE(?, website),
         location     = COALESCE(?, location),
         avatar_url   = COALESCE(?, avatar_url),
         cover_url    = COALESCE(?, cover_url)
       WHERE id = ?`,
      [display_name, bio, website, location, avatar_url, cover_url, req.user.id]
    );
    const [rows] = await db.execute(
      `SELECT id, username, display_name, bio, avatar_url, cover_url,
              website, location, is_verified FROM users WHERE id = ?`,
      [req.user.id]
    );
    res.json({ message: 'Profile updated!', user: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;