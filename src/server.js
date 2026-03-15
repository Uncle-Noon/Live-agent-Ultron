const express = require("express");
const cors = require("cors");
require("dotenv").config();

const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Serve static assets (HTML, JS, etc.) so module imports work in the browser
//    This makes paths like /src/services/tool.service.js available.
app.use(express.static(path.join(__dirname, "..")));

// 🔹 Import routes AFTER middleware
const chatRoutes = require("./routes/chat.routes");
app.use("/api", chatRoutes);

// 🔹 Root test interface
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../chat-ui.html"));
});

// 🔹 Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../login.html"));
});

const PORT = 3000;

// 🔹 Start server LAST
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);

  // Open the login page in the default browser on server start
  try {
    const { exec } = require("child_process");
    const url = `http://localhost:${PORT}/login`;

    if (process.platform === "win32") {
      exec(`start "" "${url}"`);
    } else if (process.platform === "darwin") {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch (err) {
    console.warn("Failed to auto-open login page:", err);
  }
});
