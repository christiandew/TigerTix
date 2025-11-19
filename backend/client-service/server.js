const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const routes = require('./routes/clientRoutes');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(cookieParser());
app.use(express.json());

const PORT = 6001;

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
