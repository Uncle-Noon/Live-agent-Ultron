const express = require('express');
const path = require('path');
const app = express();

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Serve static assets (HTML, JS, CSS)
app.use(express.static(PUBLIC_DIR));

// Fallback HTML page routes
app.get('/',      (_, res) => res.sendFile(path.join(PUBLIC_DIR, 'chat.html')));
app.get('/login', (_, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});
