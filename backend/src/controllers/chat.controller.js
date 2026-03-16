const fsp = require('fs').promises;
const path = require('path');
const makeLogger = require('../utils/logger');
const { getUserPromptsDir } = require('../utils/sanitize');
const aiSvc  = require('../services/ai.service');
const histSvc = require('../services/history.service');
const cmdSvc  = require('../services/commands.service');

const log = makeLogger('chat.controller');

// ── Shared helper: build history + new user turn ──────────────────────────────
async function buildContents(email, userText) {
  const history = await histSvc.readHistory(email).catch(() => []);
  return [...histSvc.buildGeminiContents(history), { role: 'user', parts: [{ text: userText }] }];
}

// ── Chat (standard) ───────────────────────────────────────────────────────────
const handleChat = async (req, res) => {
  const { message, email } = req.body;
  try {
    const contents = await buildContents(email, message);
    const commands = await cmdSvc.getCommands(email).catch(() => []);
    const result   = await aiSvc.generateReply(contents, { commands });
    await histSvc.appendHistory(email, message, result.reply).catch(() => {});
    res.json({ result });
  } catch (err) {
    log.error('handleChat:', err.message);
    res.status(500).json({ error: 'Failed to process message.' });
  }
};

// ── Chat (streaming SSE) ──────────────────────────────────────────────────────
const handleChatStream = async (req, res) => {
  const { message, email } = req.body;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const contents = await buildContents(email, message).catch(() => []);
  const commands = await cmdSvc.getCommands(email).catch(() => []);

  await aiSvc.generateReplyStream(contents, {
    commands,
    onChunk: (chunk) => send({ chunk }),
    onDone: async (result) => {
      await histSvc.appendHistory(email, message, result.reply).catch(() => {});
      send({ done: true, ...result });
      res.end();
    },
    onError: (err) => { send({ error: err.message || 'Stream error.' }); res.end(); },
  });
};

// ── Chat with file attachment ─────────────────────────────────────────────────
const handleChatFile = async (req, res) => {
  const { message, email } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded.' });

  const { MAX_MESSAGE_LENGTH } = require('../config/app.config');
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} chars).` });
  }

  try {
    const isText = file.mimetype.startsWith('text/') ||
      ['application/json', 'application/javascript'].includes(file.mimetype);
    const filePart = isText
      ? { text: await fsp.readFile(file.path, 'utf8') }
      : { inlineData: { data: (await fsp.readFile(file.path)).toString('base64'), mimeType: file.mimetype } };

    const msgText  = `[File: ${file.originalname}] ${message || ''}`;
    const history  = await histSvc.readHistory(email).catch(() => []);
    const commands = await cmdSvc.getCommands(email).catch(() => []);
    const contents = [
      ...histSvc.buildGeminiContents(history),
      { role: 'user', parts: [{ text: msgText }, filePart] },
    ];
    const result = await aiSvc.generateReply(contents, { commands });
    await histSvc.appendHistory(email, msgText, result.reply).catch(() => {});
    fsp.unlink(file.path).catch(() => {});
    res.json({ result });
  } catch (err) {
    log.error('handleChatFile:', err.message);
    fsp.unlink(file.path).catch(() => {});
    res.status(500).json({ error: 'Failed to process file.' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const handleLogin = async (req, res) => {
  const email = (req.body?.email || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required.' });
  }
  const promptsDir = getUserPromptsDir(email);
  if (promptsDir) await fsp.mkdir(promptsDir, { recursive: true }).catch(() => {});

  // Migrate old global prompts folder if present
  const globalDir = path.join(__dirname, '..', '..', 'prompts');
  try {
    const entries = await fsp.readdir(globalDir);
    await Promise.all(entries.map(async (e) => {
      const to = path.join(promptsDir, e);
      try { await fsp.access(to); } catch { await fsp.rename(path.join(globalDir, e), to).catch(() => {}); }
    }));
  } catch {}

  res.json({ success: true, email });
};

// ── History ───────────────────────────────────────────────────────────────────
const getHistory = async (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ history: [] });
  try {
    const entries = await histSvc.readHistory(email);
    res.json({ history: entries.map(e => ({ role: e.role === 'user' ? 'user' : 'bot', content: e.content })) });
  } catch { res.json({ history: [] }); }
};

const deleteHistory = async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ success: false, error: 'email required.' });
  try {
    await histSvc.clearHistory(email);
    res.json({ success: true });
  } catch (err) {
    log.error('deleteHistory:', err.message);
    res.status(500).json({ success: false, error: 'Failed to clear history.' });
  }
};

// ── Commands ──────────────────────────────────────────────────────────────────
const getCommands = async (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ commands: [] });
  const commands = await cmdSvc.getCommands(email).catch(() => []);
  res.json({ commands });
};

const addCommand = async (req, res) => {
  const { email, keyword, label } = req.body || {};
  let { url } = req.body || {};
  if (!email || !keyword || !url) {
    return res.status(400).json({ success: false, error: 'email, keyword, and url are required.' });
  }
  // Normalize: add https:// if the user omitted the protocol
  if (!/^https?:\/\//i.test(url.trim())) url = 'https://' + url.trim();
  // Validate: must look like a real domain (hostname.tld) — rejects 'asdfasdf', 'hello!!!'
  let _validHost = false;
  try { _validHost = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(new URL(url).hostname); } catch {}
  if (!_validHost) {
    return res.status(400).json({ success: false, error: 'Please enter a real website URL (e.g. instagram.com).' });
  }
  try {
    const commands = await cmdSvc.addCommand(email, { keyword, url, label });
    res.json({ success: true, commands });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};


const deleteCommand = async (req, res) => {
  const { email, keyword } = req.query;
  if (!email || !keyword) return res.status(400).json({ success: false, error: 'email and keyword required.' });
  const commands = await cmdSvc.deleteCommand(email, keyword).catch(() => []);
  res.json({ success: true, commands });
};

module.exports = {
  handleChat, handleChatStream, handleChatFile,
  handleLogin, getHistory, deleteHistory,
  getCommands, addCommand, deleteCommand,
};