const fs = require("fs");
const path = require("path");

// Ask user for a prompt and save it as a standalone .md file
function savePromptAsMarkdown(promptText, response) {
  const trimmed = promptText.trim();

  // Timestamp-based filename
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-") // make it filesystem-safe
    .replace("T", "_")
    .slice(0, 19); // keep up to seconds

  const fileName = `prompt_${timestamp}.md`;

  // Save in a folder next to this script
  const folderPath = './prompts';

  fs.mkdirSync(folderPath, { recursive: true });

  const filePath = path.join(folderPath, fileName);

  // Format response for human readability (avoid raw JSON brackets)
  const formattedResponse = formatResponse(response);

  // Simple markdown content
  const content = `# Saved at ${timestamp}\n# Prompt\n${trimmed}\n# Response\n${formattedResponse}`;

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

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Prompt and response saved to ${filePath}`);
}

module.exports = savePromptAsMarkdown;