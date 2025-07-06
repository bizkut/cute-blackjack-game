import React from 'react';
import { useAuth } from './contexts/AuthContext';
import * as api from './services/apiService'; // For leaderboard, score submission etc.

// Placeholder components (you would create these as actual components)
const GameComponent = () => {
  const { user, refreshUserProfile } = useAuth(); // For submitting score

  const handleGameEnd = async (score) => {
    if (!user) {
      alert("Please log in to submit your score.");
      return;
    }
    try {
      await api.submitScore(score);
      alert(`Score ${score} submitted!`);
      await refreshUserProfile(); // Refresh user profile to show new high score if achieved
    } catch (error) {
      alert(`Error submitting score: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Blackjack Game</h2>
      <p>Game content goes here...</p>
      {/* Example button to simulate game end and score submission */}
      {user && <button onClick={() => handleGameEnd(Math.floor(Math.random() * 100) + 1)}>Simulate Game End & Submit Score</button>}
    </div>
  );
};

const Leaderboard = () => {
  const [scores, setScores] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getLeaderboard(10);
        setScores(data);
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <p>Loading leaderboard...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h3>Leaderboard (Top 10)</h3>
      {scores.length === 0 ? <p>No scores yet.</p> : (
        <ol>
          {scores.map((entry, index) => (
            <li key={index}>
              {entry.nickname || entry.ethereum_address.substring(0, 6)}: {entry.score}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

const UserProfile = () => {
    const { user, refreshUserProfile } = useAuth();
    const [nickname, setNickname] = React.useState('');
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        if (user && user.nickname) {
            setNickname(user.nickname);
        } else {
            setNickname('');
        }
    }, [user]);

    const handleNicknameUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!nickname.trim()) {
            setMessage('Nickname cannot be empty.');
            return;
        }
        try {
            await api.updateUserNickname(nickname);
            setMessage('Nickname updated successfully!');
            await refreshUserProfile(); // Refresh user data in AuthContext
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    if (!user) return null;

    return (
        <div>
            <h4>My Profile</h4>
            <p>Address: {user.ethereum_address}</p>
            <p>Current Nickname: {user.nickname || 'Not set'}</p>
            <p>My High Score: {user.high_score ? `${user.high_score.score} (on ${new Date(user.high_score.achieved_at).toLocaleDateString()})` : 'Not set'}</p>
            <form onSubmit={handleNicknameUpdate}>
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter new nickname"
                />
                <button type="submit">Update Nickname</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};


function App() {
  const { user, isAuthenticated, loginWithMetamask, logout, loading, error } = useAuth();

  return (
    <div style={{ padding: '20px' }}>
      <h1>React Blackjack Game</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!isAuthenticated ? (
        <button onClick={loginWithMetamask} disabled={loading}>
          {loading ? 'Connecting...' : 'Login with MetaMask'}
        </button>
      ) : (
        <div>
          <p>Welcome, {user.nickname || user.ethereum_address}!</p>
          <p>Your User ID: {user.id}</p>
          {user.high_score && <p>Your Personal Best: {user.high_score.score}</p>}
          <button onClick={logout} disabled={loading}>
            {loading ? 'Logging out...' : 'Logout'}
          </button>
          <hr />
          <UserProfile />
        </div>
      )}

      <hr style={{ margin: '20px 0' }}/>

      <GameComponent />

      <hr style={{ margin: '20px 0' }}/>

      <Leaderboard />
    </div>
  );
}

export default App;
