/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Competitive Player Profile & Statistics
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/profile/:username or current user
router.get('/:username?', authMiddleware, (req, res) => {
  try {
    const db = req.db;
    const targetUsername = req.params.username || req.user.username;

    const userStmt = db.prepare('SELECT id, username, email, level, xp, gold, gems, avatar, created_at FROM users WHERE username = ?');
    userStmt.bind([targetUsername]);
    let user = null;
    if (userStmt.step()) user = userStmt.getAsObject();
    userStmt.free();

    if (!user) return res.status(404).json({ error: 'Planeswalker não encontrado' });

    // Collection stats
    const colStmt = db.prepare('SELECT COUNT(*) as total_cards, SUM(CASE WHEN rarity = "mythic" THEN 1 ELSE 0 END) as mythics, SUM(CASE WHEN rarity = "rare" THEN 1 ELSE 0 END) as rares, SUM(CASE WHEN foil = 1 THEN 1 ELSE 0 END) as foils FROM collection WHERE user_id = ?');
    colStmt.bind([user.id]);
    let colStats = { total_cards: 0, mythics: 0, rares: 0, foils: 0 };
    if (colStmt.step()) colStats = colStmt.getAsObject();
    colStmt.free();

    // Decks count
    const deckStmt = db.prepare('SELECT COUNT(*) as total_decks FROM decks WHERE user_id = ?');
    deckStmt.bind([user.id]);
    let deckStats = { total_decks: 0 };
    if (deckStmt.step()) deckStats = deckStats.getAsObject();
    deckStmt.free();

    // Generate competitive Elo & Tournament stats based on level & activity
    const baseElo = 1500 + (user.level * 45) + Math.floor(user.xp / 100);
    const totalMatches = Math.max(12, user.level * 8);
    const wins = Math.floor(totalMatches * 0.64);
    const losses = totalMatches - wins;
    const winrate = Math.round((wins / totalMatches) * 100);

    const achievements = [
      { id: 'first_blood', name: 'Primeira Vitória', icon: '⚔️', desc: 'Venceu sua primeira partida tabletop', unlocked: true },
      { id: 'mythic_pull', name: 'Toque Mítico', icon: '🔥', desc: 'Abriu uma carta mítica em booster', unlocked: colStats.mythics > 0 },
      { id: 'deckmaster', name: 'Mestre da Construção', icon: '🃏', desc: 'Construiu 3 ou mais decks oficiais', unlocked: deckStats.total_decks >= 3 },
      { id: 'planeswalker_ascended', name: 'Planeswalker Veterano', icon: '👑', desc: 'Alcançou o nível 5 no multiverso', unlocked: user.level >= 5 },
      { id: 'foil_collector', name: 'Brilho Estelar', icon: '✨', desc: 'Possui 5 ou mais cartas Foil', unlocked: colStats.foils >= 5 }
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
          totalCards: colStats.total_cards,
          mythicsCount: colStats.mythics,
          raresCount: colStats.rares,
          foilsCount: colStats.foils,
          decksCount: deckStats.total_decks,
          collectionValueUsd: (colStats.total_cards * 1.85 + colStats.mythics * 18.5).toFixed(2)
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
    res.status(500).json({ error: 'Erro ao carregar perfil: ' + err.message });
  }
});

// PUT /api/profile - Update customization
router.put('/', authMiddleware, (req, res) => {
  try {
    const { avatar, bio, favoriteFormat } = req.body;
    const db = req.db;

    if (avatar) {
      db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
    }

    req.saveDb();
    res.json({ success: true, message: 'Perfil atualizado com sucesso! 🌟' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

module.exports = router;
