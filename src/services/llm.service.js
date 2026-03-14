require("dotenv").config();
console.log("GROQ KEY:", process.env.GROQ_API_KEY);
const { GoogleGenAI } = require("@google/genai");
const fetch = require("node-fetch");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const LLM_MODEL = process.env.GEMINI_MODEL || "gemini-1.5";

async function handle(message){
    try {
        const prompt = `
        You are a helpful AI assistant.
        User message: "${message}"
        Respond naturally.
        `;
        const response = await ai.models.generateContent({
            model: LLM_MODEL,
            contents: prompt,
        });

        let reply = response.text.trim();
        reply = reply.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
        return reply;
    }
    catch (error){
        console.error("Gemini API Error", error);
         try {

            const groqResponse = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // 🆕
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile", // 🆕 cheap model
                        messages: [
                            {
                                role: "user",
                                content: `User message: "${message}". Respond naturally.` // 🆕 shorter prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 50 // 🆕 limit cost
                    })
                }
            );

            const data = await groqResponse.json();

            let reply = data.choices[0].message.content.trim();

            // remove markdown formatting
            reply = reply.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();

            return reply;

        }
        catch (groqError){
            console.error("Groq API Error", groqError);
            return "Sorry, I'm having trouble processing your request right now.(LLM Service";
        }
    }
}
module.exports = {handle};
