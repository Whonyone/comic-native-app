const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = db.prepare(
    'SELECT id, email, nickname, phonenumber, role FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
  res.json(user);
});

module.exports = router;
