const express = require('express');
const router = express.Router();
const { postParse, postConfirm } = require('../controllers/llmController');

router.post('/llm/parse', postParse);
router.post('/llm/confirm', postConfirm);


module.exports = router;