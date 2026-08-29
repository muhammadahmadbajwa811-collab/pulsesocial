// config/initDB.js
// ─────────────────────────────────────────────────────────────────────
// Run this ONCE to seed demo users and posts into the database.
// Tables must already exist (run schema.sql in MySQL Workbench first).
//
// Command:  node config/initDB.js
// ─────────────────────────────────────────────────────────────────────

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDB() {
  console.log('');
  console.log('  🌊 Pulse Social — Database Seeder');
  console.log('  ──────────────────────────────────');

  // ── Step 1: Connect to MySQL ────────────────────────────────
  // Using query() NOT execute() — avoids "prepared statement protocol" error
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'pulse_social',
      timezone: '+00:00',
    });
    console.log('  ✅ Connected to MySQL');
  } catch (err) {
    console.error('  ❌ MySQL connection FAILED:', err.message);
    console.error('');
    console.error('  Check:');
    console.error('  1. Is MySQL running?');
    console.error('  2. Is DB_PASSWORD correct in .env?');
    console.error('  3. Does the pulse_social database exist?');
    process.exit(1);
  }

  // ── Step 2: Check tables exist ──────────────────────────────
  // query() works for all SQL — no prepared statement issues
  const [tables] = await conn.query('SHOW TABLES');
  if (tables.length === 0) {
    console.error('  ❌ No tables found in pulse_social database!');
    console.error('  → Open MySQL Workbench and run schema.sql first.');
    await conn.end();
    process.exit(1);
  }
  console.log(`  ✅ Found ${tables.length} tables in database`);

  // ── Step 3: Check if demo users already exist ───────────────
  const [existingUsers] = await conn.query('SELECT COUNT(*) AS cnt FROM users');
  if (existingUsers[0].cnt > 0) {
    console.log(`  ℹ️  Database already has ${existingUsers[0].cnt} user(s). Skipping user seed.`);
    console.log('');
    console.log('  💡 To re-seed, run this in MySQL Workbench:');
    console.log('     DELETE FROM users;');
    console.log('     Then run this script again.');
    await conn.end();
    process.exit(0);
  }

  // ── Step 4: Hash the demo password ─────────────────────────
  console.log('  🔐 Hashing passwords...');
  const hash = await bcrypt.hash('password123', 10);

  // ── Step 5: Insert demo users ────────────────────────────────
  // Using query() with ?  placeholders — safe and works without prepared stmt issues
  await conn.query(
    `INSERT INTO users (username, email, password, display_name, bio, is_verified) VALUES
       (?, ?, ?, ?, ?, ?),
       (?, ?, ?, ?, ?, ?),
       (?, ?, ?, ?, ?, ?),
       (?, ?, ?, ?, ?, ?)`,
    [
      'pulse_admin', 'admin@pulse.social', hash, 'Pulse Official', 'Welcome to Pulse 🌊', 1,
      'alex_wave',   'alex@pulse.social',  hash, 'Alex Wave',      'Designer. Dreamer. Coffee addict ☕', 0,
      'sarah_codes', 'sarah@pulse.social', hash, 'Sarah Chen',     'Full-stack dev | Open source enthusiast 💻', 1,
      'marcus_j',    'marcus@pulse.social',hash, 'Marcus Johnson', 'Photographer & visual storyteller 📷', 0,
    ]
  );
  console.log('  ✅ Demo users created');

  // Get the user IDs we just inserted
  const [userRows] = await conn.query(
    `SELECT id, username FROM users WHERE username IN ('pulse_admin','alex_wave','sarah_codes','marcus_j')`
  );
  const uid = {};
  userRows.forEach(r => { uid[r.username] = r.id; });

  // ── Step 6: Insert follows ───────────────────────────────────
  await conn.query(
    `INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?,?),(?,?),(?,?),(?,?),(?,?),(?,?)`,
    [
      uid.alex_wave,   uid.pulse_admin,
      uid.sarah_codes, uid.pulse_admin,
      uid.marcus_j,    uid.pulse_admin,
      uid.alex_wave,   uid.sarah_codes,
      uid.sarah_codes, uid.alex_wave,
      uid.marcus_j,    uid.alex_wave,
    ]
  );
  console.log('  ✅ Follows seeded');

  // ── Step 7: Insert demo posts ────────────────────────────────
  const [p1] = await conn.query(`INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?,?,?,?)`,
    [uid.pulse_admin, "Welcome to Pulse 🌊 The social network built different. For creators, thinkers, and dreamers. #WelcomeToPulse", '', '']);
  const [p2] = await conn.query(`INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?,?,?,?)`,
    [uid.alex_wave, "Just shipped a brand new design system. 72 components, 6 months of work, now open source 🎨 #Design #OpenSource", '', '']);
  const [p3] = await conn.query(`INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?,?,?,?)`,
    [uid.sarah_codes, "Hot take: The best code is the code you delete. Simplicity is underrated. Fight me 👊 #Programming", '', '']);
  const [p4] = await conn.query(`INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?,?,?,?)`,
    [uid.marcus_j, "Golden hour hits different 🌅 Shot on my analog camera. Film photography is not dead. #Photography", '', '']);
  const [p5] = await conn.query(`INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?,?,?,?)`,
    [uid.alex_wave, "Morning update: replaced doomscrolling with 20 mins of sketching. Week 3. Never going back 🧠", '', '']);
  const [p6] = await conn.query(`INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?,?,?,?)`,
    [uid.sarah_codes, "PSA: Write tests for your code. Future you will thank present you 🧪 #Testing #WebDev", '', '']);

  console.log('  ✅ Posts seeded');

  const pids = [p1.insertId, p2.insertId, p3.insertId, p4.insertId, p5.insertId, p6.insertId];

  // ── Step 8: Insert likes ─────────────────────────────────────
  await conn.query(
    `INSERT IGNORE INTO likes (user_id, post_id) VALUES
       (?,?),(?,?),(?,?),
       (?,?),(?,?),(?,?),
       (?,?),(?,?),(?,?),
       (?,?),(?,?),(?,?)`,
    [
      uid.alex_wave, pids[0], uid.sarah_codes, pids[0], uid.marcus_j, pids[0],
      uid.pulse_admin, pids[1], uid.sarah_codes, pids[1], uid.marcus_j, pids[1],
      uid.pulse_admin, pids[2], uid.alex_wave, pids[2], uid.marcus_j, pids[2],
      uid.pulse_admin, pids[3], uid.alex_wave, pids[3], uid.sarah_codes, pids[3],
    ]
  );
  console.log('  ✅ Likes seeded');

  // ── Step 9: Insert comments ──────────────────────────────────
  await conn.query(
    `INSERT INTO comments (user_id, post_id, content) VALUES (?,?,?),(?,?,?),(?,?,?),(?,?,?)`,
    [
      uid.alex_wave,   pids[0], 'So excited to be here! This feels fresh 🔥',
      uid.sarah_codes, pids[0], 'Built with passion. Welcome everyone!',
      uid.pulse_admin, pids[2], 'Absolutely agree! Simplicity is the ultimate sophistication.',
      uid.alex_wave,   pids[3], 'Stunning! What film did you use?',
    ]
  );
  console.log('  ✅ Comments seeded');

  // ── Done ──────────────────────────────────────────────────────
  await conn.end();

  console.log('');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎉 Database seeding COMPLETE!');
  console.log('');
  console.log('  🧑 Demo accounts (password: password123)');
  console.log('     alex_wave    / alex@pulse.social');
  console.log('     sarah_codes  / sarah@pulse.social');
  console.log('     marcus_j     / marcus@pulse.social');
  console.log('     pulse_admin  / admin@pulse.social');
  console.log('');
  console.log('  👉 Now run:  npm run dev');
  console.log('');
}

initDB().catch(err => {
  console.error('  ❌ Unexpected error:', err.message);
  process.exit(1);
});