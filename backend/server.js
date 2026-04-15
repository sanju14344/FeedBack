const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('FeedbackPulse Node.js Backend API');
});

// Export for Vercel serverless
module.exports = app;

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
