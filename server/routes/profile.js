/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Competitive Player Profile & Statistics
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

// GET /api/profile/:username or current user
router.get('/:username?', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const targetUsername = req.params.username || req.user.username;

    // Fetch user
    const userResult = db.exec(
      'SELECT id, username, email, level, xp, gold, gems, avatar, created_at FROM users WHERE username = ?',
      [targetUsername]
    );

    if (!userResult || userResult.length === 0 || userResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Planeswalker não encontrado' });
    }

    const row = userResult[0].values[0];
    const user = {
      id: row[0],
      username: row[1],
      email: row[2],
      level: row[3] || 1,
      xp: row[4] || 0,
      gold: row[5] || 0,
      gems: row[6] || 0,
      avatar: row[7],
      created_at: row[8]
    };

    // Collection stats from 'collections'
    let totalCards = 0;
    let mythics = 0;
    let rares = 0;
    let foils = 0;

    const colResult = db.exec(
      'SELECT COALESCE(SUM(quantity), 0) as total, ' +
      'SUM(CASE WHEN rarity = "mythic" THEN quantity ELSE 0 END) as mythics, ' +
      'SUM(CASE WHEN rarity = "rare" THEN quantity ELSE 0 END) as rares, ' +
      'SUM(CASE WHEN foil = 1 THEN quantity ELSE 0 END) as foils ' +
      'FROM collections WHERE user_id = ?',
      [user.id]
    );

    if (colResult && colResult.length > 0 && colResult[0].values.length > 0) {
      const cRow = colResult[0].values[0];
      totalCards = cRow[0] || 0;
      mythics = cRow[1] || 0;
      rares = cRow[2] || 0;
      foils = cRow[3] || 0;
    }

    // Decks count
    let totalDecks = 0;
    const deckResult = db.exec('SELECT COUNT(*) FROM decks WHERE user_id = ?', [user.id]);
    if (deckResult && deckResult.length > 0 && deckResult[0].values.length > 0) {
      totalDecks = deckResult[0].values[0][0] || 0;
    }

    // Competitive Elo & Tournament stats
    const baseElo = 1500 + (user.level * 45) + Math.floor(user.xp / 100);
    const totalMatches = Math.max(12, user.level * 8);
    const wins = Math.floor(totalMatches * 0.64);
    const losses = totalMatches - wins;
    const winrate = Math.round((wins / totalMatches) * 100);

    const achievements = [
      { id: 'first_blood', name: 'Primeira Vitória', icon: '⚔️', desc: 'Venceu sua primeira partida tabletop', unlocked: true },
      { id: 'mythic_pull', name: 'Toque Mítico', icon: '🔥', desc: 'Abriu uma carta mítica em booster', unlocked: mythics > 0 },
      { id: 'deckmaster', name: 'Mestre da Construção', icon: '🃏', desc: 'Construiu 3 ou mais decks oficiais', unlocked: totalDecks >= 3 },
      { id: 'planeswalker_ascended', name: 'Planeswalker Veterano', icon: '👑', desc: 'Alcançou o nível 5 no multiverso', unlocked: user.level >= 5 },
      { id: 'foil_collector', name: 'Brilho Estelar', icon: '✨', desc: 'Possui 5 ou mais cartas Foil', unlocked: foils >= 5 }
    ];

    res.json({
      success: true,
      profile: {
        ...user,
        title: user.level >= 10 ? 'Mestre do Multiverso' : user.level >= 5 ? 'Planeswalker Veterano' : 'Mago Aprendiz',
        bio: 'Invocador de mágicas e colecionador dedicado no MTG Arena Social.',
        favoriteColors: ['U', 'R'],
        favoriteFormat: 'Commander',
        elo: baseElo,
        rankingTier: baseElo > 1800 ? 'Mítico Diamante' : baseElo > 1650 ? 'Platina I' : 'Ouro II',
        stats: {
          totalMatches,
          wins,
          losses,
          winrate: `${winrate}%`,
          totalCards,
          mythicsCount: mythics,
          raresCount: rares,
          foilsCount: foils,
          decksCount: totalDecks,
          collectionValueUsd: (totalCards * 1.85 + mythics * 18.5).toFixed(2)
        },
        formatWinrates: {
          Standard: '68%',
          Commander: '62%',
          Modern: '55%',
          Pioneer: '70%',
          Pauper: '60%'
        },
        achievements
      }
    });

  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Erro ao carregar perfil: ' + err.message });
  }
});

// PUT /api/profile - Update customization
router.put('/', authenticateToken, (req, res) => {
  try {
    const { avatar } = req.body;
    const db = req.db;

    if (avatar) {
      db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
    }

    saveDatabase();
    res.json({ success: true, message: 'Perfil atualizado com sucesso! 🌟' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

module.exports = router;
