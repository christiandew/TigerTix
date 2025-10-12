// admin-service/models/adminModel.js
/**
 * Purpose: Provide DB operations for Admin service (model layer).
 * Inputs:  event object { name: string, date: ISO 8601 string, ticketsAvailable: integer >= 0 }
 * Outputs: created row { id, name, date, ticketsAvailable }
 * Side effects: writes to SQLite
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const DB_PATH = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

let _db; // simple in-process cache


/**
 * getDb
 * Purpose: lazily open (and cache) the SQLite connection used by the admin model.
 * Inputs:  none
 * Output:  sqlite Database instance (promise)
 * Side effects: opens a file handle if not already open
 */
async function getDb() {
  if (_db) return _db;
  _db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  return _db;
}



/**
 * createEvent
 * Purpose: Insert a new event row.
 * Inputs:  { name, date, ticketsAvailable }
 * Output:  newly created row { id, name, date, ticketsAvailable }
 * Side effects: INSERT into events
 */
async function createEvent({ name, date, ticketsAvailable }) {
  const db = await getDb();

  // Assumes controller already validated inputs per rubric
  const result = await db.run(
    `INSERT INTO events (name, date, ticketsAvailable) VALUES (?, ?, ?)`,
    name.trim(),
    date,
    Number(ticketsAvailable)
  );

  // Return the newly-created row
  const row = await db.get(
    `SELECT id, name, date, ticketsAvailable FROM events WHERE id = ?`,
    result.lastID
  );
  return row;
}

module.exports = { createEvent };
