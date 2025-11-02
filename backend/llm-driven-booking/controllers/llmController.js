// Task 1 handlers: parse and confirm

const {
  parseWithLLM,
  getAllEvents,
  hydrateNormalization,
  confirmBookingTxn,
} = require("../models/llmModel");

// POST /api/llm/parse
// Input: { user_input }
// If "show_events": { intent, message, results[] }; else: {...normalizedIntent, availability}
exports.postParse = async (req, res) => {
  // accept new name; quietly support old clients
  const user_input = (req.body?.user_input ?? "").trim();
  if (!user_input)
    return res.status(400).json({ error: "user_input (string) is required" });

  try {
    // Ask LLM for a structured intent
    const intent = await parseWithLLM(user_input);

    //  Load DB events and resolve event_text to event_id + availability
    const events = await getAllEvents();
    const { normalizedIntent, availability } = hydrateNormalization(
      intent,
      events
    );

    // show list of events with tickets
    if (normalizedIntent.intent === "show_events") {
      const results = events
        .filter((e) => Number(e.ticketsAvailable) > 0)
        .map((e) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          remaining: Number(e.ticketsAvailable) || 0,
        }));
      return res
        .status(200)
        .json({
          intent: normalizedIntent.intent,
          message: normalizedIntent.message,
          results,
        });
    }

    // return proposal + availability
    return res.status(200).json({ ...normalizedIntent, availability });
  } catch (err) {
    // Minimal fallback: if user clearly asked to list events, do so
    try {
      if (/\b(show|list)\s+events\b/i.test(user_input)) {
        const events = await getAllEvents();
        const results = events
          .filter((e) => Number(e.ticketsAvailable) > 0)
          .map((e) => ({
            id: e.id,
            name: e.name,
            date: e.date,
            remaining: Number(e.ticketsAvailable) || 0,
          }));
        return res
          .status(200)
          .json({
            intent: "show_events",
            message: "Here are the upcoming events:",
            results,
          });
      }
    } catch {}

    console.error("[postParse]", err);
    return res
      .status(400)
      .json({ error: "Sorry I couldn't parse that. Try “show events”" });
  }
};

// POST /api/llm/confirm
// Input: { event_id, qty } to { ok, eventId, tickets, remaining } or error codes
exports.postConfirm = async (req, res) => {
  try {
    const event_id = Number(req.body?.event_id);
    const qty = Number(req.body?.qty);

    if (!Number.isInteger(event_id) || event_id <= 0) {
      return res
        .status(400)
        .json({ error: "event_id must be a positive integer" });
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: "qty must be a positive integer" });
    }

    const result = await confirmBookingTxn(event_id, qty);
    if (result.kind === "OK") return res.status(200).json(result.payload);
    if (result.kind === "EVENT_NOT_FOUND")
      return res.status(404).json({ error: "EVENT_NOT_FOUND" });
    if (result.kind === "INSUFFICIENT_TICKETS")
      return res.status(409).json({ error: "INSUFFICIENT_TICKETS" });
    if (result.kind === "DB_BUSY")
      return res.status(503).json({ error: "DB_BUSY" });
    return res.status(500).json({ error: "Unknown error" });
  } catch (err) {
    console.error("[postConfirm]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
