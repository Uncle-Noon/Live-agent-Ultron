const express = require("express");
const router = express.Router();
const { handleChat } = require("../controllers/chat.controller");

router.post("/chat", (req, res, next) => {
  console.log("[Route Layer]");
  next();
}, handleChat);

module.exports = router;