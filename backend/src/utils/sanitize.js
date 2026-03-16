const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  return email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

function getUserDir(email) {
  const safe = sanitizeEmail(email);
  return safe ? path.join(PROJECT_ROOT, 'users', safe) : null;
}

function getUserPromptsDir(email) {
  const dir = getUserDir(email);
  return dir ? path.join(dir, 'prompts') : null;
}

function getHistoryPath(email) {
  const dir = getUserPromptsDir(email);
  return dir ? path.join(dir, 'conversation.json') : null;
}

function getCommandsPath(email) {
  const dir = getUserDir(email);
  return dir ? path.join(dir, 'commands.json') : null;
}

module.exports = { sanitizeEmail, getUserDir, getUserPromptsDir, getHistoryPath, getCommandsPath };
