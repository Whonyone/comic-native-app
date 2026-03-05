const express = require('express');
require('./db'); // DB 초기화 (테이블 생성)

const authRouter     = require('./routes/auth');
const usersRouter    = require('./routes/users');
const comicsRouter   = require('./routes/comics');
const episodesRouter = require('./routes/episodes');

const app = express();
app.use(express.json());

app.use('/api/auth',                     authRouter);
app.use('/api/users',                    usersRouter);
app.use('/api/comics',                   comicsRouter);
app.use('/api/comics/:comicId/episodes', episodesRouter);

module.exports = app;
