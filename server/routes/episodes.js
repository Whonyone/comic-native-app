const express = require('express');
const db = require('../db');

const router = express.Router({ mergeParams: true }); // comicId 접근용

// images 조립 헬퍼
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
router.post('/', (req, res) => {
  const comicId = Number(req.params.comicId);
  const comic = db.prepare('SELECT id FROM comics WHERE id = ?').get(comicId);
  if (!comic) return res.status(404).json({ message: '만화를 찾을 수 없습니다.' });

  const { title, images, episodeNumber, thumbnail } = req.body;
  if (!title || !images || !episodeNumber || !thumbnail)
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });

  const now = new Date().toISOString();

  // 트랜잭션으로 episode + images 한번에 저장
  const insert = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO percomics (comicId, title, episodeNumber, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(comicId, title, episodeNumber, thumbnail, now);

    const percomicId = result.lastInsertRowid;
    const insertImage = db.prepare(
      'INSERT INTO percomic_images (percomicId, url, image_order) VALUES (?, ?, ?)'
    );
    images.forEach(({ url, order }) => insertImage.run(percomicId, url, order));

    return percomicId;
  });

  const percomicId = insert();
  const episode = db.prepare('SELECT * FROM percomics WHERE id = ?').get(percomicId);
  res.status(201).json(attachImages(episode));
});

module.exports = router;
