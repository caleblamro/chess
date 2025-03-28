import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './ChessBoard.css';

function ChessBoard({ fen, playerColor, onMove, gameStatus }) {
  const [chess, setChess] = useState(new Chess(fen || undefined));
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [moveFrom, setMoveFrom] = useState('');
  const [possibleMoves, setPossibleMoves] = useState({});
  const [isGameOver, setIsGameOver] = useState(false);

  // Update the chess instance when fen changes
  useEffect(() => {
    if (fen) {
      try {
        const newChess = new Chess(fen);
        setChess(newChess);
        setIsGameOver(['checkmate', 'stalemate', 'draw', 'resigned'].includes(gameStatus));
      } catch (e) {
        console.error("Invalid FEN string:", e);
      }
    }
  }, [fen, gameStatus]);

  // Set board orientation based on player color
  useEffect(() => {
    if (playerColor) {
      setBoardOrientation(playerColor);
    }
  }, [playerColor]);

  // Get all possible moves for a piece
  const getMoveOptions = (square) => {
    const moves = {};
    try {
      const legalMoves = chess.moves({
        square,
        verbose: true
      });

      legalMoves.forEach((move) => {
        moves[move.to] = {
          background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
          borderRadius: '50%'
        };
      });

      return moves;
    } catch (e) {
      console.error("Error getting move options:", e);
      return {};
    }
  };

  // Handle piece drop
  const onDrop = (sourceSquare, targetSquare) => {
    // Check if it's player's turn
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    if (turn !== playerColor || isGameOver) {
      return false;
    }

    try {
      // Check if the move is valid
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to a queen for simplicity
      });

      // If move is invalid
      if (move === null) return false;

      // Notify the parent component about the move
      onMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      return true;
    } catch (e) {
      console.error("Error making move:", e);
      return false;
    }
  };

  const onSquareClick = (square) => {
    // Check if it's player's turn
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    if (turn !== playerColor || isGameOver) {
      return;
    }

    // If a piece was already selected, attempt to make a move
    if (moveFrom) {
      const move = {
        from: moveFrom,
        to: square,
        promotion: 'q' // Always promote to a queen for simplicity
      };

      try {
        const result = chess.move(move);

        // If the move is valid, notify the parent component
        if (result) {
          onMove(move);
          setMoveFrom('');
          setPossibleMoves({});
          return;
        }
      } catch (e) {
        // Invalid move, do nothing
      }
    }

    // Check if the clicked square has a piece that can be moved
    const piece = chess.get(square);
    if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
      setMoveFrom(square);
      setPossibleMoves(getMoveOptions(square));
    } else {
      setMoveFrom('');
      setPossibleMoves({});
    }
  };

  const getGameStatusMessage = () => {
    if (!isGameOver) {
      const turn = chess.turn() === 'w' ? 'white' : 'black';
      return `${turn === playerColor ? 'Your' : 'Opponent\'s'} turn`;
    }

    switch (gameStatus) {
      case 'checkmate':
        return 'Checkmate!';
      case 'stalemate':
        return 'Stalemate';
      case 'draw':
        return 'Draw';
      case 'resigned':
        return 'Opponent resigned';
      default:
        return 'Game over';
    }
  };

  return (
    <div className="chess-board-container">
      <div className="game-status">
        <div className={`status-indicator ${isGameOver ? 'game-over' : ''}`}>
          {getGameStatusMessage()}
        </div>
        {playerColor && (
          <div className="player-color">
            You are playing as {playerColor}
          </div>
        )}
      </div>
      <div className="board-wrapper">
        <Chessboard
          id="chess-board"
          position={chess.fen()}
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={possibleMoves}
          boardOrientation={boardOrientation}
          areArrowsAllowed={true}
          boardWidth={window.innerWidth < 600 ? window.innerWidth - 40 : 500}
        />
      </div>
    </div>
  );
}

export default ChessBoard;