const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get pending trades for user
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      `SELECT t.*, u1.username as sender_name, u2.username as receiver_name
       FROM trades t
       JOIN users u1 ON t.sender_id = u1.id
       JOIN users u2 ON t.receiver_id = u2.id
       WHERE t.sender_id = ? OR t.receiver_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.id, req.user.id]
    );

    const trades = result.length > 0 ? result[0].values.map(row => ({
      id: row[0], sender_id: row[1], receiver_id: row[2],
      status: row[3], cards_offered: JSON.parse(row[4] || '[]'),
      cards_wanted: JSON.parse(row[5] || '[]'), message: row[6],
      created_at: row[7], updated_at: row[8],
      sender_name: row[9], receiver_name: row[10]
    })) : [];

    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create trade offer
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { receiver_id, cards_offered, cards_wanted, message } = req.body;

    if (!receiver_id || !cards_offered) {
      return res.status(400).json({ error: 'receiver_id and cards_offered are required' });
    }

    const id = uuidv4();
    db.run(
      "INSERT INTO trades (id, sender_id, receiver_id, cards_offered, cards_wanted, message) VALUES (?, ?, ?, ?, ?, ?)",
      [id, req.user.id, receiver_id, JSON.stringify(cards_offered), JSON.stringify(cards_wanted || []), message || '']
    );
    saveDatabase();

    res.status(201).json({ id, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept/Reject trade
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { action } = req.body; // 'accept' or 'reject'

    const tradeResult = db.exec("SELECT * FROM trades WHERE id = ?", [req.params.id]);
    if (tradeResult.length === 0 || tradeResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const trade = tradeResult[0].values[0];
    if (trade[2] !== req.user.id) { // receiver_id
      return res.status(403).json({ error: 'Only the receiver can accept/reject' });
    }

    if (trade[3] !== 'pending') {
      return res.status(400).json({ error: 'Trade is no longer pending' });
    }

    if (action === 'accept') {
      // Transfer cards between collections
      const offeredCards = JSON.parse(trade[4] || '[]');
      const wantedCards = JSON.parse(trade[5] || '[]');

      // Move offered cards from sender to receiver
      for (const card of offeredCards) {
        db.run("UPDATE collections SET quantity = quantity - ? WHERE user_id = ? AND card_id = ?",
          [card.quantity || 1, trade[1], card.card_id]);
        
        const existing = db.exec(
          "SELECT quantity FROM collections WHERE user_id = ? AND card_id = ?",
          [trade[2], card.card_id]
        );
        if (existing.length > 0 && existing[0].values.length > 0) {
          db.run("UPDATE collections SET quantity = quantity + ? WHERE user_id = ? AND card_id = ?",
            [card.quantity || 1, trade[2], card.card_id]);
        } else {
          db.run("INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [trade[2], card.card_id, card.card_name || '', card.set_code || '', card.rarity || '', card.image_uri || '', card.quantity || 1]);
        }
      }

      // Move wanted cards from receiver to sender
      for (const card of wantedCards) {
        db.run("UPDATE collections SET quantity = quantity - ? WHERE user_id = ? AND card_id = ?",
          [card.quantity || 1, trade[2], card.card_id]);

        const existing = db.exec(
          "SELECT quantity FROM collections WHERE user_id = ? AND card_id = ?",
          [trade[1], card.card_id]
        );
        if (existing.length > 0 && existing[0].values.length > 0) {
          db.run("UPDATE collections SET quantity = quantity + ? WHERE user_id = ? AND card_id = ?",
            [card.quantity || 1, trade[1], card.card_id]);
        } else {
          db.run("INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [trade[1], card.card_id, card.card_name || '', card.set_code || '', card.rarity || '', card.image_uri || '', card.quantity || 1]);
        }
      }

      // Clean up zero-quantity entries
      db.run("DELETE FROM collections WHERE quantity <= 0");
    }

    db.run("UPDATE trades SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [action === 'accept' ? 'accepted' : 'rejected', req.params.id]);
    saveDatabase();

    res.json({ success: true, status: action === 'accept' ? 'accepted' : 'rejected' });
  } catch (err) {
    console.error('Trade action error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
