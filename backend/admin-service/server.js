// admin-service/server.js
const express = require('express');
const cors = require('cors');
const routes = require('./routes/adminRoutes');
const { runSetup } = require('./setup');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5001;

(async () => {
  try {
    await runSetup();              // ← ensures events table exists & seeds (if any)
    app.use('/api', routes);       // base path = /api  (router uses '/admin/events')
    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error('[boot] setup failed:', e.message);
    process.exit(1);
  }
})();
