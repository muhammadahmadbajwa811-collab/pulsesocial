# 🌊 Pulse Social — Full-Stack Social Media Platform

> A feature-complete social media web application built with **Node.js**, **Express**, **MySQL**, and vanilla **HTML/CSS/JS**. Pulse supports real-time-style feeds, image & video post uploads, a follow graph, threaded comments, likes, and an in-app notification system — all wrapped in a polished, responsive UI.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

## ✨ Features

### 👤 Auth & Identity
- Register with username, email, and password — uniqueness enforced at the DB level
- Login with **username or email** (flexible credential field)
- JWT authentication with 7-day expiry; `requireAuth` and `optionalAuth` middleware for protected vs. public routes
- Passwords hashed with bcrypt (10 rounds)
- Profile editing: display name, bio, website, location, avatar & cover photo (Multer file upload, 10 MB limit per image)
- Verified badge support (`is_verified` flag) seeded on demo accounts

### 📰 Feed & Posts
- **Home feed** — shows your own posts plus everyone you follow, newest first, paginated (20/page)
- **Explore feed** — globally trending posts ranked by `likes + comments` score, visible to guests too
- Create posts with optional **image or video** (JPG, PNG, GIF, WEBP, MP4, WEBM, MOV — up to 50 MB)
- 500-character post limit with a live character counter and colour-coded warning states
- Delete your own posts; ownership enforced server-side
- Post detail page with full comment thread

### ❤️ Likes & Comments
- Toggle like on any post — auto-generates a notification for the author
- Threaded comments (supports `parent_id` for nested replies)
- Comment character limit of 300
- Like and comment counts returned with every post query (no N+1: all done in subqueries)

### 🤝 Follow System
- Follow / unfollow toggle on any user profile
- Self-follow prevention enforced on the server
- Live follower count returned on every toggle
- "Who to follow" suggestions — users you're not yet following, ordered by follower count

### 🔔 Notifications
- In-app notifications for: **likes**, **comments**, and **new followers**
- Unread count endpoint for badge display
- Mark individual notification or all notifications as read
- Last 50 notifications returned per user

### 🔍 Explore & Search
- Full-text user search by `username` or `display_name`
- Explore page publicly accessible — great for discovery without an account

### 🎨 Frontend
- 6 pages: Sign In/Register, Feed, Explore, Profile, Post Detail, Notifications
- Google Fonts: **Syne** (headings) + **DM Sans** (body)
- Animated blob background on auth pages
- Avatar fallback with initials when no image is set
- Smart number formatting (1K, 1M) and relative timestamps (`2m`, `5h`, `3d`)
- Toast notification system built from scratch (no libraries)
- Mobile-responsive with `max-scale=1.0` viewport locking

---

## 🏗️ Project Structure

```
pulse-social/
├── backend/
│   ├── config/
│   │   ├── db.js              # MySQL2 promise pool (connectionLimit: 10)
│   │   └── initDB.js          # DB seeder — 6 demo users, 22 posts, likes & comments
│   ├── middleware/
│   │   └── auth.js            # requireAuth + optionalAuth JWT guards
│   ├── routes/
│   │   ├── auth.js            # Register / Login / Me
│   │   ├── users.js           # Profile, Follow toggle, Search, Suggestions, Avatar upload
│   │   ├── posts.js           # Feed, Explore, Create (with media), Like, Comment, Delete
│   │   └── notifications.js   # List, unread count, mark-read
│   ├── uploads/               # Multer destination (auto-created on startup)
│   ├── .env                   # Environment variables (not committed)
│   ├── package.json
│   └── server.js              # Express entry point, static /uploads serve
│
└── frontend/
    ├── css/
    │   ├── auth.css           # Auth pages (sign in, register)
    │   └── app.css            # Main app styles
    ├── js/
    │   ├── api.js             # Shared fetch wrapper, auth helpers, UI utilities
    │   ├── auth.js            # Login & register logic
    │   ├── feed.js            # Home feed + compose with media upload
    │   ├── explore.js         # Trending posts grid
    │   ├── profile.js         # Profile view + edit modal
    │   ├── post.js            # Post detail + comments
    │   └── notifications.js   # Notification list + mark-read
    ├── pages/
    │   ├── feed.html
    │   ├── explore.html
    │   ├── profile.html
    │   ├── post.html
    │   └── notifications.html
    └── index.html             # Login / Register landing
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MySQL](https://dev.mysql.com/downloads/) 8.0+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/muhammadahmadbajwa811-collab/pulsesocial.git
cd pulsesocial
```

### 2. Create the database

```sql
CREATE DATABASE pulse_social;
```

Then create the tables (run the schema below in MySQL Workbench or the CLI):

<details>
<summary>Click to expand schema</summary>

```sql
USE pulse_social;

CREATE TABLE users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(30)  NOT NULL UNIQUE,
  email        VARCHAR(150) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  bio          TEXT,
  avatar_url   VARCHAR(500) DEFAULT '',
  cover_url    VARCHAR(500) DEFAULT '',
  website      VARCHAR(200) DEFAULT '',
  location     VARCHAR(100) DEFAULT '',
  is_verified  TINYINT(1)   DEFAULT 0,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT  NOT NULL,
  content    TEXT,
  media_url  VARCHAR(500) DEFAULT '',
  media_type VARCHAR(20)  DEFAULT '',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE follows (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  follower_id  INT NOT NULL,
  following_id INT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id),
  FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE likes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  post_id    INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT  NOT NULL,
  post_id    INT  NOT NULL,
  parent_id  INT  DEFAULT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT         NOT NULL,
  actor_id   INT         NOT NULL,
  type       ENUM('like','comment','follow') NOT NULL,
  post_id    INT         DEFAULT NULL,
  comment_id INT         DEFAULT NULL,
  is_read    TINYINT(1)  DEFAULT 0,
  created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id)  REFERENCES posts(id) ON DELETE CASCADE
);
```

