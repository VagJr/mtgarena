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
  }
};
