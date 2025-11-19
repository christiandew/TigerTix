// models/userModel.js
// User model with embedded SQLite DB helper.

const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH =
  process.env.DB_PATH ||
  path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

let dbInstance;

async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await dbInstance.exec('PRAGMA foreign_keys = ON;');
  return dbInstance;
}

// Create a new user. Returns { id, email } or null if email already exists.
async function createUser({ email, passwordHash }) {
  const db = await getDb();
  const normalizedEmail = email.toLowerCase();

  try {
    const result = await db.run(
      `
      INSERT INTO users (email, passwordHash)
      VALUES (?, ?)
      `,
      normalizedEmail,
      passwordHash
    );

    return {
      id: result.lastID,
      email: normalizedEmail,
    };
  } catch (err) {
    // Unique constraint on email
    if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return null;
    }
    throw err;
  }
}

// Find a user by email. Returns full row or null.
async function findByEmail(email) {
  if (!email) return null;

  const db = await getDb();
  const normalizedEmail = email.toLowerCase();

  const user = await db.get(
    `
    SELECT id, email, passwordHash
    FROM users
    WHERE email = ?
    `,
    normalizedEmail
  );

  return user || null;
}

// Find a user by id. Returns full row or null.
async function findById(id) {
  const db = await getDb();

  const user = await db.get(
    `
    SELECT id, email, passwordHash
    FROM users
    WHERE id = ?
    `,
    id
  );

  return user || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
};
