const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// db setup
const DB_PATH = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

let _db; // cached connection 

async function getDb() {
  if (_db) return _db;
  _db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await _db.exec('PRAGMA foreign_keys = ON;');
  return _db;
}

async function getAllEvents() {
  const db = await getDb();
  return db.all(
    `SELECT id, name, date, ticketsAvailable
       FROM events
      ORDER BY date ASC`
  );
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL   =  'gpt-4o-mini'; // free-tier friendly
const MAX_OUT_TOKENS = 200;

// Keep prompt compact; strict schema carries most constraints.
const SYSTEM_PROMPT =
  `You are the TigerTix Booking Parser. Convert the user's message into JSON that ` +
  `exactly matches the BookingIntent schema. Do not perform bookings or any side effects—only parse. ` +
  `Default tickets=1 if unstated. event_text must be the verbatim event mention (e.g., "Jazz Night"). ` +
  `If you cannot confidently match an event, set normalized.event_id=null (the server resolves IDs). ` +
  `Always include a message string for the chat UI; if no text is needed, use an empty string (""). ` +
  `confidence must be a number from 0 to 1. Output JSON only.`;

// Strict schema kept minimal + required message (so the UI can always render text).
const BOOKING_INTENT_FORMAT = {
  type: 'json_schema',
  name: 'BookingIntent',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      intent: {
        type: 'string',
        enum: ['greet','show_events','propose_booking','confirm','help','unknown']
      },
      event_text: { type: 'string', minLength: 0 },
      tickets:    { type: 'integer', minimum: 1 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      message:    { type: 'string', minLength: 0 },        // required; "" allowed
      normalized: {
        type: 'object',
        additionalProperties: false,
        properties: { event_id: { type: ['integer','null'] } },
        required: ['event_id']
      }
    },
    required: ['intent','event_text','tickets','confidence','message','normalized']
  }
};


async function parseWithLLM(user_input)
{


    const payload = 
    {
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: user_input }
    ],
    text: { format: BOOKING_INTENT_FORMAT },
    temperature: 0.2,
    max_output_tokens: MAX_OUT_TOKENS
  };

  const res = await fetch("https://api.openai.com/v1/responses", 
    {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
            'Content-Type': 'application/json'
        },

        body: JSON.stringify(payload)

    }
);

const data = await res.json();

const raw = data?.output_text ?? data?.output?.[0]?.content?.find?.(c => c.type === 'output_text')?.text;

const intent = JSON.parse(raw);

if (typeof intent.tickets !== 'number') intent.tickets = 1;

console.log(intent.message);
return intent;

}

  module.exports = {parseWithLLM};