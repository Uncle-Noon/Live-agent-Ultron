const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeEmail(email) {
  if (!email || typeof email !== "string") return null;
  return email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

function getConversationPath(email) {
  const safe = sanitizeEmail(email);
  if (!safe) return null;
  const root = path.join(__dirname, "..", "..");
  return path.join(root, "users", safe, "prompts", "conversation.json");
}

const SYSTEM_INSTRUCTION = `You are a personal AI assistant called Ultron. \
You help the user with tasks, questions, and quick actions like opening websites.

The system supports quick commands that open a website in the browser. \
When the user asks to open a well-known site, set the "command" field to the \
normalized keyword exactly as listed (e.g. "open youtube") so the UI can execute it.

Always reply ONLY with a JSON object in this EXACT format (no markdown fences):
{
  "intent": "<GREETING|QUESTION|TASK|COMMAND|UNKNOWN>",
  "reply": "<your response — plain text only, NO markdown, NO asterisks, NO em dashes>",
  "command": "<normalized command string or null>"
}

Rules:
- "reply" must be plain text — no *bold*, no _italic_, no \`backticks\`, no em dashes.
- If writing a list, use plain numbers or plain dashes ( - ) only.
- Be direct. Do NOT say "As an AI assistant I can help…" — just answer.
- Length: short for simple questions, detailed only if user needs it (e.g. asks for an essay).
- If the user gives a word limit, respect it closely.
- If the user asks you to write something (essay, email, code), actually write it.`;

/**
 * Build a multi-turn contents[] array from saved JSON history.
 * Falls back gracefully if history is missing or corrupt.
 */
function buildContentsFromHistory(email) {
  const convPath = getConversationPath(email);
  if (!convPath || !fs.existsSync(convPath)) return [];

  try {
    const raw = fs.readFileSync(convPath, "utf8");
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];

    // Keep the last 40 turns to stay well within context limits
    return entries.slice(-40).map((entry) => ({
      role: entry.role === "user" ? "user" : "model",
      parts: [{ text: entry.content }],
    }));
  } catch (err) {
    console.error("[intent.service] Failed to parse history:", err.message);
    return [];
  }
}

/**
 * Retry wrapper for Gemini calls with back-off on 429.
 */
async function callWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isQuota = err.status === 429;
      if (isQuota && i < retries - 1) {
        const detail = err.details?.find(
          (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
        );
        const delay = parseFloat((detail?.retryDelay || "10s").replace("s", "")) * 1000 || 10000;
        console.warn(`[intent.service] Quota exceeded, retrying in ${delay / 1000}s…`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

// ─── Standard (non-streaming) ─────────────────────────────────────────────────

const processMessage = async (message, email, file) => {
  try {
    const history = email ? buildContentsFromHistory(email) : [];

    const isTextFile =
      file &&
      (file.mimetype.startsWith("text/") ||
        ["application/json", "application/javascript"].includes(file.mimetype));

    // Build the user turn parts
    const userParts = [{ text: message }];
    if (file) {
      if (isTextFile) {
        userParts.push({ text: fs.readFileSync(file.path, "utf8") });
      } else {
        userParts.push({
          inlineData: {
            data: fs.readFileSync(file.path).toString("base64"),
            mimeType: file.mimetype,
          },
        });
      }
    }

    const contents = [
      ...history,
      { role: "user", parts: userParts },
    ];

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        contents,
      })
    );

    let rawText = (response.text || "").trim();
    // Strip accidental ```json fences
    rawText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    const result = JSON.parse(rawText);

    // Persist to JSON history
    const saveHistory = require("../../to_json.js");
    saveHistory(message, result, email);

    return result;
  } catch (err) {
    console.error("[intent.service] Gemini error:", err.message || err);
    return { intent: "ERROR", reply: "Sorry, I had trouble processing that. Please try again." };
  }
};

// ─── Streaming ────────────────────────────────────────────────────────────────

/**
 * processMessageStream — streams Gemini output via SSE.
 * Sends events:
 *   data: {"chunk":"..."}      — text chunks as they arrive
 *   data: {"done": true, "intent":"...", "command":...}  — final parsed result
 *   data: {"error":"..."}      — on failure
 */
const processMessageStream = async (message, email, res) => {
  try {
    const history = email ? buildContentsFromHistory(email) : [];

    const contents = [
      ...history,
      { role: "user", parts: [{ text: message }] },
    ];

    // Set SSE headers (caller may have already done this, but idempotent)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const stream = await callWithRetry(() =>
      ai.models.generateContentStream({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        contents,
      })
    );

    let fullText = "";
    for await (const chunk of stream) {
      const piece = chunk.text || "";
      if (piece) {
        fullText += piece;
        res.write(`data: ${JSON.stringify({ chunk: piece })}\n\n`);
      }
    }

    // Parse the accumulated JSON from Gemini
    let result;
    try {
      let clean = fullText.trim()
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      result = JSON.parse(clean);
    } catch {
      // If parsing fails, treat entire text as a plain reply
      result = { intent: "UNKNOWN", reply: fullText.trim(), command: null };
    }

    // Persist to history
    const saveHistory = require("../../to_json.js");
    saveHistory(message, result, email);

    // Signal completion with the final structured result
    res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[intent.service] Stream error:", err.message || err);
    res.write(`data: ${JSON.stringify({ error: "Failed to process message." })}\n\n`);
    res.end();
  }
};

module.exports = { processMessage, processMessageStream };
