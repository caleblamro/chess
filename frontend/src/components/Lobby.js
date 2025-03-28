import React from 'react';
import './Lobby.css';

function Lobby({ games, onCreateGame, onJoinGame, connectionStatus }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="lobby-container">
      <section className="lobby-welcome">
        <h2>Welcome to the Chess App</h2>
        <p>Create a new game or join an existing one to get started.</p>
      </section>

      <section className="lobby-actions">
        <button 
          className="create-game-btn"
          onClick={onCreateGame}
          disabled={connectionStatus !== 'connected'}
        >
          Create New Game
        </button>
      </section>

      <section className="available-games">
        <h3>Available Games</h3>
        {connectionStatus !== 'connected' ? (
          <div className="connection-message">
            Connecting to server... Please wait.
          </div>
        ) : games.length === 0 ? (
          <div className="no-games-message">
            No games available. Create one to get started!
          </div>
        ) : (
          <ul className="game-list">
            {games.map((game) => (
              <li key={game.gameId} className="game-item">
                <div className="game-info">
                  <span className="game-id">Game #{game.gameId.slice(0, 8)}</span>
                  <span className="game-created">Created at {formatDate(game.createdAt)}</span>
                </div>
                <button
                  className="join-game-btn"
                  onClick={() => {
                    console.log('Join button clicked for game:', game.gameId);
                    onJoinGame(game.gameId);
                  }}
                >
                  Join Game
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="instructions">
        <h3>How to Play</h3>
        <ol>
          <li>Create a new game or join an existing one</li>
          <li>If you create a game, you'll play as white</li>
          <li>If you join a game, you'll play as black</li>
          <li>Move pieces by dragging or clicking</li>
          <li>The game automatically follows standard chess rules</li>
        </ol>
      </section>
    </div>
  );
}

export default Lobby;