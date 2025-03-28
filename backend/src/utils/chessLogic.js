'use strict';

const { Chess } = require('chess.js');

function createNewChessGame() {
  // Create a new chess game with the default starting position
  try {
    const chess = new Chess();
    console.log('Chess instance created successfully');
    console.log('FEN:', chess.fen());
    console.log('PGN:', chess.pgn());
    return chess;
  } catch (error) {
    console.error('Error creating new chess game:', error);
    // Return a basic chess instance as fallback
    return {
      fen: () => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: () => ''
    };
  }
}

function validateMove(fen, move, playerColor) {
  try {
    const chess = new Chess(fen);
    
    // Check if it's the correct player's turn
    const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor) {
      return {
        valid: false,
        error: `It's not ${playerColor}'s turn`
      };
    }
    
    // Try to make the move
    const result = chess.move(move);
    
    if (!result) {
      return {
        valid: false,
        error: 'Invalid move'
      };
    }
    
    // Check game status
    let gameOver = false;
    let status = 'in_progress';
    
    if (chess.in_checkmate()) {
      gameOver = true;
      status = 'checkmate';
    } else if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) {
      gameOver = true;
      status = 'draw';
    } else if (chess.in_stalemate()) {
      gameOver = true;
      status = 'stalemate';
    }
    
    return {
      valid: true,
      fen: chess.fen(),
      pgn: chess.pgn() || '', // Handle the case where pgn() might return null or undefined
      gameOver,
      status
    };
  } catch (error) {
    console.error('Error validating move:', error);
    return {
      valid: false,
      error: 'Failed to validate move'
    };
  }
}

module.exports = {
  createNewChessGame,
  validateMove
};