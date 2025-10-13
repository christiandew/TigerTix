// client-service/controllers/clientController.js
// Purpose: HTTP layer for the client microservice (list events & purchase flow).
// Notes: Keep handlers thin; delegate DB work to the model. Status codes map to rubric.

const { getAllEvents, purchaseTicket} = require('../models/clientModel');



/**
 * listEvents
 * Purpose: Return the full list of events for the client API.
 * Inputs:  (req) none
 * Output:  200 JSON array on success; 500 on server error
 * Side effects: none
 */ 
exports.listEvents = async (req, res) => {
    try
    {
        const events = await getAllEvents();
        return res.status(200).json(events);
    }
    catch(err)
    {
        return res.status(500).json({ error: 'Failed to fetch events' });
    }
}


/**
 * purchaseEvent
 * Purpose: Decrease ticket count for a given event ID (simulated purchase).
 * Inputs:  (req.params.id) event id as number
 * Output:  200 with updated row on success
 *          400 if id is invalid
 *          404 if event not found
 *          409 if no tickets are available
 *          500 for unexpected server errors
 * Side effects: writes to DB via model (transactional)
 */
exports.purchaseEvent = async(req, res) => {
    try
    {
        //ensure id input is a number and is above 1
        const id = Number.parseInt(req.params.id, 10);
        if(!Number.isInteger(id) || id < 1)
        {
            return res.status(400).json({error: 'Invalid Event ID Input'});
        }

        const result = await purchaseTicket(id);

        //parse errors from model function
        if(result.kind === 'EVENT NOT FOUND IN DB')
            return res.status(404).json({error: result.kind});
        if(result.kind === 'NO TICKETS AVAILABLE')
            return res.status(409).json({error: result.kind});
        if(result.kind === 'DB BUSY')
            return res.status(503).json({error: result.kind});

        //if we reach this point we are successful, send updated row.
        return res.status(200).json(result.row);

        
    }
    catch(err)
    {
        //if we reach this point we've encountered a server error.
        console.error('[purchaseEvent] unexpected error:', err && err.stack ? err.stack : err);
        return res.status(500).json({error:'Server error failed to purchase tickets'});
    }
}