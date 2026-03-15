const fs = require("fs");
const path = require("path");
const { processMessage } = require("../services/intent.service");

function sendDebugLog(payload) {
  // #region agent log
  fetch("http://127.0.0.1:7871/ingest/33f09435-a8d0-4286-b25c-dc72c67b9064", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "4ed34f",
    },
    body: JSON.stringify({
      sessionId: "4ed34f",
      runId: "pre-fix",
      hypothesisId: payload.hypothesisId || "H1",
      location: payload.location,
      message: payload.message,
      data: payload.data || {},
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
}

function sanitizeEmailForFolder(email) {
  if (!email || typeof email !== "string") return "anonymous";
  return email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

const getUserPromptsDir = (email) => {
  const safeEmail = sanitizeEmailForFolder(email);
  const projectRoot = path.join(__dirname, "..", "..");
  return path.join(projectRoot, "users", safeEmail, "prompts");
};

const handleChat = async (req, res) => {
  const { message, email } = req.body || {};

  sendDebugLog({
    hypothesisId: "H1",
    location: "chat.controller.js:handleChat:entry",
    message: "handleChat called",
    data: { hasMessage: typeof message === "string", hasEmail: !!email },
  });

  if (!message || typeof message !== "string") {
    sendDebugLog({
      hypothesisId: "H1",
      location: "chat.controller.js:handleChat:validation",
      message: "Invalid message payload",
      data: { messageType: typeof message },
    });
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const result = await processMessage(message, email);

    sendDebugLog({
      hypothesisId: "H2",
      location: "chat.controller.js:handleChat:afterProcess",
      message: "processMessage succeeded",
      data: {
        hasResult: !!result,
        intent: result && result.intent,
      },
    });

    res.json({ result });
  } catch (err) {
    sendDebugLog({
      hypothesisId: "H3",
      location: "chat.controller.js:handleChat:catch",
      message: "processMessage threw error",
      data: { error: err && err.message ? err.message : String(err) },
    });
    res
      .status(500)
      .json({ error: "Failed to process message on server side." });
  }
};

const handleLogin = (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ success: false, error: "Email is required." });
  }

  const trimmed = email.trim();
  if (!trimmed.includes("@")) {
    return res
      .status(400)
      .json({ success: false, error: "Please enter a valid email address." });
  }

  const safeEmail = sanitizeEmailForFolder(trimmed);
  const projectRoot = path.join(__dirname, "..", "..");

  const globalPromptsDir = path.join(projectRoot, "prompts");
  const userDir = path.join(projectRoot, "users", safeEmail);
  const userPromptsDir = path.join(userDir, "prompts");

  fs.mkdirSync(userPromptsDir, { recursive: true });

  // If there is an existing global prompts folder, move its contents under this user once.
  try {
    if (fs.existsSync(globalPromptsDir)) {
      const entries = fs.readdirSync(globalPromptsDir);
      if (entries.length > 0) {
        entries.forEach((entry) => {
          const fromPath = path.join(globalPromptsDir, entry);
          const toPath = path.join(userPromptsDir, entry);
          if (!fs.existsSync(toPath)) {
            fs.renameSync(fromPath, toPath);
          }
        });
      }
    }
  } catch (err) {
    console.warn("Failed to migrate existing prompts folder:", err);
  }

  return res.json({
    success: true,
    email: trimmed,
    folder: userDir,
  });
};

const getHistory = (req, res) => {
  const email = req.query.email;

  if (!email || typeof email !== "string") {
    return res.json({ history: [] });
  }

  const promptsDir = getUserPromptsDir(email);

  if (!fs.existsSync(promptsDir)) {
    return res.json({ history: [] });
  }

  const conversationPath = path.join(promptsDir, "conversation.md");

  // If new single-file format does not exist yet, fall back to old per-file format
  if (!fs.existsSync(conversationPath)) {
    let files;
    try {
      files = fs
        .readdirSync(promptsDir)
        .filter((f) => f.toLowerCase().endsWith(".md"))
        .sort();
    } catch (err) {
      console.error("Failed to read prompts dir for history", err);
      return res.status(500).json({ error: "Failed to load history" });
    }

    const messages = [];

    files.forEach((file) => {
      try {
        const fullPath = path.join(promptsDir, file);
        const content = fs.readFileSync(fullPath, "utf8");

        const promptIndex = content.indexOf("# Prompt");
        const responseIndex = content.indexOf("# Response");

        if (promptIndex === -1 || responseIndex === -1) return;

        const promptText = content
          .slice(promptIndex + "# Prompt".length, responseIndex)
          .trim();
        const responseText = content
          .slice(responseIndex + "# Response".length)
          .trim();

        if (promptText) {
          messages.push({ role: "user", content: promptText });
        }
        if (responseText) {
          messages.push({ role: "bot", content: responseText });
        }
      } catch (err) {
        console.warn("Failed to parse history file", file, err);
      }
    });

    return res.json({ history: messages });
  }

  // Parse single conversation file with syntax:
  // {User Prompt} .....
  // {Reply} ... { time stamp }
  //
  // {Next User prompt} ...
  let content;
  try {
    content = fs.readFileSync(conversationPath, "utf8");
  } catch (err) {
    console.error("Failed to read conversation history file", err);
    return res.status(500).json({ error: "Failed to load history" });
  }

  const messages = [];
  const blocks = content.split(/\n\s*\n/).filter(Boolean);

  blocks.forEach((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return;

    const userLine = lines[0];
    const replyLine = lines[1];

    if (!userLine.startsWith("{User Prompt}")) return;
    if (!replyLine.startsWith("{Reply}")) return;

    const userText = userLine.replace("{User Prompt}", "").trim();

    // Remove trailing {timestamp} if present
    let replyText = replyLine.replace("{Reply}", "").trim();
    const tsMatch = replyText.match(/\{[^}]*\}\s*$/);
    if (tsMatch) {
      replyText = replyText.slice(0, tsMatch.index).trim();
    }

    if (userText) {
      messages.push({ role: "user", content: userText });
    }
    if (replyText) {
      messages.push({ role: "bot", content: replyText });
    }
  });

  return res.json({ history: messages });
};

module.exports = { handleChat, handleLogin, getHistory };
console.log("[Controller Layer]");