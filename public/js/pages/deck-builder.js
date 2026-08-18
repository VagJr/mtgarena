/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Deck Builder (Binder Collector & Full Drag & Drop)
   ═══════════════════════════════════════════════════════════════ */

const DeckBuilderPage = {
  currentView: 'list', // 'list', 'editor', 'starter-store'
  currentDeck: null,
  collectionCards: [],
  filteredCollection: [],
  searchDebounce: null,
  colorFilters: new Set(),
  rarityFilter: 'all',
  typeFilter: 'all',
  binderPage: 1,
  binderPerPage: 12, // 12 cards per binder page (4x3)

  async render() {
    if (!AppState.user) {
      document.getElementById('app').innerHTML = `
        <div class="container page-enter" style="padding-top:60px;text-align:center;">
          <div class="empty-state">
            <div class="empty-state-icon">🔒</div>
            <div class="empty-state-title">Login Necessário</div>
            <p class="empty-state-text">Faça login para criar decks e comprar produtos selados.</p>
            <button class="btn btn-primary mt-md" onclick="showAuthModal()">Entrar no Plano</button>
          </div>
        </div>`;
      return;
    }

    if (this.currentView === 'editor' && this.currentDeck) {
      this.renderEditor();
    } else {
      this.renderMainList();
    }
  },

  renderMainList() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-md);">
        <div class="section-header">
          <div>
            <h1 class="section-title">🃏 Deck Builder & Loja de Decks</h1>
            <p style="font-size:0.8rem;color:var(--text-muted);">Construa com seu fichário de coleção ou adquira decks selados oficiais prontos para jogar.</p>
          </div>
          <div class="flex gap-xs">
            <button class="btn btn-primary btn-sm" onclick="DeckBuilderPage.showCreateModal()">+ Novo Deck</button>
            <button class="btn btn-secondary btn-sm" onclick="DeckBuilderPage.showImportModal()">📥 Importar</button>
          </div>
        </div>

        <div class="tabs">
          <button class="tab ${this.currentView === 'list' ? 'active' : ''}" onclick="DeckBuilderPage.switchMainTab('list')">🃏 Meus Decks</button>
          <button class="tab ${this.currentView === 'starter-store' ? 'active' : ''}" onclick="DeckBuilderPage.switchMainTab('starter-store')">🛒 Decks Prontos Oficiais (Loja)</button>
        </div>

        <div id="deck-tab-content">
          ${this.currentView === 'list'
            ? `<div id="decks-list" class="decks-grid">${CardDisplay.renderSkeleton(4)}</div>`
            : `<div id="starters-list" class="decks-grid">${CardDisplay.renderSkeleton(4)}</div>`
          }
        </div>
      </div>

      <!-- Create Deck Modal -->
      <div id="deck-create-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('deck-create-modal').style.display='none'">✕</button>
          <h2 style="margin-bottom:var(--space-md);">🃏 Criar Novo Deck</h2>
          <form onsubmit="DeckBuilderPage.createDeck(event)">
            <div class="form-group">
              <label>Nome do Deck</label>
              <input type="text" id="new-deck-name" required placeholder="Ex: Mono Red Burn, Dinossauros Naya...">
            </div>
            <div class="form-group">
              <label>Formato de Jogo</label>
              <select id="new-deck-format">
                <option value="standard">Standard (60 cartas)</option>
                <option value="commander">Commander (100 cartas com Comandante)</option>
                <option value="modern">Modern (60 cartas)</option>
                <option value="pioneer">Pioneer (60 cartas)</option>
                <option value="pauper">Pauper (60 cartas apenas comuns)</option>
                <option value="legacy">Legacy (60 cartas)</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Abrir Fichário & Deck</button>
          </form>
        </div>
      </div>

      <!-- Import Deck Modal -->
      <div id="deck-import-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('deck-import-modal').style.display='none'">✕</button>
          <h2 style="margin-bottom:var(--space-md);">📥 Importar Lista de Deck</h2>
          <form onsubmit="DeckBuilderPage.importDeck(event)">
            <div class="form-group">
              <label>Nome</label>
              <input type="text" id="import-deck-name" placeholder="Nome do deck...">
            </div>
            <div class="form-group">
              <label>Formato</label>
              <select id="import-deck-format">
                <option value="standard">Standard</option>
                <option value="commander">Commander</option>
                <option value="modern">Modern</option>
                <option value="pioneer">Pioneer</option>
                <option value="pauper">Pauper</option>
              </select>
            </div>
            <div class="form-group">
              <label>Lista de Cartas (Ex: 4 Lightning Bolt / 1 Sol Ring)</label>
              <textarea id="import-deck-text" rows="8" placeholder="4 Lightning Bolt&#10;4 Counterspell&#10;20 Island" style="font-family:var(--font-mono);font-size:0.85rem;"></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Importar Deck</button>
          </form>
        </div>
      </div>

      <style>
        .decks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-sm); }
        .deck-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: var(--space-md); cursor: pointer; transition: all var(--transition-fast); position: relative; }
        .deck-card:hover { border-color: var(--border-gold); transform: translateY(-2px); box-shadow: var(--shadow-glow-gold); }
        .deck-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
        .deck-card h3 { font-size: 0.95rem; line-height: 1.2; }
      </style>
    `;

    if (this.currentView === 'list') {
      this.loadDecks();
    } else {
      this.loadStarterDecks();
    }
  },

  switchMainTab(view) {
    this.currentView = view;
    this.render();
  },

  async loadDecks() {
    try {
      const decks = await API.getDecks();
      const list = document.getElementById('decks-list');
      if (!list) return;

      if (!decks.length) {
        list.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-state-icon">🃏</div>
            <div class="empty-state-title">Nenhum deck criado ainda</div>
            <p class="empty-state-text">Crie seu primeiro deck com o Fichário da sua coleção ou adquira um deck selado oficial na aba ao lado!</p>
            <div class="flex gap-xs justify-center mt-md">
              <button class="btn btn-primary btn-sm" onclick="DeckBuilderPage.showCreateModal()">+ Criar Novo Deck</button>
              <button class="btn btn-secondary btn-sm" onclick="DeckBuilderPage.switchMainTab('starter-store')">🛒 Ver Decks Prontos</button>
            </div>
          </div>
        `;
        return;
      }

      list.innerHTML = decks.map(d => `
        <div class="deck-card" onclick="DeckBuilderPage.openEditor('${d.id}')">
          <div class="deck-card-header">
            <div>
              <h3>${d.name}</h3>
              <span class="badge badge-${d.format === 'commander' ? 'mythic' : 'rare'}" style="margin-top:2px;">${d.format}</span>
            </div>
            <button class="btn btn-ghost btn-sm" style="padding:2px 6px;" onclick="event.stopPropagation();DeckBuilderPage.deleteDeck('${d.id}','${d.name.replace(/'/g,"\\'")}')">🗑️</button>
          </div>
          <p style="color:var(--text-muted);font-size:0.78rem;margin:4px 0;">
            ${(d.cards || []).reduce((acc, c) => acc + (c.quantity || 1), 0)} cartas no deck
            ${d.commander_id ? ` • 👑 ${d.commander_id}` : ''}
          </p>
          <div style="display:flex;gap:4px;margin-top:6px;">
            <button class="btn btn-primary btn-sm" style="flex:1;">📖 Abrir Fichário & Deck</button>
          </div>
        </div>
      `).join('');
    } catch(e) {
      showToast('Erro ao carregar decks: ' + e.message, 'error');
    }
  },

  async loadStarterDecks() {
    try {
      const response = await fetch('/api/economy/starter-decks');
      const starters = await response.json();
      const list = document.getElementById('starters-list');
      if (!list) return;

      list.innerHTML = starters.map(s => `
        <div class="deck-card" style="border-left: 3px solid var(--mana-gold);">
          <div style="display:flex;gap:8px;align-items:flex-start;">
            <img src="${s.cover_image}" style="width:70px;border-radius:6px;" alt="${s.name}">
            <div style="flex:1;">
              <span class="badge badge-mythic" style="font-size:0.6rem;">${s.category}</span>
              <h3 style="margin:2px 0;">${s.name}</h3>
              <p style="font-size:0.72rem;color:var(--text-muted);">${s.format.toUpperCase()} • ${s.cards.reduce((acc, c) => acc + (c.quantity||1), 0)} cartas</p>
              <div class="mana-cost" style="margin-top:2px;">${ManaSymbols.renderColorIdentity(s.colors)}</div>
            </div>
          </div>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin:8px 0;line-height:1.4;">${s.description}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-subtle);padding-top:6px;margin-top:4px;">
            <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--mana-gold-glow);font-weight:700;">🪙 ${s.price_gold} Gold</span>
            <button class="btn btn-primary btn-sm" onclick="DeckBuilderPage.buyStarterDeck('${s.id}')">🛒 Adquirir Deck</button>
          </div>
        </div>
      `).join('');
    } catch(e) {
      showToast('Erro ao carregar loja de starter decks', 'error');
    }
  },

  async buyStarterDeck(deckId) {
    if (!confirm('Deseja comprar este Starter Deck oficial? Todas as cartas serão adicionadas à sua coleção e o deck ficará pronto para jogar!')) return;
    try {
      showToast('Processando compra do deck selado... ✨', 'info');
      const res = await API.post('/economy/starter-decks/buy', { deck_id: deckId, currency: 'gold' });
      AppState.user.gold = res.balance.gold;
      AppState.user.gems = res.balance.gems;
      updateAuthUI();
      showToast(`🎉 "${res.deck_name}" adquirido! ${res.cards_added} cartas adicionadas à coleção!`, 'success', 3500);
      this.switchMainTab('list');
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  showCreateModal() { document.getElementById('deck-create-modal').style.display = 'flex'; },
  showImportModal() { document.getElementById('deck-import-modal').style.display = 'flex'; },

  async createDeck(e) {
    e.preventDefault();
    const name = document.getElementById('new-deck-name').value;
    const format = document.getElementById('new-deck-format').value;
    try {
      const created = await API.createDeck({ name, format, cards: [] });
      document.getElementById('deck-create-modal').style.display = 'none';
      showToast('Deck criado! Abrindo o Fichário...', 'success');
      this.openEditor(created.id);
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async importDeck(e) {
    e.preventDefault();
    try {
      const data = await API.importDeck(
        document.getElementById('import-deck-text').value,
        document.getElementById('import-deck-name').value,
        document.getElementById('import-deck-format').value
      );
      document.getElementById('deck-import-modal').style.display = 'none';
      showToast(`Deck importado com sucesso! 📥`, 'success');
      this.openEditor(data.id);
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async deleteDeck(id, name) {
    if (!confirm(`Deseja excluir o deck "${name}"?`)) return;
    try {
      await API.deleteDeck(id);
      showToast('Deck excluído', 'info');
      this.loadDecks();
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  // ─── VISUAL BINDER DECK BUILDER ───
  async openEditor(deckId) {
    try {
      this.currentDeck = await API.getDeck(deckId);
      if (!this.currentDeck.cards) this.currentDeck.cards = [];
      this.currentView = 'editor';
      this.binderPage = 1;
      this.render();
      this.loadUserCollectionForBuilder();
    } catch(e) {
      showToast('Erro ao carregar deck: ' + e.message, 'error');
    }
  },

  renderEditor() {
    const deck = this.currentDeck;
    const totalCards = deck.cards.reduce((acc, c) => acc + (c.quantity || 1), 0);
    const targetCount = deck.format === 'commander' ? 100 : 60;

    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-sm);">
        <!-- Top Action Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);flex-wrap:wrap;gap:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="btn btn-ghost btn-sm" onclick="DeckBuilderPage.exitEditor()">← Meus Decks</button>
            <h2 style="font-size:1.1rem;color:var(--text-primary);">${deck.name}</h2>
            <span class="badge badge-${deck.format==='commander'?'mythic':'rare'}">${deck.format}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="DeckBuilderPage.copyExport('${deck.id}')">📋 Copiar Lista</button>
            <button class="btn btn-primary btn-sm" onclick="DeckBuilderPage.saveDeck()">💾 Salvar Deck</button>
          </div>
        </div>

        <!-- 2-Column Split Layout: Binder on Left, Deck Dropzone on Right -->
        <div class="builder-split-layout">
          <!-- LEFT COLUMN: Collector Binder (Fichário) -->
          <div class="builder-column builder-collection-col binder-container">
            <div class="builder-col-header" style="justify-content:space-between;">
              <span style="font-weight:600;color:var(--mana-gold-glow);font-size:0.85rem;">📖 FICHÁRIO DE COLEÇÃO (CLIQUE OU ARRASTE)</span>
              <div class="binder-pagination-header" id="binder-pagination-top"></div>
            </div>

            <!-- Filters Bar -->
            <div style="padding:8px;border-bottom:1px solid var(--border-subtle);background:var(--bg-secondary);">
              <div class="search-bar" style="max-width:100%;margin-bottom:6px;">
                <span class="search-bar-icon">🔍</span>
                <input type="text" id="builder-search-input" placeholder="Buscar no fichário ou Scryfall..." oninput="DeckBuilderPage.onSearchInput(this.value)">
              </div>

              <!-- Color & Type Filters -->
              <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
                <button class="filter-chip mana-W" style="padding:2px 6px;font-size:0.7rem;" onclick="DeckBuilderPage.toggleColorFilter('W', this)">☀️ W</button>
                <button class="filter-chip mana-U" style="padding:2px 6px;font-size:0.7rem;" onclick="DeckBuilderPage.toggleColorFilter('U', this)">💧 U</button>
                <button class="filter-chip mana-B" style="padding:2px 6px;font-size:0.7rem;" onclick="DeckBuilderPage.toggleColorFilter('B', this)">💀 B</button>
                <button class="filter-chip mana-R" style="padding:2px 6px;font-size:0.7rem;" onclick="DeckBuilderPage.toggleColorFilter('R', this)">🔥 R</button>
                <button class="filter-chip mana-G" style="padding:2px 6px;font-size:0.7rem;" onclick="DeckBuilderPage.toggleColorFilter('G', this)">🌲 G</button>
                <button class="filter-chip mana-C" style="padding:2px 6px;font-size:0.7rem;" onclick="DeckBuilderPage.toggleColorFilter('C', this)">◇ Incolor</button>

                <select id="builder-type-filter" class="lang-select" style="font-size:0.72rem;padding:2px 6px;" onchange="DeckBuilderPage.setTypeFilter(this.value)">
                  <option value="all">Todos os Tipos</option>
                  <option value="creature">Criaturas</option>
                  <option value="instant">Instantes</option>
                  <option value="sorcery">Feitiços</option>
                  <option value="enchantment">Encantamentos</option>
                  <option value="artifact">Artefatos</option>
                  <option value="planeswalker">Planeswalkers</option>
                  <option value="land">Terrenos</option>
                </select>
              </div>

              <!-- Quick Basic Lands Add Bar -->
              <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;background:var(--bg-tertiary);padding:4px 8px;border-radius:6px;">
                <span style="font-size:0.68rem;color:var(--text-muted);font-weight:600;">+ TERRENOS:</span>
                <button class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:0.68rem;" onclick="DeckBuilderPage.addBasicLand('Plains')">☀️ Planície</button>
                <button class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:0.68rem;" onclick="DeckBuilderPage.addBasicLand('Island')">💧 Ilha</button>
                <button class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:0.68rem;" onclick="DeckBuilderPage.addBasicLand('Swamp')">💀 Pântano</button>
                <button class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:0.68rem;" onclick="DeckBuilderPage.addBasicLand('Mountain')">🔥 Montanha</button>
                <button class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:0.68rem;" onclick="DeckBuilderPage.addBasicLand('Forest')">🌲 Floresta</button>
              </div>
            </div>

            <!-- 4x3 Binder Grid with Full Sized Cards -->
            <div id="builder-binder-sheet" class="binder-sheet-grid">
              ${CardDisplay.renderSkeleton(8)}
            </div>

            <!-- Binder Footer Navigation -->
            <div class="binder-footer-nav" id="binder-pagination-bottom"></div>
          </div>

          <!-- RIGHT COLUMN: Deck Dropzone & Stats -->
          <div class="builder-column builder-deck-col" id="deck-dropzone"
               ondragover="event.preventDefault(); this.classList.add('drag-over');"
               ondragleave="this.classList.remove('drag-over');"
               ondrop="DeckBuilderPage.handleDropOnDeck(event)">
            <div class="builder-col-header" style="justify-content:space-between;">
              <span style="font-weight:600;color:var(--mana-gold-glow);font-size:0.85rem;">🃏 CARTAS NO DECK (SOLTE AQUI)</span>
              <span id="deck-counter-badge" style="font-family:var(--font-mono);font-size:0.85rem;color:${totalCards >= targetCount ? 'var(--success)' : 'var(--mana-gold-glow)'};font-weight:700;">
                ${totalCards} / ${targetCount} cartas
              </span>
            </div>

            <!-- Mana Curve Chart & Stats -->
            <div class="builder-stats-bar" id="builder-stats-container"></div>

            <!-- Deck Entries List -->
            <div id="builder-deck-list" class="builder-deck-entries"></div>
          </div>
        </div>
      </div>

      <style>
        .builder-split-layout {
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: var(--space-sm);
          height: calc(100vh - 110px);
        }
        .builder-column {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .builder-col-header {
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
        }

        /* Binder Sheet Layout */
        .binder-sheet-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding: 10px;
          overflow-y: auto;
          flex: 1;
          background: radial-gradient(ellipse at center, #18182c 0%, #0d0d18 100%);
        }
        .binder-card-slot {
          background: rgba(25, 25, 45, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 3px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.15s ease, border-color 0.15s ease;
          position: relative;
        }
        .binder-card-slot:hover {
          border-color: var(--mana-gold);
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .binder-card-slot .mtg-card {
          width: 100%;
          aspect-ratio: 63 / 88;
          border-radius: 6px;
          overflow: hidden;
          cursor: grab;
        }
        .binder-card-slot .mtg-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .binder-add-btn {
          margin-top: 3px;
          width: 100%;
          padding: 3px 0;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .binder-footer-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border-top: 1px solid var(--border-subtle);
          font-size: 0.75rem;
        }

        .builder-deck-col.drag-over {
          border: 2px dashed var(--mana-gold-glow);
          background: rgba(212, 160, 23, 0.06);
        }

        .builder-stats-bar {
          background: var(--bg-tertiary);
          padding: 6px 12px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.75rem;
        }
        .mana-curve-container {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 38px;
          margin-top: 4px;
          padding-top: 4px;
        }
        .mana-curve-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          justify-content: flex-end;
        }
        .mana-curve-bar {
          width: 100%;
          background: linear-gradient(180deg, var(--mana-blue-glow), var(--mana-blue));
          border-radius: 2px 2px 0 0;
          min-height: 2px;
          transition: height 0.2s ease;
        }
        .mana-curve-label {
          font-size: 0.62rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-top: 2px;
        }

        .builder-deck-entries {
          flex: 1;
          overflow-y: auto;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .deck-entry-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.8rem;
          cursor: grab;
          transition: background var(--transition-fast);
        }
        .deck-entry-row:hover { background: var(--bg-hover); }
        .deck-entry-name {
          flex: 1;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
        }
        .deck-entry-name:hover { color: var(--mana-gold-glow); }
        .deck-qty-controls {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .deck-qty-btn {
          width: 22px;
          height: 22px;
          border-radius: 3px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .deck-qty-btn:hover { background: var(--mana-gold); color: black; }

        @media (max-width: 900px) {
          .binder-sheet-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 600px) {
          .binder-sheet-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .builder-split-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          .builder-deck-col {
            max-height: 400px;
          }
        }
      </style>
    `;

    this.renderDeckListOnly();
    this.renderStatsOnly();
  },

  async loadUserCollectionForBuilder() {
    try {
      const data = await API.getCollection({ page: 1, limit: 300 });
      this.collectionCards = (data.cards || []).map(c => ({
        id: c.card_id,
        name: c.card_name,
        rarity: c.rarity,
        set_code: c.set_code,
        image_uri: c.image_uri,
        quantity: c.quantity,
        foil: c.foil
      }));
      this.filteredCollection = [...this.collectionCards];
      this.renderBinderSheet();
    } catch(e) {
      console.error('Error loading collection for builder:', e);
    }
  },

  renderBinderSheet() {
    const grid = document.getElementById('builder-binder-sheet');
    const pagTop = document.getElementById('binder-pagination-top');
    const pagBottom = document.getElementById('binder-pagination-bottom');
    if (!grid) return;

    const totalCards = this.filteredCollection.length;
    const totalPages = Math.max(1, Math.ceil(totalCards / this.binderPerPage));
    if (this.binderPage > totalPages) this.binderPage = totalPages;

    const startIndex = (this.binderPage - 1) * this.binderPerPage;
    const pageCards = this.filteredCollection.slice(startIndex, startIndex + this.binderPerPage);

    // Render pagination controls
    const paginationHtml = `
      <button class="btn btn-ghost btn-sm" style="padding:1px 6px;" onclick="DeckBuilderPage.changeBinderPage(-1)" ${this.binderPage <= 1 ? 'disabled' : ''}>◀ Anterior</button>
      <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-secondary);">Página ${this.binderPage} de ${totalPages}</span>
      <button class="btn btn-ghost btn-sm" style="padding:1px 6px;" onclick="DeckBuilderPage.changeBinderPage(1)" ${this.binderPage >= totalPages ? 'disabled' : ''}>Próxima ▶</button>
    `;
    if (pagTop) pagTop.innerHTML = paginationHtml;
    if (pagBottom) pagBottom.innerHTML = paginationHtml;

    if (pageCards.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:30px;">
          <div class="empty-state-icon">📖</div>
          <p class="empty-state-text">Nenhuma carta encontrada nesta página do fichário.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = pageCards.map(c => `
      <div class="binder-card-slot" draggable="true" ondragstart="DeckBuilderPage.handleDragStart(event, '${c.name.replace(/'/g, "\\'")}', '${c.id}', '${c.image_uri}')">
        <div class="mtg-card" onclick="showCardDetail('${c.id}')">
          <img src="${c.image_uri}" alt="${c.name}" loading="lazy">
          <div class="card-foil-overlay"></div>
          ${c.quantity > 1 ? `<span class="card-quantity-badge">×${c.quantity}</span>` : ''}
        </div>
        <button class="btn btn-primary btn-sm binder-add-btn" onclick="DeckBuilderPage.addCardToDeck('${c.name.replace(/'/g, "\\'")}', '${c.id}', '${c.image_uri}')">
          + Adicionar
        </button>
      </div>
    `).join('');
  },

  changeBinderPage(delta) {
    this.binderPage += delta;
    this.renderBinderSheet();
  },

  handleDragStart(event, name, id, imageUri) {
    event.dataTransfer.setData('application/json', JSON.stringify({ name, id, image_uri: imageUri }));
  },

  handleDropOnDeck(event) {
    event.preventDefault();
    document.getElementById('deck-dropzone')?.classList.remove('drag-over');
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      if (data && data.name) {
        this.addCardToDeck(data.name, data.id, data.image_uri);
      }
    } catch(e) {}
  },

  renderDeckListOnly() {
    const container = document.getElementById('builder-deck-list');
    if (!container || !this.currentDeck) return;

    const cards = this.currentDeck.cards || [];

    if (cards.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:20px;">
          <div class="empty-state-icon">🃏</div>
          <p class="empty-state-text">O deck está vazio. Arraste ou clique em <b>"+ Adicionar"</b> nas cartas do Fichário ao lado!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = cards.map((c, index) => `
      <div class="deck-entry-row" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${index}')">
        <span class="deck-entry-name" onclick="DeckBuilderPage.previewCardByName('${c.name.replace(/'/g, "\\'")}')">
          ${c.is_commander ? '👑 ' : ''}<b>${c.name}</b>
        </span>
        <div class="deck-qty-controls">
          <button class="deck-qty-btn" onclick="DeckBuilderPage.changeQuantity(${index}, -1)">−</button>
          <span style="font-family:var(--font-mono);font-size:0.8rem;min-width:18px;text-align:center;">${c.quantity || 1}</span>
          <button class="deck-qty-btn" onclick="DeckBuilderPage.changeQuantity(${index}, 1)">+</button>
          <button class="btn btn-ghost btn-sm" style="padding:0 4px;font-size:0.7rem;color:var(--error);" onclick="DeckBuilderPage.removeCardFromDeck(${index})" title="Remover">✕</button>
        </div>
      </div>
    `).join('');
  },

  renderStatsOnly() {
    const statsContainer = document.getElementById('builder-stats-container');
    const badge = document.getElementById('deck-counter-badge');
    if (!this.currentDeck) return;

    const cards = this.currentDeck.cards || [];
    const totalCount = cards.reduce((acc, c) => acc + (c.quantity || 1), 0);
    const targetCount = this.currentDeck.format === 'commander' ? 100 : 60;

    if (badge) {
      badge.textContent = `${totalCount} / ${targetCount} cartas`;
      badge.style.color = totalCount >= targetCount ? 'var(--success)' : 'var(--mana-gold-glow)';
    }

    if (statsContainer) {
      const cmcCounts = [0, 0, 0, 0, 0, 0, 0];
      cards.forEach(c => {
        const qty = c.quantity || 1;
        const cmc = Math.min(6, c.cmc || (c.name.includes('Land') || c.name.includes('Plains') || c.name.includes('Island') || c.name.includes('Swamp') || c.name.includes('Mountain') || c.name.includes('Forest') ? 0 : 2));
        cmcCounts[cmc] += qty;
      });
      const maxCmc = Math.max(1, ...cmcCounts);

      statsContainer.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>Curva de Mana:</span>
          <span style="color:var(--text-muted);font-size:0.7rem;">Total: <b>${totalCount}</b></span>
        </div>
        <div class="mana-curve-container">
          ${cmcCounts.map((count, cmc) => `
            <div class="mana-curve-bar-col" title="Custo ${cmc === 6 ? '6+' : cmc}: ${count} cartas">
              <div class="mana-curve-bar" style="height:${Math.round((count / maxCmc) * 26)}px;"></div>
              <span class="mana-curve-label">${cmc === 6 ? '6+' : cmc}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
  },

  addCardToDeck(cardName, cardId, imageUri) {
    if (!this.currentDeck) return;
    const cards = this.currentDeck.cards || [];
    const existing = cards.find(c => c.name.toLowerCase() === cardName.toLowerCase());

    const isCommander = this.currentDeck.format === 'commander';
    const maxCopies = (cardName.includes('Plains') || cardName.includes('Island') || cardName.includes('Swamp') || cardName.includes('Mountain') || cardName.includes('Forest')) ? 99 : (isCommander ? 1 : 4);

    if (existing) {
      if (existing.quantity >= maxCopies) {
        showToast(`Limite atingido para ${cardName} (${maxCopies} cópias permitidas no formato)`, 'warning');
        return;
      }
      existing.quantity += 1;
    } else {
      cards.push({
        name: cardName,
        quantity: 1,
        image_uri: imageUri || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`
      });
    }

    this.renderDeckListOnly();
    this.renderStatsOnly();
    showToast(`+1 ${cardName} adicionado!`, 'info', 800);
  },

  addBasicLand(landName) {
    this.addCardToDeck(landName, `land-${landName.toLowerCase()}`, `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(landName)}&format=image&version=normal`);
  },

  changeQuantity(index, delta) {
    if (!this.currentDeck || !this.currentDeck.cards[index]) return;
    const card = this.currentDeck.cards[index];
    card.quantity = (card.quantity || 1) + delta;

    if (card.quantity <= 0) {
      this.currentDeck.cards.splice(index, 1);
    }

    this.renderDeckListOnly();
    this.renderStatsOnly();
  },

  removeCardFromDeck(index) {
    if (!this.currentDeck) return;
    this.currentDeck.cards.splice(index, 1);
    this.renderDeckListOnly();
    this.renderStatsOnly();
  },

  async previewCardByName(name) {
    try {
      const card = await API.getCardByName(name, true);
      if (card) showCardDetail(card.id);
    } catch(e) {}
  },

  onSearchInput(value) {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(async () => {
      this.binderPage = 1;
      this.applyFilters(value);
    }, 200);
  },

  applyFilters(queryParam) {
    const input = document.getElementById('builder-search-input');
    const query = (queryParam !== undefined ? queryParam : (input ? input.value : '')).trim().toLowerCase();

    let list = [...this.collectionCards];

    if (query) {
      list = list.filter(c => c.name.toLowerCase().includes(query));
    }

    if (this.typeFilter && this.typeFilter !== 'all') {
      list = list.filter(c => (c.type_line || '').toLowerCase().includes(this.typeFilter.toLowerCase()));
    }

    this.filteredCollection = list;

    if (this.filteredCollection.length === 0 && query.length >= 2) {
      API.searchCards(query).then(sfData => {
        this.filteredCollection = (sfData.data || []).map(c => ({
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          image_uri: CardDisplay.getImageUri(c, 'normal'),
          quantity: 0
        }));
        this.renderBinderSheet();
      }).catch(() => {});
    }

    this.renderBinderSheet();
  },

  toggleColorFilter(color, btn) {
    btn.classList.toggle('active');
    if (this.colorFilters.has(color)) this.colorFilters.delete(color);
    else this.colorFilters.add(color);
    this.binderPage = 1;
    this.applyFilters();
  },

  setTypeFilter(type) {
    this.typeFilter = type;
    this.binderPage = 1;
    this.applyFilters();
  },

  async saveDeck() {
    if (!this.currentDeck) return;
    try {
      await API.updateDeck(this.currentDeck.id, {
        name: this.currentDeck.name,
        format: this.currentDeck.format,
        cards: this.currentDeck.cards
      });
      showToast('Deck salvo com sucesso! 💾', 'success');
    } catch(e) {
      showToast('Erro ao salvar deck: ' + e.message, 'error');
    }
  },

  exitEditor() {
    this.currentView = 'list';
    this.currentDeck = null;
    this.render();
  },

  async copyExport(deckId) {
    try {
      const data = await API.exportDeck(deckId);
      if (data && data.text) {
        navigator.clipboard.writeText(data.text);
        showToast('Lista de cartas copiada para a área de transferência! 📋', 'success');
      }
    } catch(e) {
      showToast('Erro ao exportar deck', 'error');
    }
  }
};
