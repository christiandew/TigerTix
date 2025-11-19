const express = require('express');
const router = express.Router();
const { postParse, postConfirm } = require('../controllers/llmController');
const jwtMiddleware = require('../middleware/authMiddleware');

router.post('/llm/parse', postParse);
router.post('/llm/confirm', jwtMiddleware, postConfirm);

module.exports = router;
