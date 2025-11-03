const express = require('express');
const cors = require('cors');
const routes = require('./routes/clientRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 6001;

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
