/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Dynamic Pricing Engine
   Supply & demand-driven card economy with market events
   ═══════════════════════════════════════════════════════════════ */

const RARITY_BASE = {
  common:    { min: 5,   max: 50,    base: 15   },
  uncommon:  { min: 20,  max: 200,   base: 50   },
  rare:      { min: 80,  max: 800,   base: 250  },
  mythic:    { min: 300, max: 5000,  base: 1000 },
};

const MARKET_EVENTS = [
  { type: 'buying_surge', title: '🔥 Frenesi de Compras!', desc: 'Todos os preços de compra aumentam 20% por 30 minutos!', rarity_mod: 1.2, duration: 30 },
  { type: 'price_crash', title: '📉 Crash do Mercado!', desc: 'Os preços caem 15%! Oportunidade de comprar barato.', rarity_mod: 0.85, duration: 45 },
  { type: 'rare_boost', title: '💎 Festival de Raras!', desc: 'Cartas raras e míticas valorizam 25%!', rarity_mod: 1.25, duration: 60, color: 'rare' },
  { type: 'foil_frenzy', title: '✨ Loucura Foil!', desc: 'Cartas foil valem o dobro por 40 minutos!', rarity_mod: 2.0, duration: 40, color: 'foil' },
  { type: 'new_set_release', title: '🆕 Lançamento de Expansão!', desc: 'Novas cartas disponíveis! Preços iniciais altos.', rarity_mod: 1.5, duration: 120 },
  { type: 'black_market', title: '🌙 Mercado Negro', desc: 'Cartas negras e de morte valorizam 30%!', rarity_mod: 1.3, duration: 45, color: 'black' },
  { type: 'green_surge', title: '🌿 Floresta em Chamas!', desc: 'Cartas verdes e de criaturas ficam mais baratas.', rarity_mod: 0.8, duration: 60, color: 'green' },
  { type: 'value_hunt', title: '🏆 Caça ao Valor!', desc: 'Todas as cartas raras ganham bônus de 15%!', rarity_mod: 1.15, duration: 90 },
];

class PricingEngine {
  constructor(db) {
    this.db = db;
    this.eventInterval = null;
    this.normalizeInterval = null;
  }

  start() {
    console.log('💰 Dynamic Pricing Engine started');
    this.eventInterval = setInterval(() => this.maybeSpawnEvent(), 10 * 60 * 1000);
    this.normalizeInterval = setInterval(() => this.normalizePrices(), 5 * 60 * 1000);
    this.cleanupExpiredEvents();
  }

  stop() {
    if (this.eventInterval) clearInterval(this.eventInterval);
    if (this.normalizeInterval) clearInterval(this.normalizeInterval);
    console.log('💰 Dynamic Pricing Engine stopped');
  }

  initializeCardPrice(cardId, cardName, rarity) {
    const existing = this.db.exec(`SELECT card_id FROM dynamic_pricing WHERE card_id = ?`, [cardId]);
    if (existing.length && existing[0].values.length) return;

    const base = RARITY_BASE[rarity] || RARITY_BASE.common;
    this.db.run(
      `INSERT OR IGNORE INTO dynamic_pricing (card_id, card_name, base_price, current_price, supply, demand, demand_score, trend)
       VALUES (?, ?, ?, ?, 0, 0, 1.0, 'stable')`,
      [cardId, cardName, base.base, base.base]
    );
  }

  getCurrentPrice(cardId) {
    const result = this.db.exec(`SELECT current_price, base_price, demand_score FROM dynamic_pricing WHERE card_id = ?`, [cardId]);
    if (!result.length || !result[0].values.length) return null;
    return {
      current: result[0].values[0][0],
      base: result[0].values[0][1],
      demandScore: result[0].values[0][2],
    };
  }

  onCardBought(cardId, cardName, rarity, price) {
    this.initializeCardPrice(cardId, cardName, rarity);

    this.db.run(`UPDATE dynamic_pricing SET demand = demand + 1, supply = MAX(supply - 1, -20), last_updated = datetime('now') WHERE card_id = ?`, [cardId]);
    this.adjustPrice(cardId, 'buy');
  }

