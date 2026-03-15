const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Import routes FIRST
const chatRoutes = require("./routes/chat.routes");
app.use("/api", chatRoutes);

const path = require("path");

// 🔹 Root test interface
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../chat-ui.html"));
});

const PORT = 3000;

// 🔹 Start server LAST
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
