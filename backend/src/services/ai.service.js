const { GoogleGenAI } = require('@google/genai');
const makeLogger = require('../utils/logger');
const { AI_MODEL, AI_RETRIES } = require('../config/app.config');

const log = makeLogger('ai.service');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildSystemInstruction(availableCommands = []) {
  const cmdListStr = availableCommands.length
    ? availableCommands.map(c => {
      // Always show the URL so the AI can identify sites even for opaque keywords like "boga"
      const site = c.url ? `${c.url}` : (c.label || c.keyword);
      const labelNote = (c.label && c.label.toLowerCase() !== c.keyword.toLowerCase()) ? ` (${c.label})` : '';
      return `- "${c.keyword}" → opens ${site}${labelNote}`;
    }).join('\n')
    : '- "open youtube" → opens https://www.youtube.com (YouTube)\n- "open instagram" → opens https://www.instagram.com (Instagram)';

  return `You are Ultron, a personal AI assistant running inside a smart browser UI that has built-in website-opening capabilities.

IMPORTANT — you run inside a command-capable interface. It has predefined quick commands that open websites instantly in a new tab. When you set the "command" field, the UI immediately opens the site — you do NOT need to tell the user to do it manually. The action is automatic.

Available commands the user has defined FOR THIS SESSION (copy one of these EXACT strings into "command"):
${cmdListStr}

When the user asks to open any website, social media, or web app:
1. Look at the URL in the AVAILABLE COMMANDS list above (the part after "→ opens") to understand what each keyword actually opens.
2. Match the user's intent to the SITE that best fits — do NOT repeat a command just because conversation history mentioned it before.
3. Set "command" to the EXACT keyword string of the best matching command — copy it character-for-character.
4. Set "reply" to a SHORT confirmation naming the SAME site as the URL in that command (e.g. if the command opens https://www.youtube.com, say "Opening YouTube for you!").
5. Set "intent" to "COMMAND"
6. If NO command in the list is a reasonable match, set "command" to null and answer normally.

CRITICAL RULES:
- PRIORITIZE INTENT: If the user mentions "reels", "stories", "chatting", or "photos", strongly favor Instagram. If they mention "videos", "shorts", or "watching", strongly favor YouTube.
- NEVER choose a command just because it was used before in the conversation. Always re-evaluate fresh from the list each turn.
- The "reply" and "command" fields must refer to the SAME site. The reply must name the site from the URL, not the keyword name.
- If a keyword is ambiguous (e.g. "khul ja sim sim"), look at its URL to decide if it matches the user's intent. Do NOT guess based on the keyword's sound.
- If the URL contains "youtube.com" it is for videos. If it contains "instagram.com" it is for social/reels.

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
- If asked to write something, actually write it instead of saying something like i will help you to do...
- Follow the user's commands strictly`;
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
      contents,
      config: {
        systemInstruction: buildSystemInstruction(commands),
        responseMimeType: 'application/json'
      }
    })
  );
  return parseResponse(response.text);
}

async function generateReplyStream(contents, { onChunk, onDone, onError, commands = [] }) {
  try {
    const stream = await withRetry(() =>
      ai.models.generateContentStream({
        model: AI_MODEL,
        contents,
        config: {
          systemInstruction: buildSystemInstruction(commands),
          responseMimeType: 'application/json'
        }
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

