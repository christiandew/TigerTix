  const path = require('path');
  const sqlite3 = require('sqlite3').verbose();
  const { open } = require('sqlite');

  const DB_PATH = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

  let _db; // simple in-process cache

  async function getDb() {
    if (_db) return _db;
    _db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await _db.exec('PRAGMA busy_timeout=1000;'); //prevent server busy errors with concurrent purchases
    return _db;
  }

  async function getAllEvents()
  {
    const db = await getDb();
    const result = await db.all('SELECT id, name, date, ticketsAvailable FROM events ORDER BY date')
    return result;
  }

  async function purchaseTicket(id)
  {
    const db = await getDb();
    try
    {
      //lock database writes so you can't sell the same ticket twice.
      await db.exec('BEGIN IMMEDIATE;');

      const result = await db.run('UPDATE events SET ticketsAvailable = ticketsAvailable - 1 WHERE id = ? AND ticketsAvailable >= 1;', id); //only update if enough stock

      if(result.changes === 0)
      {
        const exists = await db.get('SELECT id FROM events WHERE id = ?', id); //if the first query fails we know either the event doesn't exist or theres no tickets.
        await db.exec('ROLLBACK;');
        if(!exists)
        {
          return {kind: 'EVENT NOT FOUND IN DB'};
        }
        return{kind: 'NO TICKETS AVAILABLE'};
      }

      const row = await db.get('SELECT id, name, date, ticketsAvailable FROM events WHERE id = ?', id); //get update row to show changes to ticket count
      await db.exec('COMMIT;'); //commit changes now that we know theres no errors
      return{kind: 'OK', row}; //return OK status message and row
    }
    catch(err)
    {
      //if we reach this point we have an unexpected error, attempt to rollback database.
      try
      {
        await db.exec("ROLLBACK;")
      }
      catch(_)
      {

      }
      throw err;
    }
  }

  module.exports = {getAllEvents, purchaseTicket};