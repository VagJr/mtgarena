const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get Community Feed
router.get('/feed', optionalAuth, (req, res) => {
  try {
    const db = req.db;
    const currentUserId = req.user ? req.user.id : null;

    const result = db.exec(`
      SELECT p.id, p.user_id, p.content, p.post_type, p.card_data, p.deck_id, p.likes, p.created_at,
             u.username, u.avatar, u.level,
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [currentUserId || '']);

    const posts = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      user_id: row[1],
      content: row[2],
      post_type: row[3],
      card_data: JSON.parse(row[4] || '{}'),
      deck_id: row[5],
      likes: row[6],
      created_at: row[7],
      username: row[8],
      avatar: row[9],
      level: row[10],
      user_liked: !!row[11]
    })) : [];

    res.json(posts);
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to fetch community feed' });
  }
});

// Create Post
router.post('/posts', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { content, post_type = 'general', card_data = {}, deck_id = null } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }

    const id = uuidv4();
    db.run(
      "INSERT INTO posts (id, user_id, content, post_type, card_data, deck_id) VALUES (?, ?, ?, ?, ?, ?)",
      [id, req.user.id, content.trim(), post_type, JSON.stringify(card_data), deck_id]
    );

    // Give some XP for community participation
    db.run("UPDATE users SET xp = xp + 15 WHERE id = ?", [req.user.id]);
    saveDatabase();

    res.status(201).json({ id, success: true });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like / Unlike Post
router.post('/posts/:id/like', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const postId = req.params.id;
    const userId = req.user.id;

    const existing = db.exec(
      "SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );

    let liked = false;
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run("DELETE FROM post_likes WHERE user_id = ? AND post_id = ?", [userId, postId]);
      db.run("UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?", [postId]);
      liked = false;
    } else {
      db.run("INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)", [userId, postId]);
      db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId]);
      liked = true;
    }

    saveDatabase();
    res.json({ success: true, liked });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Friends List & Requests
router.get('/friends', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;

    // Accepted friends
    const friendsResult = db.exec(`
      SELECT f.id, f.status, f.created_at,
             CASE WHEN f.user_id = ? THEN u2.id ELSE u1.id END as friend_id,
             CASE WHEN f.user_id = ? THEN u2.username ELSE u1.username END as username,
             CASE WHEN f.user_id = ? THEN u2.avatar ELSE u1.avatar END as avatar,
             CASE WHEN f.user_id = ? THEN u2.level ELSE u1.level END as level,
             CASE WHEN f.user_id = ? THEN u2.last_login ELSE u1.last_login END as last_login
      FROM friends f
      JOIN users u1 ON f.user_id = u1.id
      JOIN users u2 ON f.friend_id = u2.id
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    `, [userId, userId, userId, userId, userId, userId, userId]);

    // Pending incoming requests
    const pendingResult = db.exec(`
      SELECT f.id, f.user_id, u.username, u.avatar, u.level, f.created_at
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
    `, [userId]);

    const friends = friendsResult.length > 0 ? friendsResult[0].values.map(r => ({
      friendship_id: r[0],
      status: r[1],
      created_at: r[2],
      id: r[3],
      username: r[4],
      avatar: r[5],
      level: r[6],
      last_login: r[7]
    })) : [];

    const pending = pendingResult.length > 0 ? pendingResult[0].values.map(r => ({
      friendship_id: r[0],
      sender_id: r[1],
      username: r[2],
      avatar: r[3],
      level: r[4],
      created_at: r[5]
    })) : [];

    res.json({ friends, pending });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send Friend Request by Username
router.post('/friends/request', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { username } = req.body;

    if (!username || username.trim() === req.user.username) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const targetUser = db.exec("SELECT id FROM users WHERE username = ?", [username.trim()]);
    if (targetUser.length === 0 || targetUser[0].values.length === 0) {
      return res.status(404).json({ error: 'Planeswalker not found' });
    }

    const targetId = targetUser[0].values[0][0];

    // Check existing
    const existing = db.exec(
      "SELECT id, status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
      [req.user.id, targetId, targetId, req.user.id]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({ error: 'Friend request already exists or already friends' });
    }

    db.run("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')", [req.user.id, targetId]);
    saveDatabase();

    res.status(201).json({ success: true, message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept / Decline Friend Request
router.put('/friends/:friendshipId', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { action } = req.body; // 'accept' or 'reject'
    const friendshipId = req.params.friendshipId;

    const request = db.exec("SELECT id, user_id, friend_id FROM friends WHERE id = ?", [friendshipId]);
    if (request.length === 0 || request[0].values.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const row = request[0].values[0];
    if (row[2] !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (action === 'accept') {
      db.run("UPDATE friends SET status = 'accepted' WHERE id = ?", [friendshipId]);
    } else {
      db.run("DELETE FROM friends WHERE id = ?", [friendshipId]);
    }

    saveDatabase();
    res.json({ success: true, action });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Direct Messages
router.get('/messages/:friendId', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const friendId = req.params.friendId;

    const result = db.exec(`
      SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
      LIMIT 100
    `, [userId, friendId, friendId, userId]);

    const messages = result.length > 0 ? result[0].values.map(r => ({
      id: r[0],
      sender_id: r[1],
      receiver_id: r[2],
      content: r[3],
      created_at: r[4],
      sender_name: r[5],
      is_me: r[1] === userId
    })) : [];

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/messages', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { receiver_id, content } = req.body;

    if (!receiver_id || !content || !content.trim()) {
      return res.status(400).json({ error: 'Receiver and content are required' });
    }

    db.run(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
      [req.user.id, receiver_id, content.trim()]
    );
    saveDatabase();

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Planeswalker Leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(`
      SELECT u.id, u.username, u.avatar, u.level, u.xp, u.gold,
             (SELECT COUNT(*) FROM collections c WHERE c.user_id = u.id) as card_count,
             (SELECT COUNT(*) FROM decks d WHERE d.user_id = u.id) as deck_count
      FROM users u
      ORDER BY u.level DESC, u.xp DESC, card_count DESC
      LIMIT 25
    `);

    const leaderboard = result.length > 0 ? result[0].values.map((r, index) => ({
      rank: index + 1,
      id: r[0],
      username: r[1],
      avatar: r[2],
      level: r[3],
      xp: r[4],
      gold: r[5],
      card_count: r[6],
      deck_count: r[7]
    })) : [];

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { avatar, bio, favorite_color } = req.body;

    const updates = [];
    const params = [];

    if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (favorite_color !== undefined) { updates.push('favorite_color = ?'); params.push(favorite_color); }

    if (updates.length > 0) {
      params.push(req.user.id);
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      saveDatabase();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
