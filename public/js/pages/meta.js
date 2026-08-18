/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Meta Tracker Page
   ═══════════════════════════════════════════════════════════════ */
const MetaPage = {
  async render() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);">
        <div class="section-header"><h1 class="section-title">📊 Meta Tracker</h1></div>
        <div class="tabs">
          <button class="tab active" onclick="MetaPage.showTab('standard',this)">Standard</button>
          <button class="tab" onclick="MetaPage.showTab('modern',this)">Modern</button>
          <button class="tab" onclick="MetaPage.showTab('pioneer',this)">Pioneer</button>
          <button class="tab" onclick="MetaPage.showTab('commander',this)">Commander</button>
          <button class="tab" onclick="MetaPage.showTab('legacy',this)">Legacy</button>
          <button class="tab" onclick="MetaPage.showTab('pauper',this)">Pauper</button>
        </div>
        <div id="meta-content"></div>
      </div>`;
    this.showTab('standard', document.querySelector('.tab.active'));
  },

  async showTab(format, el) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');

    const content = document.getElementById('meta-content');
    content.innerHTML = `
      <div class="panel mt-lg">
        <h2 style="margin-bottom:var(--space-lg);">🏆 Top Archetypes — ${format.charAt(0).toUpperCase()+format.slice(1)}</h2>
        <p style="color:var(--text-muted);margin-bottom:var(--space-lg);">Powered by Scryfall API data. Busque cartas populares por formato.</p>
        <div id="meta-cards" class="card-grid">${CardDisplay.renderSkeleton(8)}</div>
      </div>`;

    try {
      const data = await API.searchCards(`format:${format} order:edhrec`, 1);
      document.getElementById('meta-cards').innerHTML = (data.data || []).slice(0, 20).map(c => CardDisplay.render(c)).join('');
    } catch(e) {
      document.getElementById('meta-cards').innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">📊</div><p class="empty-state-text">Erro ao carregar dados do meta.</p></div>`;
    }
  }
};
