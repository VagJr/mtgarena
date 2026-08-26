/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Dynamic Pricing & Market Intelligence API
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/pricing/market-overview — Full market intelligence
router.get('/market-overview', (req, res) => {
  try {
    const db = getDb();

    const totalListings = db.exec(`SELECT COUNT(*) FROM market_listings WHERE status = 'active'`);
    const totalSold = db.exec(`SELECT COUNT(*) FROM market_listings WHERE status = 'sold'`);
    const avgPrice = db.exec(`SELECT AVG(price_gold) FROM market_listings WHERE status = 'active'`);
    const totalVolume = db.exec(`SELECT SUM(price_gold) FROM market_listings WHERE status = 'sold'`);

    const byRarity = db.exec(`
      SELECT rarity, COUNT(*) as count, AVG(price_gold) as avg_price, MIN(price_gold) as min_price, MAX(price_gold) as max_price
      FROM market_listings WHERE status = 'active' GROUP BY rarity ORDER BY
      CASE rarity WHEN 'mythic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END
    `);

    const recentSales = db.exec(`
      SELECT m.card_name, m.rarity, m.price_gold, m.created_at as sold_at, u.username as seller_name
      FROM market_listings m
      JOIN users u ON m.seller_id = u.id
      WHERE m.status = 'sold'
      ORDER BY m.created_at DESC LIMIT 15
    `);

    const events = db.exec(`SELECT * FROM market_events WHERE active = 1 ORDER BY expires_at DESC`);

    res.json({
      stats: {
        activeListings: totalListings.length ? totalListings[0].values[0][0] : 0,
        totalSold: totalSold.length ? totalSold[0].values[0][0] : 0,
        avgPrice: avgPrice.length ? Math.round(avgPrice[0].values[0][0] || 0) : 0,
        totalVolume: totalVolume.length ? totalVolume[0].values[0][0] || 0 : 0,
      },
      byRarity: byRarity.length ? byRarity[0].values.map(row => {
        const obj = {};
        byRarity[0].columns.forEach((col, idx) => obj[col] = row[idx]);
        return obj;
      }) : [],
      recentSales: recentSales.length ? recentSales[0].values.map(row => {
        const obj = {};
        recentSales[0].columns.forEach((col, idx) => obj[col] = row[idx]);
        return obj;
      }) : [],
      activeEvents: events.length ? events[0].values.map(row => {
        const obj = {};
        events[0].columns.forEach((col, idx) => obj[col] = row[idx]);
        return obj;
      }) : [],
    });
  } catch (err) {
    console.error('Error fetching market overview:', err);
    res.status(500).json({ error: 'Erro ao carregar visão do mercado' });
  }
});

// GET /api/pricing/card/:cardId — Card price data
router.get('/card/:cardId', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`SELECT * FROM dynamic_pricing WHERE card_id = ?`, [req.params.cardId]);
    if (!result.length || !result[0].values.length) {
      return res.json({ price: null });
    }
    const price = {};
    result[0].columns.forEach((col, idx) => price[col] = result[0].values[0][idx]);
    res.json({ price });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar preço da carta' });
  }
});

// GET /api/pricing/collection-value — Current user's collection value
router.get('/collection-value', authenticateToken, (req, res) => {
  try {
    const db = getDb();

    const collections = db.exec(`
      SELECT c.card_id, c.card_name, c.rarity, c.quantity, c.foil, c.image_uri, c.set_code
      FROM collections c WHERE c.user_id = ?
    `, [req.user.id]);

    const RARITY_BASE = { common: 15, uncommon: 50, rare: 250, mythic: 1000 };
    let totalValue = 0;
    let cardCount = 0;
    const breakdown = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
    const topCards = [];

    if (collections.length) {
      const cols = collections[0].columns;
      for (const row of collections[0].values) {
        const card = {};
        cols.forEach((col, idx) => card[col] = row[idx]);

        const pricing = db.exec(`SELECT current_price FROM dynamic_pricing WHERE card_id = ?`, [card.card_id]);
        let price = pricing.length && pricing[0].values.length ? pricing[0].values[0][0] : (RARITY_BASE[card.rarity] || 15);
        if (card.foil) price = Math.round(price * 2.5);

        const cardValue = price * (card.quantity || 1);
        totalValue += cardValue;
        cardCount += card.quantity || 1;
        breakdown[card.rarity] = (breakdown[card.rarity] || 0) + (card.quantity || 0);

        if (cardValue > 100) {
          topCards.push({ ...card, estimated_value: price, total_value: cardValue });
        }
      }
    }

    topCards.sort((a, b) => b.total_value - a.total_value);

    const uniqueRes = db.exec(`SELECT COUNT(DISTINCT card_id) FROM collections WHERE user_id = ?`, [req.user.id]);
    const uniqueCards = uniqueRes.length && uniqueRes[0].values.length ? uniqueRes[0].values[0][0] : 0;

    res.json({
      totalValue,
      cardCount,
      uniqueCards,
      breakdown,
      completionPct: Math.min(100, (uniqueCards / 500) * 100),
      topCards: topCards.slice(0, 20),
      rank: totalValue > 50000 ? 'Mítico' : totalValue > 20000 ? 'Lendário' : totalValue > 5000 ? 'Raro' : totalValue > 1000 ? 'Incomum' : 'Comum',
    });
  } catch (err) {
    console.error('Error calculating collection value:', err);
    res.status(500).json({ error: 'Erro ao calcular valor da coleção' });
  }
});

// GET /api/pricing/events — Active market events
router.get('/events', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`SELECT * FROM market_events WHERE active = 1 ORDER BY expires_at DESC`);
    const events = result.length ? result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    }) : [];
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar eventos' });
  }
});

module.exports = router;
