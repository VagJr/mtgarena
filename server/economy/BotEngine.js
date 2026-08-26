/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Bot AI Player Engine
   Autonomous NPCs that buy, sell, and trade to animate the economy
   ═══════════════════════════════════════════════════════════════ */

const { v4: uuidv4 } = require('uuid');

const BOT_CARD_POOLS = {
  artifacts: ['Sol Ring', 'Arcane Signet', 'Mind Stone', 'Thought Vessel', 'Lightning Greaves', 'Swiftfoot Boots', 'Sensei\'s Divining Top', 'Chromatic Lantern', 'Command Tower', 'Reliquary Tower'],
  rare_cards: ['Demonic Tutor', 'Vampiric Tutor', 'Mystical Tutor', 'Enlightened Tutor', 'Swords to Plowshares', 'Path to Exile', 'Counterspell', 'Cyclonic Rift', 'Rhystic Study', 'Smothering Tithe'],
  commons: ['Llanowar Elves', 'Elvish Mystic', 'Birds of Paradise', 'Lightning Bolt', 'Swords to Plowshares', 'Counterspell', 'Dark Ritual', 'Sol Ring', 'Signet cards', 'Talisman cards'],
  starter: ['Colossal Dreadmaw', 'Serra Angel', 'Shivan Dragon', 'Counterspell', 'Lightning Bolt', 'Llanowar Elves', 'Giant Growth', 'Terror', 'Disenchant', 'Prodigal Sorcerer'],
  foils: ['Foil Sol Ring', 'Foil Command Tower', 'Foil Lightning Greaves', 'Foil Swiftfoot Boots', 'Foil Arcane Signet', 'Foil Rhystic Study', 'Foil Smothering Tithe', 'Foil Cyclonic Rift'],
  black_cards: ['Dark Ritual', 'Vampiric Tutor', 'Demonic Tutor', 'Damnation', 'Toxic Deluge', 'Vindicate', 'Swords to Plowshares', 'Path to Exile', 'Thoughtseize', 'Inquisition of Kozilek'],
  value: ['Rhystic Study', 'Smothering Tithe', 'Dockside Extortionist', 'Cyclonic Rift', 'Fierce Guardianship', 'Deflecting Swat', 'Jeska\'s Will', 'The Great Henge', 'Mana Crypt', 'Mana Vault'],
  all: ['Sol Ring', 'Lightning Bolt', 'Counterspell', 'Llanowar Elves', 'Swords to Plowshares', 'Dark Ritual', 'Birds of Paradise', 'Arcane Signet', 'Cultivate', 'Terror'],
};

const RARITY_BASE_PRICES = {
  common: { min: 5, max: 30, base: 15 },
  uncommon: { min: 20, max: 100, base: 40 },
  rare: { min: 80, max: 500, base: 200 },
  mythic: { min: 300, max: 3000, base: 800 },
};

function generateBotCardName(pool) {
  const cards = BOT_CARD_POOLS[pool] || BOT_CARD_POOLS.all;
  return cards[Math.floor(Math.random() * cards.length)];
}

function generateCardId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}

class BotEngine {
  constructor(db) {
    this.db = db;
    this.running = false;
    this.actionInterval = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log('🤖 Bot Engine started — Bots are now active in the economy');

    this.actionInterval = setInterval(() => this.botCycle(), 45000);
    setTimeout(() => this.botCycle(), 5000);
  }

  stop() {
    this.running = false;
    if (this.actionInterval) clearInterval(this.actionInterval);
    console.log('🤖 Bot Engine stopped');
  }

  async botCycle() {
    try {
      const bots = this.getActiveBots();
      for (const bot of bots) {
        const actionsSince = this.getMinutesSince(bot.last_action_at);
        if (actionsSince < 2) continue;

        const action = this.decideAction(bot);
        await this.executeAction(bot, action);

        this.db.run(`UPDATE bot_players SET last_action_at = datetime('now') WHERE id = ?`, [bot.id]);
      }
    } catch (err) {
      console.error('🤖 Bot cycle error:', err.message);
    }
  }

