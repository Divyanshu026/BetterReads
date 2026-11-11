// Node's HTTP module (Socket.io attaches to the raw HTTP server)
const http = require('http');
// Express application instance (middleware + routes)
const app = require('./app');
// Configuration (reads environment variables via dotenv)
const config = require('./config');
// Database connector (MongoDB via Mongoose)
const db = require('./db');
// Socket.io initialization function (sets up real-time events)
const { initSockets } = require('./sockets');

// Bootstraps the server: connect DB, create HTTP server, attach sockets, start listening
async function start() {
  try {
    if (!config.jwtSecret || config.jwtSecret.length < 32)
      throw new Error('Set JWT_SECRET to at least 32 characters');
    // Connect to MongoDB before accepting requests
    await db.connect();
    // Create an HTTP server from the Express app
    const server = http.createServer(app);

    // Initialize Socket.io on the HTTP server
    app.set('io', initSockets(server));

    // Start listening on the configured port
    server.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });

    // Graceful shutdown: stop accepting connections, then close the DB. Session
    // and email-token expiry is handled by Mongo TTL indexes, so there is no
    // cleanup job to drain here.
    const shutdown = (signal) => {
      console.log(`Received ${signal}, shutting down`);
      server.close(() => {
        require('mongoose')
          .disconnect()
          .finally(() => process.exit(0));
      });
      // Don't hang forever if connections refuse to drain.
      setTimeout(() => process.exit(0), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    // If any step fails, log the error and exit with failure
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
