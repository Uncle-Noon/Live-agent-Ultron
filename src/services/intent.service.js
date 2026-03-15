const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const processMessage = async (message, email) => {
  try {
    const prompt = `
You are an intent detection(personal ai assistant who can perform tasks for the user) bot. Evaluate the user's message like a personal ai assistant.

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

If the user asks to do something like write an essay actually write the essay instead of saying something like i will help to to write the essay. Follow the user's instructions strictly and if they give a word limit stick to that word limit and try to be as close as possible.

Don't answer in this way: "As an AI assistant, I can help you with that. Here is the information you requested: ..."
Instead, just provide the information directly in the "reply" field without mentioning that you are an AI assistant.
Try to be as concise as possible in the "reply" field while still providing a helpful and complete answer to the user's message.
Try to keep the "intent" field as specific as possible based on the user's message. For example, if the user is asking a question, set the intent to "QUESTION". If they are greeting, set it to "GREETING". If they are asking you to do a task, set it to "TASK". If you can't determine the intent, set it to "UNKNOWN".
Try to keep the "command" field as specific as possible based on the user's message. If the user is asking to open a website or app, set it to the exact normalized quick command. Otherwise, set it to null.
Try to be to the point and dont reply in this way: "I can help yo to write an essay about..."

User message: "${message}"
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
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
