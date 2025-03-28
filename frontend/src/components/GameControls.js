import React, { useState, useEffect } from 'react';
import './GameControls.css';

function GameControls({ game, onExit, playerColor }) {
  const [gameDetails, setGameDetails] = useState({
    status: 'waiting',
    movesHistory: [],
    currentPlayerTurn: 'white'
  });
  
  // Update game details when game prop changes
  useEffect(() => {
    if (game) {
      const status = game.status;
      const movesHistory = game.moves || [];
      
      // Determine whose turn it is based on number of moves
      // Even number of moves means it's white's turn
      const currentPlayerTurn = 
        movesHistory.length % 2 === 0 ? 'white' : 'black';
      
      setGameDetails({
        status,
        movesHistory,
        currentPlayerTurn
      });
    }
  }, [game]);

  const formatStatusMessage = () => {
    switch (gameDetails.status) {
      case 'waiting_for_opponent':
        return 'Waiting for opponent to join...';
      case 'in_progress':
        return `${gameDetails.currentPlayerTurn}'s turn`;
      case 'checkmate':
        return `Checkmate! ${gameDetails.currentPlayerTurn === 'white' ? 'Black' : 'White'} wins!`;
      case 'stalemate':
        return 'Stalemate! The game is a draw.';
      case 'draw':
        return 'The game ended in a draw.';
      case 'resigned':
        return 'Game ended. One player resigned.';
      default:
        return 'Unknown game status';
    }
  };

  const formatMoveNotation = (move, index) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhiteMove = index % 2 === 0;
    
    if (isWhiteMove) {
      return `${moveNumber}. ${move.move}`;
    } else {
      return move.move;
    }
  };

  const renderMovesList = () => {
    if (!game || !game.moves || game.moves.length === 0) {
      return <p className="no-moves">No moves yet</p>;
    }

    return (
      <div className="moves-list">
        {game.moves.map((move, index) => (
          <span key={index} className={`move ${move.playerColor}`}>
            {formatMoveNotation(move, index)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="game-controls">
      <div className="game-info-panel">
        <div className="game-id-display">
          Game ID: <span>{game?.gameId?.slice(0, 8) || 'N/A'}</span>
        </div>
        
        <div className="status-display">
          <h3>Game Status</h3>
          <div className={`status ${gameDetails.status}`}>
            {formatStatusMessage()}
          </div>
          {gameDetails.status === 'in_progress' && (
            <div className="turn-indicator">
              {gameDetails.currentPlayerTurn === playerColor ? 
                "Your turn" : "Opponent's turn"}
            </div>
          )}
        </div>
        
        <div className="moves-history">
          <h3>Moves History</h3>
          {renderMovesList()}
        </div>
      </div>
      
      <div className="control-buttons">
        <button 
          className="exit-game-btn"
          onClick={onExit}
        >
          Exit Game
        </button>
      </div>
    </div>
  );
}

export default GameControls;