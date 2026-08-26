/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Marketplace & Trade Hub API
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/market — List active market listings with filters
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { search, rarity, set_code, foil, sort } = req.query;

    let query = `
      SELECT m.*, u.username as seller_name, u.avatar as seller_avatar, u.level as seller_level
      FROM market_listings m
      JOIN users u ON m.seller_id = u.id
      WHERE m.status = 'active'
    `;
    const params = [];

    if (search) {
      query += ` AND m.card_name LIKE ?`;
      params.push(`%${search}%`);
    }
    if (rarity) {
      query += ` AND LOWER(m.rarity) = LOWER(?)`;
      params.push(rarity);
    }
    if (set_code) {
      query += ` AND LOWER(m.set_code) = LOWER(?)`;
      params.push(set_code);
    }
    if (foil !== undefined && foil !== '') {
      query += ` AND m.foil = ?`;
      params.push(foil === '1' || foil === 'true' ? 1 : 0);
    }

    if (sort === 'price_asc') query += ` ORDER BY m.price_gold ASC`;
    else if (sort === 'price_desc') query += ` ORDER BY m.price_gold DESC`;
    else if (sort === 'oldest') query += ` ORDER BY m.created_at ASC`;
    else query += ` ORDER BY m.created_at DESC`;

    const result = db.exec(query, params);
    if (!result.length) return res.json({ listings: [] });

    const cols = result[0].columns;
    const listings = result[0].values.map(row => {
      const obj = {};
      cols.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });

    res.json({ listings });
  } catch (err) {
    console.error('Error fetching market listings:', err);
    res.status(500).json({ error: 'Erro ao carregar anúncios do mercado' });
  }
});

// GET /api/market/my-listings — List current user's listings
router.get('/my-listings', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT * FROM market_listings
      WHERE seller_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    if (!result.length) return res.json({ listings: [] });

    const cols = result[0].columns;
    const listings = result[0].values.map(row => {
      const obj = {};
      cols.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });

    res.json({ listings });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar seus anúncios' });
  }
});

