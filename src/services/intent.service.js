require("dotenv").config();
const fetch = require('node-fetch');
const llmService = require('./llm.service');
const ragService = require('./rag.service');
const toolService = require('./tool.service');
const services = {
  llm: llmService,
  rag: ragService,
  tool: toolService
}


const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const INTENT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5";

const processMessage = async (message) => {
  try {
    const prompt = 
    `Classify the user message.

Return ONE word only:
llm  = normal conversation or general knowledge
tool = requires external tool (weather, search, calculator, API, real-time info)
rag  = needs past memory (chat history, journal, stored documents)

Message: "${message}"`
    ;
    const response = await ai.models.generateContent({
      model: INTENT_MODEL,
      contents: prompt,
    })
    let intent = response.text.trim().toLowerCase();

    intent = intent.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();

    // Fallback to llm if the intent is not recognized
    if (!services[intent]) {
      intent = 'llm';
    }

    // Route the message to the proper service
    const replyStr = await services[intent].handle(message);
    const result = { intent, reply: replyStr };

    // Save prompt and response to markdown file
    const savePromptAsMarkdown = require('../../to_md.js');
    savePromptAsMarkdown(message, result);

    return result;
  }

  catch (error) {
    console.error("Gemini API Error", error);
    require('fs').writeFileSync('gemini-error.txt', error.stack || error.toString());
    try {

    // --- GROQ FALLBACK REQUEST ---
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // your Groq key
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // small cheap model
          messages: [
            {
              role: "user",
              content: `Classify the user message.

Return ONE word only:
llm  = normal conversation or general knowledge
tool = requires external tool (weather, search, calculator, API, real-time info)
rag  = needs past memory (chat history, journal, stored documents)

Message: "${message}"`
            }
          ],
          temperature: 0,  // deterministic output
          max_tokens: 10   // limit token usage
        })
      }
    );

    const data = await groqResponse.json();

    // --- Extract the model reply ---
    let intent = data.choices[0].message.content.trim().toLowerCase();

    // remove markdown formatting if model adds it
    intent = intent.replace(/```/g, '').trim();

    // --- Safety fallback ---
    // if model returns something unexpected
    if (!services[intent]) {
      intent = "llm";
    }

    // --- Route to correct service ---
    const replyStr = await services[intent].handle(message);

    const result = { intent, reply: replyStr };

    // save prompt + response to markdown file
    const savePromptAsMarkdown = require('../../to_md.js');
    savePromptAsMarkdown(message, result);

    return result;

  }
  catch (groqError) {

    console.error("Groq API Error", groqError);

    return {
      intent: "ERROR",
      reply: "Sorry I had trouble processing that"
    };
  }
  }
};
module.exports = { processMessage };
