const { GoogleGenAI } = require('@google/genai');
const makeLogger = require('../utils/logger');
const { AI_MODEL, AI_RETRIES } = require('../config/app.config');

const log = makeLogger('ai.service');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildSystemInstruction(availableCommands = []) {
  const cmdListStr = availableCommands.length
    ? availableCommands.map(c => `- "${c.keyword}"`).join('\n')
    : '- "open youtube"\n- "open instagram"';

  return `You are Ultron, a personal AI assistant running inside a smart browser UI that has built-in website-opening capabilities.

IMPORTANT — you run inside a command-capable interface. It has predefined quick commands that open websites instantly in a new tab. When you set the "command" field, the UI immediately opens the site — you do NOT need to tell the user to do it manually. The action is automatic.

Available commands the user has defined FOR THIS SESSION (use EXACT keywords below):
${cmdListStr}

When the user asks to open any website, social media, or web app:
1. Set "command" to the EXACT matching keyword from the list above.
2. Set "reply" to a SHORT, confident confirmation like: "Opening YouTube for you!" — never say you can't do it.
3. Set "intent" to "COMMAND"

Reply ONLY with a JSON object in this EXACT format — no markdown fences:
{
  "intent": "<GREETING|QUESTION|TASK|COMMAND|UNKNOWN>",
  "reply": "<response — plain text only, NO markdown, NO asterisks, NO em dashes>",
  "command": "<matched keyword string or null>"
}

Rules:
- Plain text only — no *bold*, no _italic_, no backticks, no em dashes.
- Lists: use plain numbers or plain dashes ( - ) only.
- Be direct and confident. Never say "As an AI…" — just act.
- For COMMAND intent: reply is a brief confirmation only (e.g. "Opening Instagram!", "Launching YouTube!").
- Concise for simple questions; detailed when the user asks for essays, code, etc.
- Respect word limits the user specifies.
- If asked to write something, actually write it.`;
}

async function withRetry(fn) {
  for (let i = 0; i < AI_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      const isQuota = err.status === 429;
      if (isQuota && i < AI_RETRIES - 1) {
        const detail = err.details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
        const delay = parseFloat((detail?.retryDelay || '10s').replace('s', '')) * 1000 || 10_000;
        log.warn(`Quota exceeded, retrying in ${delay / 1000}s…`);
        await new Promise(r => setTimeout(r, delay));
      } else throw err;
    }
  }
}

function parseResponse(rawText) {
  const clean = (rawText || '').trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { intent: 'UNKNOWN', reply: clean, command: null };
  }
}

async function generateReply(contents, { commands = [] } = {}) {
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: AI_MODEL,
      systemInstruction: buildSystemInstruction(commands),
      contents,
      config: { responseMimeType: 'application/json' }
    })
  );
  return parseResponse(response.text);
}

async function generateReplyStream(contents, { onChunk, onDone, onError, commands = [] }) {
  try {
    const stream = await withRetry(() =>
      ai.models.generateContentStream({
        model: AI_MODEL,
        systemInstruction: buildSystemInstruction(commands),
        contents,
        config: { responseMimeType: 'application/json' }
      })
    );
    let full = '';
    for await (const chunk of stream) {
      const piece = chunk.text || '';
      if (piece) { full += piece; onChunk(piece); }
    }
    onDone(parseResponse(full));
  } catch (err) {
    log.error('Stream error:', err.message);
    onError(err);
  }
}

module.exports = { generateReply, generateReplyStream };

