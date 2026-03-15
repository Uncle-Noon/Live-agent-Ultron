const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const fs = require("fs");
const path = require("path");

function getConversationPath(email) {
  if (!email) return null;
  const safeEmail = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  const projectRoot = path.join(__dirname, "..", "..");
  return path.join(projectRoot, "users", safeEmail, "prompts", "conversation.md");
}

const processMessage = async (message, email, file) => {
  try {
    let conversationHistory = "";
    if (email) {
      const convPath = getConversationPath(email);
      if (fs.existsSync(convPath)) {
        conversationHistory = fs.readFileSync(convPath, "utf8");
      }
    }

    const prompt = `
You are an intent detection(personal ai assistant who can perform tasks for the user) bot. Evaluate the user's message like a personal ai assistant.

${conversationHistory ? `Previous conversation history:\n${conversationHistory}\n\n` : ""}

The system supports a few "quick commands" that open a website in the browser when the user asks for it.
The known quick commands are:
  - "open youtube" (opens https://www.youtube.com)
  - "open instagram" (opens https://www.instagram.com)

If the user is asking to open a website or app, convert their phrasing into one of the known quick commands above and set it on the "command" field.
For example: "open yt" -> "open youtube" EXACTLY.

Reply ONLY with a JSON object in this exact format:
{
  "intent": "The detected intent (e.g.,GREETING,QUESTION,TASK)",
  "reply": "A friendly and brief response to the user's message, lenght of message varies based on the user's request but generally should be 1-3 sentences(more if user needs detailed answer or even asks to do something like write a blog post or an essay. Follow users instructions strictly and if user gives any word limit stick to that and try to be as close as possible).",
  "command": "(if the user is asking to open a website or app; the exact normalized quick command the UI should execute, or null)"
}

Ensure that the "reply" value contains NO markdown formatting (such as asterisks *, underscores _, or backticks \`). Respond in RAW PLAIN TEXT only. Do NOT use markdown bold/italics etc. If providing a list, use plain numbers or dashes ( - ) without styling.

If the user asks to do something like write an essay actually write the essay instead of saying something like i will help to to write the essay. Follow the user's instructions strictly and if they give a word limit stick to that word limit and try to be as close as possible.

Don't answer in this way: "As an AI assistant, I can help you with that. Here is the information you requested: ..."
Instead, just provide the information directly in the "reply" field without mentioning that you are an AI assistant.
Try to be as concise as possible in the "reply" field while still providing a helpful and complete answer to the user's message.
Try to keep the "intent" field as specific as possible based on the user's message. For example, if the user is asking a question, set the intent to "QUESTION". If they are greeting, set it to "GREETING". If they are asking you to do a task, set it to "TASK". If you can't determine the intent, set it to "UNKNOWN".
Try to keep the "command" field as specific as possible based on the user's message. If the user is asking to open a website or app, set it to the exact normalized quick command. Otherwise, set it to null.
Try to be to the point and dont reply in this way: "I can help yo to write an essay about..."

User message: "${message}"
    `;

    const isTextFile = file && (
      file.mimetype.startsWith("text/") ||
      ["application/json", "application/javascript"].includes(file.mimetype)
    );

    const contents = file ? [
      {
        role: "user",
        parts: [
          { text: prompt },
          isTextFile ? 
            { text: require("fs").readFileSync(file.path, "utf8") } :
            {
              inlineData: {
                data: require("fs").readFileSync(file.path).toString("base64"),
                mimeType: file.mimetype,
              },
            },
        ],
      },
    ] : prompt;

    let response;
    let retries = 3;
    for (let i = 0; i < retries; i++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: contents,
        });
        break; // Success, exit loop
      } catch (error) {
        if (error.status === 429 && i < retries - 1) {
          const retryDelay = error.details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay || '60s';
          const delayMs = parseFloat(retryDelay.replace('s', '')) * 1000 || 60000;
          console.log(`Quota exceeded, retrying in ${delayMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          throw error;
        }
      }
    }

    let rawText = response.text;
    if (rawText.startsWith('\`\`\`json')) {
      rawText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }
    const result = JSON.parse(rawText);

    // Save prompt and response to markdown file (scoped by user email if provided)
    const savePromptAsMarkdown = require("../../to_md.js");
    savePromptAsMarkdown(message, result, email);

    return result;
  }


  catch (error) {
    console.error("Gemini API Error", error);
    require('fs').writeFileSync('gemini-error.txt', error.stack || error.toString());
    return { intent: "ERROR", reply: "Sorry I had trouble processing that" };
  }
};
module.exports = { processMessage };
