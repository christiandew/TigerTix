const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const request = require('supertest');

jest.setTimeout(30000);

let DB_PATH;
let adminServer;
let clientServer;

beforeAll(async () => {
  // create a temp sqlite DB from init.sql
  const tempFile = path.join(os.tmpdir(), `tigertix-concurrency-${Date.now()}.sqlite`);
  DB_PATH = tempFile;

  const initSqlPath = path.join(__dirname, '..', 'shared-db', 'init.sql');
  const sql = fs.readFileSync(initSqlPath, 'utf8');

  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec('PRAGMA journal_mode=WAL;');
  await db.exec(sql);
  await db.close();

  // Point services at the temp DB before requiring them
  process.env.DB_PATH = DB_PATH;

  adminServer = require('../admin-service/server');
  clientServer = require('../client-service/server');

  await adminServer.init();
  await clientServer.init();
});

afterAll(async () => {
  try { fs.unlinkSync(DB_PATH); } catch (e) { /* ignore */ }
});

test('concurrent purchases do not oversell and return correct status codes', async () => {
  // create a fresh event with limited tickets via admin API
  const createRes = await request(adminServer.app)
    .post('/api/admin/events')
    .send({ name: 'Concurrent Test Event', date: '2030-01-01', ticketsAvailable: 3 });

  expect(createRes.status).toBe(201);
  const created = createRes.body;
  const id = created.id;

  const CONCURRENT = 12; // more requests than tickets

  // To properly simulate concurrent DB access we spawn child processes so each has its own DB connection.
  // Create a small worker script at ../scripts/purchase_worker.js which calls clientModel.purchaseTicket
  const { spawn } = require('child_process');

  function runWorker(eventId) {
    return new Promise((resolve) => {
      const worker = path.join(__dirname, '..', 'scripts', 'purchase_worker.js');
      const cp = spawn(process.execPath, [worker, String(eventId)], {
        env: { ...process.env, DB_PATH },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      let err = '';
      cp.stdout.on('data', (d) => (out += d.toString()));
      cp.stderr.on('data', (d) => (err += d.toString()));
      cp.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }));
    });
  }

  const proms = [];
  for (let i = 0; i < CONCURRENT; i++) proms.push(runWorker(id));
  const results = await Promise.all(proms);

  // Parse worker outputs
  let okCount = 0;
  let noTickets = 0;
  let dbBusy = 0;
  let other = 0;

  for (const r of results) {
    if (r.out) {
      try {
        const obj = JSON.parse(r.out);
        if (obj.kind === 'OK') okCount++;
        else if (obj.kind === 'NO_TICKETS_AVAILABLE') noTickets++;
        else if (obj.kind === 'EVENT NOT FOUND IN DB') other++;
        else other++;
      } catch (e) {
        other++;
      }
    } else if (r.err) {
      if (r.err.includes('DB BUSY') || r.err.includes('SQLITE_BUSY')) dbBusy++;
      else other++;
    } else if (r.code !== 0) {
      other++;
    }
  }

  // The number of successful purchases must be <= initial tickets
  expect(okCount).toBeLessThanOrEqual(3);

  // Verify DB remaining matches
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const row = await db.get('SELECT ticketsAvailable FROM events WHERE id = ?', id);
  await db.close();
  const remaining = Number(row.ticketsAvailable) || 0;
  expect(remaining).toBe(3 - okCount);

  // Ensure all attempts were accounted for
  expect(okCount + noTickets + dbBusy + other).toBe(CONCURRENT);
});
