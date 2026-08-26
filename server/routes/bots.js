/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Bot Economy & Dynamic Pricing API
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/bots — List all active bots with status
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT b.id, b.name, b.personality, b.avatar, b.specialty, b.gold, b.level, b.description,
        (SELECT COUNT(*) FROM bot_inventory bi WHERE bi.bot_id = b.id) as card_count,
        (SELECT SUM(bi.quantity) FROM bot_inventory bi WHERE bi.bot_id = b.id) as total_cards,
        (SELECT COUNT(*) FROM bot_activity_log bal WHERE bal.bot_id = b.id AND bal.action = 'buy') as total_buys,
        (SELECT COUNT(*) FROM bot_activity_log bal WHERE bal.bot_id = b.id AND bal.action = 'sell') as total_sells
      FROM bot_players b WHERE b.active = 1 ORDER BY b.level DESC
    `);

    if (!result.length) return res.json({ bots: [] });

    const bots = result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });

    res.json({ bots });
  } catch (err) {
    console.error('Error fetching bots:', err);
    res.status(500).json({ error: 'Erro ao carregar bots' });
  }
});

// GET /api/bots/:id — Get specific bot details + inventory
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const botRes = db.exec(`SELECT * FROM bot_players WHERE id = ?`, [req.params.id]);
    if (!botRes.length || !botRes[0].values.length) {
      return res.status(404).json({ error: 'Bot não encontrado' });
    }

    const bot = {};
    botRes[0].columns.forEach((col, idx) => bot[col] = botRes[0].values[0][idx]);

    const invRes = db.exec(`SELECT * FROM bot_inventory WHERE bot_id = ? ORDER BY rarity DESC, card_name ASC`, [req.params.id]);
    bot.inventory = invRes.length ? invRes[0].values.map(row => {
      const obj = {};
      invRes[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    }) : [];

    const recentActivity = db.exec(`
      SELECT * FROM bot_activity_log WHERE bot_id = ? ORDER BY created_at DESC LIMIT 20
    `, [req.params.id]);
    bot.recentActivity = recentActivity.length ? recentActivity[0].values.map(row => {
      const obj = {};
      recentActivity[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    }) : [];

    res.json({ bot });
  } catch (err) {
    console.error('Error fetching bot:', err);
    res.status(500).json({ error: 'Erro ao carregar bot' });
  }
});

// GET /api/bots/activity/recent — Global bot activity feed
router.get('/activity/recent', (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const result = db.exec(`
      SELECT bal.*, bp.name as bot_name, bp.avatar as bot_avatar
      FROM bot_activity_log bal
      JOIN bot_players bp ON bal.bot_id = bp.id
      ORDER BY bal.created_at DESC LIMIT ?
    `, [limit]);

    if (!result.length) return res.json({ activity: [] });

    const activity = result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });

    res.json({ activity });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar atividade dos bots' });
  }
});

module.exports = router;
