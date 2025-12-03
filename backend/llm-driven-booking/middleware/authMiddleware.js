const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
const SKIP_AUTH = process.env.SKIP_AUTH === 'true' || process.env.NODE_ENV === 'test';

function jwtMiddleware(req, res, next) {
  if (SKIP_AUTH) return next(); // allow tests to bypass auth

  const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = { id: decoded.id, email: decoded.email };
    next();
  });
}

module.exports = jwtMiddleware;
