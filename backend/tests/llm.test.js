const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const request = require('supertest');

jest.setTimeout(20000);

let DB_PATH;
let llmServer;

beforeAll(async () => {
  // create a temp sqlite DB from init.sql
  const tempFile = path.join(os.tmpdir(), `tigertix-llm-test-${Date.now()}.sqlite`);
  DB_PATH = tempFile;

  const initSqlPath = path.join(__dirname, '..', 'shared-db', 'init.sql');
  const sql = fs.readFileSync(initSqlPath, 'utf8');

  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec('PRAGMA journal_mode=WAL;');
  await db.exec(sql);
  await db.close();

  // Point service at the temp DB before requiring it
  process.env.DB_PATH = DB_PATH;

  // require and init llm service
  llmServer = require('../llm-driven-booking/server');
  await llmServer.init();
});

afterAll(async () => {
  // cleanup temp DB file
  try { fs.unlinkSync(DB_PATH); } catch (e) { /* ignore */ }
  // restore fetch if needed
  if (global.fetch && global.fetch._isMock) delete global.fetch;
});

test('parse -> propose_booking normalizes to an event and returns availability', async () => {
  // Mock fetch (OpenAI Responses) to return a propose_booking intent for a seeded event
  global.fetch = jest.fn(async () => ({
    json: async () => ({
      output_text: JSON.stringify({
        intent: 'propose_booking',
        event_text: 'Clemson vs. Florida State',
        tickets: 1,
        confidence: 0.95,
        message: 'I can book this',
        normalized: { event_id: null }
      })
    })
  }));
  global.fetch._isMock = true;

  const res = await request(llmServer.app)
    .post('/api/llm/parse')
    .send({ user_input: 'Book one for Clemson vs. Florida State' })
    .expect(200);

  // controller returns normalized intent + availability
  expect(res.body).toHaveProperty('normalized');
  expect(res.body.normalized).toHaveProperty('event_id');
  expect(typeof res.body.normalized.event_id).toBe('number');
  expect(res.body).toHaveProperty('availability');
  expect(res.body.availability).toHaveProperty('can_fulfill');
});

test('parse -> show_events returns results array', async () => {
  // Mock fetch to return a show_events intent
  global.fetch = jest.fn(async () => ({
    json: async () => ({
      output_text: JSON.stringify({
        intent: 'show_events',
        event_text: '',
        tickets: 1,
        confidence: 0.9,
        message: 'Here are events',
        normalized: { event_id: null }
      })
    })
  }));
  global.fetch._isMock = true;

  const res = await request(llmServer.app)
    .post('/api/llm/parse')
    .send({ user_input: 'show events' })
    .expect(200);

  expect(res.body).toHaveProperty('intent', 'show_events');
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.results.length).toBeGreaterThan(0);
});

test('confirm booking transactionally reduces tickets and returns payload', async () => {
  // pick a seeded event id from the DB
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const ev = await db.get('SELECT id, ticketsAvailable FROM events WHERE name = ?', 'Clemson vs. Florida State');
  await db.close();
  expect(ev).toBeDefined();

  const res = await request(llmServer.app)
    .post('/api/llm/confirm')
    .send({ event_id: ev.id, qty: 1 })
    .expect(200);

  expect(res.body).toHaveProperty('ok', true);
  expect(res.body).toHaveProperty('eventId', ev.id);
  expect(res.body).toHaveProperty('tickets');
  expect(res.body.tickets).toBe(1);
  expect(res.body).toHaveProperty('remaining');
  expect(typeof res.body.remaining).toBe('number');
});
