'use strict';
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const initDB = require('./config/initDB');

// ── Safe route loader ─────────────────────────────────────────────────────────
// Shows the REAL error (e.g. missing package) instead of the cryptic
// "argument handler must be a function" crash from Express.
function safeRequireRoute(routePath) {
  try {
    const mod = require(routePath);
    if (typeof mod !== 'function') {
      throw new Error(`Route did not export a function. Got: ${typeof mod}`);
    }
    return mod;
  } catch (err) {
    console.error('\n❌ ────────────────────────────────────────────────────');
    console.error(`❌  FAILED TO LOAD: ${routePath}`);
    console.error(`❌  Reason: ${err.message}`);
    if (err.message.includes('Cannot find module')) {
      const pkg = err.message.match(/'([^']+)'/)?.[1];
      console.error(`❌  Missing package: ${pkg}`);
      console.error(`❌  Fix: cd backend && npm install`);
    }
    console.error('❌ ────────────────────────────────────────────────────\n');
    throw err;
  }
}

// ── Load routes ───────────────────────────────────────────────────────────────
const authRoutes      = safeRequireRoute('./routes/authRoutes');
const requestRoutes   = safeRequireRoute('./routes/requestRoutes');
const statsRoutes     = safeRequireRoute('./routes/statsRoutes');
const workflowRoutes  = safeRequireRoute('./routes/workflowRoutes');
const duplicateRoutes = safeRequireRoute('./routes/duplicateRoutes');
const masterRoutes    = safeRequireRoute('./routes/masterRoutes');

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Mount routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/requests',  requestRoutes);
app.use('/api/stats',     statsRoutes);
app.use('/api/workflow',  workflowRoutes);
app.use('/api/duplicate', duplicateRoutes);
app.use('/api/master',    masterRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Material Master API is running' });
});

// ── Start server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await initDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`   API:    http://localhost:${PORT}/api/health`);
      console.log(`   Portal: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
    });
    setInterval(() => {}, 10000);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
