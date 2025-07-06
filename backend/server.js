const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { ethers } = require('ethers'); // For signature verification
const crypto = require('crypto'); // For generating a secure random nonce
const dbPool = require('./db'); // Import the database connection pool
const cors = require('cors'); // Import CORS middleware
const path = require('path'); // Import path module

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS Configuration
// IMPORTANT: Restrict this in production to your actual frontend domain!
const frontendURL = process.env.NODE_ENV === 'production'
                    ? process.env.FRONTEND_PROD_URL // e.g., https://your-blackjack-game.com
                    : 'http://localhost:3000'; // Default React dev port

app.use(cors({
  origin: frontendURL, // Allow only your frontend to make requests
  credentials: true    // Allow cookies to be sent (for session management)
}));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'public')));

// Function to initialize database tables
async function initializeDatabase() {
  let connection;
  try {
    connection = await dbPool.getConnection();
    console.log('Connected to DB for schema initialization.');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ethereum_address VARCHAR(42) UNIQUE NOT NULL,
        nickname VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table checked/created.');

    // Create high_scores table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS high_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        score INT NOT NULL,
        achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('High scores table checked/created.');

  } catch (error) {
    console.error('Error initializing database schema:', error);
    // Depending on the severity, you might want to exit the process
    // process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'), // Use an environment variable for secret in production
  resave: false,
  saveUninitialized: true, // Set to false if you want to manually create sessions
  cookie: {
    secure: process.env.NODE_ENV === 'production', // True if using https
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// In-memory store for nonces (for simplicity, replace with DB in production for multi-server setups)
// const nonceStore = new Map(); // Nonce is now stored in req.session

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user && req.session.user.id) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated. Please log in.' });
};

// --- Authentication Routes ---

// 1. Get Challenge Message
app.post('/api/auth/challenge', (req, res) => {
  const { address } = req.body;
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Valid Ethereum address is required.' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `Welcome to Blackjack! Please sign this message to log in. Nonce: ${nonce}`;

  // Store the nonce associated with the user's address and session
  // This prevents replay attacks.
  req.session.authNonce = nonce;
  req.session.authAddress = address; // Store address temporarily for verification step

  console.log(`Generated challenge for ${address} with nonce ${nonce}`);
  res.json({ message });
});

// 2. Verify Signature & Login
app.post('/api/auth/verify', async (req, res) => {
  const { address, signature } = req.body;

  if (!address || !signature) {
    return res.status(400).json({ error: 'Address and signature are required.' });
  }

  if (req.session.authAddress !== address) {
    console.warn(`Address mismatch. Session: ${req.session.authAddress}, Provided: ${address}`);
    return res.status(400).json({ error: 'Address does not match session address.' });
  }

  const expectedNonce = req.session.authNonce;
  if (!expectedNonce) {
    return res.status(400).json({ error: 'No nonce found in session. Please request a challenge first.' });
  }

  const message = `Welcome to Blackjack! Please sign this message to log in. Nonce: ${expectedNonce}`;

  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
      // Signature is valid
      const userAddress = address.toLowerCase();
      let connection;
      try {
        connection = await dbPool.getConnection();
        // Check if user exists, otherwise create them
        let [rows] = await connection.execute('SELECT * FROM users WHERE ethereum_address = ?', [userAddress]);
        let user;
        if (rows.length === 0) {
          // User does not exist, create new user
          const [result] = await connection.execute(
            'INSERT INTO users (ethereum_address) VALUES (?)',
            [userAddress]
          );
          user = { id: result.insertId, address: userAddress, nickname: null };
          console.log(`New user created with ID: ${user.id} and address: ${userAddress}`);
        } else {
          user = { id: rows[0].id, address: rows[0].ethereum_address, nickname: rows[0].nickname };
          console.log(`User ${userAddress} found with ID: ${user.id}`);
        }

        req.session.user = user; // Store full user object (id, address, nickname) in session
        req.session.authNonce = null; // Clear the nonce
        req.session.authAddress = null; // Clear temporary address

        console.log(`User ${user.address} authenticated successfully. Session user:`, req.session.user);
        res.json({ success: true, message: 'Authentication successful.', user: req.session.user });

      } catch (dbError) {
        console.error('Database error during authentication:', dbError);
        res.status(500).json({ error: 'Database error during authentication.' });
      } finally {
        if (connection) connection.release();
      }
    } else {
      console.warn(`Signature verification failed. Recovered: ${recoveredAddress}, Expected: ${address}`);
      res.status(401).json({ error: 'Signature verification failed.' });
    }
  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({ error: 'Error verifying signature.' });
  }
});

// 3. Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid'); // Default session cookie name
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// 4. Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session.user) {
    res.json({ isAuthenticated: true, user: req.session.user });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// --- User and Score API Endpoints ---

