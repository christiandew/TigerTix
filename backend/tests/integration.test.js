const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const request = require('supertest');

jest.setTimeout(20000);

let DB_PATH;
let adminServer;
let clientServer;

beforeAll(async () => {
  // create a temp sqlite DB from init.sql
  const tempFile = path.join(os.tmpdir(), `tigertix-test-${Date.now()}.sqlite`);
  DB_PATH = tempFile;

  const initSqlPath = path.join(__dirname, '..', 'shared-db', 'init.sql');
  const sql = fs.readFileSync(initSqlPath, 'utf8');

  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec('PRAGMA journal_mode=WAL;');
  await db.exec(sql);
  await db.close();

  // Point services at the temp DB before requiring them
  process.env.DB_PATH = DB_PATH;

  // require and init services
  adminServer = require('../admin-service/server');
  clientServer = require('../client-service/server');

  await adminServer.init();
  await clientServer.init();
});

afterAll(async () => {
  // Attempt to remove temp DB file
  try {
    fs.unlinkSync(DB_PATH);
  } catch (e) {
    // ignore
  }
});

test('create event via admin, list via client, purchase, update and delete', async () => {
  // create an event
  const newEvent = {
    name: 'Test Event Integration',
    date: '2030-01-01',
    ticketsAvailable: 5,
  };

  const createRes = await request(adminServer.app)
    .post('/api/admin/events')
    .send(newEvent)
    .expect(201);

  const created = createRes.body;
  expect(created).toHaveProperty('id');
  expect(created.name).toBe(newEvent.name);

  const id = created.id;

  // list events via client and find the created one
  const listRes = await request(clientServer.app).get('/api/events').expect(200);
  const events = listRes.body;
  const found = events.find((e) => e.id === id);
  expect(found).toBeDefined();
  expect(found.ticketsAvailable).toBe(5);

  // purchase one ticket
  const purchaseRes = await request(clientServer.app).post(`/api/events/${id}/purchase`).expect(200);
  expect(purchaseRes.body).toHaveProperty('id', id);
  expect(purchaseRes.body.ticketsAvailable).toBe(4);

  // update tickets directly in DB
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.run('UPDATE events SET ticketsAvailable = ? WHERE id = ?', 42, id);
  await db.close();

  // verify update is visible via client
  const listRes2 = await request(clientServer.app).get('/api/events').expect(200);
  const found2 = listRes2.body.find((e) => e.id === id);
  expect(found2).toBeDefined();
  expect(found2.ticketsAvailable).toBe(42);

  // delete the event directly
  const db2 = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db2.run('DELETE FROM events WHERE id = ?', id);
  await db2.close();

  // verify deletion via client
  const listRes3 = await request(clientServer.app).get('/api/events').expect(200);
  const found3 = listRes3.body.find((e) => e.id === id);
  expect(found3).toBeUndefined();
});
