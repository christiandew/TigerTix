//const { getAllEvents, purchaseTicket} = require('../models/'); fix later


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_MODEL = "gpt-4o-mini";
const OPENAI_API_MAX_TOKENS = 200;

const SYSTEM_PROMPT = `You are the TigerTix Booking Parser. Convert the user’s message into a JSON object that EXACTLY matches the provided BookingIntent JSON Schema.

Allowed intents: greet, show_events, propose_booking, confirm, help, unknown.
Do not book tickets or call external systems—only parse.

Rules:
- Default tickets = 1 if not stated.
- event_text must be the verbatim event mention from the user (e.g., "Jazz Night").
- If you cannot confidently match an event, set normalized.event_id = null and include a brief follow_up question that would clarify the event.
- If a date is clearly specified, include it in constraints.date (simple human text like “Oct 25” or “Friday” is fine).
- Always include a numeric confidence from 0 to 1.
- Output JSON ONLY, no prose, exactly conforming to the schema.`;

const BOOKING_INTENT_SCHEMA = {
  name: "BookingIntent",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      intent:      { type: "string", enum: ["greet","show_events","propose_booking","confirm","help","unknown"] },
      event_text:  { type: "string",  minLength: 0 },
      tickets:     { type: "integer", minimum: 1 },
      constraints: {
        type: "object",
        additionalProperties: false,
        properties: {
          date: { type: "string", minLength: 1 }
        }
      },
      confidence:  { type: "number",  minimum: 0, maximum: 1 },
      follow_up:   { type: "string" },
      normalized:  {
        type: "object",
        additionalProperties: false,
        properties: {
          event_id: { type: ["integer","null"] }
        }
      }
    },
    required: ["intent","tickets","event_text","confidence","normalized"]
  }
}


exports.postParse(request_body) = async (req, res) => 
{
    try
    {

    }
    catch(err)
    {

    }
}

exports.postConfirm = async(req, res) => 
{
    try
    {
 
    }
    catch(err)
    {
        //if we reach this point we've encountered a server error.

    }
}