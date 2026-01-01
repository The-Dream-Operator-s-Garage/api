const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const greetingRoutes = require('./routes/greetingRoutes');
const db = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files (CSS, images, fonts, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api', greetingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database connection
db.initialize()
  .then(() => {
    console.log('Database connection initialized');
  })
  .catch((err) => {
    console.error('Database initialization error:', err);
  });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