// POST /api/market/sell — Create a new listing from user's collection
router.post('/sell', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { card_id, price_gold, foil } = req.body;

    if (!card_id || !price_gold || price_gold <= 0) {
      return res.status(400).json({ error: 'Informe a carta e um valor válido de Gold.' });
    }

    const foilInt = foil ? 1 : 0;
    const collRes = db.exec(`
      SELECT * FROM collections
      WHERE user_id = ? AND card_id = ? AND foil = ?
    `, [req.user.id, card_id, foilInt]);

    if (!collRes.length || !collRes[0].values.length) {
      return res.status(404).json({ error: 'Carta não encontrada na sua coleção.' });
    }

    const card = {};
    collRes[0].columns.forEach((col, idx) => card[col] = collRes[0].values[0][idx]);

    if (card.quantity < 1) {
      return res.status(400).json({ error: 'Quantidade insuficiente para anunciar.' });
    }

    // Deduct 1 from collection
    if (card.quantity === 1) {
      db.run(`DELETE FROM collections WHERE id = ?`, [card.id]);
    } else {
      db.run(`UPDATE collections SET quantity = quantity - 1 WHERE id = ?`, [card.id]);
    }

    // Create listing
    const listingId = uuidv4();
    db.run(`
      INSERT INTO market_listings (id, seller_id, card_id, card_name, set_code, rarity, image_uri, foil, price_gold, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [listingId, req.user.id, card.card_id, card.card_name, card.set_code, card.rarity, card.image_uri, foilInt, Math.round(price_gold)]);

    saveDatabase();

    res.status(201).json({
      message: 'Carta anunciada no mercado com sucesso! 🛒',
      listing_id: listingId
    });
  } catch (err) {
    console.error('Error creating market listing:', err);
    res.status(500).json({ error: 'Erro ao anunciar carta: ' + err.message });
  }
});

// POST /api/market/buy/:id — Buy an active listing
router.post('/buy/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const listingId = req.params.id;

    const listRes = db.exec(`SELECT * FROM market_listings WHERE id = ? AND status = 'active'`, [listingId]);
    if (!listRes.length || !listRes[0].values.length) {
      return res.status(404).json({ error: 'Anúncio não encontrado ou já vendido.' });
    }

    const listing = {};
    listRes[0].columns.forEach((col, idx) => listing[col] = listRes[0].values[0][idx]);

    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode comprar seu próprio anúncio.' });
    }

    // Check buyer balance
    const userRes = db.exec(`SELECT gold FROM users WHERE id = ?`, [req.user.id]);
    const buyerGold = userRes[0].values[0][0];

    if (buyerGold < listing.price_gold) {
      return res.status(400).json({ error: `Gold insuficiente! Você possui ${buyerGold} Gold e a carta custa ${listing.price_gold} Gold.` });
    }

    // Process transaction
    db.run(`UPDATE users SET gold = gold - ? WHERE id = ?`, [listing.price_gold, req.user.id]);
    db.run(`UPDATE users SET gold = gold + ? WHERE id = ?`, [listing.price_gold, listing.seller_id]);
    db.run(`UPDATE market_listings SET status = 'sold' WHERE id = ?`, [listingId]);

    // Add card to buyer's collection
    const existingColl = db.exec(`
      SELECT id, quantity FROM collections WHERE user_id = ? AND card_id = ? AND foil = ?
    `, [req.user.id, listing.card_id, listing.foil]);

    if (existingColl.length && existingColl[0].values.length) {
      db.run(`UPDATE collections SET quantity = quantity + 1 WHERE id = ?`, [existingColl[0].values[0][0]]);
    } else {
      db.run(`
        INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `, [req.user.id, listing.card_id, listing.card_name, listing.set_code, listing.rarity, listing.image_uri, listing.foil]);
    }

    saveDatabase();

    res.json({
      message: `🎉 Você comprou "${listing.card_name}" por ${listing.price_gold} Gold!`,
      card: listing
    });
  } catch (err) {
    console.error('Error buying listing:', err);
    res.status(500).json({ error: 'Erro ao processar compra: ' + err.message });
  }
});

// POST /api/market/cancel/:id — Cancel a listing and return card
router.post('/cancel/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const listingId = req.params.id;

    const listRes = db.exec(`SELECT * FROM market_listings WHERE id = ? AND seller_id = ? AND status = 'active'`, [listingId, req.user.id]);
    if (!listRes.length || !listRes[0].values.length) {
      return res.status(404).json({ error: 'Anúncio ativo não encontrado.' });
    }

    const listing = {};
    listRes[0].columns.forEach((col, idx) => listing[col] = listRes[0].values[0][idx]);

    db.run(`UPDATE market_listings SET status = 'cancelled' WHERE id = ?`, [listingId]);

    // Return card to collection
    const existingColl = db.exec(`
      SELECT id, quantity FROM collections WHERE user_id = ? AND card_id = ? AND foil = ?
    `, [req.user.id, listing.card_id, listing.foil]);

    if (existingColl.length && existingColl[0].values.length) {
      db.run(`UPDATE collections SET quantity = quantity + 1 WHERE id = ?`, [existingColl[0].values[0][0]]);
    } else {
      db.run(`
        INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `, [req.user.id, listing.card_id, listing.card_name, listing.set_code, listing.rarity, listing.image_uri, listing.foil]);
    }

    saveDatabase();

    res.json({ message: 'Anúncio cancelado e carta devolvida à sua coleção.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar anúncio: ' + err.message });
  }
});

// GET /api/market/trades — List trades
router.get('/trades', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT t.*, u1.username as sender_name, u2.username as receiver_name
      FROM trades t
      JOIN users u1 ON t.sender_id = u1.id
      JOIN users u2 ON t.receiver_id = u2.id
      WHERE t.sender_id = ? OR t.receiver_id = ?
      ORDER BY t.created_at DESC
    `, [req.user.id, req.user.id]);

    if (!result.length) return res.json({ trades: [] });

    const cols = result[0].columns;
    const trades = result[0].values.map(row => {
      const obj = {};
      cols.forEach((col, idx) => obj[col] = row[idx]);
      try { obj.cards_offered = JSON.parse(obj.cards_offered || '[]'); } catch(e) { obj.cards_offered = []; }
      try { obj.cards_wanted = JSON.parse(obj.cards_wanted || '[]'); } catch(e) { obj.cards_wanted = []; }
      return obj;
    });

    res.json({ trades });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar propostas de troca' });
  }
});

// POST /api/market/trades — Create a trade proposal
router.post('/trades', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { receiver_username, cards_offered, cards_wanted, message } = req.body;

    const userRes = db.exec(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, [receiver_username]);
    if (!userRes.length || !userRes[0].values.length) {
      return res.status(404).json({ error: 'Jogador destinatário não encontrado.' });
    }

    const receiverId = userRes[0].values[0][0];
    if (receiverId === req.user.id) {
      return res.status(400).json({ error: 'Você não pode propor uma troca para si mesmo.' });
    }

    const tradeId = uuidv4();
    db.run(`
      INSERT INTO trades (id, sender_id, receiver_id, status, cards_offered, cards_wanted, message)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `, [tradeId, req.user.id, receiverId, JSON.stringify(cards_offered || []), JSON.stringify(cards_wanted || []), message || '']);

    saveDatabase();

    res.status(201).json({
      message: 'Proposta de troca enviada com sucesso! 🔄',
      trade_id: tradeId
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar proposta de troca: ' + err.message });
  }
});

module.exports = router;
