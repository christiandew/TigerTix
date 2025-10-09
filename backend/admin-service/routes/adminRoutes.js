const express = require('express');
const router = express.Router();
const { postCreateEvent } = require('../controllers/adminController');

router.post('/admin/events', postCreateEvent);  //  no leading /api here

module.exports = router;
