// middleware/auth.js
// Checks if the user is logged in by verifying their JWT token.
// Every protected route uses this.

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pulse_secret';

// requireAuth — blocks the request if not logged in
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

// optionalAuth — attaches user if token exists, but doesn't block if missing
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };