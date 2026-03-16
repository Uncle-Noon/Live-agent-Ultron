module.exports = {
  APP_NAME: 'ultron-live-agent',
  PORT: Number(process.env.PORT) || 3000,
  MAX_MESSAGE_LENGTH: 4000,
  MAX_HISTORY_ENTRIES: 400,   // stored turns (user + model)
  HISTORY_CONTEXT_TURNS: 40,  // turns sent to Gemini per request
  HISTORY_CACHE_TTL: 30_000,  // ms — in-memory cache TTL
  AI_MODEL: 'gemini-2.0-flash',
  AI_RETRIES: 3,
};
