const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || 'C:/uploads';

// 파일 시스템에 사용할 수 없는 문자 치환
function sanitizeName(str) {
  return str.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, 100);
}

// 파일을 지정 경로에 저장하고 DB용 상대 경로 반환
function saveFile(buffer, mimetype, ...pathSegments) {
  const dir = path.join(UPLOAD_ROOT, ...pathSegments.slice(0, -1));
  fs.mkdirSync(dir, { recursive: true });
  const ext = mimetype.split('/')[1]?.split('+')[0] || 'jpg';
  const filename = `${pathSegments[pathSegments.length - 1]}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return [...pathSegments.slice(0, -1), filename].join('/');
}

// GET /api/comics
router.get('/', (req, res) => {
  const comics = db.prepare('SELECT * FROM comics ORDER BY createdAt DESC').all();
  res.json(comics);
});

// GET /api/comics/:id
router.get('/:id', (req, res) => {
  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.id);
  if (!comic) return res.status(404).json({ message: '만화를 찾을 수 없습니다.' });
  res.json(comic);
});

// POST /api/comics
router.post('/', requireAuth, upload.single('thumbnail'), (req, res) => {
  const { authorId, title, description } = req.body;
  if (!authorId || !title || !description || !req.file)
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });

  const emailDir = sanitizeName(req.user.email);
  const titleDir = sanitizeName(title);
  const thumbnailPath = saveFile(req.file.buffer, req.file.mimetype, emailDir, titleDir, 'thumbnail');

  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO comics (authorId, title, description, thumbnail, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(Number(authorId), title, description, thumbnailPath, now, now);

  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(comic);
});

// PUT /api/comics/:id
router.put('/:id', requireAuth, upload.single('thumbnail'), (req, res) => {
  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.id);
  if (!comic) return res.status(404).json({ message: '만화를 찾을 수 없습니다.' });

  const { title, description } = req.body;
  const now = new Date().toISOString();

  let thumbnailPath = comic.thumbnail;
  if (req.file) {
    const emailDir = sanitizeName(req.user.email);
    const titleDir = sanitizeName(title || comic.title);
    thumbnailPath = saveFile(req.file.buffer, req.file.mimetype, emailDir, titleDir, 'thumbnail');
  }

  db.prepare(
    'UPDATE comics SET title = ?, description = ?, thumbnail = ?, updatedAt = ? WHERE id = ?'
  ).run(title ?? comic.title, description ?? comic.description, thumbnailPath, now, req.params.id);

  res.json(db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.id));
});

// DELETE /api/comics/:id
router.delete('/:id', requireAuth, (req, res) => {
  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.id);
  if (!comic) return res.status(404).json({ message: '만화를 찾을 수 없습니다.' });

  db.prepare('DELETE FROM percomic_images WHERE percomicId IN (SELECT id FROM percomics WHERE comicId = ?)').run(req.params.id);
  db.prepare('DELETE FROM percomics WHERE comicId = ?').run(req.params.id);
  db.prepare('DELETE FROM comics WHERE id = ?').run(req.params.id);

  // 작품 폴더 삭제
  const emailDir = sanitizeName(req.user.email);
  const titleDir = sanitizeName(comic.title);
  const comicDir = path.join(UPLOAD_ROOT, emailDir, titleDir);
  try { fs.rmSync(comicDir, { recursive: true, force: true }); } catch {}

  res.json({ message: '삭제되었습니다.' });
});

module.exports = router;
