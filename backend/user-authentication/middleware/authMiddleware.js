const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';

function jwtMiddleware(req, res, next) {
  // Try cookie first, then Authorization header
  const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Token expired or invalid
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  });
}

module.exports = jwtMiddleware;
