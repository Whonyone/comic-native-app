const express = require('express');
const path = require('path');
require('./db'); // DB 초기화 (테이블 생성)

const authRouter     = require('./routes/auth');
const usersRouter    = require('./routes/users');
const comicsRouter   = require('./routes/comics');
const episodesRouter = require('./routes/episodes');

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || 'C:/uploads';

const app = express();
app.use(express.json());
// 업로드 파일 정적 서빙: GET /uploads/{path} → UPLOAD_ROOT/{path}
app.use('/uploads', express.static(UPLOAD_ROOT));

app.use('/api/auth',                     authRouter);
app.use('/api/users',                    usersRouter);
app.use('/api/comics',                   comicsRouter);
app.use('/api/comics/:comicId/episodes', episodesRouter);

module.exports = app;
