const express = require("express");
const router = express.Router();
const {
  handleChat,
  handleLogin,
  getHistory,
  handleChatFile,
} = require("../controllers/chat.controller");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: "uploads/" });

router.post(
  "/chat",
  (req, res, next) => {
    console.log("[Route Layer]");
    next();
  },
  handleChat
);

router.post("/chat-file", upload.single("file"), handleChatFile);
router.post("/login", handleLogin);
router.get("/history", getHistory);

module.exports = router;