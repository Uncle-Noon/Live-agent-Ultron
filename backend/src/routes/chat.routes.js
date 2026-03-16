const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { chatLimiter, dataLimiter } = require('../middleware/rateLimiter');
const { validateMessage }          = require('../middleware/validate');
const ctrl = require('../controllers/chat.controller');

const router = express.Router();

// Uploads folder
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

// ── AI routes ──────────────────────────────────────────────────────────────────
router.post('/chat',        chatLimiter, validateMessage, ctrl.handleChat);
router.post('/chat-stream', chatLimiter, validateMessage, ctrl.handleChatStream);
router.post('/chat-vision-stream', chatLimiter, ctrl.handleChatVisionStream);
router.post('/chat-file',   chatLimiter, upload.single('file'), ctrl.handleChatFile);

// ── Auth ───────────────────────────────────────────────────────────────────────
router.post('/login', dataLimiter, ctrl.handleLogin);

// ── History ───────────────────────────────────────────────────────────────────
router.get('/history',    dataLimiter, ctrl.getHistory);
router.delete('/history', dataLimiter, ctrl.deleteHistory);

// ── Commands ───────────────────────────────────────────────────────────────────
router.get('/commands',    dataLimiter, ctrl.getCommands);
router.post('/commands',   dataLimiter, ctrl.addCommand);
router.delete('/commands', dataLimiter, ctrl.deleteCommand);

module.exports = router;