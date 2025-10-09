const express = require('express');
const router = express.Router();
const { listEvents, purchaseEvent } = require('../controllers/clientController');

router.get('/events', listEvents);  
router.post('/events/:id/purchase', purchaseEvent);

module.exports = router;