</details>

### 3. Configure environment variables

```bash
cd backend
cp .env.example .env   # or create .env manually
```

Populate `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pulse_social
JWT_SECRET=a_long_random_secret_string
PORT=5000
BASE_URL=http://localhost:5000
```

### 4. Install & start the backend

```bash
cd backend
npm install
npm run db:init   # seeds 6 demo users, 22 posts, follows, likes, and comments
npm run dev       # development with nodemon
# or
npm start         # production
```

API live at `http://localhost:5000` · Uploads served at `http://localhost:5000/uploads/`

### 5. Open the frontend

Open `frontend/index.html` via **VS Code Live Server** (port 5500) or any local HTTP server.

> The frontend `API_BASE` in `js/api.js` points to `http://localhost:5000/api` by default.

### 6. Demo accounts

All demo accounts use the password `password123`.

| Username | Email |
|---|---|
| `pulse_admin` | admin@pulse.social |
| `alex_wave` | alex@pulse.social |
| `sarah_codes` | sarah@pulse.social |
| `marcus_j` | marcus@pulse.social |
| `zara_creates` | zara@pulse.social |
| `dev_omar` | omar@pulse.social |

---

## 🔌 API Reference

Base URL: `http://localhost:5000/api`

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Create account — returns JWT |
| `POST` | `/auth/login` | ❌ | Login with username or email — returns JWT |
| `GET` | `/auth/me` | ✅ | Current user with follower/following/post counts |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users/me` | ✅ | Own profile with stats |
| `PUT` | `/users/me/profile` | ✅ | Update profile (multipart — supports `avatar` + `cover` files) |
| `GET` | `/users/suggestions` | ✅ | "Who to follow" — up to 5 users not yet followed |
| `GET` | `/users/search?q=` | ✅ | Search users by username or display name |
| `GET` | `/users/:username` | ✅ | Public profile + `is_following` flag |
| `GET` | `/users/:username/posts` | ✅ | All posts by a user |
| `POST` | `/users/:username/follow` | ✅ | Toggle follow / unfollow |

### Posts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/posts/feed?page=` | ✅ | Home feed (own + following), 20/page |
| `GET` | `/posts/explore?page=` | 〰️ Optional | Trending posts ranked by engagement |
| `POST` | `/posts` | ✅ | Create post (`multipart/form-data` — `content` + optional `media` file) |
| `GET` | `/posts/:id` | 〰️ Optional | Single post + comment thread |
| `DELETE` | `/posts/:id` | ✅ | Delete own post |
| `POST` | `/posts/:id/like` | ✅ | Toggle like |
| `POST` | `/posts/:id/comments` | ✅ | Add comment (supports `parent_id` for replies) |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notifications` | ✅ | Last 50 notifications |
| `GET` | `/notifications/unread-count` | ✅ | Badge count |
| `PUT` | `/notifications/mark-all-read` | ✅ | Bulk mark read |
| `PUT` | `/notifications/:id/read` | ✅ | Mark one as read |

**Auth header format:**
```
Authorization: Bearer <jwt_token>
```

---

## 🗄️ Database Schema Overview

```
users          → id, username, email, password, display_name, bio, avatar_url, cover_url,
                 website, location, is_verified, created_at
posts          → id, user_id, content, media_url, media_type, created_at
follows        → follower_id, following_id  [UNIQUE pair]
likes          → user_id, post_id           [UNIQUE pair]
comments       → id, user_id, post_id, parent_id (nullable), content, created_at
notifications  → id, user_id, actor_id, type (like|comment|follow), post_id, comment_id,
                 is_read, created_at
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18 |
| Framework | Express 4 |
| Database | MySQL 8 (mysql2/promise pool) |
| Auth | JSON Web Tokens (jsonwebtoken) |
| Password Hashing | bcryptjs |
| File Uploads | Multer (disk storage, 50 MB post media / 10 MB avatars) |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ES6+) |
| Fonts | Google Fonts — Syne + DM Sans |
| Dev Tools | nodemon, dotenv |

---

## 🔒 Security Notes

- Passwords never stored in plaintext — bcrypt with 10 rounds.
- JWT secrets loaded from environment variables and never hardcoded in production.
- Two auth middleware modes: `requireAuth` blocks unauthenticated requests; `optionalAuth` attaches the user when a token is present but allows guests through (used on Explore and post detail).
- All SQL queries use **parameterised statements** (`?` placeholders) — no string interpolation, no SQL injection surface.
- Follow toggle prevents self-following server-side.
- Post deletion verifies `user_id === req.user.id` before executing.
- Uploaded files are served as static assets under `/uploads/` — no executable paths.

---

## 👨‍💻 Author

**Muhammad Ahmad**  
CS Student @ UET Lahore  
[GitHub](https://github.com/muhammadahmadbajwa811-collab)

---

