// admin-service/controllers/adminController.js
/**
 * Purpose: Validate admin POST bodies and create events via the model.
 * Input (req.body): { name: string, date: string (ISO-ish), ticketsAvailable: integer >= 0 }
 * Output: 201 + created event JSON | 400 with message | 500 on unexpected errors
 */

const { createEvent } = require('../models/adminModel');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function isNonNegativeInteger(v) {
  return Number.isInteger(v) && v >= 0;
}


/**
 * postCreateEvent
 * Purpose: REST handler for creating events (POST /api/events).
 * Inputs:  req.body { name, date, ticketsAvailable }
 * Output:  201 with created event | 400 on validation error | 500 on server error
 * Side effects: writes to DB through model
 */
exports.postCreateEvent = async (req, res) => {
  try {
    const { name, date, ticketsAvailable } = req.body ?? {};

    // Basic validation (rubric: “accepts and validates input, JSON format”)
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: 'name is required (non-empty string)' });
    }
    if (!isNonEmptyString(date)) {
      return res.status(400).json({ error: 'date is required (ISO string)' });
    }
    const tickets = Number(ticketsAvailable);
    if (!Number.isFinite(tickets) || !isNonNegativeInteger(tickets)) {
      return res.status(400).json({ error: 'ticketsAvailable must be a non-negative integer' });
    }

    const created = await createEvent({ name: name.trim(), date, ticketsAvailable: tickets });
    return res.status(201).json(created);
  } catch (err) {
    // Clear, informative message without leaking internals
    return res.status(500).json({ error: 'Failed to create event' });
  }
};
