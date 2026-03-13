const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Create readline interface for interactive prompt
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Ask user for a prompt and save it as .md
rl.question("Type your prompt: ", (promptText) => {
  const trimmed = promptText.trim();
  if (!trimmed) {
    console.log("No prompt provided. Exiting.");
    rl.close();
    return;
  }

  // Timestamp-based filename
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-") // make it filesystem-safe
    .replace("T", "_")
    .slice(0, 19); // keep up to seconds

  const fileName = `prompt_${timestamp}.md`;

  // Save in the same directory as this script
  const filePath = path.join(__dirname, fileName);

  // Simple markdown content
  const content = `# Prompt\n\n${trimmed}\n`;

  fs.writeFile(filePath, content, "utf8", (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
      console.log(`Markdown file created: ${filePath}`);
    }
    rl.close();
  });
});