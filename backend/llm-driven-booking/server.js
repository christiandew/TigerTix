const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const express = require('express');
const cors = require('cors');
const routes = require('./routes/llmRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 7001;

(async () => {
  try {
    app.use('/api', routes);
    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error('[boot] setup failed:', e.message);
    process.exit(1);
  }
})();
