/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — API Client
   Fetch wrapper with JWT, caching, and error handling
   ═══════════════════════════════════════════════════════════════ */

const API = {
  base: '/api',
  token: localStorage.getItem('mtg_token'),

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('mtg_token', token);
    else localStorage.removeItem('mtg_token');
  },

  async request(endpoint, options = {}) {
    const url = `${this.base}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        this.setToken(null);
        AppState.user = null;
        updateAuthUI();
      }
      throw err;
    }
  },

  get(endpoint) { return this.request(endpoint); },
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },

  // Auth
  async login(username, password) {
    const data = await this.post('/auth/login', { username, password });
    this.setToken(data.token);
    return data;
  },

  async register(username, email, password) {
    const data = await this.post('/auth/register', { username, email, password });
    this.setToken(data.token);
    return data;
  },

  async getMe() {
    return this.get('/auth/me');
  },

  // Cards (Scryfall proxy)
  async searchCards(query, page = 1) {
    return this.get(`/cards/search?q=${encodeURIComponent(query)}&page=${page}`);
  },

  async getCardByName(name, fuzzy = false) {
    const param = fuzzy ? 'fuzzy' : 'exact';
    return this.get(`/cards/named?${param}=${encodeURIComponent(name)}`);
  },

  async autocomplete(query) {
    return this.get(`/cards/autocomplete?q=${encodeURIComponent(query)}`);
  },

  async getRandomCard(query = '') {
    return this.get(`/cards/random${query ? '?q=' + encodeURIComponent(query) : ''}`);
  },

  async getCardById(id) {
    return this.get(`/cards/id/${id}`);
  },

  async getSets() {
    return this.get('/cards/sets');
  },

  async getSet(code) {
    return this.get(`/cards/sets/${code}`);
  },

  async getSetCards(code, page = 1) {
    return this.get(`/cards/sets/${code}/cards?page=${page}`);
  },

  // Collection
  async getCollection(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/collection${qs ? '?' + qs : ''}`);
  },

  async addToCollection(card) {
    return this.post('/collection', card);
  },

  async addBulkToCollection(cards) {
    return this.post('/collection/bulk', { cards });
  },

  async removeFromCollection(cardId, foil = 0) {
    return this.delete(`/collection/${cardId}?foil=${foil}`);
  },

  async getCollectionStats() {
    return this.get('/collection/stats');
  },

  // Decks
  async getDecks() {
    return this.get('/decks');
  },

  async getDeck(id) {
    return this.get(`/decks/${id}`);
  },

  async createDeck(deck) {
    return this.post('/decks', deck);
  },

  async updateDeck(id, deck) {
    return this.put(`/decks/${id}`, deck);
  },

  async deleteDeck(id) {
    return this.delete(`/decks/${id}`);
  },

  async importDeck(text, name, format) {
    return this.post('/decks/import', { text, name, format });
  },

  async exportDeck(id) {
    return this.get(`/decks/${id}/export`);
  },

  // Economy
  async getEconomy() {
    return this.get('/economy/info');
  },

  async openBooster(set_code, currency = 'gold') {
    return this.post('/economy/booster/open', { set_code, currency });
  },

  async claimDaily() {
    return this.post('/economy/daily', {});
  },

  // Trades
  async getTrades() {
    return this.get('/trade');
  },

  async createTrade(trade) {
    return this.post('/trade', trade);
  },

  async respondTrade(id, action) {
    return this.put(`/trade/${id}`, { action });
  },

  // News & Daily MTG RSS
  async getNews() {
    return this.get('/news');
  },

  // Competitive Profile
  async getProfile(username = '') {
    return this.get(`/profile${username ? '/' + username : ''}`);
  },

  async updateProfile(data) {
    return this.put('/profile', data);
  },

  // Marketplace & P2P Card Trading
  async getMarketListings(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/market${qs ? '?' + qs : ''}`);
  },

  async getMyMarketListings() {
    return this.get('/market/my-listings');
  },

  async sellMarketCard(data) {
    return this.post('/market/sell', data);
  },

  async buyMarketCard(listingId) {
    return this.post(`/market/buy/${listingId}`, {});
  },

  async cancelMarketListing(listingId) {
    return this.post(`/market/cancel/${listingId}`, {});
  },

  async getMarketTrades() {
    return this.get('/market/trades');
  },

  async createMarketTrade(data) {
    return this.post('/market/trades', data);
  },

  // Seasons & Leaderboard
  async getCurrentSeason() {
    return this.get('/seasons/current');
  },

  async getSeasons() {
    return this.get('/seasons');
  },

  async getMySeasonProgress() {
    return this.get('/seasons/my-progress');
  },

  async claimSeasonReward(tier) {
    return this.post('/seasons/claim-reward', { tier });
  },

  async getLeaderboard(category = 'xp') {
    return this.get(`/seasons/leaderboard?category=${category}`);
  },

  async recordGameResult(won, format) {
    return this.post('/seasons/record-game', { won, format });
  },

  // Missions
  async getMissions() {
    return this.get('/missions');
  },

  async getDailyMissions() {
    return this.get('/missions/daily');
  },

  async getWeeklyMissions() {
    return this.get('/missions/weekly');
  },

  async updateMissionProgress(category, amount = 1) {
    return this.post('/missions/progress', { category, amount });
  },

  async claimMissionReward(mission_id) {
    return this.post('/missions/claim', { mission_id });
  },

  async resetDailyMissions() {
    return this.post('/missions/reset-daily', {});
  },

  // Achievements
  async getAchievements() {
    return this.get('/achievements');
  },

  async getAchievementsByCategory(category) {
    return this.get(`/achievements/category/${category}`);
  },

  async updateAchievementProgress(achievement_id, amount = 1) {
    return this.post('/achievements/progress', { achievement_id, amount });
  },

  async claimAchievementReward(achievement_id) {
    return this.post('/achievements/claim', { achievement_id });
  },

  // Customization
  async getCustomizationShop(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/customization/shop${qs ? '?' + qs : ''}`);
  },

  async getMyCustomizations() {
    return this.get('/customization/my-items');
  },

  async getEquippedCustomizations(userId) {
    return this.get(`/customization/equipped/${userId}`);
  },

  async buyCustomization(item_id, currency = 'gold') {
    return this.post('/customization/buy', { item_id, currency });
  },

  async equipCustomization(item_id, equipped = true) {
    return this.post('/customization/equip', { item_id, equipped });
  },

  // Vault & Crafting
  async getVault() {
    return this.get('/customization/vault');
  },

  async disenchantCard(card_id, quantity = 1) {
    return this.post('/customization/craft/disenchant', { card_id, quantity });
  },

  async craftWildcard(from_rarity, to_rarity, quantity = 1) {
    return this.post('/customization/craft/wildcard', { from_rarity, to_rarity, quantity });
  },

  // Economy extras
  async getDailyStatus() {
    return this.get('/economy/daily/status');
  },

  async getLevelInfo() {
    return this.get('/economy/level');
  },

  // Tavern
  async getTavernOverview() {
    return this.get('/tavern/overview');
  },

  async getTavernNPCs() {
    return this.get('/tavern/npcs');
  },

  async getDailyDeals() {
    return this.get('/tavern/daily-deals');
  },

  async buyDailyDeal(deal) {
    return this.post('/tavern/buy-deal', deal);
  },

  async getRareDeals() {
    return this.get('/tavern/rare-deals');
  },

  async buyRareDeal(card) {
    return this.post('/tavern/buy-rare-deal', card);
  },

  async openMysteryBox() {
    return this.post('/tavern/mystery-box', {});
  },

  async getFortune() {
    return this.get('/tavern/fortune');
  },

  async tavernDisenchant(card_id, quantity = 1) {
    return this.post('/tavern/disenchant', { card_id, quantity });
  },

  async tavernCraft(from_rarity, to_rarity) {
    return this.post('/tavern/craft', { from_rarity, to_rarity });
  },

  async getTavernVault() {
    return this.get('/tavern/vault');
  },

  async playDice(bet, guess) {
    return this.post('/tavern/games/dice', { bet, guess });
  },

  async playCoinflip(bet, guess) {
    return this.post('/tavern/games/coinflip', { bet, guess });
  },

  async playSlots(bet) {
    return this.post('/tavern/games/slotmachine', { bet });
  },

  async getTavernGameHistory() {
    return this.get('/tavern/games/history');
  },

  // ─── BOT ECONOMY ───
  async getBots() { return this.get('/bots'); },
  async getBot(id) { return this.get(`/bots/${id}`); },
  async getBotActivity(limit) { return this.get(`/bots/activity/recent?limit=${limit || 30}`); },

  // ─── DYNAMIC PRICING ───
  async getMarketOverview() { return this.get('/pricing/market-overview'); },
  async getCardPricing(cardId) { return this.get(`/pricing/card/${cardId}`); },
  async getCollectionValue() { return this.get('/pricing/collection-value'); },
  async getMarketEvents() { return this.get('/pricing/events'); },

  // ─── SHOWCASES ───
  async getShowcases() { return this.get('/showcases'); },
  async getMyShowcases() { return this.get('/showcases/mine'); },
  async createShowcase(data) { return this.post('/showcases', data); },
  async updateShowcase(id, data) { return this.put(`/showcases/${id}`, data); },
  async deleteShowcase(id) { return this.del(`/showcases/${id}`); },

  // ─── BINDERS ───
  async getMyBinders() { return this.get('/showcases/binders'); },
  async createBinder(data) { return this.post('/showcases/binders', data); },
  async getBinder(id) { return this.get(`/showcases/binders/${id}`); },
  async addCardToBinder(binderId, card) { return this.post(`/showcases/binders/${binderId}/cards`, card); },
  async removeCardFromBinder(binderId, cardId) { return this.del(`/showcases/binders/${binderId}/cards/${cardId}`); },
  async deleteBinder(id) { return this.del(`/showcases/binders/${id}`); },

  // ─── CARD SKINS ───
  async getCardSkins() { return this.get('/showcases/skins'); },
  async getMySkins() { return this.get('/showcases/skins/mine'); },
  async buyCardSkin(skinId) { return this.post(`/showcases/skins/buy/${skinId}`); },
  async equipSkin(skinId, cardId) { return this.post(`/showcases/skins/equip/${skinId}`, { card_id: cardId }); },
};
