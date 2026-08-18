const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

const BOOSTER_COST = { gold: 200, gems: 20 };

// Official MTG Preconstructed / Starter Decks Catalog
const STARTER_DECKS_CATALOG = [
  // ─── COMMANDER PRECONS (100 Cards) ───
  {
    id: 'precon-bloomburrow-animated-army',
    name: 'Exército Animado (Animated Army)',
    format: 'commander',
    category: 'Commander Precon',
    price_gold: 1200,
    price_gems: 120,
    commander_name: 'Bello, Bard of the Brambles',
    colors: ['R', 'G'],
    description: 'Deus dos artefatos e encantamentos! Durante seu turno, todos os seus artefatos e encantamentos de custo 4 ou mais viram criaturas 4/4 com Ímpeto e Indestrutível que compram cartas.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Bello%2C%20Bard%20of%20the%20Brambles&format=image&version=normal',
    cards: [
      { name: 'Bello, Bard of the Brambles', quantity: 1, is_commander: true },
      { name: 'Gilded Goose', quantity: 1 },
      { name: 'Birds of Paradise', quantity: 1 },
      { name: 'Llanowar Elves', quantity: 1 },
      { name: 'Elvish Mystic', quantity: 1 },
      { name: 'Wood Elves', quantity: 1 },
      { name: 'Beast Within', quantity: 1 },
      { name: 'Chaos Warp', quantity: 1 },
      { name: 'Blasphemous Act', quantity: 1 },
      { name: 'Cultivate', quantity: 1 },
      { name: 'Kodama\'s Reach', quantity: 1 },
      { name: 'Rishkar\'s Expertise', quantity: 1 },
      { name: 'Sol Ring', quantity: 1 },
      { name: 'Arcane Signet', quantity: 1 },
      { name: 'Gruul Signet', quantity: 1 },
      { name: 'Mind Stone', quantity: 1 },
      { name: 'Hedron Archive', quantity: 1 },
      { name: 'Gilded Lotus', quantity: 1 },
      { name: 'Thran Dynamo', quantity: 1 },
      { name: 'Caged Sun', quantity: 1 },
      { name: 'Immortal Sun', quantity: 1 },
      { name: 'Garruk\'s Uprising', quantity: 1 },
      { name: 'Elemental Bond', quantity: 1 },
      { name: 'Unnatural Growth', quantity: 1 },
      { name: 'Zendikar Resurgent', quantity: 1 },
      { name: 'Berserkers\' Onslaught', quantity: 1 },
      { name: 'Gratuitous Violence', quantity: 1 },
      { name: 'Warstorm Surge', quantity: 1 },
      { name: 'Sunbird\'s Invocation', quantity: 1 },
      { name: 'Etali, Primal Storm', quantity: 1 },
      { name: 'Kogla, the Titan Ape', quantity: 1 },
      { name: 'Drakuseth, Maw of Flames', quantity: 1 },
      { name: 'Hellkite Tyrant', quantity: 1 },
      { name: 'Bane of Progress', quantity: 1 },
      { name: 'Command Tower', quantity: 1 },
      { name: 'Stomping Ground', quantity: 1 },
      { name: 'Rootbound Crag', quantity: 1 },
      { name: 'Cinder Glade', quantity: 1 },
      { name: 'Game Trail', quantity: 1 },
      { name: 'Karplusan Forest', quantity: 1 },
      { name: 'Spire Garden', quantity: 1 },
      { name: 'Fabled Passage', quantity: 1 },
      { name: 'Mountain', quantity: 18 },
      { name: 'Forest', quantity: 20 }
    ]
  },
  {
    id: 'precon-ixalan-dinosaurs',
    name: 'Veloci-RAMP-tor (Dinossauros)',
    format: 'commander',
    category: 'Commander Precon',
    price_gold: 1400,
    price_gems: 140,
    commander_name: 'Pantlaza, Sun-Favored',
    colors: ['R', 'G', 'W'],
    description: 'Domine a era jurássica! Toda vez que um dinossauro entra no campo, Descubra (Discover) mágicas grátis direto do seu grimório.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Pantlaza%2C%20Sun-Favored&format=image&version=normal',
    cards: [
      { name: 'Pantlaza, Sun-Favored', quantity: 1, is_commander: true },
      { name: 'Gishath, Sun\'s Avatar', quantity: 1 },
      { name: 'Zacama, Primal Calamity', quantity: 1 },
      { name: 'Etali, Primal Conqueror', quantity: 1 },
      { name: 'Ghalta, Primal Hunger', quantity: 1 },
      { name: 'Ghalta, Stampede Tyrant', quantity: 1 },
      { name: 'Carnage Tyrant', quantity: 1 },
      { name: 'Ripjaw Raptor', quantity: 1 },
      { name: 'Ranging Raptors', quantity: 1 },
      { name: 'Regisaur Alpha', quantity: 1 },
      { name: 'Topiary Stomper', quantity: 1 },
      { name: 'Marauding Raptor', quantity: 1 },
      { name: 'Otepec Huntmaster', quantity: 1 },
      { name: 'Kinjalli\'s Caller', quantity: 1 },
      { name: 'Drover of the Mighty', quantity: 1 },
      { name: 'Sol Ring', quantity: 1 },
      { name: 'Arcane Signet', quantity: 1 },
      { name: 'Farseek', quantity: 1 },
      { name: 'Cultivate', quantity: 1 },
      { name: 'Kodama\'s Reach', quantity: 1 },
      { name: 'Heroic Intervention', quantity: 1 },
      { name: 'Teferi\'s Protection', quantity: 1 },
      { name: 'Swords to Plowshares', quantity: 1 },
      { name: 'Path to Exile', quantity: 1 },
      { name: 'Generous Gift', quantity: 1 },
      { name: 'Beast Within', quantity: 1 },
      { name: 'Blasphemous Act', quantity: 1 },
      { name: 'Wrath of God', quantity: 1 },
      { name: 'Command Tower', quantity: 1 },
      { name: 'Jungle Shrine', quantity: 1 },
      { name: 'Sacred Foundry', quantity: 1 },
      { name: 'Stomping Ground', quantity: 1 },
      { name: 'Temple Garden', quantity: 1 },
      { name: 'Plains', quantity: 12 },
      { name: 'Mountain', quantity: 12 },
      { name: 'Forest', quantity: 14 }
    ]
  },
  {
    id: 'precon-esper-knights',
    name: 'Cavalaria de Zhalfir (Cavalry Charge)',
    format: 'commander',
    category: 'Commander Precon',
    price_gold: 1300,
    price_gems: 130,
    commander_name: 'Sidar Jabari of Zhalfir',
    colors: ['W', 'U', 'B'],
    description: 'Eminência tribal de Cavaleiros! Saqueie cartas direto da zona de comando e ressuscite cavaleiros mortos ao causar dano de combate.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Sidar%20Jabari%20of%20Zhalfir&format=image&version=normal',
    cards: [
      { name: 'Sidar Jabari of Zhalfir', quantity: 1, is_commander: true },
      { name: 'Knight Exemplar', quantity: 1 },
      { name: 'Vodalian Wave-Knight', quantity: 1 },
      { name: 'Silverwing Squadron', quantity: 1 },
      { name: 'Herald of Hoofbeats', quantity: 1 },
      { name: 'Aryel, Knight of Windgrace', quantity: 1 },
      { name: 'Kinsbaile Cavalier', quantity: 1 },
      { name: 'Valiant Knight', quantity: 1 },
      { name: 'Midnight Reaper', quantity: 1 },
      { name: 'Corpse Knight', quantity: 1 },
      { name: 'Smitten Swordmaster', quantity: 1 },
      { name: 'Sol Ring', quantity: 1 },
      { name: 'Arcane Signet', quantity: 1 },
      { name: 'Fellwar Stone', quantity: 1 },
      { name: 'Commander\'s Sphere', quantity: 1 },
      { name: 'Swords to Plowshares', quantity: 1 },
      { name: 'Counterspell', quantity: 1 },
      { name: 'Anguished Unmaking', quantity: 1 },
      { name: 'Dovin\'s Veto', quantity: 1 },
      { name: 'Toxic Deluge', quantity: 1 },
      { name: 'Vanquisher\'s Banner', quantity: 1 },
      { name: 'Herald\'s Horn', quantity: 1 },
      { name: 'Command Tower', quantity: 1 },
      { name: 'Arcane Sanctum', quantity: 1 },
      { name: 'Hallowed Fountain', quantity: 1 },
      { name: 'Watery Grave', quantity: 1 },
      { name: 'Godless Shrine', quantity: 1 },
      { name: 'Plains', quantity: 14 },
      { name: 'Island', quantity: 12 },
      { name: 'Swamp', quantity: 12 }
    ]
  },

  // ─── STANDARD STARTER KITS (60 Cards) ───
  {
    id: 'starter-bloomburrow-otters',
    name: 'Lontras Mágicas (Otter Limits)',
    format: 'standard',
    category: 'Standard Starter Kit',
    price_gold: 600,
    price_gems: 60,
    commander_name: 'Bria, Riptide Rogue',
    colors: ['U', 'R'],
    description: 'Deck Izzet ágil e divertido de Bloomburrow! Acumule feitiços, aumente o poder com Destreza (Prowess) e ataque de forma inbloqueável.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Bria%2C%20Riptide%20Rogue&format=image&version=normal',
    cards: [
      { name: 'Bria, Riptide Rogue', quantity: 2 },
      { name: 'Stormchaser\'s Talent', quantity: 3 },
      { name: 'Coruscation Mage', quantity: 4 },
      { name: 'Pearl of Wisdom', quantity: 4 },
      { name: 'Monastery Swiftspear', quantity: 4 },
      { name: 'Slickshot Show-Off', quantity: 2 },
      { name: 'Lightning Strike', quantity: 4 },
      { name: 'Shock', quantity: 4 },
      { name: 'Consider', quantity: 4 },
      { name: 'Opt', quantity: 4 },
      { name: 'Play with Fire', quantity: 3 },
      { name: 'Thundering Falls', quantity: 2 },
      { name: 'Shivan Reef', quantity: 4 },
      { name: 'Island', quantity: 8 },
      { name: 'Mountain', quantity: 8 }
    ]
  },
  {
    id: 'starter-bloomburrow-rabbits',
    name: 'Coelhos Prolíferos (Hare Raising)',
    format: 'standard',
    category: 'Standard Starter Kit',
    price_gold: 600,
    price_gems: 60,
    commander_name: 'Finneas, Ace Archer',
    colors: ['G', 'W'],
    description: 'Enxameie o campo com exércitos de coelhos! Coloque marcadores +1/+1 e compre cartas sempre que atacar em grupo.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Finneas%2C%20Ace%20Archer&format=image&version=normal',
    cards: [
      { name: 'Finneas, Ace Archer', quantity: 2 },
      { name: 'Valley Questcaller', quantity: 3 },
      { name: 'Hop to It', quantity: 4 },
      { name: 'Carrot Cake', quantity: 4 },
      { name: 'Warren Warleader', quantity: 2 },
      { name: 'Pawpatch Formation', quantity: 3 },
      { name: 'Get Lost', quantity: 3 },
      { name: 'Go for the Throat', quantity: 2 },
      { name: 'Overwhelmed Sponsor', quantity: 4 },
      { name: 'Bushwhack', quantity: 3 },
      { name: 'Razorverge Thicket', quantity: 4 },
      { name: 'Brushland', quantity: 4 },
      { name: 'Plains', quantity: 11 },
      { name: 'Forest', quantity: 11 }
    ]
  },

  // ─── PIONEER CHALLENGER DECKS (60 + 15 Sideboard) ───
  {
    id: 'pioneer-izzet-phoenix',
    name: 'Fênix de Izzet (Izzet Phoenix)',
    format: 'pioneer',
    category: 'Pioneer Challenger',
    price_gold: 1000,
    price_gems: 100,
    commander_name: 'Arclight Phoenix',
    colors: ['U', 'R'],
    description: 'Um dos arquétipos mais icônicos do Magic! Compre feitiços rápidos, descarte a Fênix Arcana e ressuscite-a voando no combate.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Arclight%20Phoenix&format=image&version=normal',
    cards: [
      { name: 'Arclight Phoenix', quantity: 4 },
      { name: 'Ledger Shredder', quantity: 4 },
      { name: 'Consider', quantity: 4 },
      { name: 'Opt', quantity: 4 },
      { name: 'Treasure Cruise', quantity: 4 },
      { name: 'Lightning Axe', quantity: 4 },
      { name: 'Fiery Impulse', quantity: 4 },
      { name: 'Chart a Course', quantity: 3 },
      { name: 'Strategic Planning', quantity: 3 },
      { name: 'Steam Vents', quantity: 4 },
      { name: 'Spirebluff Canal', quantity: 4 },
      { name: 'Sulfur Falls', quantity: 4 },
      { name: 'Island', quantity: 7 },
      { name: 'Mountain', quantity: 7 }
    ]
  },

  // ─── MODERN EVENT DECKS (60 + 15 Sideboard) ───
  {
    id: 'modern-burn',
    name: 'Modern Burn Clássico (Mono Red)',
    format: 'modern',
    category: 'Modern Competitive',
    price_gold: 1100,
    price_gems: 110,
    commander_name: 'Lightning Bolt',
    colors: ['R'],
    description: 'Fogo puro e direto aos 20 pontos de vida do oponente! O deck mais veloz e letal do formato Modern.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Lightning%20Bolt&format=image&version=normal',
    cards: [
      { name: 'Lightning Bolt', quantity: 4 },
      { name: 'Lava Spike', quantity: 4 },
      { name: 'Rift Bolt', quantity: 4 },
      { name: 'Skewer the Critics', quantity: 4 },
      { name: 'Monastery Swiftspear', quantity: 4 },
      { name: 'Goblin Guide', quantity: 4 },
      { name: 'Eidolon of the Great Revel', quantity: 4 },
      { name: 'Searing Blaze', quantity: 4 },
      { name: 'Skullcrack', quantity: 4 },
      { name: 'Roiling Vortex', quantity: 4 },
      { name: 'Mountain', quantity: 20 }
    ]
  },

  // ─── PAUPER META (60 Cards) ───
  {
    id: 'pauper-kuldotha-red',
    name: 'Kuldotha Red Goblin Burn',
    format: 'pauper',
    category: 'Pauper Meta',
    price_gold: 500,
    price_gems: 50,
    commander_name: 'Kuldotha Rebirth',
    colors: ['R'],
    description: 'O deck número 1 do formato Pauper! Sacrifique artefatos para criar hordas de Goblins e finalize com Raios e Queimaduras.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Kuldotha%20Rebirth&format=image&version=normal',
    cards: [
      { name: 'Kuldotha Rebirth', quantity: 4 },
      { name: 'Goblin Bushwhacker', quantity: 4 },
      { name: 'Goblin Blast-Runner', quantity: 4 },
      { name: 'Voldaren Epicure', quantity: 4 },
      { name: 'Monastery Swiftspear', quantity: 4 },
      { name: 'Lightning Bolt', quantity: 4 },
      { name: 'Galvanic Blast', quantity: 4 },
      { name: 'Chain Lightning', quantity: 4 },
      { name: 'Experimental Synthesizer', quantity: 4 },
      { name: 'Great Furnace', quantity: 4 },
      { name: 'Mountain', quantity: 16 }
    ]
  },
  {
    id: 'pauper-mono-blue-terror',
    name: 'Mono Blue Terror Control',
    format: 'pauper',
    category: 'Pauper Meta',
    price_gold: 500,
    price_gems: 50,
    commander_name: 'Tolarian Terror',
    colors: ['U'],
    description: 'Controle absoluto! Encha o cemitério com mágicas baratas de vidência e invoque o Terror Tolariano 5/5 por apenas 1 mana azul.',
    cover_image: 'https://api.scryfall.com/cards/named?exact=Tolarian%20Terror&format=image&version=normal',
    cards: [
      { name: 'Tolarian Terror', quantity: 4 },
      { name: 'Cryptic Serpent', quantity: 4 },
      { name: 'Delver of Secrets', quantity: 4 },
      { name: 'Counterspell', quantity: 4 },
      { name: 'Brainstorm', quantity: 4 },
      { name: 'Consider', quantity: 4 },
      { name: 'Thought Scour', quantity: 4 },
      { name: 'Mental Note', quantity: 4 },
      { name: 'Spell Pierce', quantity: 4 },
      { name: 'Boomerang', quantity: 2 },
      { name: 'Island', quantity: 18 }
    ]
  }
];

