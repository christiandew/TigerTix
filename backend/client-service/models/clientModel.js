 // client-service/models/clientModel.js
// Purpose: Data access for client microservice (reads & purchase updates).
// Notes:   DB logic stays here; controllers handle HTTP & validation.
 
 const path = require('path');
  const sqlite3 = require('sqlite3').verbose();
  const { open } = require('sqlite');

  const DB_PATH = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

  let _db; // simple in-process cache


  /**
 * getDb
 * Purpose: Lazily open and cache the SQLite connection.
 * Inputs:  none
 * Output:  sqlite Database instance (Promise)
 * Side effects: opens a file handle; sets helpful PRAGMAs
 */
  async function getDb() {
    if (_db) return _db;
    _db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await _db.exec('PRAGMA busy_timeout=1000;'); //prevent server busy errors with concurrent purchases
    return _db;
  }




  /**
 * getAllEvents
 * Purpose: Fetch all events to display to users.
 * Inputs:  none
 * Output:  Array<{ id, name, date, ticketsAvailable }>
 * Side effects: none
 */
  async function getAllEvents()
  {
    const db = await getDb();
    const result = await db.all('SELECT id, name, date, ticketsAvailable FROM events ORDER BY date')
    return result;
  }


  /**
 * purchaseTicket
 * Purpose: Atomically decrement ticketsAvailable for one event.
 * Inputs:  id (integer) — event identifier
 * Output:  { kind: 'OK', row }
 *          { kind: 'EVENT NOT FOUND IN DB' }
 *          { kind: 'NO TICKETS AVAILABLE' }
 *          { kind: 'DB BUSY' }

 * Side effects: writes to DB within a transaction (BEGIN IMMEDIATE…COMMIT/ROLLBACK)
 */
  async function purchaseTicket(id) {
  const db = await getDb(); // reuse the cached handle (busy_timeout already set)

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // Acquire a reserved write lock up front so we can't oversell.
      await db.exec('BEGIN IMMEDIATE;');

      // Only decrement if stock remains; otherwise UPDATE affects 0 rows.
      const result = await db.run(
        'UPDATE events ' +
        'SET ticketsAvailable = ticketsAvailable - 1 ' +
        'WHERE id = ? AND ticketsAvailable >= 1;',
        id
      );

      if (result.changes === 0) {
        // Distinguish between "no such event" vs "no tickets left".
        const exists = await db.get('SELECT id FROM events WHERE id = ?', id);
        await db.exec('ROLLBACK;');
        return exists ? { kind: 'NO TICKETS AVAILABLE' }
                      : { kind: 'EVENT NOT FOUND IN DB' };
      }

      // Fetch the updated row to return to caller.
      const row = await db.get(
        'SELECT id, name, date, ticketsAvailable FROM events WHERE id = ?',
        id
      );
      await db.exec('COMMIT;');
      return { kind: 'OK', row };
    } catch (err) {
      // If the DB was busy starting the transaction, back off and retry.
      const isBusy =
        err && (err.code === 'SQLITE_BUSY' || String(err.message).includes('SQLITE_BUSY'));
      try { await db.exec('ROLLBACK;'); } catch (_) { /* ignore */ }

      if (isBusy && attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 50 * attempt)); // simple linear backoff
        continue;
      }
      if (isBusy) {
        return { kind: 'DB BUSY' };
      }
      // Unexpected error: surface to the controller to 500.
      throw err;
    }
  }
}

  module.exports = {getAllEvents, purchaseTicket};