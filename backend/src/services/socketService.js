'use strict';

const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const { validateMove, createNewChessGame } = require('../utils/chessLogic');
const { notifyGameUpdate } = require('./webhookService');

// Store active connections
const connections = new Map();
// Store game subscriptions
const gameSubscriptions = new Map();

function setupWebSocketConnection(connection, fastify) {
  const clientId = uuidv4();
  
  // Store the connection
  connections.set(clientId, {
    connection,
    games: new Set()
  });
  
  console.log(`Client connected: ${clientId}`);
  
  // Handle incoming messages
  connection.socket.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'join_game':
          await handleJoinGame(clientId, data.gameId);
          break;
          
        case 'create_game':
          await handleCreateGame(clientId);
          break;
          
        case 'make_move':
          await handleMakeMove(clientId, data.gameId, data.move, data.playerColor);
          break;
          
        case 'leave_game':
          handleLeaveGame(clientId, data.gameId);
          break;
        
        case 'get_available_games':
          await handleGetAvailableGames(clientId);
          break;
          
        default:
          sendToClient(clientId, {
            type: 'error',
            message: 'Unknown message type'
          });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      sendToClient(clientId, {
        type: 'error',
        message: 'Failed to process message'
      });
    }
  });
  
  // Handle disconnection
  connection.socket.on('close', () => {
    handleDisconnect(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });
}

async function handleCreateGame(clientId) {
  try {
    // Create a new game
    const gameId = uuidv4();
    const chessGame = createNewChessGame();
    
    // Create and save the game with explicit safe defaults for required fields
    const newGame = new Game({
      gameId,
      fen: chessGame.fen() || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '',  // Explicitly set to empty string for new games
      status: 'waiting_for_opponent',
      moves: [],
      createdAt: new Date()
    });
    
    console.log('Creating new game with data:', {
      gameId: newGame.gameId,
      fen: newGame.fen,
      pgn: newGame.pgn,
      status: newGame.status
    });
    
    await newGame.save();
    
    // Subscribe the client to the game
    subscribeToGame(clientId, gameId);
    
    // Notify the client
    sendToClient(clientId, {
      type: 'game_created',
      game: newGame
    });
    
    // Notify webhooks
    notifyGameUpdate(newGame, 'game_created');
    
    // Broadcast to clients waiting for games
    broadcastNewGame(newGame);
    
  } catch (error) {
    console.error('Error creating game:', error);
    sendToClient(clientId, {
      type: 'error',
      message: 'Failed to create game'
    });
  }
}

async function handleJoinGame(clientId, gameId) {
  try {
    console.log(`Client ${clientId} attempting to join game ${gameId}`);
    
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      console.log(`Game ${gameId} not found`);
      return sendToClient(clientId, {
        type: 'error',
        message: 'Game not found'
      });
    }
    
    console.log(`Game ${gameId} found with status: ${game.status}`);
    
    if (game.status !== 'waiting_for_opponent') {
      console.log(`Game ${gameId} already has both players (status: ${game.status})`);
      return sendToClient(clientId, {
        type: 'error',
        message: 'Game already has both players'
      });
    }
    
    // Subscribe the client to the game
    subscribeToGame(clientId, gameId);
    console.log(`Client ${clientId} subscribed to game ${gameId}`);
    
    // Update game status
    game.status = 'in_progress';
    await game.save();
    console.log(`Game ${gameId} status updated to in_progress`);
    
    // Send direct confirmation to the joining client first
    sendToClient(clientId, {
      type: 'player_joined',
      gameId,
      game
    });
    console.log(`Join confirmation sent to client ${clientId}`);
    
    // Then notify other subscribers
    notifyOtherSubscribers(gameId, clientId, {
      type: 'player_joined',
      gameId,
      game
    });
    
    // Notify webhooks
    notifyGameUpdate(game, 'player_joined');
    
  } catch (error) {
    console.error('Error joining game:', error);
    sendToClient(clientId, {
      type: 'error',
      message: 'Failed to join game'
    });
  }
}

async function handleGetAvailableGames(clientId) {
  try {
    const games = await Game.find({ status: 'waiting_for_opponent' })
      .sort({ createdAt: -1 })
      .limit(10);
    
    sendToClient(clientId, {
      type: 'available_games',
      games
    });
  } catch (error) {
    console.error('Error getting available games:', error);
    sendToClient(clientId, {
      type: 'error',
      message: 'Failed to get available games'
    });
  }
}