  onCardListed(cardId, cardName, rarity, price) {
    this.initializeCardPrice(cardId, cardName, rarity);
    this.db.run(`UPDATE dynamic_pricing SET supply = supply + 1, last_updated = datetime('now') WHERE card_id = ?`, [cardId]);
    this.adjustPrice(cardId, 'sell');
  }

  onCardCancelled(cardId) {
    this.db.run(`UPDATE dynamic_pricing SET supply = MAX(supply - 1, 0), last_updated = datetime('now') WHERE card_id = ?`, [cardId]);
    this.adjustPrice(cardId, 'cancel');
  }

  adjustPrice(cardId, reason) {
    const result = this.db.exec(`SELECT * FROM dynamic_pricing WHERE card_id = ?`, [cardId]);
    if (!result.length || !result[0].values.length) return;

    const row = {};
    result[0].columns.forEach((col, idx) => row[col] = result[0].values[0][idx]);

    let demandFactor = row.demand_score || 1.0;
    const activeEvents = this.getActiveEvents();
    for (const evt of activeEvents) {
      if (!evt.color_modifier || evt.color_modifier === '' || cardId.includes(evt.color_modifier)) {
        demandFactor *= evt.rarity_modifier;
      }
    }

    let priceChange = 0;
    if (reason === 'buy') {
      priceChange = row.base_price * 0.02 * demandFactor;
    } else if (reason === 'sell') {
      priceChange = -row.base_price * 0.015 * demandFactor;
    } else if (reason === 'cancel') {
      priceChange = -row.base_price * 0.005;
    }

    const supplyDemandRatio = row.supply > 0 ? row.demand / Math.max(row.supply, 1) : row.demand > 0 ? 2.0 : 1.0;
    const supplyModifier = Math.max(0.5, Math.min(2.5, supplyDemandRatio));

    let newPrice = Math.round((row.current_price + priceChange) * supplyModifier * demandFactor);
    const minPrice = Math.round(row.base_price * 0.3);
    const maxPrice = Math.round(row.base_price * 5.0);
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

    const trend = newPrice > row.current_price * 1.05 ? 'rising' : newPrice < row.current_price * 0.95 ? 'falling' : 'stable';
    const newDemandScore = Math.max(0.5, Math.min(3.0, demandFactor + (reason === 'buy' ? 0.02 : -0.01)));

    this.db.run(
      `UPDATE dynamic_pricing SET current_price = ?, demand_score = ?, trend = ?, last_updated = datetime('now') WHERE card_id = ?`,
      [newPrice, newDemandScore, trend, cardId]
    );
  }

  normalizePrices() {
    this.db.run(`
      UPDATE dynamic_pricing
      SET current_price = CASE
        WHEN current_price > base_price * 1.5 THEN ROUND(current_price * 0.98)
        WHEN current_price < base_price * 0.6 THEN ROUND(current_price * 1.02)
        ELSE current_price
      END,
      demand_score = CASE
        WHEN demand_score > 1.5 THEN demand_score - 0.01
        WHEN demand_score < 0.8 THEN demand_score + 0.01
        ELSE demand_score
      END,
      supply = MAX(supply - 1, 0),
      demand = MAX(demand - 1, 0),
      last_updated = datetime('now')
      WHERE last_updated < datetime('now', '-10 minutes')
    `);
  }