// In-memory cache for set cards
const setCardsCache = new Map();
const SET_CACHE_TTL = 1000 * 60 * 60 * 24;

const SCRYFALL_BASE = 'https://api.scryfall.com';
const SCRYFALL_HEADERS = {
  'User-Agent': 'MTGArenaSocial/1.0',
  'Accept': 'application/json'
};

async function getSetCardsCategorized(setCode) {
  const cached = setCardsCache.get(setCode.toLowerCase());
  if (cached && (Date.now() - cached.timestamp < SET_CACHE_TTL)) {
    return cached.data;
  }

  let allCards = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 3) {
    try {
      const url = `${SCRYFALL_BASE}/cards/search?q=set:${encodeURIComponent(setCode)}+-is:promo&page=${page}&order=set`;
      const res = await fetch(url, { headers: SCRYFALL_HEADERS });
      if (!res.ok) {
        if (page === 1) {
          const fallbackRes = await fetch(`${SCRYFALL_BASE}/cards/search?q=set:${encodeURIComponent(setCode)}&page=1`, { headers: SCRYFALL_HEADERS });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            allCards = fallbackData.data || [];
          }
        }
        break;
      }
      const data = await res.json();
      allCards.push(...(data.data || []));
      hasMore = data.has_more;
      page++;
    } catch (e) {
      break;
    }
  }

  if (allCards.length === 0) {
    throw new Error(`Não foram encontradas cartas para a coleção ${setCode}`);
  }

  const categorized = {
    mythic: [],
    rare: [],
    uncommon: [],
    common: [],
    land: [],
    all: allCards
  };

  for (const c of allCards) {
    const isLand = (c.type_line || '').toLowerCase().includes('land');
    if (isLand && (c.type_line.toLowerCase().includes('basic') || categorized.land.length < 20)) {
      categorized.land.push(c);
    }

    if (c.rarity === 'mythic') categorized.mythic.push(c);
    else if (c.rarity === 'rare') categorized.rare.push(c);
    else if (c.rarity === 'uncommon') categorized.uncommon.push(c);
    else if (c.rarity === 'common') categorized.common.push(c);
  }

  if (categorized.common.length === 0) categorized.common = categorized.all;
  if (categorized.uncommon.length === 0) categorized.uncommon = categorized.common;
  if (categorized.rare.length === 0) categorized.rare = categorized.uncommon;
  if (categorized.mythic.length === 0) categorized.mythic = categorized.rare;
  if (categorized.land.length === 0) categorized.land = categorized.common;

  setCardsCache.set(setCode.toLowerCase(), {
    timestamp: Date.now(),
    data: categorized
  });

  return categorized;
}

