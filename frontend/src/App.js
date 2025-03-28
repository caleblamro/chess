import React, { useState, useEffect } from 'react';
import './App.css';
import Lobby from './components/Lobby';
import ChessBoard from './components/ChessBoard';
import GameControls from './components/GameControls';
import { connectSocket } from './services/socket';

function App() {
  const [currentGame, setCurrentGame] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameList, setGameList] = useState([]);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = connectSocket({
      onOpen: () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        // Request available games once connected
        newSocket.send(JSON.stringify({ type: 'get_available_games' }));
      },
      onClose: () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      },
      onMessage: (data) => {
        handleSocketMessage(data);
      }
    });

    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  const handleSocketMessage = (data) => {
    switch (data.type) {
      case 'game_created':
        setCurrentGame(data.game);
        setPlayerColor('white'); // Creator plays as white
        showNotification('Game created! Waiting for opponent...');
        break;

      case 'new_game_available':
        // Update list of available games
        setGameList(prevList => {
          // Check if game already exists in the list
          if (prevList.some(game => game.gameId === data.gameId)) {
            return prevList;
          }
          return [...prevList, { gameId: data.gameId, createdAt: data.createdAt }];
        });
        break;

      case 'available_games':
        setGameList(data.games);
        break;

      case 'player_joined':
        if (currentGame && currentGame.gameId === data.gameId) {
          setCurrentGame(data.game);
          showNotification('Opponent joined the game!');
        }
        break;

      case 'move_made':
        if (currentGame && currentGame.gameId === data.gameId) {
          setCurrentGame(prevGame => ({
            ...prevGame,
            fen: data.fen,
            pgn: data.pgn,
            status: data.status
          }));

          // Show notification for opponent's move
          if (data.playerColor !== playerColor) {
            showNotification(`Opponent made a move: ${data.move.from} to ${data.move.to}`);
          }
        }
        break;

      case 'game_completed':
        if (currentGame && currentGame.gameId === data.gameId) {
          showNotification(`Game over: ${data.status}`, 'important');
        }
        break;

      case 'error':
        showNotification(`Error: ${data.message}`, 'error');
        break;

      default:
        console.log('Unhandled message type:', data.type);
    }
  };

  const createNewGame = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'create_game'
      }));
    } else {
      showNotification('Socket connection not available', 'error');
    }
  };

  const joinGame = (gameId) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'join_game',
        gameId
      }));
      setPlayerColor('black'); // Joiner plays as black
    } else {
      showNotification('Socket connection not available', 'error');
    }
  };

  const makeMove = (move) => {
    if (socket && socket.readyState === WebSocket.OPEN && currentGame) {
      socket.send(JSON.stringify({
        type: 'make_move',
        gameId: currentGame.gameId,
        move,
        playerColor
      }));
    } else {
      showNotification('Cannot make move: no active game or connection', 'error');
    }
  };

  const exitGame = () => {
    if (socket && socket.readyState === WebSocket.OPEN && currentGame) {
      socket.send(JSON.stringify({
        type: 'leave_game',
        gameId: currentGame.gameId
      }));
    }
    setCurrentGame(null);
    setPlayerColor(null);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Chess Application</h1>
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === 'connected' ? '● Connected' : 
           connectionStatus === 'connecting' ? '● Connecting...' : 
           connectionStatus === 'disconnected' ? '● Disconnected' : 
           '● Connection Error'}
        </div>
      </header>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <main>
        {currentGame ? (
          <div className="game-container">
            <ChessBoard 
              fen={currentGame.fen} 
              playerColor={playerColor} 
              onMove={makeMove} 
              gameStatus={currentGame.status}
            />
            <GameControls 
              game={currentGame} 
              onExit={exitGame} 
              playerColor={playerColor}
            />
          </div>
        ) : (
          <Lobby 
            games={gameList} 
            onCreateGame={createNewGame} 
            onJoinGame={joinGame} 
            connectionStatus={connectionStatus}
          />
        )}
      </main>
    </div>
  );
}

export default App;