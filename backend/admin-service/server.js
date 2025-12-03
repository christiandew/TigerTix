// admin-service/server.js
/**
 * Purpose: Bootstraps the Admin microservice HTTP server.
 * Ports:   Runs on 5001 per rubric.
 * Routes:  mounted under /api -> POST /api/events
 */
const express = require('express');
const cors = require('cors');
const routes = require('./routes/adminRoutes');
const { runSetup } = require('./setup');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// init() mounts routes and runs DB setup. Tests can call init() before using `app`.
async function init() {
  await runSetup(); // ensures events table exists & seeds
  app.use('/api', routes); // base path = /api  (router uses '/admin/events')
  return app;
}

function start() {
  init()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    })
    .catch((e) => {
      console.error('[boot] setup failed:', e && e.message ? e.message : e);
      process.exit(1);
    });
}

// When run directly, start the server.
if (require.main === module) start();

module.exports = { app, init, start };
