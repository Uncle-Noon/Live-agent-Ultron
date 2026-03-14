const fs = require("fs");
const path = require("path");

// Ask user for a prompt and save it as .md
  function savePromptAsMarkdown(promptText, response) {
  const trimmed = promptText.trim();

  // Timestamp-based filename
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-") // make it filesystem-safe
    .replace("T", "_")
    .slice(0, 19); // keep up to seconds

  const fileName = `prompt.md`;

  // Save in the same directory as this script
  const folderPath = './prompts';

  fs.mkdirSync(folderPath, { recursive: true });

  const filePath = path.join(folderPath , fileName);

  // Simple markdown content
  const content = `${timestamp}\n# Prompt\n${trimmed}\n# Response\n${response}\n\n\n`;

  fs.appendFile(filePath, content, "utf8", (err) => {
    if (err) {
      console.error("Error writing file:", err);
    }
  });
};

module.exports = savePromptAsMarkdown;