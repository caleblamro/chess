'use strict';

const fastify = require('fastify')({
  logger: true
});
const cors = require('@fastify/cors');
const websocket = require('@fastify/websocket');
const gameRoutes = require('./routes/gameRoutes');
const mongoose = require('mongoose');
const { setupWebSocketConnection } = require('./services/socketService');

// Register plugins
fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// Register WebSocket plugin
fastify.register(websocket);

// Connect to MongoDB
mongoose.connect(`mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Register routes
fastify.register(gameRoutes);

// Register WebSocket handler - MUST be done before server.listen()
fastify.register(function (fastify, opts, done) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    setupWebSocketConnection(connection, fastify);
  });
  
  done();
});

module.exports = fastify;