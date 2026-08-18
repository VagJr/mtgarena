/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Search Page
   ═══════════════════════════════════════════════════════════════ */

const SearchPage = {
  searchTimeout: null,
  currentResults: [],
  currentPage: 1,
  hasMore: false,
  currentQuery: '',

  async render() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);">
        <div class="section-header">
          <h1 class="section-title">🔍 Buscar Cartas</h1>
        </div>

        <div class="search-bar" style="margin-bottom:var(--space-lg);">
          <span class="search-bar-icon">🔍</span>
          <input type="text" id="card-search-input" placeholder="Busque qualquer carta do Magic..."
                 oninput="SearchPage.onInput(this.value)" autocomplete="off">
          <div id="autocomplete-dropdown" class="autocomplete-dropdown" style="display:none;"></div>
        </div>

        <div class="filter-bar" id="search-filters">
          <button class="filter-chip active" onclick="SearchPage.setFilter('', this)">Todas</button>
          <button class="filter-chip" onclick="SearchPage.setFilter('type:creature', this)">🐉 Criaturas</button>
          <button class="filter-chip" onclick="SearchPage.setFilter('type:instant', this)">⚡ Instantes</button>
          <button class="filter-chip" onclick="SearchPage.setFilter('type:sorcery', this)">🌀 Feitiços</button>
          <button class="filter-chip" onclick="SearchPage.setFilter('type:enchantment', this)">✨ Encantamentos</button>
          <button class="filter-chip" onclick="SearchPage.setFilter('type:artifact', this)">⚙️ Artefatos</button>
          <button class="filter-chip" onclick="SearchPage.setFilter('type:planeswalker', this)">👤 Planeswalkers</button>
          <button class="filter-chip" onclick="SearchPage.setFilter('type:land', this)">🏔️ Terrenos</button>
        </div>

        <div id="search-results" class="card-grid">
          <div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-state-icon">🔮</div>
            <div class="empty-state-title">Explore o Multiverso</div>
            <p class="empty-state-text">Digite o nome de uma carta, tipo, ou use a sintaxe Scryfall para buscar.</p>
          </div>
        </div>

        <div id="search-load-more" style="text-align:center;padding:var(--space-xl);display:none;">
          <button class="btn btn-secondary" onclick="SearchPage.loadMore()">Carregar Mais</button>
        </div>
      </div>

      <style>
        .autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          max-height: 300px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: var(--shadow-lg);
        }
        .autocomplete-item {
          padding: 10px 16px;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--text-secondary);
          transition: background var(--transition-fast);
          border-bottom: 1px solid var(--border-subtle);
        }
        .autocomplete-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .autocomplete-item:last-child { border-bottom: none; }
        .search-result-count {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-bottom: var(--space-md);
        }
      </style>
    `;
  },

  typeFilter: '',

  setFilter(filter, el) {
    document.querySelectorAll('#search-filters .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this.typeFilter = filter;
    const input = document.getElementById('card-search-input');
    if (input.value) this.search(input.value);
  },

  onInput(value) {
    clearTimeout(this.searchTimeout);
    if (value.length < 2) {
      document.getElementById('autocomplete-dropdown').style.display = 'none';
      return;
    }
    this.searchTimeout = setTimeout(() => this.showAutocomplete(value), 200);
  },

  async showAutocomplete(query) {
    try {
      const data = await API.autocomplete(query);
      const dropdown = document.getElementById('autocomplete-dropdown');
      if (data.data && data.data.length > 0) {
        dropdown.innerHTML = data.data.slice(0, 8).map(name =>
          `<div class="autocomplete-item" onclick="SearchPage.selectCard('${name.replace(/'/g, "\\'")}')">${name}</div>`
        ).join('') + `<div class="autocomplete-item" style="color:var(--mana-gold-glow);" onclick="SearchPage.search('${query.replace(/'/g, "\\'")}')">🔍 Buscar "${query}"</div>`;
        dropdown.style.display = 'block';
      } else {
        dropdown.style.display = 'none';
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  },

  selectCard(name) {
    document.getElementById('card-search-input').value = name;
    document.getElementById('autocomplete-dropdown').style.display = 'none';
    this.search(name);
  },

  async search(query) {
    document.getElementById('autocomplete-dropdown').style.display = 'none';
    this.currentQuery = query;
    this.currentPage = 1;

    const fullQuery = this.typeFilter ? `${query} ${this.typeFilter}` : query;

    const results = document.getElementById('search-results');
    results.innerHTML = CardDisplay.renderSkeleton(12);

    try {
      const data = await API.searchCards(fullQuery, 1);
      this.currentResults = data.data || [];
      this.hasMore = data.has_more || false;

      if (this.currentResults.length === 0) {
        results.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-state-icon">🤷</div>
            <div class="empty-state-title">Nenhuma carta encontrada</div>
            <p class="empty-state-text">Tente outro termo de busca.</p>
          </div>`;
        return;
      }

      results.innerHTML = `<p class="search-result-count" style="grid-column:1/-1;">~${data.total_cards || this.currentResults.length} resultados</p>` +
        this.currentResults.map(card => CardDisplay.render(card)).join('');

      document.getElementById('search-load-more').style.display = this.hasMore ? 'block' : 'none';
    } catch (err) {
      results.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-title">Erro na busca</div>
          <p class="empty-state-text">${err.message}</p>
        </div>`;
    }
  },

  async loadMore() {
    if (!this.hasMore) return;
    this.currentPage++;
    const fullQuery = this.typeFilter ? `${this.currentQuery} ${this.typeFilter}` : this.currentQuery;

    try {
      const data = await API.searchCards(fullQuery, this.currentPage);
      const newCards = data.data || [];
      this.hasMore = data.has_more || false;
      this.currentResults.push(...newCards);

      const results = document.getElementById('search-results');
      const loadMoreBtn = document.getElementById('search-load-more');

      newCards.forEach(card => {
        results.insertAdjacentHTML('beforeend', CardDisplay.render(card));
      });

      loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
    } catch (err) {
      showToast('Erro ao carregar mais: ' + err.message, 'error');
    }
  }
};
