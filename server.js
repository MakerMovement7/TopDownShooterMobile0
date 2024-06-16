const express = require('express');
const expressStaticGzip = require('express-static-gzip');
const WebSocket = require('ws');
const path = require('path');

const app = express();
let server;
const initialPort = process.env.PORT || 4000; // Use a higher default port like 4000

const startServer = (port) => {
  console.log(`Attempting to start server on port ${port}...`);

  server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1); // Try the next port
    } else {
      console.error('Server error:', err);
    }
  });

  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
      console.log(`Received message => ${message}`);
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Handle graceful shutdown
  const shutdown = () => {
    if (server) {
      server.close(() => {
        console.log('HTTP server closed.');
      });
    }
    process.exit();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGUSR2', shutdown);
};

// Serve static files with Gzip compression
app.use('/', expressStaticGzip(path.join(__dirname, '.'), {
  enableBrotli: true,
  orderPreference: ['br', 'gz']
}));

// Serve the WebGL build files directly
app.use(express.static(path.join(__dirname, '.')));

// Serve the WebGL build index file on the root route
app.get('/', (req, res) => {
  console.log('Serving index.html');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
startServer(initialPort);
