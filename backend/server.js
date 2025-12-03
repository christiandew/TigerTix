// backend/server.js
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { runSetup } = require('./admin-service/setup');
const adminRoutes = require('./admin-service/routes/adminRoutes');
const clientRoutes = require('./client-service/routes/clientRoutes');
const authRoutes = require('./user-authentication/routes/authRoutes');
const llmRoutes = require('./llm-driven-booking/routes/llmRoutes');

const app = express();
const PORT = process.env.PORT || 8080;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// Ensure all services use the same DB path
process.env.DB_PATH = process.env.DB_PATH || path.join(__dirname, 'shared-db', 'database.sqlite');

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Mount routers
app.use('/api', adminRoutes);          // POST /api/admin/events
app.use('/api', clientRoutes);         // /api/events, /api/events/:id/purchase (auth middleware inside)
app.use('/api/auth', authRoutes);      // /api/auth/*
app.use('/api', llmRoutes);            // /api/llm/parse, /api/llm/confirm

app.get('/health', (req, res) => res.json({ ok: true }));

async function start() {
  try {
    await runSetup();
    app.listen(PORT, () => console.log(`TigerTix backend on ${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

if (require.main === module) start();
module.exports = { app, start };
