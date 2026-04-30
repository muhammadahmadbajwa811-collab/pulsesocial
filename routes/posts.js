// routes/posts.js  —  Feed, create, like, comment, delete
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const fmt = p => ({ ...p, user_liked: !!p.user_liked });

// ── GET /api/posts/feed ───────────────────────────────────────
router.get('/feed', requireAuth, async (req, res) => {
  const page   = parseInt(req.query.page) || 1;
  const limit  = 20;
  const offset = (page - 1) * limit;
  try {
    const [posts] = await db.execute(
      `SELECT p.*,
              u.username, u.display_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)                AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id)                AS comments_count,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) AS user_liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
          OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, req.user.id, req.user.id, limit, offset]
    );
    res.json(posts.map(fmt));
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /api/posts/explore ────────────────────────────────────
router.get('/explore', optionalAuth, async (req, res) => {
  const page   = parseInt(req.query.page) || 1;
  const limit  = 20;
  const offset = (page - 1) * limit;
  const meId   = req.user ? req.user.id : 0;
  try {
    const [posts] = await db.execute(
      `SELECT p.*,
              u.username, u.display_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)                AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id)                AS comments_count,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) AS user_liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY (likes_count + comments_count) DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [meId, limit, offset]
    );
    res.json(posts.map(fmt));
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── POST /api/posts ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { content, image_url } = req.body;
  if (!content || content.trim().length === 0)
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  if (content.length > 500)
    return res.status(400).json({ error: 'Post cannot exceed 500 characters.' });

  try {
    const [result] = await db.execute(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [req.user.id, content.trim(), image_url || '']
    );
    const [rows] = await db.execute(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified,
              0 AS likes_count, 0 AS comments_count, 0 AS user_liked
       FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [result.insertId]
    );
    res.status(201).json(fmt(rows[0]));
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /api/posts/:id ────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  const meId = req.user ? req.user.id : 0;
  try {
    const [rows] = await db.execute(
      `SELECT p.*,
              u.username, u.display_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)                AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id)                AS comments_count,
              (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) AS user_liked
       FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [meId, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found.' });

    const [comments] = await db.execute(
      `SELECT c.*, u.username, u.display_name, u.avatar_url, u.is_verified
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? AND c.parent_id IS NULL
       ORDER BY c.created_at ASC`,
      [rows[0].id]
    );
    res.json({ post: fmt(rows[0]), comments });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── DELETE /api/posts/:id ─────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found.' });
    if (rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'You can only delete your own posts.' });

    await db.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── POST /api/posts/:id/like  (toggle) ───────────────────────
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const [postRows] = await db.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (postRows.length === 0) return res.status(404).json({ error: 'Post not found.' });
    const post = postRows[0];

    const [existing] = await db.execute(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
      [req.user.id, post.id]
    );

    if (existing.length > 0) {
      await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, post.id]);
    } else {
      await db.execute('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, post.id]);
      if (post.user_id !== req.user.id) {
        await db.execute(
          `INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, 'like', ?)`,
          [post.user_id, req.user.id, post.id]
        );
      }
    }

    const [[{ count }]] = await db.execute(
      'SELECT COUNT(*) AS count FROM likes WHERE post_id = ?', [post.id]
    );
    res.json({ liked: existing.length === 0, likes_count: count });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── POST /api/posts/:id/comments ─────────────────────────────
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { content, parent_id } = req.body;
  if (!content || content.trim().length === 0)
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  if (content.length > 300)
    return res.status(400).json({ error: 'Comment cannot exceed 300 characters.' });

  try {
    const [postRows] = await db.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (postRows.length === 0) return res.status(404).json({ error: 'Post not found.' });
    const post = postRows[0];

    const [result] = await db.execute(
      'INSERT INTO comments (user_id, post_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [req.user.id, post.id, parent_id || null, content.trim()]
    );

    if (post.user_id !== req.user.id) {
      await db.execute(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, 'comment', ?, ?)`,
        [post.user_id, req.user.id, post.id, result.insertId]
      );
    }

    const [rows] = await db.execute(
      `SELECT c.*, u.username, u.display_name, u.avatar_url, u.is_verified
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;