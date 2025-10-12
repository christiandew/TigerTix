// admin-service/setup.js
/**
 * Purpose: Run the shared init.sql to prepare the SQLite DB (idempotent).
 * Inputs: none
 * Outputs: logs DB readiness; throws on fatal DB/FS errors
 * Side effects: Creates/updates schema + seeds via init.sql
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Resolve shared DB assets relative to admin-service/
const DB_PATH = path.join(__dirname, '..', 'shared-db', 'database.sqlite');
const INIT_SQL_PATH = path.join(__dirname, '..', 'shared-db', 'init.sql');


/**
 * runSetup
 * Purpose: Ensure events table exists before the server starts.
 * Inputs:  none
 * Output:  Promise<void>
 * Side effects: creates DB file (if missing), executes schema
 */
async function runSetup() {
  const sql = fs.readFileSync(INIT_SQL_PATH, 'utf8');
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  // Pragmatic defaults + idempotent schema exec
  await db.exec('PRAGMA journal_mode=WAL;');
  await db.exec(sql);

  // Health log
  const row = await db.get('SELECT COUNT(*) AS cnt FROM events;').catch(() => ({ cnt: 0 }));
  console.log(`[setup] DB ready at ${DB_PATH}; events=${row?.cnt ?? 0}`);

  await db.close();
}

module.exports = { runSetup };
