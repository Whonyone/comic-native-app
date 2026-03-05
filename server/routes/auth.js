const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'comic-app-secret-key';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, nickname, phonenumber } = req.body;
  if (!email || !password || !nickname || !phonenumber)
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing)
    return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password, nickname, phonenumber, role) VALUES (?, ?, ?, ?, ?)'
  ).run(email, hashedPassword, nickname, phonenumber, 'user');

  const user = db.prepare('SELECT id, email, nickname, phonenumber, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
