/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Marketplace & Trade Hub Page
   ═══════════════════════════════════════════════════════════════ */

const MarketPage = {
  currentTab: 'browse', // 'browse' | 'sell' | 'my-listings' | 'trades'
  listings: [],
  myCollection: [],

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);padding-bottom:var(--space-2xl);">
        <div class="section-header">
          <div>
            <h1 class="section-title">🛒 Mercado de Cartas & Trocas</h1>
            <p style="font-size:0.85rem;color:var(--text-muted);">Compre, venda por Gold e troque cartas diretamente com outros Planeswalkers do Multiverso.</p>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-primary btn-sm" onclick="MarketPage.switchTab('sell')">🏷️ Vender Carta</button>
            <button class="btn btn-secondary btn-sm" onclick="MarketPage.switchTab('trades')">🔄 Propor Troca</button>
          </div>
        </div>

        <div class="tabs">
          <button class="tab active" id="market-tab-browse" onclick="MarketPage.switchTab('browse')">🛒 Vitrine de Cartas</button>
          <button class="tab" id="market-tab-sell" onclick="MarketPage.switchTab('sell')">🏷️ Anunciar Carta</button>
          <button class="tab" id="market-tab-my" onclick="MarketPage.switchTab('my-listings')">📦 Meus Anúncios</button>
          <button class="tab" id="market-tab-trades" onclick="MarketPage.switchTab('trades')">🔄 Central de Trocas</button>
        </div>

        <div id="market-tab-content">
          <!-- Dynamic Content -->
        </div>
      </div>
    `;

    this.switchTab('browse');
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    const btn = document.getElementById(`market-tab-${tab === 'my-listings' ? 'my' : tab}`);
    if (btn) btn.classList.add('active');

    if (tab === 'browse') this.loadBrowse();
    else if (tab === 'sell') this.loadSell();
    else if (tab === 'my-listings') this.loadMyListings();
    else if (tab === 'trades') this.loadTrades();
  },

  async loadBrowse() {
    const container = document.getElementById('market-tab-content');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:var(--space-md);">
        <div class="search-bar" style="flex:1;min-width:240px;">
          <span class="search-bar-icon">🔍</span>
          <input type="text" id="market-search-input" placeholder="Buscar carta no mercado por nome..." oninput="MarketPage.handleSearch(this.value)">
        </div>
        <select class="lang-select" id="market-rarity-filter" onchange="MarketPage.filterByRarity(this.value)">
          <option value="">Todas as Raridades</option>
          <option value="mythic">Míticas (Mythic)</option>
          <option value="rare">Raras (Rare)</option>
          <option value="uncommon">Incomuns (Uncommon)</option>
          <option value="common">Comuns (Common)</option>
        </select>
        <select class="lang-select" id="market-sort-filter" onchange="MarketPage.sortBy(this.value)">
          <option value="newest">Mais Recentes</option>
          <option value="price_asc">Menor Preço</option>
          <option value="price_desc">Maior Preço</option>
        </select>
      </div>

      <div id="market-grid-container">
        <div class="market-grid">${CardDisplay.renderSkeleton(8)}</div>
      </div>
    `;

    this.fetchListings();
  },

  async fetchListings(params = {}) {
    try {
      const res = await API.getMarketListings(params);
      this.listings = res.listings || [];
      const container = document.getElementById('market-grid-container');
      if (!container) return;

      if (this.listings.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🛒</div>
            <div class="empty-state-title">Nenhum anúncio encontrado</div>
            <p class="empty-state-text">Seja o primeiro a anunciar cartas da sua coleção no mercado!</p>
            <button class="btn btn-primary mt-md" onclick="MarketPage.switchTab('sell')">🏷️ Anunciar Carta</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="market-grid">
          ${this.listings.map(l => `
            <div class="market-card">
              <img class="market-card-img" src="${l.image_uri || 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(l.card_name) + '&format=image&version=normal'}" alt="${l.card_name}" onclick="CardDisplay.showModal({id:'${l.card_id}', name:'${l.card_name.replace(/'/g, "\\'")}', image_uri:'${l.image_uri}'})" loading="lazy">
              <div class="market-card-info">
                <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.card_name}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);">
                  <span>Vendedor: <b>${l.seller_name}</b></span>
                  <span class="badge badge-${l.rarity || 'rare'}">${l.rarity || 'Rare'}</span>
                </div>
                <div class="market-price-tag">
                  <span>🪙 ${l.price_gold} Gold</span>
                  ${l.seller_id !== AppState.user?.id ? `
                    <button class="btn btn-primary btn-sm" style="padding:2px 10px;font-size:0.75rem;" onclick="MarketPage.buyListing('${l.id}', '${l.card_name.replace(/'/g, "\\'")}', ${l.price_gold})">Comprar</button>
                  ` : `
                    <span style="font-size:0.7rem;color:var(--text-muted);">Seu anúncio</span>
                  `}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch(e) {
      console.error(e);
    }
  },

  handleSearch(val) {
    this.fetchListings({ search: val });
  },

  filterByRarity(rarity) {
    this.fetchListings({ rarity });
  },

  sortBy(sort) {
    this.fetchListings({ sort });
  },

  async buyListing(listingId, cardName, price) {
    if (!AppState.user) return showAuthModal();
    if (!confirm(`Deseja comprar "${cardName}" por ${price} Gold?`)) return;

    try {
      const res = await API.buyMarketCard(listingId);
      showToast(res.message, 'success');
      AppState.user.gold = (AppState.user.gold || 0) - price;
      updateAuthUI();
      this.fetchListings();
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async loadSell() {
    const container = document.getElementById('market-tab-content');
    if (!container) return;

    if (!AppState.user) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔒</div>
          <div class="empty-state-title">Login Necessário</div>
          <p class="empty-state-text">Faça login para colocar suas cartas à venda no mercado.</p>
          <button class="btn btn-primary mt-md" onclick="showAuthModal()">Entrar</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="skeleton skeleton-card" style="height:300px;"></div>`;

    try {
      const res = await API.getCollection({ limit: 200 });
      this.myCollection = (res && res.cards) ? res.cards : (Array.isArray(res) ? res : []);

      if (this.myCollection.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">Sua Coleção está Vazia</div>
            <p class="empty-state-text">Abra boosters para obter cartas e colocá-las à venda no mercado!</p>
            <button class="btn btn-primary mt-md" onclick="navigateTo('/boosters')">✨ Abrir Booster</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="panel" style="max-width:800px;margin:0 auto;">
          <h2 style="font-size:1.15rem;color:var(--mana-gold-glow);margin-bottom:12px;">🏷️ Escolha uma Carta da sua Coleção para Vender</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;max-height:360px;overflow-y:auto;padding-right:6px;">
            ${this.myCollection.map(c => `
              <div class="market-card" style="padding:6px;cursor:pointer;" onclick="MarketPage.openSellModal('${c.card_id}', '${c.card_name.replace(/'/g, "\\'")}', '${c.image_uri}', ${c.foil || 0})">
                <img src="${c.image_uri || 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(c.card_name) + '&format=image&version=small'}" style="width:100%;aspect-ratio:var(--card-ratio);border-radius:6px;">
                <div style="font-size:0.75rem;font-weight:700;margin-top:4px;text-align:center;color:var(--text-primary);">${c.card_name}</div>
                <div style="font-size:0.68rem;color:var(--mana-gold-glow);text-align:center;">Qtd: ${c.quantity || 1}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch(e) {
      container.innerHTML = `<div class="auth-error">Erro ao carregar coleção: ${e.message}</div>`;
    }
  },

  openSellModal(cardId, cardName, imageUri, foil) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2 style="font-size:1.1rem;color:var(--mana-gold-glow);margin-bottom:12px;">🏷️ Anunciar "${cardName}"</h2>
        
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
          <img src="${imageUri}" style="width:90px;aspect-ratio:var(--card-ratio);border-radius:6px;box-shadow:var(--shadow-md);">
          <div>
            <div style="font-weight:700;">${cardName}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${foil ? '✨ Foil Wildcard' : 'Normal'}</div>
          </div>
        </div>

        <form onsubmit="MarketPage.handleSellSubmit(event, '${cardId}', ${foil})">
          <div class="form-group">
            <label>Preço de Venda em Gold (🪙)</label>
            <input type="number" id="sell-price-input" min="10" max="100000" step="5" required placeholder="Ex: 250">
          </div>
          <button type="submit" class="btn btn-primary btn-full mt-md">Publicar Anúncio no Mercado</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  async handleSellSubmit(e, cardId, foil) {
    e.preventDefault();
    const price = parseInt(document.getElementById('sell-price-input').value);
    if (!price || price <= 0) return;

    try {
      const res = await API.sellMarketCard({ card_id: cardId, price_gold: price, foil });
      document.querySelector('.modal-overlay')?.remove();
      showToast(res.message, 'success');
      this.switchTab('my-listings');
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async loadMyListings() {
    const container = document.getElementById('market-tab-content');
    if (!container) return;

    if (!AppState.user) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔒</div>
          <div class="empty-state-title">Login Necessário</div>
          <p class="empty-state-text">Faça login para gerenciar seus anúncios no mercado.</p>
          <button class="btn btn-primary mt-md" onclick="showAuthModal()">Entrar</button>
        </div>
      `;
      return;
    }

    try {
      const res = await API.getMyMarketListings();
      const list = res.listings || [];

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-title">Você não possui anúncios ativos</div>
            <p class="empty-state-text">Coloque cartas da sua coleção à venda para ganhar Gold!</p>
            <button class="btn btn-primary mt-md" onclick="MarketPage.switchTab('sell')">🏷️ Vender Carta</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="market-grid">
          ${list.map(l => `
            <div class="market-card">
              <img class="market-card-img" src="${l.image_uri || 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(l.card_name) + '&format=image&version=normal'}">
              <div class="market-card-info">
                <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${l.card_name}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;">
                  <span class="badge ${l.status === 'active' ? 'badge-rare' : 'badge-common'}">${l.status.toUpperCase()}</span>
                  <span style="color:var(--mana-gold-glow);font-weight:700;">🪙 ${l.price_gold} Gold</span>
                </div>
                ${l.status === 'active' ? `
                  <button class="btn btn-ghost btn-sm mt-xs" style="color:var(--mana-red-glow);width:100%;" onclick="MarketPage.cancelListing('${l.id}')">✕ Cancelar Anúncio</button>
                ` : `
                  <span style="font-size:0.72rem;color:var(--text-muted);text-align:center;margin-top:4px;">Item Finalizado</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch(e) {
      container.innerHTML = `<div class="auth-error">Erro ao carregar seus anúncios: ${e.message}</div>`;
    }
  },

  async cancelListing(listingId) {
    if (!confirm('Deseja realmente cancelar este anúncio? A carta retornará para sua coleção.')) return;
    try {
      const res = await API.cancelMarketListing(listingId);
      showToast(res.message, 'info');
      this.loadMyListings();
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async loadTrades() {
    const container = document.getElementById('market-tab-content');
    if (!container) return;

    if (!AppState.user) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔒</div>
          <div class="empty-state-title">Login Necessário</div>
          <p class="empty-state-text">Faça login para propor e receber trocas de cartas.</p>
          <button class="btn btn-primary mt-md" onclick="showAuthModal()">Entrar</button>
        </div>
      `;
      return;
    }

    try {
      const res = await API.getMarketTrades();
      const trades = res.trades || [];

      container.innerHTML = `
        <div class="panel" style="max-width:800px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="font-size:1.15rem;color:var(--mana-gold-glow);margin:0;">🔄 Propostas de Troca</h2>
            <button class="btn btn-primary btn-sm" onclick="MarketPage.openCreateTradeModal()">+ Nova Troca</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            ${trades.map(t => {
              const isSender = t.sender_id === AppState.user?.id;
              return `
                <div class="panel" style="background:var(--bg-tertiary);padding:12px;border:1px solid var(--border-subtle);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div>
                      <b>${t.sender_name}</b> ⇄ <b>${t.receiver_name}</b>
                      <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">${new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span class="badge ${t.status === 'pending' ? 'badge-rare' : 'badge-common'}">${t.status.toUpperCase()}</span>
                  </div>
                  <div style="font-size:0.85rem;color:var(--text-secondary);margin:6px 0;">
                    💬 "${t.message || 'Proposta de troca direta'}"
                  </div>
                </div>
              `;
            }).join('') || '<div style="color:var(--text-muted);text-align:center;padding:30px;">Nenhuma proposta de troca pendente no momento.</div>'}
          </div>
        </div>
      `;
    } catch(e) {
      container.innerHTML = `<div class="auth-error">Erro ao carregar trocas: ${e.message}</div>`;
    }
  },

  openCreateTradeModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:480px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2 style="font-size:1.15rem;color:var(--mana-gold-glow);margin-bottom:12px;">🔄 Propor Troca de Cartas</h2>

        <form onsubmit="MarketPage.handleCreateTradeSubmit(event)">
          <div class="form-group">
            <label>Username do Jogador Destinatário</label>
            <input type="text" id="trade-receiver-input" required placeholder="Digite o username exato do amigo...">
          </div>
          <div class="form-group">
            <label>Mensagem / Proposta</label>
            <textarea id="trade-msg-input" rows="3" required placeholder="Ex: Ofereço Sheoldred por Teferi..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-full mt-md">Enviar Proposta de Troca</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  async handleCreateTradeSubmit(e) {
    e.preventDefault();
    const receiver = document.getElementById('trade-receiver-input').value.trim();
    const msg = document.getElementById('trade-msg-input').value.trim();

    try {
      const res = await API.createMarketTrade({ receiver_username: receiver, message: msg });
      document.querySelector('.modal-overlay')?.remove();
      showToast(res.message, 'success');
      this.loadTrades();
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  }
};
