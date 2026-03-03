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

// 🔹 Root test interface
app.get("/", (req, res) => {
  res.send(`
    <h2>Ultron Test Interface</h2>
    <form method="POST" action="/api/chat">
      <input name="message" placeholder="Type message" />
      <button type="submit">Send</button>
    </form>
  `);
});

const PORT = 3000;

// 🔹 Start server LAST
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});