// Get user's economy info
router.get('/info', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      "SELECT gold, gems, xp, level FROM users WHERE id = ?",
      [req.user.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result[0].values[0];
    res.json({ gold: row[0], gems: row[1], xp: row[2], level: row[3] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List all Starter / Precon Decks for Store
router.get('/starter-decks', (req, res) => {
  res.json(STARTER_DECKS_CATALOG);
});

// Buy a Starter / Precon Deck
router.post('/starter-decks/buy', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { deck_id, currency = 'gold' } = req.body;

    const template = STARTER_DECKS_CATALOG.find(d => d.id === deck_id);
    if (!template) {
      return res.status(404).json({ error: 'Starter deck not found' });
    }

    // Check funds
    const userResult = db.exec("SELECT gold, gems FROM users WHERE id = ?", [req.user.id]);
    if (userResult.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = { gold: userResult[0].values[0][0], gems: userResult[0].values[0][1] };
    const cost = currency === 'gold' ? template.price_gold : template.price_gems;

    if (user[currency] < cost) {
      return res.status(400).json({ error: `Saldo insuficiente de ${currency}. Necessário: ${cost}, você tem: ${user[currency]}` });
    }

    // Deduct cost
    db.run(`UPDATE users SET ${currency} = ${currency} - ? WHERE id = ?`, [cost, req.user.id]);

    // 1. Add all cards to user's collection
    for (const item of template.cards) {
      const cardId = `scry_${encodeURIComponent(item.name.toLowerCase())}`;
      const imageUri = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(item.name)}&format=image&version=normal`;

      const existing = db.exec(
        "SELECT id, quantity FROM collections WHERE user_id = ? AND card_name = ?",
        [req.user.id, item.name]
      );

      if (existing.length > 0 && existing[0].values.length > 0) {
        db.run(
          "UPDATE collections SET quantity = quantity + ? WHERE user_id = ? AND card_name = ?",
          [item.quantity || 1, req.user.id, item.name]
        );
      } else {
        db.run(
          "INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil) VALUES (?, ?, ?, 'precon', 'rare', ?, ?, 0)",
          [req.user.id, cardId, item.name, imageUri, item.quantity || 1]
        );
      }
    }

    // 2. Create the ready-to-play deck for user
    const newDeckId = uuidv4();
    const commanderCard = template.cards.find(c => c.is_commander);
    const commanderName = commanderCard ? commanderCard.name : template.commander_name;

    db.run(
      "INSERT INTO decks (id, user_id, name, description, format, cards_json, commander_id, cover_card_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        newDeckId,
        req.user.id,
        template.name,
        template.description,
        template.format,
        JSON.stringify(template.cards),
        commanderName || null,
        commanderName || null
      ]
    );

    // Give XP
    db.run("UPDATE users SET xp = xp + 100 WHERE id = ?", [req.user.id]);
    saveDatabase();

    const updatedUser = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const balance = {
      gold: updatedUser[0]?.values[0][0] || 0,
      gems: updatedUser[0]?.values[0][1] || 0,
      xp: updatedUser[0]?.values[0][2] || 0,
      level: updatedUser[0]?.values[0][3] || 1
    };

    res.json({
      success: true,
      deck_id: newDeckId,
      deck_name: template.name,
      cards_added: template.cards.reduce((acc, c) => acc + (c.quantity || 1), 0),
      balance
    });
  } catch (err) {
    console.error('Buy starter deck error:', err);
    res.status(500).json({ error: 'Erro ao processar compra do starter deck' });
  }
});

// Open a booster pack (Guaranteed 15 MTG cards)
router.post('/booster/open', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { set_code, currency = 'gold' } = req.body;

    if (!set_code) return res.status(400).json({ error: 'set_code is required' });

    const userResult = db.exec("SELECT gold, gems FROM users WHERE id = ?", [req.user.id]);
    if (userResult.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = { gold: userResult[0].values[0][0], gems: userResult[0].values[0][1] };
    const cost = BOOSTER_COST[currency];

    if (user[currency] < cost) {
      return res.status(400).json({ error: `Not enough ${currency}. Need ${cost}, have ${user[currency]}` });
    }

    const setCards = await getSetCardsCategorized(set_code);

    const pickRandom = (arr, count) => {
      if (!arr || arr.length === 0) return [];
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };

    const boosterPackRaw = [];

    // 1. Rare / Mythic
    const isMythic = Math.random() < 0.135 && setCards.mythic.length > 0;
    const rarePool = isMythic ? setCards.mythic : setCards.rare;
    const rareCard = pickRandom(rarePool, 1);
    if (rareCard.length > 0) boosterPackRaw.push(rareCard[0]);

    // 2. 3 Uncommons
    const uncommons = pickRandom(setCards.uncommon, 3);
    boosterPackRaw.push(...uncommons);

    // 3. Foil Wildcard
    const hasFoil = Math.random() < 0.33;
    let foilCard = null;
    if (hasFoil) {
      const foilRarityRoll = Math.random();
      let foilPool = setCards.common;
      if (foilRarityRoll < 0.05 && setCards.mythic.length > 0) foilPool = setCards.mythic;
      else if (foilRarityRoll < 0.18 && setCards.rare.length > 0) foilPool = setCards.rare;
      else if (foilRarityRoll < 0.40 && setCards.uncommon.length > 0) foilPool = setCards.uncommon;
      const pickedFoil = pickRandom(foilPool, 1);
      if (pickedFoil.length > 0) foilCard = pickedFoil[0];
    }

    // 4. Commons
    const commonCount = foilCard ? 9 : 10;
    const commons = pickRandom(setCards.common, commonCount);
    boosterPackRaw.push(...commons);

    if (foilCard) boosterPackRaw.push(foilCard);

    // 5. 1 Basic Land
    const land = pickRandom(setCards.land, 1);
    if (land.length > 0) boosterPackRaw.push(land[0]);

    while (boosterPackRaw.length < 15) {
      const filler = pickRandom(setCards.all, 1);
      if (filler.length > 0) boosterPackRaw.push(filler[0]);
      else break;
    }

    const result = boosterPackRaw.map((card, index) => {
      const isCardFoil = (foilCard && card.id === foilCard.id && index === boosterPackRaw.length - 2) || (Math.random() < 0.015);

      return {
        card_id: card.id,
        card_name: card.name,
        set_code: card.set,
        rarity: card.rarity,
        image_uri: card.image_uris?.normal || card.image_uris?.large || card.card_faces?.[0]?.image_uris?.normal || '',
        image_small: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || '',
        oracle_text: card.oracle_text || (card.card_faces ? card.card_faces.map(f => f.oracle_text).join('\n---\n') : ''),
        mana_cost: card.mana_cost || (card.card_faces ? card.card_faces[0]?.mana_cost : '') || '',
        type_line: card.type_line || '',
        power: card.power,
        toughness: card.toughness,
        foil: isCardFoil ? 1 : 0,
        quantity: 1
      };
    });

    db.run(`UPDATE users SET ${currency} = ${currency} - ? WHERE id = ?`, [cost, req.user.id]);

    for (const card of result) {
      const existing = db.exec(
        "SELECT id, quantity FROM collections WHERE user_id = ? AND card_id = ? AND foil = ?",
        [req.user.id, card.card_id, card.foil]
      );

      if (existing.length > 0 && existing[0].values.length > 0) {
        db.run("UPDATE collections SET quantity = quantity + 1 WHERE user_id = ? AND card_id = ? AND foil = ?",
          [req.user.id, card.card_id, card.foil]);
      } else {
        db.run(
          "INSERT INTO collections (user_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
          [req.user.id, card.card_id, card.card_name, card.set_code, card.rarity, card.image_uri, card.foil]
        );
      }
    }

    db.run("UPDATE users SET xp = xp + 25 WHERE id = ?", [req.user.id]);

    db.run(
      "INSERT INTO booster_history (user_id, set_code, cards_json, cost_type, cost_amount) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, set_code, JSON.stringify(result), currency, cost]
    );

    saveDatabase();

    const updatedUser = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const balance = {
      gold: updatedUser[0]?.values[0][0] || 0,
      gems: updatedUser[0]?.values[0][1] || 0,
      xp: updatedUser[0]?.values[0][2] || 0,
      level: updatedUser[0]?.values[0][3] || 1
    };

    res.json({
      cards: result,
      total_count: result.length,
      cost: { type: currency, amount: cost },
      balance,
      set_code
    });
  } catch (err) {
    console.error('Booster error:', err);
    res.status(500).json({ error: err.message || 'Falha ao abrir booster.' });
  }
});

// Daily reward
router.post('/daily', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    db.run("UPDATE users SET gold = gold + 250, xp = xp + 50 WHERE id = ?", [req.user.id]);
    saveDatabase();

    const result = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = result[0].values[0];

    res.json({
      reward: { gold: 250, xp: 50 },
      balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
