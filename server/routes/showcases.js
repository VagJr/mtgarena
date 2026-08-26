/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Showcases, Binders & Card Skins API
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// ─── SHOWCASES ───

// GET /api/showcases — Public showcases
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT ps.*, u.username, u.avatar, u.level
      FROM player_showcases ps
      JOIN users u ON ps.user_id = u.id
      WHERE ps.is_public = 1
      ORDER BY ps.views DESC LIMIT 30
    `);
    if (!result.length) return res.json({ showcases: [] });
    const showcases = result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      try { obj.featured_card_ids = JSON.parse(obj.featured_card_ids || '[]'); } catch(e) { obj.featured_card_ids = []; }
      return obj;
    });
    res.json({ showcases });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar vitrines' });
  }
});

// GET /api/showcases/mine — User's own showcases
router.get('/mine', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`SELECT * FROM player_showcases WHERE user_id = ? ORDER BY updated_at DESC`, [req.user.id]);
    if (!result.length) return res.json({ showcases: [] });
    const showcases = result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      try { obj.featured_card_ids = JSON.parse(obj.featured_card_ids || '[]'); } catch(e) { obj.featured_card_ids = []; }
      return obj;
    });
    res.json({ showcases });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar suas vitrines' });
  }
});

// POST /api/showcases — Create showcase
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, description, cover_card_id, featured_card_ids, theme } = req.body;
    const id = uuidv4();
    db.run(
      `INSERT INTO player_showcases (id, user_id, name, description, cover_card_id, featured_card_ids, theme)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name || 'Minha Vitrine', description || '', cover_card_id || null, JSON.stringify(featured_card_ids || []), theme || 'default']
    );
    saveDatabase();
    res.status(201).json({ message: 'Vitrine criada!', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar vitrine' });
  }
});

// PUT /api/showcases/:id — Update showcase
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, description, cover_card_id, featured_card_ids, theme, is_public } = req.body;
    db.run(
      `UPDATE player_showcases SET name = COALESCE(?, name), description = COALESCE(?, description),
       cover_card_id = COALESCE(?, cover_card_id), featured_card_ids = COALESCE(?, featured_card_ids),
       theme = COALESCE(?, theme), is_public = COALESCE(?, is_public), updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [name, description, cover_card_id, featured_card_ids ? JSON.stringify(featured_card_ids) : null, theme, is_public, req.params.id, req.user.id]
    );
    saveDatabase();
    res.json({ message: 'Vitrine atualizada!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar vitrine' });
  }
});

// DELETE /api/showcases/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.run(`DELETE FROM player_showcases WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    saveDatabase();
    res.json({ message: 'Vitrine removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover vitrine' });
  }
});

// ─── BINDERS ───

// GET /api/binders — User's binders
router.get('/binders', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT pb.*,
        (SELECT COUNT(*) FROM binder_cards bc WHERE bc.binder_id = pb.id) as card_count
      FROM player_binders pb WHERE pb.user_id = ? ORDER BY pb.sort_order ASC, pb.created_at ASC
    `, [req.user.id]);
    if (!result.length) return res.json({ binders: [] });
    const binders = result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });
    res.json({ binders });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar fichários' });
  }
});

// POST /api/binders — Create binder
router.post('/binders', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, description, color, icon } = req.body;
    const id = `binder-${uuidv4()}`;
    db.run(
      `INSERT INTO player_binders (id, user_id, name, description, color, icon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name || 'Novo Fichário', description || '', color || '#D4A017', icon || '📖']
    );
    saveDatabase();
    res.status(201).json({ message: 'Fichário criado!', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar fichário' });
  }
});

// GET /api/binders/:id — Get binder with cards
router.get('/binders/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const binderRes = db.exec(`SELECT * FROM player_binders WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (!binderRes.length || !binderRes[0].values.length) {
      return res.status(404).json({ error: 'Fichário não encontrado' });
    }
    const binder = {};
    binderRes[0].columns.forEach((col, idx) => binder[col] = binderRes[0].values[0][idx]);

    const cards = db.exec(`SELECT * FROM binder_cards WHERE binder_id = ? ORDER BY sort_order ASC`, [req.params.id]);
    binder.cards = cards.length ? cards[0].values.map(row => {
      const obj = {};
      cards[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    }) : [];

    res.json({ binder });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar fichário' });
  }
});