  getActiveBots() {
    const result = this.db.exec(`SELECT * FROM bot_players WHERE active = 1`);
    if (!result.length) return [];
    return result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });
  }

  getMinutesSince(dateStr) {
    if (!dateStr) return 999;
    const now = new Date();
    const then = new Date(dateStr);
    return (now - then) / 60000;
  }

  decideAction(bot) {
    const roll = Math.random();
    const aggression = bot.aggression || 0.5;

    if (roll < 0.35) return 'buy_listing';
    if (roll < 0.60) return 'sell_card';
    if (roll < 0.75 && aggression > 0.5) return 'list_card';
    if (roll < 0.88) return 'browse';
    return 'rest';
  }

  async executeAction(bot, action) {
    switch (action) {
      case 'buy_listing': return this.botBuy(bot);
      case 'sell_card': return this.botSell(bot);
      case 'list_card': return this.botList(bot);
      case 'browse': return this.botBrowse(bot);
      default: break;
    }
  }

  botBuy(bot) {
    const listings = this.db.exec(`
      SELECT m.*, u.username as seller_name
      FROM market_listings m
      JOIN users u ON m.seller_id = u.id
      WHERE m.status = 'active' AND m.seller_id != ?
      ORDER BY RANDOM() LIMIT 10
    `, [bot.id]);

    if (!listings.length || !listings[0].values.length) return;

    const cols = listings[0].columns;
    const candidates = listings[0].values.map(row => {
      const obj = {};
      cols.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });

    const buyThreshold = bot.buy_threshold || 0.8;
    const affordable = candidates.filter(l => l.price_gold <= bot.gold * buyThreshold);
    if (!affordable.length) return;

    const listing = affordable[Math.floor(Math.random() * affordable.length)];
    const rarityMult = { common: 1, uncommon: 1.5, rare: 3, mythic: 8 };
    const botValue = (RARITY_BASE_PRICES[listing.rarity]?.base || 100) * (rarityMult[listing.rarity] || 1);

    if (listing.price_gold > botValue * 1.3) return;

    const updateResult = this.db.run(
      `UPDATE market_listings SET status = 'sold' WHERE id = ? AND status = 'active'`,
      [listing.id]
    );
    if (updateResult.changes === 0) return;

    this.db.run(`UPDATE users SET gold = gold + ? WHERE id = ?`, [listing.price_gold, listing.seller_id]);
    this.db.run(`UPDATE bot_players SET gold = gold - ? WHERE id = ?`, [listing.price_gold, bot.id]);

    const existing = this.db.exec(
      `SELECT id, quantity FROM bot_inventory WHERE bot_id = ? AND card_id = ? AND foil = ?`,
      [bot.id, listing.card_id, listing.foil]
    );

    if (existing.length && existing[0].values.length) {
      this.db.run(`UPDATE bot_inventory SET quantity = quantity + 1 WHERE id = ?`, [existing[0].values[0][0]]);
    } else {
      this.db.run(
        `INSERT INTO bot_inventory (bot_id, card_id, card_name, set_code, rarity, image_uri, quantity, foil, acquired_price)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [bot.id, listing.card_id, listing.card_name, listing.set_code, listing.rarity, listing.image_uri, listing.foil, listing.price_gold]
      );
    }

    this.logActivity(bot.id, 'buy', listing.card_name, listing.card_id, listing.price_gold, 1, listing.seller_name);
    this.db.run(`UPDATE bot_players SET xp = xp + ? WHERE id = ?`, [Math.floor(listing.price_gold / 10), bot.id]);
  }

  botSell(bot) {
    const inventory = this.db.exec(`
      SELECT * FROM bot_inventory WHERE bot_id = ? AND quantity > 0 ORDER BY RANDOM() LIMIT 5
    `, [bot.id]);

    if (!inventory.length || !inventory[0].values.length) return;

    const cols = inventory[0].columns;
    const items = inventory[0].values.map(row => {
      const obj = {};
      cols.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });

    const item = items[Math.floor(Math.random() * items.length)];
    const rarityPrices = RARITY_BASE_PRICES[item.rarity] || RARITY_BASE_PRICES.common;
    const supply = this.getSupply(item.card_id);
    const supplyMod = supply > 5 ? 0.7 : supply > 2 ? 0.85 : supply > 0 ? 1.0 : 1.15;
    const sellMult = (bot.sell_threshold || 1.2) * supplyMod;
    const price = Math.max(rarityPrices.min, Math.min(rarityPrices.max,
      Math.round(rarityPrices.base * sellMult * (0.85 + Math.random() * 0.3))
    ));

    const foilMult = item.foil ? 2.5 : 1;
    const finalPrice = Math.round(price * foilMult);

    const listingId = uuidv4();
    this.db.run(
      `INSERT INTO market_listings (id, seller_id, card_id, card_name, set_code, rarity, image_uri, foil, price_gold, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [listingId, bot.id, item.card_id, item.card_name, item.set_code, item.rarity, item.image_uri, item.foil, finalPrice]
    );

    if (item.quantity === 1) {
      this.db.run(`DELETE FROM bot_inventory WHERE id = ?`, [item.id]);
    } else {
      this.db.run(`UPDATE bot_inventory SET quantity = quantity - 1 WHERE id = ?`, [item.id]);
    }

    this.logActivity(bot.id, 'sell', item.card_name, item.card_id, finalPrice, 1, 'market');
  }

  botList(bot) {
    if (Math.random() > 0.3) return;
    const pool = bot.specialty || 'all';
    const cardName = generateBotCardName(pool);
    const cardId = generateCardId(cardName);
    const rarities = ['common', 'uncommon', 'rare', 'mythic'];
    const weights = [0.4, 0.3, 0.2, 0.1];
    let roll = Math.random();
    let rarity = 'common';
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { rarity = rarities[i]; break; }
    }

    const rarityPrices = RARITY_BASE_PRICES[rarity];
    const price = Math.round(rarityPrices.base * (0.8 + Math.random() * 0.4));

    const existing = this.db.exec(
      `SELECT id, quantity FROM bot_inventory WHERE bot_id = ? AND card_id = ?`,
      [bot.id, cardId]
    );

    if (existing.length && existing[0].values.length && existing[0].values[0][1] > 0) {
      this.db.run(`UPDATE bot_inventory SET quantity = quantity - 1 WHERE id = ?`, [existing[0].values[0][0]]);
    } else {
      this.db.run(
        `INSERT INTO bot_inventory (bot_id, card_id, card_name, set_code, rarity, quantity, acquired_price)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [bot.id, cardId, cardName, 'BOT', rarity, Math.round(price * 0.5)]
      );
    }

    const listingId = uuidv4();
    this.db.run(
      `INSERT INTO market_listings (id, seller_id, card_id, card_name, set_code, rarity, foil, price_gold, status)
       VALUES (?, ?, ?, ?, 'BOT', ?, 0, ?, 'active')`,
      [listingId, bot.id, cardId, cardName, rarity, price]
    );

    this.logActivity(bot.id, 'list', cardName, cardId, price, 1, 'market');
  }

  botBrowse(bot) {
    this.logActivity(bot.id, 'browse', null, null, 0, 0, null);
  }

  getSupply(cardId) {
    const active = this.db.exec(
      `SELECT COUNT(*) FROM market_listings WHERE card_id = ? AND status = 'active'`,
      [cardId]
    );
    return (active.length && active[0].values.length) ? active[0].values[0][0] : 0;
  }

  logActivity(botId, action, cardName, cardId, price, quantity, target) {
    this.db.run(
      `INSERT INTO bot_activity_log (bot_id, action, card_name, card_id, price, quantity, target_user)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [botId, action, cardName, cardId, price, quantity, target]
    );
  }

  getBotStatus() {
    return this.db.exec(`
      SELECT b.id, b.name, b.avatar, b.level, b.gold, b.personality, b.specialty,
        (SELECT COUNT(*) FROM bot_inventory bi WHERE bi.bot_id = b.id) as card_count,
        (SELECT COUNT(*) FROM bot_activity_log bal WHERE bal.bot_id = b.id AND bal.created_at > datetime('now', '-1 hour')) as recent_actions
      FROM bot_players b WHERE b.active = 1 ORDER BY b.level DESC
    `);
  }

  getBotActivity(limit = 30) {
    const result = this.db.exec(`
      SELECT bal.*, bp.name as bot_name, bp.avatar as bot_avatar
      FROM bot_activity_log bal
      JOIN bot_players bp ON bal.bot_id = bp.id
      ORDER BY bal.created_at DESC LIMIT ?
    `, [limit]);

    if (!result.length) return [];
    return result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });
  }
}

module.exports = BotEngine;
