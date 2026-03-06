const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || 'C:/uploads';

function sanitizeName(str) {
  return str.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, 100);
}

function attachImages(episode) {
  const images = db.prepare(
    'SELECT url, image_order FROM percomic_images WHERE percomicId = ? ORDER BY image_order ASC'
  ).all(episode.id);
  return { ...episode, images };
}

// GET /api/comics/:comicId/episodes
router.get('/', (req, res) => {
  const episodes = db.prepare(
    'SELECT * FROM percomics WHERE comicId = ? ORDER BY episodeNumber ASC'
  ).all(req.params.comicId);
  res.json(episodes.map(attachImages));
});

// GET /api/comics/:comicId/episodes/:id
router.get('/:id', (req, res) => {
  const episode = db.prepare(
    'SELECT * FROM percomics WHERE id = ? AND comicId = ?'
  ).get(req.params.id, req.params.comicId);
  if (!episode) return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
  res.json(attachImages(episode));
});

// POST /api/comics/:comicId/episodes
router.post('/', requireAuth, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images' },
]), (req, res) => {
  const comicId = Number(req.params.comicId);
  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(comicId);
  if (!comic) return res.status(404).json({ message: '만화를 찾을 수 없습니다.' });

  const { title, episodeNumber } = req.body;
  const thumbnailFile = req.files?.thumbnail?.[0];
  const imageFiles = req.files?.images || [];

  if (!title || !episodeNumber || !thumbnailFile || imageFiles.length === 0)
    return res.status(400).json({ message: '제목, 회차 번호, 썸네일, 이미지(1개 이상)가 필요합니다.' });

  const emailDir = sanitizeName(req.user.email);
  const titleDir = sanitizeName(comic.title);
  const epDir = `ep_${episodeNumber}`;
  const baseDir = path.join(UPLOAD_ROOT, emailDir, titleDir, epDir);
  fs.mkdirSync(baseDir, { recursive: true });

  // 썸네일 저장
  const thumbExt = thumbnailFile.mimetype.split('/')[1]?.split('+')[0] || 'jpg';
  const thumbFilename = `thumbnail.${thumbExt}`;
  fs.writeFileSync(path.join(baseDir, thumbFilename), thumbnailFile.buffer);
  const thumbnailPath = `${emailDir}/${titleDir}/${epDir}/${thumbFilename}`;

  const now = new Date().toISOString();

  const insert = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO percomics (comicId, title, episodeNumber, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(comicId, title, Number(episodeNumber), thumbnailPath, now);

    const percomicId = result.lastInsertRowid;
    const insertImage = db.prepare(
      'INSERT INTO percomic_images (percomicId, url, image_order) VALUES (?, ?, ?)'
    );

    imageFiles.forEach((file, idx) => {
      const imgExt = file.mimetype.split('/')[1]?.split('+')[0] || 'jpg';
      const imgFilename = `image_${String(idx + 1).padStart(3, '0')}.${imgExt}`;
      fs.writeFileSync(path.join(baseDir, imgFilename), file.buffer);
      const imgPath = `${emailDir}/${titleDir}/${epDir}/${imgFilename}`;
      insertImage.run(percomicId, imgPath, idx + 1);
    });

    return percomicId;
  });

  const percomicId = insert();
  const episode = db.prepare('SELECT * FROM percomics WHERE id = ?').get(percomicId);
  res.status(201).json(attachImages(episode));
});

// PUT /api/comics/:comicId/episodes/:id
router.put('/:id', requireAuth, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images' },
]), (req, res) => {
  const episode = db.prepare(
    'SELECT * FROM percomics WHERE id = ? AND comicId = ?'
  ).get(req.params.id, req.params.comicId);
  if (!episode) return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });

  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.comicId);
  const { title } = req.body;
  const thumbnailFile = req.files?.thumbnail?.[0];
  const imageFiles = req.files?.images || [];

  const emailDir = sanitizeName(req.user.email);
  const titleDir = sanitizeName(comic.title);
  const epDir = `ep_${episode.episodeNumber}`;
  const baseDir = path.join(UPLOAD_ROOT, emailDir, titleDir, epDir);

  let thumbnailPath = episode.thumbnail;
  if (thumbnailFile) {
    fs.mkdirSync(baseDir, { recursive: true });
    const thumbExt = thumbnailFile.mimetype.split('/')[1]?.split('+')[0] || 'jpg';
    const thumbFilename = `thumbnail.${thumbExt}`;
    fs.writeFileSync(path.join(baseDir, thumbFilename), thumbnailFile.buffer);
    thumbnailPath = `${emailDir}/${titleDir}/${epDir}/${thumbFilename}`;
  }

  const update = db.transaction(() => {
    db.prepare('UPDATE percomics SET title = ?, thumbnail = ? WHERE id = ?').run(
      title ?? episode.title,
      thumbnailPath,
      req.params.id
    );

    if (imageFiles.length > 0) {
      // 새 파일로 전체 교체
      fs.mkdirSync(baseDir, { recursive: true });
      db.prepare('DELETE FROM percomic_images WHERE percomicId = ?').run(req.params.id);
      const insertImage = db.prepare(
        'INSERT INTO percomic_images (percomicId, url, image_order) VALUES (?, ?, ?)'
      );
      imageFiles.forEach((file, idx) => {
        const imgExt = file.mimetype.split('/')[1]?.split('+')[0] || 'jpg';
        const imgFilename = `image_${String(idx + 1).padStart(3, '0')}.${imgExt}`;
        fs.writeFileSync(path.join(baseDir, imgFilename), file.buffer);
        const imgPath = `${emailDir}/${titleDir}/${epDir}/${imgFilename}`;
        insertImage.run(req.params.id, imgPath, idx + 1);
      });
    } else if (req.body.existingImagePaths) {
      // 기존 이미지 순서/삭제만 변경 (파일 재업로드 없음)
      const paths = JSON.parse(req.body.existingImagePaths);
      db.prepare('DELETE FROM percomic_images WHERE percomicId = ?').run(req.params.id);
      const insertImage = db.prepare(
        'INSERT INTO percomic_images (percomicId, url, image_order) VALUES (?, ?, ?)'
      );
      paths.forEach((imgPath, idx) => insertImage.run(req.params.id, imgPath, idx + 1));
    }
  });

  update();
  const updated = db.prepare('SELECT * FROM percomics WHERE id = ?').get(req.params.id);
  res.json(attachImages(updated));
});

// DELETE /api/comics/:comicId/episodes/:id
router.delete('/:id', requireAuth, (req, res) => {
  const episode = db.prepare(
    'SELECT * FROM percomics WHERE id = ? AND comicId = ?'
  ).get(req.params.id, req.params.comicId);
  if (!episode) return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });

  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.comicId);

  db.prepare('DELETE FROM percomic_images WHERE percomicId = ?').run(req.params.id);
  db.prepare('DELETE FROM percomics WHERE id = ?').run(req.params.id);

  // 회차 폴더 삭제
  if (comic) {
    const emailDir = sanitizeName(req.user.email);
    const titleDir = sanitizeName(comic.title);
    const epDir = `ep_${episode.episodeNumber}`;
    const epPath = path.join(UPLOAD_ROOT, emailDir, titleDir, epDir);
    try { fs.rmSync(epPath, { recursive: true, force: true }); } catch {}
  }

  res.json({ message: '삭제되었습니다.' });
});

module.exports = router;
