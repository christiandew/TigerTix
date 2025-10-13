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
 * Side effects: writes to DB within a transaction (BEGIN IMMEDIATE…COMMIT/ROLLBACK)
 */
  async function purchaseTicket(id)
  {
    // Use a fresh DB handle per attempt so BEGIN IMMEDIATE doesn't conflict with
    // other overlapping transactions on the same in-process connection.
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const localDb = await open({ filename: DB_PATH, driver: sqlite3.Database });
      try {
        await localDb.exec('PRAGMA busy_timeout=1000;');
        // lock database writes so you can't sell the same ticket twice.
        await localDb.exec('BEGIN IMMEDIATE;');

        const result = await localDb.run('UPDATE events SET ticketsAvailable = ticketsAvailable - 1 WHERE id = ? AND ticketsAvailable >= 1;', id); //only update if enough stock

        if (result.changes === 0) {
          const exists = await localDb.get('SELECT id FROM events WHERE id = ?', id); //if the first query fails we know either the event doesn't exist or theres no tickets.
          await localDb.exec('ROLLBACK;');
          await localDb.close();
          if (!exists) {
            return { kind: 'EVENT NOT FOUND IN DB' };
          }
          return { kind: 'NO TICKETS AVAILABLE' };
        }

        const row = await localDb.get('SELECT id, name, date, ticketsAvailable FROM events WHERE id = ?', id); //get updated row to show changes to ticket count
        await localDb.exec('COMMIT;'); //commit changes now that we know theres no errors
        await localDb.close();
        return { kind: 'OK', row };
      } catch (err) {
        // If SQLite is busy, roll back and retry with backoff.
        const isBusy = err && (err.code === 'SQLITE_BUSY' || (err.message && err.message.includes('SQLITE_BUSY')));
        try { await localDb.exec('ROLLBACK;'); } catch (_) {}
        try { await localDb.close(); } catch (_) {}
        if (isBusy && attempt < MAX_ATTEMPTS) {
          // backoff (ms)
          await new Promise(r => setTimeout(r, 50 * attempt));
          continue; // retry
        }
        if (isBusy) {
          return { kind: 'DB BUSY' };
        }
        // unexpected error - rethrow to let controller return 500
        throw err;
      }
    }
  }

  module.exports = {getAllEvents, purchaseTicket};