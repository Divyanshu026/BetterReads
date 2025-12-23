// Mongoose ODM used to connect to MongoDB and define models
const mongoose = require('mongoose');
// Centralized configuration (env-driven values like MONGO_URI)
const config = require('../config');

// Establish a connection to MongoDB using Mongoose
async function connect() {
  // Fail fast with a clear message if the connection string is missing
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is not set in environment');
  }
  // Connect to MongoDB; Mongoose v6+ uses sensible defaults so extra flags are unnecessary
  await mongoose.connect(config.mongoUri, {
    // useNewUrlParser, useUnifiedTopology not needed in mongoose 6+
  });
  // Log once we have an active connection (useful in local dev)
  console.log('Connected to MongoDB');
}

// Export the connect function so server.js can call await db.connect()
module.exports = { connect };
