'use strict';

const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  fen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Default starting position
  },
  pgn: {
    type: String,
    default: '' // Empty PGN for new games
  },
  status: {
    type: String,
    enum: ['waiting_for_opponent', 'in_progress', 'checkmate', 'stalemate', 'draw', 'resigned'],
    default: 'waiting_for_opponent'
  },
  moves: [{
    move: String,
    playerColor: {
      type: String,
      enum: ['white', 'black']
    },
    timestamp: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to ensure PGN never fails validation
GameSchema.pre('save', function(next) {
  // Always ensure pgn exists
  if (!this.pgn && this.pgn !== '') {
    this.pgn = '';
  }
  // Always ensure fen exists
  if (!this.fen) {
    this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }
  next();
});

module.exports = mongoose.model('Game', GameSchema);