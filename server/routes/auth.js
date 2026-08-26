const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = req.db;

    // Check existing
    const existing = db.exec("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      [id, username, email, password_hash]
    );
    saveDatabase();

    const token = jwt.sign({ id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id, username, email, gold: 1000, gems: 100, level: 1, xp: 0, avatar: 'default' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = req.db;
    const result = db.exec(
      "SELECT id, username, email, password_hash, gold, gems, level, xp, avatar FROM users WHERE username = ? OR email = ?",
      [username, username]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result[0].values[0];
    const user = {
      id: row[0], username: row[1], email: row[2],
      password_hash: row[3], gold: row[4], gems: row[5],
      level: row[6], xp: row[7], avatar: row[8]
    };

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);
    saveDatabase();

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        gold: user.gold, gems: user.gems, level: user.level,
        xp: user.xp, avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      "SELECT id, username, email, gold, gems, level, xp, avatar, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result[0].values[0];
    res.json({
      id: row[0], username: row[1], email: row[2],
      gold: row[3], gems: row[4], level: row[5],
      xp: row[6], avatar: row[7], created_at: row[8]
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
