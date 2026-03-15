const express = require("express");
const router = express.Router();
const {
  handleChat,
  handleLogin,
  getHistory,
} = require("../controllers/chat.controller");

router.post(
  "/chat",
  (req, res, next) => {
    console.log("[Route Layer]");
    next();
  },
  handleChat
);

router.post("/login", handleLogin);
router.get("/history", getHistory);

module.exports = router;