const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get all customization items (shop catalog)
router.get('/shop', (req, res) => {
  try {
    const db = req.db;
    const { type, rarity } = req.query;
    let query = "SELECT * FROM customization_items WHERE active = 1";
    const params = [];
    if (type) { query += " AND item_type = ?"; params.push(type); }
    if (rarity) { query += " AND rarity = ?"; params.push(rarity); }
    query += " ORDER BY item_type, rarity, price_gold";

    const result = db.exec(query, params);
    if (result.length === 0) return res.json([]);

    const items = result[0].values.map(row => ({
      id: row[0], name: row[1], description: row[2],
      item_type: row[3], rarity: row[4],
      price_gold: row[5], price_gems: row[6],
      preview_url: row[7], css_data: JSON.parse(row[8] || '{}'),
      limited: row[9], available_from: row[10], available_until: row[11]
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's owned customizations
router.get('/my-items', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      `SELECT ci.*, uc.equipped, uc.slot
       FROM user_customizations uc
       JOIN customization_items ci ON uc.item_id = ci.id
       WHERE uc.user_id = ?
       ORDER BY ci.item_type, ci.rarity`,
      [req.user.id]
    );

    if (result.length === 0) return res.json([]);

    const items = result[0].values.map(row => ({
      id: row[0], name: row[1], description: row[2],
      item_type: row[3], rarity: row[4],
      price_gold: row[5], price_gems: row[6],
      preview_url: row[7], css_data: JSON.parse(row[8] || '{}'),
      equipped: row[12], slot: row[13]
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's equipped customizations (public)
router.get('/equipped/:userId', (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      `SELECT ci.item_type, ci.css_data, ci.name
       FROM user_customizations uc
       JOIN customization_items ci ON uc.item_id = ci.id
       WHERE uc.user_id = ? AND uc.equipped = 1`,
      [req.params.userId]
    );

    if (result.length === 0) return res.json({});

    const equipped = {};
    for (const row of result[0].values) {
      equipped[row[0]] = { css: JSON.parse(row[1] || '{}'), name: row[2] };
    }

    res.json(equipped);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Buy customization item
router.post('/buy', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { item_id, currency = 'gold' } = req.body;

    const item = db.exec("SELECT * FROM customization_items WHERE id = ? AND active = 1", [item_id]);
    if (item.length === 0 || item[0].values.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const i = item[0].values[0];

    // Check if already owned
    const owned = db.exec("SELECT id FROM user_customizations WHERE user_id = ? AND item_id = ?", [req.user.id, item_id]);
    if (owned.length > 0 && owned[0].values.length > 0) {
      return res.status(400).json({ error: 'Item already owned' });
    }

    // Check funds
    const userResult = db.exec(`SELECT ${currency === 'gold' ? 'gold' : 'gems'} FROM users WHERE id = ?`, [req.user.id]);
    const balance = userResult[0]?.values[0][0] || 0;
    const cost = currency === 'gold' ? i[5] : i[6];

    if (balance < cost) {
      return res.status(400).json({ error: `Saldo insuficiente. Necessário: ${cost}, você tem: ${balance}` });
    }

    // Deduct and grant
    db.run(`UPDATE users SET ${currency === 'gold' ? 'gold' : 'gems'} = ${currency === 'gold' ? 'gold' : 'gems'} - ? WHERE id = ?`, [cost, req.user.id]);
    db.run("INSERT INTO user_customizations (user_id, item_id) VALUES (?, ?)", [req.user.id, item_id]);

    // Award XP for purchase
    db.run("UPDATE users SET xp = xp + 15 WHERE id = ?", [req.user.id]);

    saveDatabase();

    const updatedUser = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = updatedUser[0]?.values[0] || [0, 0, 0, 1];

    res.json({
      item: { id: i[0], name: i[1], item_type: i[3], rarity: i[4] },
      balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Equip/unequip item
router.post('/equip', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { item_id, equipped = true } = req.body;

    const item = db.exec("SELECT item_type FROM customization_items WHERE id = ?", [item_id]);
    if (item.length === 0 || item[0].values.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const itemType = item[0].values[0][0];

    // Check ownership
    const owned = db.exec("SELECT id FROM user_customizations WHERE user_id = ? AND item_id = ?", [req.user.id, item_id]);
    if (owned.length === 0 || owned[0].values.length === 0) {
      return res.status(400).json({ error: 'Item not owned' });
    }

    if (equipped) {
      // Unequip all items of same type first
      db.run("UPDATE user_customizations SET equipped = 0 WHERE user_id = ? AND item_id IN (SELECT id FROM customization_items WHERE item_type = ?)",
        [req.user.id, itemType]);
      // Equip this item
      db.run("UPDATE user_customizations SET equipped = 1, slot = ? WHERE user_id = ? AND item_id = ?",
        [itemType, req.user.id, item_id]);
    } else {
      db.run("UPDATE user_customizations SET equipped = 0 WHERE user_id = ? AND item_id = ?",
        [req.user.id, item_id]);
    }

    saveDatabase();
    res.json({ success: true, equipped });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Crafting: disenchant cards into dust
router.post('/craft/disenchant', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { card_id, quantity = 1 } = req.body;

    const card = db.exec("SELECT rarity FROM collections WHERE user_id = ? AND card_id = ? AND quantity >= ?",
      [req.user.id, card_id, quantity]);
    if (card.length === 0 || card[0].values.length === 0) {
      return res.status(400).json({ error: 'Card not found in collection' });
    }

    const rarity = card[0].values[0][0];
    const dustValues = { common: 5, uncommon: 10, rare: 20, mythic: 40 };
    const dust = (dustValues[rarity] || 5) * quantity;

    // Remove cards
    db.run("UPDATE collections SET quantity = quantity - ? WHERE user_id = ? AND card_id = ?",
      [quantity, req.user.id, card_id]);
    db.run("DELETE FROM collections WHERE quantity <= 0 AND user_id = ? AND card_id = ?",
      [req.user.id, card_id]);

    // Add to vault
    db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [req.user.id]);
    db.run("UPDATE vault SET total_dust = total_dust + ? WHERE user_id = ?", [dust, req.user.id]);

    saveDatabase();
    res.json({ dust_gained: dust, rarity, quantity });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Crafting: craft wildcards
router.post('/craft/wildcard', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { from_rarity, to_rarity, quantity = 1 } = req.body;

    const recipes = {
      'common-to-uncommon': { input: 'common', count: 5, output: 'uncommon', dust: 0 },
      'uncommon-to-rare': { input: 'uncommon', count: 3, output: 'rare', dust: 20 },
      'rare-to-mythic': { input: 'rare', count: 4, output: 'mythic', dust: 50 },
    };

    const recipeKey = `${from_rarity}-to-${to_rarity}`;
    const recipe = recipes[recipeKey];
    if (!recipe) return res.status(400).json({ error: 'Invalid crafting recipe' });

    // Check dust
    db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [req.user.id]);
    const vault = db.exec("SELECT total_dust FROM vault WHERE user_id = ?", [req.user.id]);
    const dust = vault[0]?.values[0][0] || 0;

    if (dust < recipe.dust * quantity) {
      return res.status(400).json({ error: `Po insuficiente. Necessário: ${recipe.dust * quantity}, você tem: ${dust}` });
    }

    // Deduct dust
    if (recipe.dust > 0) {
      db.run("UPDATE vault SET total_dust = total_dust - ? WHERE user_id = ?", [recipe.dust * quantity, req.user.id]);
    }

    // Add wildcards
    db.run("INSERT OR IGNORE INTO wildcards (user_id, rarity, quantity) VALUES (?, ?, 0)", [req.user.id, recipe.output]);
    db.run("UPDATE wildcards SET quantity = quantity + ? WHERE user_id = ? AND rarity = ?",
      [quantity, req.user.id, recipe.output]);

    saveDatabase();
    res.json({ success: true, crafted: { rarity: recipe.output, quantity } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's vault and wildcards
router.get('/vault', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [req.user.id]);
    const vault = db.exec("SELECT total_dust FROM vault WHERE user_id = ?", [req.user.id]);
    const wildcards = db.exec("SELECT rarity, quantity FROM wildcards WHERE user_id = ?", [req.user.id]);

    const wc = {};
    if (wildcards.length > 0) {
      for (const row of wildcards[0].values) {
        wc[row[0]] = row[1];
      }
    }

    res.json({
      dust: vault[0]?.values[0][0] || 0,
      wildcards: { common: wc.common || 0, uncommon: wc.uncommon || 0, rare: wc.rare || 0, mythic: wc.mythic || 0 }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
