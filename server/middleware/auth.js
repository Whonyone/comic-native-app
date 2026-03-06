const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'comic-app-secret-key';

module.exports = function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ message: '인증이 필요합니다.' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};
