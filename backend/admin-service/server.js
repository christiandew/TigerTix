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

const PORT = 5001;


/**
 * start
 * Purpose: run DB setup then start Express
 * Inputs:  none
 * Output:  none (process listens on PORT)
 * Side effects: initializes DB; logs boot messages
 */
(async () => {
  try {
    await runSetup();              // <- ensures events table exists & seeds (if any)
    app.use('/api', routes);       // base path = /api  (router uses '/admin/events')
    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error('[boot] setup failed:', e.message);
    process.exit(1);
  }
})();
