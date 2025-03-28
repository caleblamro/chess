'use strict';

const gameController = require('../controllers/gameController');

async function routes(fastify, options) {
  // Create a new game
  fastify.post('/api/games', gameController.createGame);
  
  // Get a specific game by ID
  fastify.get('/api/games/:id', gameController.getGame);
  
  // Get all available games
  fastify.get('/api/games', gameController.getAvailableGames);
  
  // Make a move in a game
  fastify.post('/api/games/:id/move', gameController.makeMove);
  
  // Register a webhook for game events
  fastify.post('/api/webhooks', gameController.registerWebhook);
}

module.exports = routes;