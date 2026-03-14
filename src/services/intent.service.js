const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const processMessage = async (message) => {
  try {
    const prompt = `
    You are an intent detection bot. Evaluate the user's message.
    Reply ONLY with a JSON object in this exact format:
    {
      "intent": "The detected intent (e.g.,GREETING,QUESTION,TASK)",
      "reply": "A friendly and brief response to the user's message"
    }
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
    
    // Save prompt and response to markdown file
    const savePromptAsMarkdown = require('../../to_md.js');
    savePromptAsMarkdown(message, result);
    
    return result;
  }

  catch (error) {
    console.error("Gemini API Error", error);
    require('fs').writeFileSync('gemini-error.txt', error.stack || error.toString());
    return { intent: "ERROR", reply: "Sorry I had trouble processing that" };
  }
};
module.exports = { processMessage };
