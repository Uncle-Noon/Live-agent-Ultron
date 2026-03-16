const { MAX_MESSAGE_LENGTH } = require('../config/app.config');

function validateMessage(req, res, next) {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required.' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} chars).` });
  }
  next();
}

function validateEmail(req, res, next) {
  const email = req.body?.email || req.query?.email;
  if (!email || typeof email !== 'string' || !String(email).trim().includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  next();
}

module.exports = { validateMessage, validateEmail };
