const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const express = require('express');
const cors = require('cors');
const routes = require('./routes/llmRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 7001;

// init mounts routes. Tests can call init() then use `app` with supertest.
async function init() {
  app.use('/api', routes);
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

if (require.main === module) start();

module.exports = { app, init, start };
