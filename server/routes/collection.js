const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get user's collection
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { set_code, rarity, color, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM collections WHERE user_id = ?";
    const params = [req.user.id];

    if (set_code) { query += " AND set_code = ?"; params.push(set_code); }
    if (rarity) { query += " AND rarity = ?"; params.push(rarity); }
    if (search) { query += " AND card_name LIKE ?"; params.push(`%${search}%`); }

    query += ` ORDER BY card_name ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const result = db.exec(query, params);
    const countResult = db.exec("SELECT COUNT(*) as total FROM collections WHERE user_id = ?", [req.user.id]);

    const cards = result.length > 0 ? result[0].values.map(row => ({
      id: row[0], user_id: row[1], card_id: row[2], card_name: row[3],
      set_code: row[4], rarity: row[5], image_uri: row[6],
      quantity: row[7], foil: row[8]
    })) : [];

    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

    res.json({ cards, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Collection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add card to collection
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { card_id, card_name, set_code, rarity, image_uri, quantity = 1, foil = 0 } = req.body;

    if (!card_id) return res.status(400).json({ error: 'card_id is required' });

    // Try to update existing
    const existing = db.exec(
      "SELECT id, quantity FROM collections WHERE user_id = ? AND card_id = ? AND foil = ?",
      [req.user.id, card_id, foil ? 1 : 0]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      const currentQty = existing[0].values[0][1];
      db.run("UPDATE collections SET quantity = ? WHERE user_id = ? AND card_id = ? AND foil = ?",
        [currentQty + quantity, req.user.id, card_id, foil ? 1 : 0]);
    } else {
      db.run(
        "INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [req.user.id, card_id, card_name || '', set_code || '', rarity || '', image_uri || '', quantity, foil ? 1 : 0]
      );
    }
    saveDatabase();

    res.json({ success: true, message: 'Card added to collection' });
  } catch (err) {
    console.error('Add card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add multiple cards (for booster opening)
router.post('/bulk', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { cards } = req.body;

    if (!Array.isArray(cards)) return res.status(400).json({ error: 'cards array is required' });

    for (const card of cards) {
      const existing = db.exec(
        "SELECT id, quantity FROM collections WHERE user_id = ? AND card_id = ? AND foil = ?",
        [req.user.id, card.card_id, card.foil ? 1 : 0]
      );

      if (existing.length > 0 && existing[0].values.length > 0) {
        const currentQty = existing[0].values[0][1];
        db.run("UPDATE collections SET quantity = ? WHERE user_id = ? AND card_id = ? AND foil = ?",
          [currentQty + (card.quantity || 1), req.user.id, card.card_id, card.foil ? 1 : 0]);
      } else {
        db.run(
          "INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [req.user.id, card.card_id, card.card_name || '', card.set_code || '', card.rarity || '', card.image_uri || '', card.quantity || 1, card.foil ? 1 : 0]
        );
      }
    }
    saveDatabase();

    res.json({ success: true, message: `${cards.length} cards added` });
  } catch (err) {
    console.error('Bulk add error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove card from collection
router.delete('/:cardId', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { cardId } = req.params;
    const { quantity = 1, foil = 0 } = req.query;

    const existing = db.exec(
      "SELECT id, quantity FROM collections WHERE user_id = ? AND card_id = ? AND foil = ?",
      [req.user.id, cardId, foil ? 1 : 0]
    );

    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ error: 'Card not in collection' });
    }

    const currentQty = existing[0].values[0][1];
    if (currentQty <= quantity) {
      db.run("DELETE FROM collections WHERE user_id = ? AND card_id = ? AND foil = ?",
        [req.user.id, cardId, foil ? 1 : 0]);
    } else {
      db.run("UPDATE collections SET quantity = ? WHERE user_id = ? AND card_id = ? AND foil = ?",
        [currentQty - quantity, req.user.id, cardId, foil ? 1 : 0]);
    }
    saveDatabase();

    res.json({ success: true });
  } catch (err) {
    console.error('Remove card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Collection stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;

    const totalCards = db.exec("SELECT COALESCE(SUM(quantity), 0) FROM collections WHERE user_id = ?", [userId]);
    const uniqueCards = db.exec("SELECT COUNT(*) FROM collections WHERE user_id = ?", [userId]);
    const byRarity = db.exec("SELECT rarity, COUNT(*), SUM(quantity) FROM collections WHERE user_id = ? GROUP BY rarity", [userId]);

    res.json({
      total_cards: totalCards[0]?.values[0][0] || 0,
      unique_cards: uniqueCards[0]?.values[0][0] || 0,
      by_rarity: byRarity.length > 0 ? byRarity[0].values.map(r => ({
        rarity: r[0], unique: r[1], total: r[2]
      })) : []
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
