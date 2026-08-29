// routes/auth.js  —  Register, Login, Get current user
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const JWT_SECRET  = process.env.JWT_SECRET || 'pulse_secret';
const JWT_EXPIRES = '7d';

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password, display_name } = req.body;

  if (!username || !email || !password || !display_name)
    return res.status(400).json({ error: 'All fields are required.' });
  if (username.length < 3 || username.length > 20)
    return res.status(400).json({ error: 'Username must be 3–20 characters.' });
  if (!/^[a-z0-9_]+$/i.test(username))
    return res.status(400).json({ error: 'Username: letters, numbers, underscores only.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    // Check uniqueness
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username.toLowerCase(), email.toLowerCase()]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Username or email already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)',
      [username.toLowerCase(), email.toLowerCase(), hashed, display_name]
    );

    const userId = result.insertId;
    const token  = jwt.sign({ id: userId, username: username.toLowerCase() }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const [rows] = await db.execute(
      'SELECT id, username, display_name, bio, avatar_url, is_verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({ message: 'Account created!', token, user: rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ error: 'Please provide username/email and password.' });

  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier.toLowerCase(), identifier.toLowerCase()]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const { password: _, ...safeUser } = user;
    res.json({ message: 'Welcome back!', token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, username, email, display_name, bio, avatar_url, cover_url,
              website, location, is_verified, created_at
       FROM users WHERE id = ?`, [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const [followers] = await db.execute(
      'SELECT COUNT(*) AS count FROM follows WHERE following_id = ?', [req.user.id]
    );
    const [following] = await db.execute(
      'SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?', [req.user.id]
    );

    res.json({
      ...rows[0],
      followers_count: followers[0].count,
      following_count: following[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;