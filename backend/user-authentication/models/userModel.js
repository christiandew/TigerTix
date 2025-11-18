// Simple in-memory user model. Replace with DB in production.
const users = new Map();
let nextId = 1;

function createUser({ email, passwordHash }) {
  const existing = Array.from(users.values()).find((u) => u.email === email.toLowerCase());
  if (existing) return null;
  const user = { id: nextId++, email: email.toLowerCase(), passwordHash };
  users.set(user.id, user);
  return { id: user.id, email: user.email };
}

function findByEmail(email) {
  if (!email) return null;
  return Array.from(users.values()).find((u) => u.email === email.toLowerCase()) || null;
}

function findById(id) {
  return users.get(Number(id)) || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
};