async function handleMakeMove(clientId, gameId, move, playerColor) {
  try {
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return sendToClient(clientId, {
        type: 'error',
        message: 'Game not found'
      });
    }
    
    // Validate and apply the move
    const result = validateMove(game.fen, move, playerColor);
    
    if (!result.valid) {
      return sendToClient(clientId, {
        type: 'error',
        message: result.error
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
    }
    
    await game.save();
    
    // Notify all subscribers to this game
    notifyGameSubscribers(gameId, {
      type: 'move_made',
      gameId,
      move,
      playerColor,
      fen: game.fen,
      pgn: game.pgn,
      status: game.status
    });
    
    // Notify webhooks
    notifyGameUpdate(game, 'move_made');
    
    // If the game is over, notify that as well
    if (result.gameOver) {
      notifyGameSubscribers(gameId, {
        type: 'game_completed',
        gameId,
        status: game.status
      });
      notifyGameUpdate(game, 'game_completed');
    }
    
  } catch (error) {
    console.error('Error making move:', error);
    sendToClient(clientId, {
      type: 'error',
      message: 'Failed to make move'
    });
  }
}

function handleLeaveGame(clientId, gameId) {
  try {
    // Unsubscribe the client from the game
    unsubscribeFromGame(clientId, gameId);
    
    // Notify the client
    sendToClient(clientId, {
      type: 'left_game',
      gameId
    });
    
  } catch (error) {
    console.error('Error leaving game:', error);
  }
}

function handleDisconnect(clientId) {
  // Clean up all game subscriptions
  const clientData = connections.get(clientId);
  
  if (clientData) {
    for (const gameId of clientData.games) {
      unsubscribeFromGame(clientId, gameId);
    }
    
    connections.delete(clientId);
  }
}

function subscribeToGame(clientId, gameId) {
  const clientData = connections.get(clientId);
  
  if (!clientData) {
    return;
  }
  
  // Add the game to client's subscriptions
  clientData.games.add(gameId);
  
  // Add the client to game subscribers
  if (!gameSubscriptions.has(gameId)) {
    gameSubscriptions.set(gameId, new Set());
  }
  
  gameSubscriptions.get(gameId).add(clientId);
}

function unsubscribeFromGame(clientId, gameId) {
  const clientData = connections.get(clientId);
  
  if (clientData) {
    clientData.games.delete(gameId);
  }
  
  const subscribers = gameSubscriptions.get(gameId);
  
  if (subscribers) {
    subscribers.delete(clientId);
    
    if (subscribers.size === 0) {
      gameSubscriptions.delete(gameId);
    }
  }
}

function notifyGameSubscribers(gameId, data) {
  const subscribers = gameSubscriptions.get(gameId);
  
  if (subscribers) {
    console.log(`Notifying ${subscribers.size} subscribers for game ${gameId}`);
    for (const clientId of subscribers) {
      sendToClient(clientId, data);
    }
  } else {
    console.log(`No subscribers found for game ${gameId}`);
  }
}

// New function to notify all subscribers except the specified client
function notifyOtherSubscribers(gameId, excludeClientId, data) {
  const subscribers = gameSubscriptions.get(gameId);
  
  if (subscribers) {
    console.log(`Notifying other ${subscribers.size - 1} subscribers for game ${gameId} (excluding ${excludeClientId})`);
    for (const clientId of subscribers) {
      if (clientId !== excludeClientId) {
        sendToClient(clientId, data);
      }
    }
  }
}

function broadcastNewGame(game) {
  for (const [clientId, clientData] of connections.entries()) {
    sendToClient(clientId, {
      type: 'new_game_available',
      gameId: game.gameId,
      createdAt: game.createdAt
    });
  }
}

function sendToClient(clientId, data) {
  const clientData = connections.get(clientId);
  
  if (clientData && clientData.connection.socket.readyState === 1) {
    try {
      console.log(`Sending message to client ${clientId}:`, data.type);
      clientData.connection.socket.send(JSON.stringify(data));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
    }
  } else {
    if (!clientData) {
      console.error(`Client ${clientId} not found in connections`);
    } else if (clientData.connection.socket.readyState !== 1) {
      console.error(`Client ${clientId} socket not in OPEN state (state: ${clientData.connection.socket.readyState})`);
    }
  }
}

module.exports = {
  setupWebSocketConnection
};