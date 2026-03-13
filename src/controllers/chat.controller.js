const { processMessage } = require("../services/intent.service");

const handleChat = async (req, res) => {
  const { message } = req.body;

  const result = await processMessage(message);

  res.json({ result });
};

module.exports = { handleChat };
console.log("[Controller Layer]");