// POST /api/score - Submit a new score
// This endpoint assumes a user might submit multiple scores, but we only care about their highest.
// A more robust approach for a single "high score per user" might be to have a user_high_score table
// or a specific column in the users table.
// For this implementation, we'll find if the user has a score, and update if the new one is higher, or insert if none.
app.post('/api/score', isAuthenticated, async (req, res) => {
  const { score } = req.body;
  const userId = req.session.user.id;

  if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
    return res.status(400).json({ error: 'Invalid score provided. Must be a non-negative integer.' });
  }

  let connection;
  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction(); // Start transaction

    // Check for an existing high score entry for this user
    const [existingScores] = await connection.execute(
      'SELECT id, score FROM high_scores WHERE user_id = ?',
      [userId]
    );

    if (existingScores.length > 0) {
      const currentHighScore = existingScores[0];
      if (score > currentHighScore.score) {
        // New score is higher, update it
        await connection.execute(
          'UPDATE high_scores SET score = ?, achieved_at = CURRENT_TIMESTAMP WHERE user_id = ?', // Ensure we update for the correct user
          [score, userId]
        );
        await connection.commit(); // Commit transaction
        res.json({ success: true, message: 'High score updated successfully.', newHighScore: score });
      } else {
        await connection.commit(); // Commit transaction even if no update
        res.json({ success: true, message: 'Score submitted is not higher than the current high score.', currentHighScore: currentHighScore.score });
      }
    } else {
      // No existing high score for this user, insert new one
      await connection.execute(
        'INSERT INTO high_scores (user_id, score) VALUES (?, ?)',
        [userId, score]
      );
      await connection.commit(); // Commit transaction
      res.status(201).json({ success: true, message: 'High score recorded successfully.', newHighScore: score });
    }
  } catch (error) {
    if (connection) await connection.rollback(); // Rollback transaction on error
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Failed to submit score.' });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/leaderboard - Get top N high scores
app.get('/api/leaderboard', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10; // Default to top 10, allow client to specify

  if (limit <= 0 || limit > 100) { // Basic validation for limit
    return res.status(400).json({ error: 'Invalid limit parameter. Must be between 1 and 100.' });
  }

  let connection;
  try {
    connection = await dbPool.getConnection();
    const [rows] = await connection.execute(
      `SELECT u.ethereum_address, u.nickname, hs.score, hs.achieved_at
       FROM high_scores hs
       JOIN users u ON hs.user_id = u.id
       ORDER BY hs.score DESC, hs.achieved_at ASC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/user/me - Get current user's details and their high score
app.get('/api/user/me', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  let connection;

  try {
    connection = await dbPool.getConnection();
    // Fetch user details
    const [userRows] = await connection.execute(
      'SELECT id, ethereum_address, nickname, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      // This should ideally not happen if user is authenticated and in session
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userRows[0];

    // Fetch user's high score
    const [scoreRows] = await connection.execute(
      'SELECT score, achieved_at FROM high_scores WHERE user_id = ? ORDER BY score DESC LIMIT 1',
      [userId]
    );

    const highScore = scoreRows.length > 0 ? scoreRows[0] : null;

    res.json({
      id: user.id,
      ethereum_address: user.ethereum_address,
      nickname: user.nickname,
      created_at: user.created_at,
      high_score: highScore
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details.' });
  } finally {
    if (connection) connection.release();
  }
});

// PUT /api/user/nickname - Update user's nickname
app.put('/api/user/nickname', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const { nickname } = req.body;

  if (typeof nickname !== 'string' || nickname.trim().length === 0 || nickname.length > 50) {
    return res.status(400).json({ error: 'Invalid nickname. Must be a non-empty string up to 50 characters.' });
  }

  let connection;
  try {
    connection = await dbPool.getConnection();
    await connection.execute(
      'UPDATE users SET nickname = ? WHERE id = ?',
      [nickname.trim(), userId]
    );

    // Update nickname in session as well
    if (req.session.user) {
      req.session.user.nickname = nickname.trim();
    }

    res.json({ success: true, message: 'Nickname updated successfully.', nickname: nickname.trim() });
  } catch (error) {
    console.error('Error updating nickname:', error);
    res.status(500).json({ error: 'Failed to update nickname.' });
  } finally {
    if (connection) connection.release();
  }
});


// API routes should be defined above this
// Catch-all route to serve index.html for client-side routing (React Router)
// Make sure this is after all your API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) { // Do not serve index.html for API calls
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    // If it's an API call that wasn't caught by other routes, it's a 404
    res.status(404).send('API endpoint not found');
  }
});

async function startServer() {
  await initializeDatabase(); // Ensure tables are created before server starts listening
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

startServer();

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;
