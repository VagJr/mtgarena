/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Collection Page
   ═══════════════════════════════════════════════════════════════ */
const CollectionPage = {
  async render() {
    if (!AppState.user) {
      document.getElementById('app').innerHTML = `<div class="container page-enter" style="padding-top:80px;text-align:center;">
        <div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-title">Login Necessário</div>
        <p class="empty-state-text">Faça login para acessar sua coleção.</p>
        <button class="btn btn-primary mt-lg" onclick="showAuthModal()">Entrar</button></div></div>`;
      return;
    }
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);">
        <div class="section-header">
          <h1 class="section-title">📚 Minha Coleção</h1>
          <div id="collection-stats-mini" class="flex gap-md"></div>
        </div>
        <div class="search-bar" style="margin-bottom:var(--space-lg);max-width:100%;">
          <span class="search-bar-icon">🔍</span>
          <input type="text" id="collection-search" placeholder="Buscar na coleção..." oninput="CollectionPage.filter(this.value)">
        </div>
        <div class="filter-bar">
          <button class="filter-chip active" onclick="CollectionPage.filterRarity('', this)">Todas</button>
          <button class="filter-chip" onclick="CollectionPage.filterRarity('mythic', this)">🟠 Mythic</button>
          <button class="filter-chip" onclick="CollectionPage.filterRarity('rare', this)">🟡 Rare</button>
          <button class="filter-chip" onclick="CollectionPage.filterRarity('uncommon', this)">⚪ Uncommon</button>
          <button class="filter-chip" onclick="CollectionPage.filterRarity('common', this)">⚫ Common</button>
        </div>
        <div id="collection-grid" class="card-grid">${CardDisplay.renderSkeleton(12)}</div>
        <div id="collection-pagination" style="text-align:center;padding:var(--space-xl);"></div>
      </div>`;
    this.loadCollection();
    this.loadStats();
  },
  currentPage: 1, searchTerm: '', rarityFilter: '',
  async loadCollection() {
    try {
      const params = { page: this.currentPage, limit: 50 };
      if (this.searchTerm) params.search = this.searchTerm;
      if (this.rarityFilter) params.rarity = this.rarityFilter;
      const data = await API.getCollection(params);
      const grid = document.getElementById('collection-grid');
      if (!data.cards || data.cards.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">📭</div><div class="empty-state-title">Coleção vazia</div><p class="empty-state-text">Abra boosters ou busque cartas para começar!</p><button class="btn btn-primary mt-lg" onclick="navigateTo('/boosters')">✨ Abrir Booster</button></div>`;
        return;
      }
      grid.innerHTML = data.cards.map(c => CardDisplay.render({
        id: c.card_id, name: c.card_name, rarity: c.rarity,
        image_uris: { normal: c.image_uri, small: c.image_uri }, foil: c.foil
      }, { showQuantity: true, quantity: c.quantity })).join('');
      const pag = document.getElementById('collection-pagination');
      pag.innerHTML = data.pages > 1 ? `<span class="text-muted">Página ${data.page} de ${data.pages}</span>
        ${data.page > 1 ? `<button class="btn btn-ghost btn-sm" onclick="CollectionPage.goPage(${data.page-1})">← Anterior</button>` : ''}
        ${data.page < data.pages ? `<button class="btn btn-ghost btn-sm" onclick="CollectionPage.goPage(${data.page+1})">Próxima →</button>` : ''}` : '';
    } catch(e) { showToast('Erro: '+e.message,'error'); }
  },
  async loadStats() {
    try {
      const s = await API.getCollectionStats();
      document.getElementById('collection-stats-mini').innerHTML =
        `<span class="badge" style="background:var(--bg-tertiary);color:var(--text-secondary);">📦 ${s.unique_cards} únicas</span>
         <span class="badge" style="background:var(--bg-tertiary);color:var(--text-secondary);">🃏 ${s.total_cards} total</span>`;
    } catch(e) {}
  },
  filter(term) {
    clearTimeout(this._ft);
    this._ft = setTimeout(() => { this.searchTerm = term; this.currentPage = 1; this.loadCollection(); }, 300);
  },
  filterRarity(r, el) {
    document.querySelectorAll('.filter-bar .filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    this.rarityFilter = r; this.currentPage = 1; this.loadCollection();
  },
  goPage(p) { this.currentPage = p; this.loadCollection(); }
};
