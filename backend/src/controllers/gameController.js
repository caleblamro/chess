'use strict';

const Game = require('../models/Game');
const Webhook = require('../models/Webhook');
const { v4: uuidv4 } = require('uuid');
const { createNewChessGame, validateMove } = require('../utils/chessLogic');
const { notifyGameUpdate } = require('../services/webhookService');

exports.createGame = async (request, reply) => {
  try {
    const gameId = uuidv4();
    const chessGame = createNewChessGame();
    
    // Create game with explicit safe defaults
    const newGame = new Game({
      gameId,
      fen: chessGame.fen() || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '',  // Explicitly set to empty string for new games
      status: 'waiting_for_opponent',
      moves: [],
      createdAt: new Date()
    });
    
    await newGame.save();
    
    // Notify any webhooks about new game
    notifyGameUpdate(newGame, 'game_created');
    
    return reply.code(201).send({ 
      success: true, 
      game: newGame 
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to create game' 
    });
  }
};

exports.getGame = async (request, reply) => {
  try {
    const { id } = request.params;
    const game = await Game.findOne({ gameId: id });
    
    if (!game) {
      return reply.code(404).send({ 
        success: false, 
        error: 'Game not found' 
      });
    }
    
    return reply.code(200).send({ 
      success: true, 
      game 
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to retrieve game' 
    });
  }
};

exports.getAvailableGames = async (request, reply) => {
  try {
    const games = await Game.find({ status: 'waiting_for_opponent' })
      .sort({ createdAt: -1 })
      .limit(10);
    
    return reply.code(200).send({ 
      success: true, 
      games 
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to retrieve available games' 
    });
  }
};

exports.makeMove = async (request, reply) => {
  try {
    const { id } = request.params;
    const { move, playerColor } = request.body;
    
    const game = await Game.findOne({ gameId: id });
    
    if (!game) {
      return reply.code(404).send({ 
        success: false, 
        error: 'Game not found' 
      });
    }
    
    // Validate and apply the move
    const result = validateMove(game.fen, move, playerColor);
    
    if (!result.valid) {
      return reply.code(400).send({ 
        success: false, 
        error: result.error 
      });
    }
    
    // Update the game with the new state
    game.fen = result.fen;
    game.pgn = result.pgn;
    game.moves.push({
      move,
      playerColor,
      timestamp: new Date()
    });
    
    if (result.gameOver) {
      game.status = result.status;
    } else {
      game.status = 'in_progress';
    }
    
    await game.save();
    
    // Notify webhooks about the move
    notifyGameUpdate(game, 'move_made');
    
    // If the game is over, notify that as well
    if (result.gameOver) {
      notifyGameUpdate(game, 'game_completed');
    }
    
    return reply.code(200).send({ 
      success: true, 
      game 
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to process move' 
    });
  }
};

exports.registerWebhook = async (request, reply) => {
  try {
    const { url, events, gameId } = request.body;
    
    if (!url) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Webhook URL is required' 
      });
    }
    
    const webhookId = uuidv4();
    
    // Create and save the webhook
    const webhook = new Webhook({
      webhookId,
      url,
      events: events || ['game_created', 'player_joined', 'move_made', 'game_completed'],
      gameId, // Optional, can be null/undefined to subscribe to all games
      createdAt: new Date()
    });
    
    await webhook.save();
    
    return reply.code(201).send({ 
      success: true, 
      webhook: {
        id: webhookId,
        url,
        events: webhook.events,
        gameId: webhook.gameId
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to register webhook' 
    });
  }
};