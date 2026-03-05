const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'comic.db'));

// 외래키 활성화
db.pragma('foreign_keys = ON');

// ── 테이블 생성 ───────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    nickname    TEXT    NOT NULL,
    phonenumber TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS comics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    authorId    INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL,
    thumbnail   TEXT    NOT NULL,
    createdAt   TEXT    NOT NULL,
    updatedAt   TEXT    NOT NULL,
    FOREIGN KEY (authorId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS percomics (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    comicId       INTEGER NOT NULL,
    title         TEXT    NOT NULL,
    episodeNumber INTEGER NOT NULL,
    thumbnail     TEXT    NOT NULL,
    createdAt     TEXT    NOT NULL,
    FOREIGN KEY (comicId) REFERENCES comics(id)
  );

  CREATE TABLE IF NOT EXISTS percomic_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    percomicId INTEGER NOT NULL,
    url        TEXT    NOT NULL,
    image_order INTEGER NOT NULL,
    FOREIGN KEY (percomicId) REFERENCES percomics(id)
  );
`);

module.exports = db;
