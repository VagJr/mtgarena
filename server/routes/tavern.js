const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
//  TAVERN NPC DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const TAVERN_NPCS = [
  {
    id: 'barmy',
    name: 'Barmy, o Tavern Keeper',
    title: 'Estalajadeiro',
    icon: '🍺',
    description: 'O coração da taverna. Barmy conhece todos os Planeswalkers e sempre tem uma missão para quem precisa de Gold.',
    greeting: 'Bem-vindo, Planeswalker! Que o vinho do multiverso aqueça sua alma! 🍺',
    services: ['daily_deals', 'quest_board', 'tavern_games']
  },
  {
    id: 'artificer',
    name: 'Vex, o Artificador',
    title: 'Mestre do Pó',
    icon: '⚒️',
    description: 'Desmanche cartas em pó arcano e forje novas relíquias. Vex transforma o comum em extraordinário.',
    greeting: 'Hmmm? Ah, mais um que busca transformar pó em poder? 🔮',
    services: ['disenchant', 'craft', 'vault']
  },
  {
    id: 'oracle',
    name: 'Lyra, a Oráculo',
    title: 'Vidente do Multiverso',
    icon: '🔮',
    description: 'Lyra vislumbra o destino nos cristais do multiverso. Ela pode prever sua próxima recompensa...',
    greeting: 'Os cristais me mostram... você está prestes a algo grandioso ✨',
    services: ['daily_prediction', 'mystery_box', 'fortune']
  },
  {
    id: 'shadow_merchant',
    name: 'Kael, o Mercador das Sombras',
    title: 'Comerciante Negro',
    icon: '🗡️',
    description: 'Cartas raras e colecionáveis que ninguém mais tem. Preços justos, mas negociações são finais.',
    greeting: 'Psst... tenho algo especial para quem tem Gold no bolso 🤫',
    services: ['rare_cards', 'daily_offer', 'bulk_deals']
  },
  {
    id: 'guild_master',
    name: 'Aldric, o Mestre de Guilda',
    title: 'Líder da Guilda',
    icon: '⚜️',
    description: 'Organiza torneios, temporadas e rankings. Fale com Aldric para entrar na competição.',
    greeting: 'A guilda precisa de guerreiros! Pronto para provar seu valor? ⚔️',
    services: ['seasons', 'leaderboard', 'tournaments']
  },
  {
    id: 'lorekeeper',
    name: 'Theron, o Guardião do Conhecimento',
    title: 'Historiador',
    icon: '📖',
    description: 'Cataloga todas as conquistas e segredos da coleção. Theron sabe tudo sobre cada carta.',
    greeting: 'Cada carta conta uma história... vamos ver quantas você conhece? 📚',
    services: ['achievements', 'collection_stats', 'set_completion']
  }
];

// ═══════════════════════════════════════════════════════════════
//  DAILY DEALS SYSTEM
// ═══════════════════════════════════════════════════════════════

function generateDailyDeals(userId) {
  const today = new Date().toISOString().split('T')[0];
  const seed = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + today.split('-').join('').split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  const rarities = ['common', 'uncommon', 'rare', 'mythic'];
  const setCodes = ['blb', 'fdn', 'mkm', 'woe', 'lci', 'got', 'neo', 'snc', 'vow', 'mid', 'znr', 'akh', 'kld', 'emn', 'soi'];
  const deals = [];

  for (let i = 0; i < 6; i++) {
    const s = (seed + i * 137) % 1000;
    const rarity = rarities[Math.min(Math.floor(s / 100 * rarities.length), rarities.length - 1)];
    const set = setCodes[s % setCodes.length];
    const priceMultiplier = { common: 1, uncommon: 2.5, rare: 8, mythic: 25 };
    const basePrice = { common: 50, uncommon: 100, rare: 250, mythic: 800 };
    const price = Math.round(basePrice[rarity] * (0.7 + (s % 60) / 100));

    deals.push({
      id: `deal-${userId}-${today}-${i}`,
      rarity,
      set_code: set,
      price_gold: price,
      discount: Math.round((1 - price / (basePrice[rarity] * priceMultiplier[rarity])) * 100),
      label: rarity === 'mythic' ? '⭐ OFERTA ESPECIAL' : rarity === 'rare' ? '💎 Carta Rara' : rarity === 'uncommon' ? '🔷 Incomum' : '⚪ Comum'
    });
  }

  return deals;
}

