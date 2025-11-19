const express = require('express');
const router = express.Router();
const { listEvents, purchaseEvent } = require('../controllers/clientController');
const jwtMiddleware = require('../middleware/authMiddleware');

router.get('/events', listEvents);
router.post('/events/:id/purchase', jwtMiddleware, purchaseEvent);

module.exports = router;
