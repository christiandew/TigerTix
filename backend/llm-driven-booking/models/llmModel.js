// Task 1 model utils: DB, LLM parse, normalization, transactional booking.

const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

// Allow tests to override the DB path via env. Default to shared-db/database.sqlite
const DB_PATH =
  process.env.DB_PATH ||
  path.join(__dirname, "..", "..", "shared-db", "database.sqlite");
let _db;

async function getDb() {
  if (_db) return _db;
  _db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await _db.exec("PRAGMA foreign_keys = ON;");
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

// --- LLM parsing (OpenAI Responses API) -----------------------------------

const OPENAI_MODEL = "gpt-4o-mini";
const MAX_OUT_TOKENS = 200;

const SYSTEM_PROMPT =
  "Parse the user's message into BookingIntent JSON. No side effects. " +
  "Default tickets=1. event_text is the raw event mention. " +
  "If you can't map to an ID, set normalized.event_id=null. " +
  "Always include a short message. confidence is 0..1. Output JSON only.";

const BOOKING_INTENT_FORMAT = {
  type: "json_schema",
  name: "BookingIntent",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      intent: {
        type: "string",
        enum: [
          "greet",
          "show_events",
          "propose_booking",
          "confirm",
          "help",
          "unknown",
        ],
      },
      event_text: { type: "string" },
      tickets: { type: "integer", minimum: 1 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      message: { type: "string" },
      normalized: {
        type: "object",
        additionalProperties: false,
        properties: { event_id: { type: ["integer", "null"] } },
        required: ["event_id"],
      },
    },
    required: [
      "intent",
      "event_text",
      "tickets",
      "confidence",
      "message",
      "normalized",
    ],
  },
};

// user_input: string to parsed intent
async function parseWithLLM(user_input) {
  const payload = {
    model: OPENAI_MODEL,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: user_input },
    ],
    text: { format: BOOKING_INTENT_FORMAT },
    temperature: 0.2,
    max_output_tokens: MAX_OUT_TOKENS,
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  // prefer output_text; fallback to content array if needed
  const raw =
    data?.output_text ??
    data?.output?.[0]?.content?.find?.((c) => c.type === "output_text")?.text;
  const intent = JSON.parse(raw || "{}");
  if (typeof intent.tickets !== "number") intent.tickets = 1; // defensive default
  return intent;
}

// --- Normalization: map event_text -> event_id, compute availability -------

function hydrateNormalization(intent, events) {
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\b(vs\.?|v\.)\b/g, "vs")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const tok = (s) => norm(s).split(" ").filter(Boolean);

  const nameRaw = (intent.event_text || "").trim();
  const qty = Number.isFinite(intent.tickets) ? intent.tickets : 1;

  const out = { ...intent, normalized: { ...(intent.normalized || {}) } };
  let availability = {
    event_id: null,
    event_name: null,
    remaining: 0,
    can_fulfill: false,
  };

  if (!nameRaw) return { normalizedIntent: out, availability };

  const eq = (a, b) => norm(a) === norm(b);
  const score = (q, c) => {
    const Q = tok(q),
      C = new Set(tok(c));
    if (!Q.length || !C.size) return 0;
    let hits = 0;
    for (const t of Q) if (C.has(t)) hits++;
    return hits / Q.length;
  };

  // exact match then token overlap then substring
  let match = events.find((e) => eq(e.name, nameRaw));
  if (!match) {
    let best = null,
      bestScore = 0,
      qn = tok(nameRaw).length;
    for (const e of events) {
      const s = score(nameRaw, e.name);
      if (s > bestScore) (bestScore = s), (best = e);
    }
    if (best && bestScore >= 0.6 && qn >= 2) match = best;
  }
  if (!match) {
    const key = norm(nameRaw);
    match = events.find((e) => norm(e.name).includes(key));
  }

  if (match) {
    out.normalized.event_id = match.id;
    const remaining = Number(match.ticketsAvailable) || 0;
    availability = {
      event_id: match.id,
      event_name: match.name,
      remaining,
      can_fulfill: remaining >= qty,
    };
  }

  return { normalizedIntent: out, availability };
}

// --- Booking (transaction) -------------------------------------------------

async function confirmBookingTxn(event_id, qty) {
  const db = await getDb();
  try {
    await db.exec("BEGIN IMMEDIATE;");

    const ev = await db.get(
      `SELECT id, name, ticketsAvailable FROM events WHERE id = ?`,
      event_id
    );
    if (!ev) {
      await db.exec("ROLLBACK;");
      return { kind: "EVENT_NOT_FOUND" };
    }

    const left = Number(ev.ticketsAvailable) || 0;
    if (left < qty) {
      await db.exec("ROLLBACK;");
      return { kind: "INSUFFICIENT_TICKETS" };
    }

    await db.run(
      `UPDATE events SET ticketsAvailable = ticketsAvailable - ? WHERE id = ?`,
      qty,
      event_id
    );

    await db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES events(id),
        qty INTEGER NOT NULL CHECK(qty > 0),
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
    `);

    await db.run(
      `INSERT INTO bookings (event_id, qty) VALUES (?, ?)`,
      event_id,
      qty
    );

    const upd = await db.get(
      `SELECT ticketsAvailable FROM events WHERE id = ?`,
      event_id
    );
    await db.exec("COMMIT;");
    return {
      kind: "OK",
      payload: {
        ok: true,
        eventId: event_id,
        event_name: ev.name,
        tickets: qty,
        remaining: Number(upd.ticketsAvailable) || 0,
      },
    };
  } catch (err) {
    try {
      await db.exec("ROLLBACK;");
    } catch {}
    if (String(err?.message).includes("SQLITE_BUSY"))
      return { kind: "DB_BUSY" };
    throw err;
  }
}

module.exports = {
  parseWithLLM,
  getAllEvents,
  hydrateNormalization,
  confirmBookingTxn,
};
