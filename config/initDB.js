// config/initDB.js
// ─────────────────────────────────────────────────────────────
// Run this ONCE to:
//   1. Create the MySQL database (pulse_social)
//   2. Create all 6 tables
//   3. Insert demo users, posts, likes, comments, follows
//
// Command: node config/initDB.js
// ─────────────────────────────────────────────────────────────

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDB() {
  console.log('');
  console.log('🌊 Pulse Social — MySQL Database Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ── Step 1: Connect WITHOUT specifying a database yet ──────
  // We do this so we can CREATE the database if it doesn't exist
  let connection;
  try {
    connection = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      timezone: '+00:00',
      multipleStatements: true,  // allows running multiple SQL at once
    });
    console.log('✅ Connected to MySQL server');
  } catch (err) {
    console.error('❌ Could not connect to MySQL!');
    console.error('   Error:', err.message);
    console.error('');
    console.error('   Make sure:');
    console.error('   • MySQL is installed and running');
    console.error('   • DB_PASSWORD in .env matches your MySQL password');
    process.exit(1);
  }

  // ── Step 2: Create the database ──────────────────────────
  const DB_NAME = process.env.DB_NAME || 'pulse_social';
  console.log(`\n📦 Creating database: ${DB_NAME}`);

  await connection.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci`
  );
  await connection.execute(`USE \`${DB_NAME}\``);
  console.log(`✅ Database "${DB_NAME}" ready`);

  // ── Step 3: Create Tables ─────────────────────────────────
  console.log('\n📋 Creating tables...');

  // ── TABLE: users ──────────────────────────────────────────
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id           INT            NOT NULL AUTO_INCREMENT,
      username     VARCHAR(30)    NOT NULL,
      email        VARCHAR(100)   NOT NULL,
      password     VARCHAR(255)   NOT NULL,
      display_name VARCHAR(60)    NOT NULL,
      bio          TEXT,
      avatar_url   VARCHAR(500)   DEFAULT '',
      cover_url    VARCHAR(500)   DEFAULT '',
      website      VARCHAR(200)   DEFAULT '',
      location     VARCHAR(100)   DEFAULT '',
      is_verified  TINYINT(1)     DEFAULT 0,
      created_at   DATETIME       DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_username (username),
      UNIQUE KEY uq_email    (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('   ✅ users table');

  // ── TABLE: follows ─────────────────────────────────────────
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS follows (
      id           INT      NOT NULL AUTO_INCREMENT,
      follower_id  INT      NOT NULL,
      following_id INT      NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_follow (follower_id, following_id),
      FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ follows table');

  // ── TABLE: posts ───────────────────────────────────────────
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      id         INT          NOT NULL AUTO_INCREMENT,
      user_id    INT          NOT NULL,
      content    TEXT         NOT NULL,
      image_url  VARCHAR(500) DEFAULT '',
      created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id  (user_id),
      INDEX idx_created  (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('   ✅ posts table');

  // ── TABLE: likes ───────────────────────────────────────────
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id         INT      NOT NULL AUTO_INCREMENT,
      user_id    INT      NOT NULL,
      post_id    INT      NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_like (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ likes table');

  // ── TABLE: comments ────────────────────────────────────────
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id         INT      NOT NULL AUTO_INCREMENT,
      user_id    INT      NOT NULL,
      post_id    INT      NOT NULL,
      parent_id  INT      DEFAULT NULL,
      content    TEXT     NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
      INDEX idx_post_id (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('   ✅ comments table');

  // ── TABLE: notifications ───────────────────────────────────
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         INT         NOT NULL AUTO_INCREMENT,
      user_id    INT         NOT NULL,
      actor_id   INT         NOT NULL,
      type       VARCHAR(20) NOT NULL,
      post_id    INT         DEFAULT NULL,
      comment_id INT         DEFAULT NULL,
      is_read    TINYINT(1)  DEFAULT 0,
      created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (actor_id)   REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (post_id)    REFERENCES posts(id)    ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ notifications table');

  // ── Step 4: Seed Demo Data ─────────────────────────────────
  console.log('\n🌱 Seeding demo data...');

  const hash = bcrypt.hashSync('password123', 10);

  // Insert demo users (INSERT IGNORE = skip if already exists)
  const [users] = await connection.execute(`
    INSERT IGNORE INTO users
      (username, email, password, display_name, bio, is_verified)
    VALUES
      ('pulse_admin',  'admin@pulse.social',  ?, 'Pulse Official',   'Welcome to Pulse — the social network built different. 🌊', 1),
      ('alex_wave',    'alex@pulse.social',   ?, 'Alex Wave',        'Designer. Dreamer. Coffee addict ☕', 0),
      ('sarah_codes',  'sarah@pulse.social',  ?, 'Sarah Chen',       'Full-stack dev | Open source enthusiast 💻', 1),
      ('marcus_j',     'marcus@pulse.social', ?, 'Marcus Johnson',   'Photographer & visual storyteller 📷', 0)
  `, [hash, hash, hash, hash]);

  // Get the IDs of those users
  const [rows] = await connection.execute(
    `SELECT id, username FROM users WHERE username IN
     ('pulse_admin','alex_wave','sarah_codes','marcus_j')`
  );

  const uid = {}; // uid.alex_wave = 2, etc.
  rows.forEach(r => { uid[r.username] = r.id; });

  // Insert follows
  await connection.execute(`
    INSERT IGNORE INTO follows (follower_id, following_id) VALUES
      (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)
  `, [
    uid.alex_wave,   uid.pulse_admin,
    uid.sarah_codes, uid.pulse_admin,
    uid.marcus_j,    uid.pulse_admin,
    uid.alex_wave,   uid.sarah_codes,
    uid.sarah_codes, uid.alex_wave,
    uid.marcus_j,    uid.alex_wave,
  ]);
  console.log('   ✅ follows seeded');

  // Insert posts
  const [p1] = await connection.execute(
    `INSERT INTO posts (user_id, content) VALUES (?, ?)`,
    [uid.pulse_admin, "Welcome to Pulse 🌊 The social media platform that pulses with your energy. We built this for creators, thinkers, and dreamers. Let's build something amazing together. #WelcomeToPulse"]
  );
  const [p2] = await connection.execute(
    `INSERT INTO posts (user_id, content) VALUES (?, ?)`,
    [uid.alex_wave, "Just shipped a brand new design system from scratch. 72 components, 6 months of work, now open source. Link in bio! 🎨 #Design #OpenSource"]
  );
  const [p3] = await connection.execute(
    `INSERT INTO posts (user_id, content) VALUES (?, ?)`,
    [uid.sarah_codes, "Hot take: The best code is the code you delete. Simplicity is underrated in software engineering. Fight me 👊 #Programming #DevLife"]
  );
  const [p4] = await connection.execute(
    `INSERT INTO posts (user_id, content) VALUES (?, ?)`,
    [uid.marcus_j, "Golden hour hits different when you've been waiting all week for it 🌅 Shot this on my trusty analog camera. Film photography is not dead. #Photography"]
  );
  const [p5] = await connection.execute(
    `INSERT INTO posts (user_id, content) VALUES (?, ?)`,
    [uid.alex_wave, "Morning routine update: replaced doomscrolling with 20 mins of sketching. Week 3. Never going back. Your brain will thank you 🧠"]
  );
  const [p6] = await connection.execute(
    `INSERT INTO posts (user_id, content) VALUES (?, ?)`,
    [uid.sarah_codes, "PSA: Please write tests for your code. Future you will love present you for it. That's all. Carry on. 🧪 #Testing #WebDev"]
  );

  const postIds = [
    p1.insertId, p2.insertId, p3.insertId,
    p4.insertId, p5.insertId, p6.insertId
  ];
  console.log('   ✅ posts seeded');

  // Insert likes
  await connection.execute(`
    INSERT IGNORE INTO likes (user_id, post_id) VALUES
      (?,?),(?,?),(?,?),
      (?,?),(?,?),(?,?),
      (?,?),(?,?),(?,?),
      (?,?),(?,?),(?,?)
  `, [
    uid.alex_wave,   postIds[0], uid.sarah_codes, postIds[0], uid.marcus_j, postIds[0],
    uid.pulse_admin, postIds[1], uid.sarah_codes, postIds[1], uid.marcus_j, postIds[1],
    uid.pulse_admin, postIds[2], uid.alex_wave,   postIds[2], uid.marcus_j, postIds[2],
    uid.pulse_admin, postIds[3], uid.alex_wave,   postIds[3], uid.sarah_codes, postIds[3],
  ]);
  console.log('   ✅ likes seeded');

  // Insert comments
  await connection.execute(`
    INSERT INTO comments (user_id, post_id, content) VALUES
      (?, ?, 'So excited to be here! This platform feels fresh 🔥'),
      (?, ?, 'Built with passion, ships with love. Welcome everyone!'),
      (?, ?, 'Absolutely agree! Simplicity is the ultimate sophistication.'),
      (?, ?, 'Stunning shot Marcus! What film did you use?')
  `, [
    uid.alex_wave,   postIds[0],
    uid.sarah_codes, postIds[0],
    uid.pulse_admin, postIds[2],
    uid.alex_wave,   postIds[3],
  ]);
  console.log('   ✅ comments seeded');

  // ── Done! ──────────────────────────────────────────────────
  await connection.end();

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Database setup COMPLETE!');
  console.log('');
  console.log('🧑 Demo accounts (password for all: password123)');
  console.log('   username: alex_wave    email: alex@pulse.social');
  console.log('   username: sarah_codes  email: sarah@pulse.social');
  console.log('   username: marcus_j     email: marcus@pulse.social');
  console.log('');
  console.log('👉 Next step: npm run dev');
  console.log('');
}

// Run the function
initDB().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});