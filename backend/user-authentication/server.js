require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 6010;

app.use(express.json());
app.use(cookieParser());

// Allow frontend to send cookies
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true }));

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.json({ service: 'user-authentication', status: 'ok' }));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`User-authentication service running on port ${PORT}`);
});
