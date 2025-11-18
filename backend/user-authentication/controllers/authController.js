const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findByEmail, findById } = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
const TOKEN_NAME = 'token';
const TOKEN_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

async function register(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = findByEmail(email);
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const user = createUser({ email, passwordHash: hash });
  if (!user) return res.status(500).json({ error: 'Unable to create user' });

  // Optionally auto-login: create token and set cookie
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30m' });
  res.cookie(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE_MS,
  });

  return res.status(201).json({ id: user.id, email: user.email });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30m' });
  res.cookie(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE_MS,
  });

  return res.json({ id: user.id, email: user.email });
}

function logout(req, res) {
  res.cookie(TOKEN_NAME, '', { maxAge: 0 });
  return res.json({ success: true });
}

function profile(req, res) {
  // `req.user` populated by auth middleware
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  const u = findById(req.user.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  return res.json({ id: u.id, email: u.email });
}

module.exports = { register, login, logout, profile };
