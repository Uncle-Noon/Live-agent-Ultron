const fs = require("fs");
const path = require("path");

function sanitizeEmailForFolder(email) {
  if (!email || typeof email !== "string") return "anonymous";
  // Convert to lowercase and replace characters not suitable for file paths
  return email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

// Ask user for a prompt and save it as a standalone .md file
function savePromptAsMarkdown(promptText, response, email) {
  const trimmed = (promptText || "").trim();

  // Timestamp-based filename
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-") // make it filesystem-safe
    .replace("T", "_")
    .slice(0, 19); // keep up to seconds

  const projectRoot = path.join(__dirname);

  let folderPath;
  if (email) {
    const safeEmail = sanitizeEmailForFolder(email);
    // Scope folders inside users/<safeEmail>/prompts
    folderPath = path.join(projectRoot, "users", safeEmail, "prompts");
  } else {
    // Backwards-compatible default: global prompts folder
    folderPath = path.join(projectRoot, "prompts");
  }

  fs.mkdirSync(folderPath, { recursive: true });

  // Single rolling conversation file per user / global scope
  const filePath = path.join(folderPath, "conversation.md");

  // Format response for human readability (avoid raw JSON brackets)
  const formattedResponse = formatResponse(response);

  // Append entry in the requested syntax:
  // {User Prompt} .....
  // {Reply} ... { time stamp }
  const entry = `{User Prompt} ${trimmed}\n{Reply} ${formattedResponse} {${timestamp}}\n\n`;

  // Helper: turn objects into easy-to-read text
  function formatResponse(resp) {
    if (resp == null) return "(no response)";
    if (typeof resp === "string") return resp;
    if (typeof resp === "object") {
      // Prefer intent + reply if present
      const { intent, reply, ...rest } = resp;
      const lines = [];
      if (intent !== undefined) lines.push(`- *Intent: ${intent}`);
      if (reply !== undefined) lines.push(`- *Reply: ${reply}`);
      // Include any additional keys
      for (const [key, value] of Object.entries(rest)) {
        const val = typeof value === "object" ? JSON.stringify(value, null, 2) : value;
        lines.push(`- **${key}:** ${val}`);
      }
      return lines.join("\n");
    }
    return String(resp);
  }

  fs.appendFileSync(filePath, entry, "utf8");
  console.log(`Prompt and response appended to ${filePath}`);
}

module.exports = savePromptAsMarkdown;