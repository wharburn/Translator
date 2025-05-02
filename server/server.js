/**
 * Main server file for the Live Translator application
 */

// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initCredentials } = require('./config/credentials');

// Import API routes
const speechRoutes = require('./api/speech');
const translateRoutes = require('./api/translate');

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Initialize credentials
const credentialStatus = initCredentials();

// Set credential status in app locals for use in routes
app.locals.credentials = credentialStatus;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

// Root route - serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// API routes
app.use('/api', speechRoutes);
app.use('/api', translateRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Live Translator backend running on port ${port}`);
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
});