// ═══════════════════════════════════════════════════════════════
//  TAVERN GAMES (Dice, Coin Flip, Card Duel)
// ═══════════════════════════════════════════════════════════════

function rollDice(sides = 20) {
  return Math.floor(Math.random() * sides) + 1;
}

function coinFlip() {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

// ═══════════════════════════════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all tavern NPCs
router.get('/npcs', (req, res) => {
  res.json(TAVERN_NPCS);
});

// Get tavern overview (for the hub page)
router.get('/overview', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // User stats
    const userResult = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [userId]);
    const user = userResult[0]?.values[0] || [0, 0, 0, 1];

    // Collection stats
    const collCount = db.exec("SELECT COUNT(DISTINCT card_id) FROM collections WHERE user_id = ?", [userId]);
    const uniqueCards = collCount[0]?.values[0][0] || 0;
    const totalCards = db.exec("SELECT COALESCE(SUM(quantity), 0) FROM collections WHERE user_id = ?", [userId]);
    const total = totalCards[0]?.values[0][0] || 0;

    // Deck count
    const deckCount = db.exec("SELECT COUNT(*) FROM decks WHERE user_id = ?", [userId]);
    const decks = deckCount[0]?.values[0][0] || 0;

    // Daily streak
    const streakResult = db.exec("SELECT current_streak, last_claim_date FROM daily_streaks WHERE user_id = ?", [userId]);
    let streak = 0;
    let dailyClaimed = false;
    if (streakResult.length > 0 && streakResult[0].values.length > 0) {
      streak = streakResult[0].values[0][0] || 0;
      dailyClaimed = streakResult[0].values[0][1] === today;
    }

    // Vault dust
    db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [userId]);
    const vaultResult = db.exec("SELECT total_dust FROM vault WHERE user_id = ?", [userId]);
    const dust = vaultResult[0]?.values[0][0] || 0;

    // Wildcards
    const wcResult = db.exec("SELECT rarity, quantity FROM wildcards WHERE user_id = ?", [userId]);
    const wildcards = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
    if (wcResult.length > 0) {
      for (const row of wcResult[0].values) wildcards[row[0]] = row[1];
    }

    // Missions progress
    const missionResult = db.exec(
      `SELECT m.id, m.title, m.icon, um.progress, m.target_count, m.reward_gold, m.reward_xp, um.completed, um.claimed
       FROM missions m LEFT JOIN user_missions um ON m.id = um.mission_id AND um.user_id = ?
       WHERE m.active = 1 AND m.mission_type = 'daily' LIMIT 5`, [userId]
    );
    const missions = missionResult.length > 0 ? missionResult[0].values.map(row => ({
      id: row[0], title: row[1], icon: row[2], progress: row[3] || 0,
      target: row[4], reward_gold: row[5], reward_xp: row[6],
      completed: row[7] === 1, claimed: row[8] === 1
    })) : [];

    // Daily deals
    const deals = generateDailyDeals(userId);

    // Tavern games stats
    const gameStats = db.exec(
      `SELECT type, COUNT(*), SUM(bet) as total_bet, SUM(CASE WHEN won = 1 THEN reward ELSE 0 END) as total_won
       FROM tavern_games WHERE user_id = ? GROUP BY type`, [userId]
    );
    const gameHistory = {};
    if (gameStats.length > 0) {
      for (const row of gameStats[0].values) {
        gameHistory[row[0]] = { played: row[1], total_bet: row[2] || 0, total_won: row[3] || 0 };
      }
    }

    res.json({
      user: { gold: user[0], gems: user[1], xp: user[2], level: user[3] },
      collection: { unique_cards: uniqueCards, total_cards: total, decks },
      streak: { current: streak, daily_claimed: dailyClaimed },
      vault: { dust, wildcards },
      missions,
      deals,
      gameHistory,
      npcs: TAVERN_NPCS
    });
  } catch (err) {
    console.error('Tavern overview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  BARMY — Daily Deals & Quest Board
// ═══════════════════════════════════════════════════════════════

router.get('/daily-deals', authenticateToken, (req, res) => {
  res.json(generateDailyDeals(req.user.id));
});

router.post('/buy-deal', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { deal_id, rarity, set_code, price_gold } = req.body;

    const userResult = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    const gold = userResult[0]?.values[0][0] || 0;
    if (gold < price_gold) {
      return res.status(400).json({ error: `Gold insuficiente! Necessário: ${price_gold}, você tem: ${gold}` });
    }

    db.run("UPDATE users SET gold = gold - ?, xp = xp + 10 WHERE id = ?", [price_gold, req.user.id]);

    // Generate a random card from the set
    const rarityPool = { common: 60, uncommon: 25, rare: 12, mythic: 3 };
    const cardNames = {
      common: ['Air Elemental', 'Cancel', 'Dark Ritual', 'Lightning Bolt', 'Giant Growth', 'Serra Angel', 'Drudge Skeletons', 'Prodigal Sorcerer'],
      uncommon: ['Counterspell', 'Lightning Helix', 'StP', 'Birds of Paradise', 'Llanowar Elves', 'Sol Ring', 'Dark Confidant', 'Tarmogoyf'],
      rare: ['Thoughtseize', 'Fatal Push', 'Remand', 'Path to Exile', 'Demonic Tutor', 'Swords to Plowshares', 'Brainstorm', 'Ponder'],
      mythic: ['Jace, the Mind Sculptor', 'Liliana of the Veil', 'Snapcaster Mage', 'Tarmogoyf', 'Liliana of the Last Hope', 'Teferi, Hero of Dominaria']
    };
    const pool = cardNames[rarity] || cardNames.common;
    const cardName = pool[Math.floor(Math.random() * pool.length)];

    const existing = db.exec("SELECT id, quantity FROM collections WHERE user_id = ? AND card_name = ? AND foil = 0",
      [req.user.id, cardName]);

    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run("UPDATE collections SET quantity = quantity + 1 WHERE id = ?", [existing[0].values[0][0]]);
    } else {
      const cardId = `scry_${encodeURIComponent(cardName.toLowerCase())}`;
      const imageUri = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`;
      db.run("INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil) VALUES (?, ?, ?, ?, ?, ?, 1, 0)",
        [req.user.id, cardId, cardName, set_code || 'tav', rarity, imageUri]);
    }

    saveDatabase();

    const updatedUser = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = updatedUser[0]?.values[0] || [0, 0, 0, 1];

    res.json({
      card: { name: cardName, rarity, set_code },
      message: `🃏 ${cardName} adicionada à sua coleção!`,
      balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] }
    });
  } catch (err) {
    console.error('Buy deal error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  VEX — Disenchant, Craft, Vault
// ═══════════════════════════════════════════════════════════════

router.post('/disenchant', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { card_id, quantity = 1 } = req.body;

    const card = db.exec("SELECT rarity, quantity, card_name FROM collections WHERE user_id = ? AND card_id = ? AND quantity >= ?",
      [req.user.id, card_id, quantity]);
    if (card.length === 0 || card[0].values.length === 0) {
      return res.status(400).json({ error: 'Carta não encontrada na coleção' });
    }

    const rarity = card[0].values[0][0];
    const cardName = card[0].values[0][2];
    const dustValues = { common: 5, uncommon: 10, rare: 25, mythic: 50 };
    const dust = (dustValues[rarity] || 5) * quantity;

    db.run("UPDATE collections SET quantity = quantity - ? WHERE user_id = ? AND card_id = ?",
      [quantity, req.user.id, card_id]);
    db.run("DELETE FROM collections WHERE quantity <= 0 AND user_id = ? AND card_id = ?",
      [req.user.id, card_id]);

    db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [req.user.id]);
    db.run("UPDATE vault SET total_dust = total_dust + ? WHERE user_id = ?", [dust, req.user.id]);
    db.run("UPDATE users SET xp = xp + 5 WHERE id = ?", [req.user.id]);

    saveDatabase();
    res.json({ dust_gained: dust, card_name: cardName, rarity, quantity, message: `⚒️ ${cardName} desmanchado em ${dust} po!` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/craft', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { from_rarity, to_rarity } = req.body;

    const recipes = {
      'common-to-uncommon': { input: 'common', count: 5, output: 'uncommon', dust: 0 },
      'uncommon-to-rare': { input: 'uncommon', count: 3, output: 'rare', dust: 25 },
      'rare-to-mythic': { input: 'rare', count: 4, output: 'mythic', dust: 60 },
    };

    const recipe = recipes[`${from_rarity}-to-${to_rarity}`];
    if (!recipe) return res.status(400).json({ error: 'Receita inválida' });

    db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [req.user.id]);
    const vault = db.exec("SELECT total_dust FROM vault WHERE user_id = ?", [req.user.id]);
    const dust = vault[0]?.values[0][0] || 0;

    if (dust < recipe.dust) {
      return res.status(400).json({ error: `Po insuficiente! Necessário: ${recipe.dust}, você tem: ${dust}` });
    }

    if (recipe.dust > 0) {
      db.run("UPDATE vault SET total_dust = total_dust - ? WHERE user_id = ?", [recipe.dust, req.user.id]);
    }

    db.run("INSERT OR IGNORE INTO wildcards (user_id, rarity, quantity) VALUES (?, ?, 0)", [req.user.id, recipe.output]);
    db.run("UPDATE wildcards SET quantity = quantity + 1 WHERE user_id = ? AND rarity = ?", [req.user.id, recipe.output]);
    db.run("UPDATE users SET xp = xp + 15 WHERE id = ?", [req.user.id]);

    saveDatabase();
    res.json({ success: true, crafted: { rarity: recipe.output }, message: `✨ Wildcard ${recipe.output} forjada!` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/vault', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [req.user.id]);
    const vault = db.exec("SELECT total_dust FROM vault WHERE user_id = ?", [req.user.id]);
    const wc = db.exec("SELECT rarity, quantity FROM wildcards WHERE user_id = ?", [req.user.id]);
    const wildcards = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
    if (wc.length > 0) for (const row of wc[0].values) wildcards[row[0]] = row[1];
    res.json({ dust: vault[0]?.values[0][0] || 0, wildcards });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  LYRA — Mystery Box, Daily Prediction, Fortune
// ═══════════════════════════════════════════════════════════════

router.post('/mystery-box', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const cost = 300;

    const userResult = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    const gold = userResult[0]?.values[0][0] || 0;
    if (gold < cost) {
      return res.status(400).json({ error: `Gold insuficiente! Necessário: ${cost}` });
    }

    db.run("UPDATE users SET gold = gold - ? WHERE id = ?", [cost, req.user.id]);

    const roll = Math.random();
    let reward;
    if (roll < 0.05) {
      // 5% Mythic Wildcard
      db.run("INSERT OR IGNORE INTO wildcards (user_id, rarity, quantity) VALUES (?, 'mythic', 0)", [req.user.id]);
      db.run("UPDATE wildcards SET quantity = quantity + 1 WHERE user_id = ? AND rarity = 'mythic'", [req.user.id]);
      reward = { type: 'wildcard', rarity: 'mythic', message: '🌟 WILDCARD MÍTICO! A sorte está com você!' };
    } else if (roll < 0.15) {
      // 10% Rare Wildcard
      db.run("INSERT OR IGNORE INTO wildcards (user_id, rarity, quantity) VALUES (?, 'rare', 0)", [req.user.id]);
      db.run("UPDATE wildcards SET quantity = quantity + 1 WHERE user_id = ? AND rarity = 'rare'", [req.user.id]);
      reward = { type: 'wildcard', rarity: 'rare', message: '💎 Wildcard Raro! Excelente sorte!' };
    } else if (roll < 0.35) {
      // 20% Gold bonus
      const bonus = 500 + Math.floor(Math.random() * 500);
      db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [bonus, req.user.id]);
      reward = { type: 'gold', amount: bonus, message: `🪙 ${bonus} Gold! O multiverso abençoa seu bolso!` };
    } else if (roll < 0.55) {
      // 20% Dust
      const dust = 30 + Math.floor(Math.random() * 70);
      db.run("INSERT OR IGNORE INTO vault (user_id, total_dust) VALUES (?, 0)", [req.user.id]);
      db.run("UPDATE vault SET total_dust = total_dust + ? WHERE user_id = ?", [dust, req.user.id]);
      reward = { type: 'dust', amount: dust, message: `🔮 ${dust} po de artesão!` };
    } else {
      // 45% Common/Uncommon cards
      const commons = ['llanowar elves', 'lightning bolt', 'counterspell', 'swords to plowshares', 'dark ritual'];
      const cardName = commons[Math.floor(Math.random() * commons.length)];
      const existing = db.exec("SELECT id FROM collections WHERE user_id = ? AND card_name = ?", [req.user.id, cardName]);
      if (existing.length > 0 && existing[0].values.length > 0) {
        db.run("UPDATE collections SET quantity = quantity + 1 WHERE id = ?", [existing[0].values[0][0]]);
      } else {
        db.run("INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil) VALUES (?, ?, ?, 'tav', 'uncommon', '', 1, 0)",
          [req.user.id, `scry_${cardName}`, cardName]);
      }
      reward = { type: 'card', name: cardName, message: `🃏 ${cardName}!` };
    }

    db.run("UPDATE users SET xp = xp + 20 WHERE id = ?", [req.user.id]);
    saveDatabase();

    const updatedUser = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = updatedUser[0]?.values[0] || [0, 0, 0, 1];

    res.json({ reward, balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/fortune', (req, res) => {
  const fortunes = [
    'As estrelas alinham... uma vitória está próxima! ⭐',
    'Cuidado com o oponente à esquerda... ele planeja algo! 🌙',
    'Hoje é um bom dia para abrir boosters! ✨',
    'O po arcano flui em sua direção... forje algo especial! 🔮',
    'Um dragão se aproxima... prepare seu melhor deck! 🐉',
    'O multiverso sussurra: compre aquela carta rara! 💎',
    'Seus Planeswalkers confiam em você. Continue assim! ⚔️',
    'A taverna vibra com energia... algo grande está por vir! 🍺',
    'Lyra vê: uma sequência de vitórias se forma! 🔥',
    'Os cristais revelam: hoje você sobe de nível! 📈'
  ];
  const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
  res.json({ fortune, icon: '🔮' });
});

// ═══════════════════════════════════════════════════════════════
//  TAVERN GAMES — Dice, Coin Flip, Wager
// ═══════════════════════════════════════════════════════════════

router.post('/games/dice', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { bet = 50, guess } = req.body; // guess: number 1-6 or 'high'/'low'

    if (bet < 10 || bet > 500) return res.status(400).json({ error: 'Aposta entre 10 e 500 Gold' });

    const userResult = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    const gold = userResult[0]?.values[0][0] || 0;
    if (gold < bet) return res.status(400).json({ error: 'Gold insuficiente' });

    const dice = rollDice(6);
    let won = false;
    let multiplier = 0;

    if (guess === 'high' && dice >= 4) { won = true; multiplier = 1.5; }
    else if (guess === 'low' && dice <= 3) { won = true; multiplier = 1.5; }
    else if (typeof guess === 'number' && guess === dice) { won = true; multiplier = 5; }

    const reward = won ? Math.round(bet * multiplier) : 0;

    db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [won ? reward : -bet, req.user.id]);
    db.run("UPDATE users SET xp = xp + 5 WHERE id = ?", [req.user.id]);

    db.run("INSERT INTO tavern_games (user_id, type, bet, result_json, won, reward) VALUES (?, 'dice', ?, ?, ?, ?)",
      [req.user.id, bet, JSON.stringify({ dice, guess }), won ? 1 : 0, reward]);

    saveDatabase();

    const updatedUser = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    res.json({
      dice, guess, won, reward,
      message: won ? `🎲 ${dice}! Você ganhou ${reward} Gold!` : `🎲 ${dice}! Você perdeu ${bet} Gold...`,
      gold: updatedUser[0]?.values[0][0] || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/games/coinflip', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { bet = 50, guess } = req.body; // guess: 'heads' or 'tails'

    if (bet < 10 || bet > 500) return res.status(400).json({ error: 'Aposta entre 10 e 500 Gold' });

    const userResult = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    const gold = userResult[0]?.values[0][0] || 0;
    if (gold < bet) return res.status(400).json({ error: 'Gold insuficiente' });

    const result = coinFlip();
    const won = result === guess;
    const reward = won ? bet * 2 : 0;

    db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [won ? reward : -bet, req.user.id]);
    db.run("UPDATE users SET xp = xp + 5 WHERE id = ?", [req.user.id]);

    db.run("INSERT INTO tavern_games (user_id, type, bet, result_json, won, reward) VALUES (?, 'coinflip', ?, ?, ?, ?)",
      [req.user.id, bet, JSON.stringify({ result, guess }), won ? 1 : 0, reward]);

    saveDatabase();

    const updatedUser = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    res.json({
      result, guess, won, reward,
      message: won ? `🪙 ${result === 'heads' ? 'Cara' : 'Coroa'}! Você ganhou ${reward} Gold!` : `🪙 ${result === 'heads' ? 'Cara' : 'Coroa'}! Você perdeu ${bet} Gold...`,
      gold: updatedUser[0]?.values[0][0] || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/games/slotmachine', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { bet = 100 } = req.body;

    if (bet < 20 || bet > 1000) return res.status(400).json({ error: 'Aposta entre 20 e 1000 Gold' });

    const userResult = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    const gold = userResult[0]?.values[0][0] || 0;
    if (gold < bet) return res.status(400).json({ error: 'Gold insuficiente' });

    const symbols = ['⚔️', '🛡️', '💎', '🔥', '🌀', '👑'];
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    let multiplier = 0;
    if (reels[0] === reels[1] && reels[1] === reels[2]) multiplier = reels[0] === '👑' ? 20 : 10;
    else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) multiplier = 3;

    const won = multiplier > 0;
    const reward = won ? Math.round(bet * multiplier) : 0;

    db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [won ? reward : -bet, req.user.id]);
    db.run("UPDATE users SET xp = xp + 8 WHERE id = ?", [req.user.id]);

    db.run("INSERT INTO tavern_games (user_id, type, bet, result_json, won, reward) VALUES (?, 'slotmachine', ?, ?, ?, ?)",
      [req.user.id, bet, JSON.stringify({ reels, multiplier }), won ? 1 : 0, reward]);

    saveDatabase();

    const updatedUser = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    res.json({
      reels, multiplier, won, reward,
      message: won ? `${reels.join(' ')} — JACKPOT! ${reward} Gold!` : `${reels.join(' ')} — Tente novamente...`,
      gold: updatedUser[0]?.values[0][0] || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game history
router.get('/games/history', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      `SELECT type, COUNT(*) as played, SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END) as wins,
              SUM(bet) as total_bet, SUM(CASE WHEN won = 1 THEN reward ELSE 0 END) as total_won
       FROM tavern_games WHERE user_id = ? GROUP BY type`, [req.user.id]
    );

    const history = {};
    if (result.length > 0) {
      for (const row of result[0].values) {
        history[row[0]] = { played: row[1], wins: row[2] || 0, total_bet: row[3] || 0, total_won: row[4] || 0 };
      }
    }
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  KAEL — Rare Card Deals
// ═══════════════════════════════════════════════════════════════

router.get('/rare-deals', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const seed = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + today.split('-').join('').split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    const rareCards = [
      { name: 'Jace, the Mind Sculptor', set: 'wwk', rarity: 'mythic', base_price: 2000 },
      { name: 'Liliana of the Veil', set: 'isd', rarity: 'mythic', base_price: 1800 },
      { name: 'Tarmogoyf', set: 'mm3', rarity: 'rare', base_price: 800 },
      { name: 'Thoughtseize', set: 'ths', rarity: 'rare', base_price: 600 },
      { name: 'Snapcaster Mage', set: 'isd', rarity: 'mythic', base_price: 1500 },
      { name: 'Dark Confidant', set: 'rav', rarity: 'rare', base_price: 500 },
      { name: 'Cryptic Command', set: 'mm3', rarity: 'rare', base_price: 400 },
      { name: 'Vendilion Clique', set: 'mm3', rarity: 'rare', base_price: 450 },
      { name: 'Force of Will', set: 'mm3', rarity: 'mythic', base_price: 2500 },
      { name: 'Mana Drain', set: 'ima', rarity: 'mythic', base_price: 3000 }
    ];

    const deals = [];
    for (let i = 0; i < 4; i++) {
      const card = rareCards[(seed + i * 31) % rareCards.length];
      const discount = 10 + ((seed + i * 17) % 30);
      const price = Math.round(card.base_price * (1 - discount / 100));
      deals.push({ ...card, price_gold: price, discount });
    }

    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/buy-rare-deal', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { card_name, set_code, rarity, price_gold } = req.body;

    const userResult = db.exec("SELECT gold FROM users WHERE id = ?", [req.user.id]);
    const gold = userResult[0]?.values[0][0] || 0;
    if (gold < price_gold) return res.status(400).json({ error: 'Gold insuficiente' });

    db.run("UPDATE users SET gold = gold - ?, xp = xp + 30 WHERE id = ?", [price_gold, req.user.id]);

    const existing = db.exec("SELECT id, quantity FROM collections WHERE user_id = ? AND card_name = ? AND foil = 0",
      [req.user.id, card_name]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run("UPDATE collections SET quantity = quantity + 1 WHERE id = ?", [existing[0].values[0][0]]);
    } else {
      const cardId = `scry_${encodeURIComponent(card_name.toLowerCase())}`;
      const imageUri = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card_name)}&format=image&version=normal`;
      db.run("INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil) VALUES (?, ?, ?, ?, ?, ?, 1, 0)",
        [req.user.id, cardId, card_name, set_code, rarity, imageUri]);
    }

    saveDatabase();
    const updatedUser = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = updatedUser[0]?.values[0] || [0, 0, 0, 1];

    res.json({ card: { name: card_name, rarity }, balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
