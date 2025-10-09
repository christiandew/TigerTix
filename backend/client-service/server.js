const express = require('express');
const cors = require('cors');
const routes = require('./routes/clientRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 6001;

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
