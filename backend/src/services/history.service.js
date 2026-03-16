const fsp = require('fs').promises;
const path = require('path');
const makeLogger = require('../utils/logger');
const { MAX_HISTORY_ENTRIES, HISTORY_CONTEXT_TURNS, HISTORY_CACHE_TTL } = require('../config/app.config');
const { getHistoryPath, getUserPromptsDir, sanitizeEmail } = require('../utils/sanitize');

const log = makeLogger('history.service');

// ── In-memory LRU-style cache ─────────────────────────────────────────────────
class HistoryCache {
  constructor(ttl) { this._map = new Map(); this._ttl = ttl; }
  get(k) {
    const item = this._map.get(k);
    if (!item) return null;
    if (Date.now() - item.at > this._ttl) { this._map.delete(k); return null; }
    return item.value;
  }
  set(k, v) { this._map.set(k, { value: v, at: Date.now() }); }
  del(k) { this._map.delete(k); }
}
const cache = new HistoryCache(HISTORY_CACHE_TTL);

// ── Disk helpers ──────────────────────────────────────────────────────────────
async function readFromDisk(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function writeToDisk(filePath, entries) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf8');
}

// ── Migration from legacy .md formats ────────────────────────────────────────
async function migrate(email) {
  const filePath = getHistoryPath(email);
  if (!filePath) return;
  try { await fsp.access(filePath); return; } catch {} // already JSON

  const promptsDir = getUserPromptsDir(email);
  if (!promptsDir) return;

  // Try single conversation.md
  const mdPath = path.join(promptsDir, 'conversation.md');
  let hasMd = false;
  try { await fsp.access(mdPath); hasMd = true; } catch {}

  if (hasMd) {
    try {
      const raw = await fsp.readFile(mdPath, 'utf8');
      const entries = [];
      for (const block of raw.split(/\n\s*\n/).filter(Boolean)) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2 || !lines[0].startsWith('{User Prompt}') || !lines[1].startsWith('{Reply}')) continue;
        const userText = lines[0].replace('{User Prompt}', '').trim();
        let replyText = lines.slice(1).join('\n').replace('{Reply}', '').trim();
        const tsMatch = replyText.match(/\{[^}]*\}\s*$/);
        if (tsMatch) replyText = replyText.slice(0, tsMatch.index).trim();
        const m = replyText.match(/- \*Reply:\s*([\s\S]*?)(?=- \*\*|$)/);
        const reply = m ? m[1].trim() : replyText;
        if (userText) entries.push({ role: 'user', content: userText, timestamp: 0 });
        if (reply)   entries.push({ role: 'model', content: reply,    timestamp: 0 });
      }
      if (entries.length) await writeToDisk(filePath, entries);
      log.info('Migrated conversation.md for', sanitizeEmail(email));
    } catch (err) { log.warn('md migration failed:', err.message); }
    return;
  }

  // Try per-file .md
  try {
    const files = (await fsp.readdir(promptsDir)).filter(f => f.toLowerCase().endsWith('.md')).sort();
    if (!files.length) return;
    const entries = [];
    for (const file of files) {
      try {
        const c = await fsp.readFile(path.join(promptsDir, file), 'utf8');
        const pi = c.indexOf('# Prompt'), ri = c.indexOf('# Response');
        if (pi === -1 || ri === -1) continue;
        const pt = c.slice(pi + 8, ri).trim(), rt = c.slice(ri + 10).trim();
        if (pt) entries.push({ role: 'user',  content: pt, timestamp: 0 });
        if (rt) entries.push({ role: 'model', content: rt, timestamp: 0 });
      } catch {}
    }
    if (entries.length) await writeToDisk(filePath, entries);
  } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────
async function readHistory(email) {
  if (!email) return [];
  const hit = cache.get(email);
  if (hit) return hit;
  await migrate(email);
  const fp = getHistoryPath(email);
  const entries = fp ? await readFromDisk(fp) : [];
  cache.set(email, entries);
  return entries;
}

async function appendHistory(email, userMsg, modelReply) {
  if (!email) return;
  const fp = getHistoryPath(email);
  if (!fp) return;
  const entries = await readFromDisk(fp);
  const now = Date.now();
  if (userMsg)   entries.push({ role: 'user',  content: userMsg,    timestamp: now });
  if (modelReply) entries.push({ role: 'model', content: modelReply, timestamp: now });
  while (entries.length > MAX_HISTORY_ENTRIES) entries.shift();
  await writeToDisk(fp, entries);
  cache.set(email, entries);
}

async function clearHistory(email) {
  if (!email) return;
  const dir = getUserPromptsDir(email);
  if (!dir) return;
  try {
    const files = await fsp.readdir(dir);
    await Promise.all(files.map(f => fsp.unlink(path.join(dir, f)).catch(() => {})));
  } catch {}
  cache.del(email);
}

function buildGeminiContents(entries) {
  return entries.slice(-HISTORY_CONTEXT_TURNS).map(e => ({
    role: e.role === 'user' ? 'user' : 'model',
    parts: [{ text: e.content }],
  }));
}

module.exports = { readHistory, appendHistory, clearHistory, buildGeminiContents };