  maybeSpawnEvent() {
    const active = this.getActiveEvents();
    if (active.length >= 2) return;

    if (Math.random() > 0.15) return;

    const event = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    const expires = new Date(Date.now() + event.duration * 60000);

    this.db.run(
      `INSERT INTO market_events (event_type, title, description, rarity_modifier, color_modifier, duration_minutes, active, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [event.type, event.title, event.desc, event.rarity_mod, event.color || '', event.duration, expires.toISOString()]
    );

    console.log(`📢 Market Event: ${event.title}`);
  }

  getActiveEvents() {
    this.cleanupExpiredEvents();
    const result = this.db.exec(`SELECT * FROM market_events WHERE active = 1`);
    if (!result.length) return [];
    return result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    });
  }

  cleanupExpiredEvents() {
    this.db.run(`UPDATE market_events SET active = 0 WHERE active = 1 AND expires_at < datetime('now')`);
  }

  getMarketOverview() {
    const stats = {};
    const total = this.db.exec(`SELECT COUNT(*) as total, SUM(current_price) as total_value, AVG(current_price) as avg_price FROM dynamic_pricing`);
    if (total.length && total[0].values.length) {
      stats.totalTracked = total[0].values[0][0] || 0;
      stats.totalValue = total[0].values[0][1] || 0;
      stats.avgPrice = total[0].values[0][2] || 0;
    }

    const topGainers = this.db.exec(`SELECT card_name, current_price, base_price, trend FROM dynamic_pricing WHERE trend = 'rising' ORDER BY current_price DESC LIMIT 10`);
    stats.topGainers = topGainers.length ? topGainers[0].values.map(row => {
      const obj = {};
      topGainers[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    }) : [];

    const topLosers = this.db.exec(`SELECT card_name, current_price, base_price, trend FROM dynamic_pricing WHERE trend = 'falling' ORDER BY current_price ASC LIMIT 10`);
    stats.topLosers = topLosers.length ? topLosers[0].values.map(row => {
      const obj = {};
      topLosers[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    }) : [];

    const mostActive = this.db.exec(`SELECT card_name, demand, supply, demand_score FROM dynamic_pricing ORDER BY demand DESC LIMIT 10`);
    stats.mostActive = mostActive.length ? mostActive[0].values.map(row => {
      const obj = {};
      mostActive[0].columns.forEach((col, idx) => obj[col] = row[idx]);
      return obj;
    }) : [];

    stats.activeEvents = this.getActiveEvents();

    return stats;
  }

  getCardPriceHistory(cardId) {
    const result = this.db.exec(`SELECT * FROM dynamic_pricing WHERE card_id = ?`, [cardId]);
    if (!result.length || !result[0].values.length) return null;
    const obj = {};
    result[0].columns.forEach((col, idx) => obj[col] = result[0].values[0][idx]);
    return obj;
  }

  calculateCollectionValue(userId) {
    const collections = this.db.exec(`
      SELECT c.card_id, c.rarity, c.quantity, c.foil
      FROM collections c WHERE c.user_id = ?
    `, [userId]);

    if (!collections.length) return { totalValue: 0, cardCount: 0 };

    let totalValue = 0;
    let cardCount = 0;
    const cols = collections[0].columns;

    for (const row of collections[0].values) {
      const card = {};
      cols.forEach((col, idx) => card[col] = row[idx]);

      const pricing = this.getCurrentPrice(card.card_id);
      let price = pricing ? pricing.current : (RARITY_BASE[card.rarity]?.base || 15);
      if (card.foil) price = Math.round(price * 2.5);

      totalValue += price * (card.quantity || 1);
      cardCount += card.quantity || 1;
    }

    const uniqueResult = this.db.exec(`SELECT COUNT(DISTINCT card_id) FROM collections WHERE user_id = ?`, [userId]);
    const uniqueCards = uniqueResult.length && uniqueResult[0].values.length ? uniqueResult[0].values[0][0] : 0;

    const mythicCount = this.db.exec(`SELECT COUNT(*) FROM collections WHERE user_id = ? AND rarity = 'mythic'`, [userId]);
    const rareCount = this.db.exec(`SELECT COUNT(*) FROM collections WHERE user_id = ? AND rarity = 'rare'`, [userId]);
    const foilCount = this.db.exec(`SELECT COUNT(*) FROM collections WHERE user_id = ? AND foil = 1`, [userId]);

    const mythicN = mythicCount.length && mythicCount[0].values.length ? mythicCount[0].values[0][0] : 0;
    const rareN = rareCount.length && rareCount[0].values.length ? rareCount[0].values[0][0] : 0;
    const foilN = foilCount.length && foilCount[0].values.length ? foilCount[0].values[0][0] : 0;

    this.db.run(`
      INSERT OR REPLACE INTO collection_value (user_id, total_cards, unique_cards, total_value_gold,
        mythic_count, rare_count, foil_count, completion_pct, last_calculated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [userId, cardCount, uniqueCards, totalValue, mythicN, rareN, foilN, Math.min(100, (uniqueCards / 500) * 100)]);

    return {
      totalValue,
      cardCount,
      uniqueCards,
      mythicCount: mythicN,
      rareCount: rareN,
      foilCount: foilN,
      completionPct: Math.min(100, (uniqueCards / 500) * 100),
    };
  }
}

module.exports = PricingEngine;
