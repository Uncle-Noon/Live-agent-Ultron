require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express     = require('express');
const cors        = require('cors');
const compression = require('compression');
const path        = require('path');
const makeLogger  = require('./utils/logger');
const { PORT }    = require('./config/app.config');
const chatRoutes  = require('./routes/chat.routes');

const log = makeLogger('server');
const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(compression());           // gzip all responses
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API ───────────────────────────────────────────────────────────────────────
app.use('/api', chatRoutes);

// ── Start ─────────────────────────────────────────────────────────────────────
const BACKEND_PORT = 5000;
app.listen(BACKEND_PORT, () => {
  log.info(`Backend API running at http://localhost:${BACKEND_PORT}`);
});
