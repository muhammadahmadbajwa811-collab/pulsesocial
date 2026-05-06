// server.js — Pulse Social API  (Node.js + MySQL + File Uploads)
// Start: npm run dev

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 5000;

// Create uploads folder automatically if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files at /uploads/filename.jpg etc.
app.use('/uploads', express.static(uploadsDir));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Pulse API is running 🌊', database: 'MySQL' });
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` }));
app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  🌊 Pulse Social — Node.js + MySQL');
  console.log(`  🚀 API running at  : http://localhost:${PORT}`);
  console.log(`  📁 Uploads served  : http://localhost:${PORT}/uploads/`);
  console.log(`  🏥 Health check    : http://localhost:${PORT}/api/health`);
  console.log('');
});