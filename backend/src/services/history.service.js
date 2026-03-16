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

// ── Public API ────────────────────────────────────────────────────────────────
async function readHistory(email) {
  if (!email) return [];
  const hit = cache.get(email);
  if (hit) return hit;
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
