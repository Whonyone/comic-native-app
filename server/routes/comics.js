const express = require('express');
const db = require('../db');

const router = express.Router();

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
router.post('/', (req, res) => {
  const { authorId, title, description, thumbnail } = req.body;
  if (!authorId || !title || !description || !thumbnail)
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });

  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO comics (authorId, title, description, thumbnail, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(authorId, title, description, thumbnail, now, now);

  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(comic);
});

// PUT /api/comics/:id
router.put('/:id', (req, res) => {
  const comic = db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.id);
  if (!comic) return res.status(404).json({ message: '만화를 찾을 수 없습니다.' });

  const { title, description, thumbnail } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE comics SET title = ?, description = ?, thumbnail = ?, updatedAt = ? WHERE id = ?'
  ).run(
    title ?? comic.title,
    description ?? comic.description,
    thumbnail ?? comic.thumbnail,
    now,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM comics WHERE id = ?').get(req.params.id));
});

module.exports = router;
