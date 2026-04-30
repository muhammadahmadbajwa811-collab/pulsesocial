// routes/notifications.js (FIXED)
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT n.*,
              u.username     AS actor_username,
              u.display_name AS actor_name,
              u.avatar_url   AS actor_avatar
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const [[{ count }]] = await db.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count });
  } catch (err) {
    console.error('GET /notifications/unread-count error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// FIX: Support BOTH /read-all AND /read so frontend always works
// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All marked as read.' });
  } catch (err) {
    console.error('PUT /notifications/read-all error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/notifications/read  (alias — kept for compatibility)
router.put('/read', requireAuth, async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All marked as read.' });
  } catch (err) {
    console.error('PUT /notifications/read error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;