// POST /api/binders/:id/cards — Add card to binder
router.post('/binders/:id/cards', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { card_id, card_name, set_code, rarity, image_uri } = req.body;

    const binderCheck = db.exec(`SELECT id FROM player_binders WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (!binderCheck.length || !binderCheck[0].values.length) {
      return res.status(404).json({ error: 'Fichário não encontrado' });
    }

    const maxOrder = db.exec(`SELECT MAX(sort_order) FROM binder_cards WHERE binder_id = ?`, [req.params.id]);
    const nextOrder = maxOrder.length && maxOrder[0].values[0][0] !== null ? maxOrder[0].values[0][0] + 1 : 0;

    db.run(
      `INSERT OR IGNORE INTO binder_cards (binder_id, card_id, card_name, set_code, rarity, image_uri, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, card_id, card_name, set_code, rarity, image_uri, nextOrder]
    );
    saveDatabase();
    res.json({ message: 'Carta adicionada ao fichário!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar carta' });
  }
});

// DELETE /api/binders/:id/cards/:cardId — Remove card from binder
router.delete('/binders/:id/cards/:cardId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const binderCheck = db.exec(`SELECT id FROM player_binders WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (!binderCheck.length || !binderCheck[0].values.length) {
      return res.status(404).json({ error: 'Fichário não encontrado' });
    }
    db.run(`DELETE FROM binder_cards WHERE binder_id = ? AND card_id = ?`, [req.params.id, req.params.cardId]);
    saveDatabase();
    res.json({ message: 'Carta removida do fichário' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover carta' });
  }
});

// DELETE /api/binders/:id — Delete binder
router.delete('/binders/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.run(`DELETE FROM binder_cards WHERE binder_id = ?`, [req.params.id]);
    db.run(`DELETE FROM player_binders WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    saveDatabase();
    res.json({ message: 'Fichário removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover fichário' });
  }
});

// ─── CARD SKINS ───

// GET /api/skins — All available card skins
router.get('/skins', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`SELECT * FROM card_skins WHERE active = 1 ORDER BY price_gold ASC`);
    if (!result.length) return res.json({ skins: [] });
    const skins = result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });
    res.json({ skins });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar skins' });
  }
});

// GET /api/skins/mine — User's owned skins
router.get('/skins/mine', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT ucs.*, cs.name, cs.description, cs.css_effect, cs.rarity as skin_rarity
      FROM user_card_skins ucs
      JOIN card_skins cs ON ucs.skin_id = cs.id
      WHERE ucs.user_id = ?
    `, [req.user.id]);
    if (!result.length) return res.json({ skins: [] });
    const skins = result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });
    res.json({ skins });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar suas skins' });
  }
});

// POST /api/skins/buy/:skinId — Buy a card skin
router.post('/skins/buy/:skinId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const skinRes = db.exec(`SELECT * FROM card_skins WHERE id = ? AND active = 1`, [req.params.skinId]);
    if (!skinRes.length || !skinRes[0].values.length) {
      return res.status(404).json({ error: 'Skin não encontrada' });
    }
    const skin = {};
    skinRes[0].columns.forEach((col, idx) => skin[col] = skinRes[0].values[0][idx]);

    const existing = db.exec(`SELECT id FROM user_card_skins WHERE user_id = ? AND skin_id = ?`, [req.user.id, req.params.skinId]);
    if (existing.length && existing[0].values.length) {
      return res.status(400).json({ error: 'Você já possui esta skin!' });
    }

    const userRes = db.exec(`SELECT gold, gems FROM users WHERE id = ?`, [req.user.id]);
    const user = {};
    userRes[0].columns.forEach((col, idx) => user[col] = userRes[0].values[0][idx]);

    if (user.gold < skin.price_gold) {
      return res.status(400).json({ error: `Gold insuficiente! Precisa de ${skin.price_gold}, tem ${user.gold}` });
    }
    if (user.gems < skin.price_gems) {
      return res.status(400).json({ error: `Gems insuficientes! Precisa de ${skin.price_gems}, tem ${user.gems}` });
    }

    db.run(`UPDATE users SET gold = gold - ?, gems = gems - ? WHERE id = ?`, [skin.price_gold, skin.price_gems, req.user.id]);
    db.run(
      `INSERT INTO user_card_skins (user_id, skin_id) VALUES (?, ?)`,
      [req.user.id, req.params.skinId]
    );
    saveDatabase();
    res.json({ message: `🎨 Skin "${skin.name}" adquirida!` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao comprar skin' });
  }
});

// POST /api/skins/equip/:skinId — Equip skin on a card (or globally)
router.post('/skins/equip/:skinId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { card_id } = req.body;
    db.run(`UPDATE user_card_skins SET equipped = 0 WHERE user_id = ? AND card_id ${card_id ? '= ?' : 'IS NULL'}`, card_id ? [req.user.id, card_id] : [req.user.id]);
    db.run(`UPDATE user_card_skins SET equipped = 1, card_id = ? WHERE user_id = ? AND skin_id = ?`, [card_id || null, req.user.id, req.params.skinId]);
    saveDatabase();
    res.json({ message: 'Skin equipada!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao equipar skin' });
  }
});

module.exports = router;
