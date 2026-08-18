const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get user's decks
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      "SELECT id, name, description, format, cards_json, sideboard_json, commander_id, cover_card_id, is_public, wins, losses, created_at, updated_at FROM decks WHERE user_id = ? ORDER BY updated_at DESC",
      [req.user.id]
    );

    const decks = result.length > 0 ? result[0].values.map(row => ({
      id: row[0], name: row[1], description: row[2], format: row[3],
      cards: JSON.parse(row[4] || '[]'), sideboard: JSON.parse(row[5] || '[]'),
      commander_id: row[6], cover_card_id: row[7], is_public: !!row[8],
      wins: row[9], losses: row[10], created_at: row[11], updated_at: row[12]
    })) : [];

    res.json(decks);
  } catch (err) {
    console.error('Get decks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single deck
router.get('/:id', (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      "SELECT d.*, u.username FROM decks d JOIN users u ON d.user_id = u.id WHERE d.id = ?",
      [req.params.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const row = result[0].values[0];
    res.json({
      id: row[0], user_id: row[1], name: row[2], description: row[3],
      format: row[4], cards: JSON.parse(row[5] || '[]'),
      sideboard: JSON.parse(row[6] || '[]'), commander_id: row[7],
      cover_card_id: row[8], is_public: !!row[9], wins: row[10],
      losses: row[11], created_at: row[12], updated_at: row[13],
      author: row[14]
    });
  } catch (err) {
    console.error('Get deck error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create deck
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { name, description, format, cards, sideboard, commander_id, cover_card_id } = req.body;

    if (!name) return res.status(400).json({ error: 'Deck name is required' });

    const id = uuidv4();
    db.run(
      "INSERT INTO decks (id, user_id, name, description, format, cards_json, sideboard_json, commander_id, cover_card_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, req.user.id, name, description || '', format || 'standard',
       JSON.stringify(cards || []), JSON.stringify(sideboard || []),
       commander_id || null, cover_card_id || null]
    );
    saveDatabase();

    res.status(201).json({ id, name, format: format || 'standard' });
  } catch (err) {
    console.error('Create deck error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update deck
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { name, description, format, cards, sideboard, commander_id, cover_card_id, is_public } = req.body;

    // Verify ownership
    const existing = db.exec("SELECT user_id FROM decks WHERE id = ?", [req.params.id]);
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    if (existing[0].values[0][0] !== req.user.id) {
      return res.status(403).json({ error: 'Not your deck' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (format !== undefined) { updates.push('format = ?'); params.push(format); }
    if (cards !== undefined) { updates.push('cards_json = ?'); params.push(JSON.stringify(cards)); }
    if (sideboard !== undefined) { updates.push('sideboard_json = ?'); params.push(JSON.stringify(sideboard)); }
    if (commander_id !== undefined) { updates.push('commander_id = ?'); params.push(commander_id); }
    if (cover_card_id !== undefined) { updates.push('cover_card_id = ?'); params.push(cover_card_id); }
    if (is_public !== undefined) { updates.push('is_public = ?'); params.push(is_public ? 1 : 0); }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.run(`UPDATE decks SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDatabase();

    res.json({ success: true });
  } catch (err) {
    console.error('Update deck error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete deck
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const existing = db.exec("SELECT user_id FROM decks WHERE id = ?", [req.params.id]);
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    if (existing[0].values[0][0] !== req.user.id) {
      return res.status(403).json({ error: 'Not your deck' });
    }

    db.run("DELETE FROM decks WHERE id = ?", [req.params.id]);
    saveDatabase();

    res.json({ success: true });
  } catch (err) {
    console.error('Delete deck error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import deck from text
router.post('/import', authenticateToken, (req, res) => {
  try {
    const { text, name, format } = req.body;
    if (!text) return res.status(400).json({ error: 'Deck text is required' });

    const lines = text.trim().split('\n');
    const cards = [];
    const sideboard = [];
    let isSideboard = false;
    let commander_id = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for sideboard/commander markers
      if (/^(sideboard|sb)/i.test(trimmed)) { isSideboard = true; continue; }
      if (/^(commander|cmdr)/i.test(trimmed)) { continue; } // next line is commander
      if (/^(deck|mainboard|main)/i.test(trimmed)) { isSideboard = false; continue; }
      if (/^\/\//i.test(trimmed)) continue; // comment

      // Parse "4 Lightning Bolt" or "4x Lightning Bolt" or "Lightning Bolt"
      const match = trimmed.match(/^(\d+)\s*x?\s+(.+)$/i);
      const quantity = match ? parseInt(match[1]) : 1;
      const cardName = match ? match[2].trim() : trimmed;

      // Remove set info if present: "Lightning Bolt (M21) 123"
      const cleanName = cardName.replace(/\s*\([A-Z0-9]+\)\s*\d*\s*$/, '').trim();

      const entry = { name: cleanName, quantity };

      if (isSideboard) {
        sideboard.push(entry);
      } else {
        cards.push(entry);
      }
    }

    const id = uuidv4();
    const db = req.db;
    db.run(
      "INSERT INTO decks (id, user_id, name, format, cards_json, sideboard_json) VALUES (?, ?, ?, ?, ?, ?)",
      [id, req.user.id, name || 'Imported Deck', format || 'standard',
       JSON.stringify(cards), JSON.stringify(sideboard)]
    );
    saveDatabase();

    res.status(201).json({ id, cards_count: cards.length, sideboard_count: sideboard.length });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export deck as text
router.get('/:id/export', (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      "SELECT name, format, cards_json, sideboard_json, commander_id FROM decks WHERE id = ?",
      [req.params.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const row = result[0].values[0];
    const cards = JSON.parse(row[2] || '[]');
    const sideboard = JSON.parse(row[3] || '[]');

    let text = `// ${row[0]} (${row[1]})\n// Exported from MTG Arena Social\n\n`;

    if (row[4]) {
      text += `Commander\n${row[4]}\n\n`;
    }

    text += `Deck\n`;
    for (const card of cards) {
      text += `${card.quantity} ${card.name}\n`;
    }

    if (sideboard.length > 0) {
      text += `\nSideboard\n`;
      for (const card of sideboard) {
        text += `${card.quantity} ${card.name}\n`;
      }
    }

    const { format: fmt } = req.query;
    if (fmt === 'text') {
      res.type('text/plain').send(text);
    } else {
      res.json({ text, name: row[0], format: row[1] });
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
