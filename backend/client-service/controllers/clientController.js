const { getAllEvents, purchaseTicket} = require('../models/clientModel');


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

        //if we reach this point we are successful, send updated row.
        return res.status(200).json(result.row);

        
    }
    catch(err)
    {
        //if we reach this point we've encountered a server error.
        return res.status(500).json({error:'Server error failed to purchase tickets'});
    }
}