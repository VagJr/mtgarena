/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Personal Binders & Card Skins
   Organize, customize, and showcase your collection
   ═══════════════════════════════════════════════════════════════ */

const BindersPage = {
  async render() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);padding-bottom:80px;">
        <div class="section-header">
          <h1 class="section-title">📖 Meus Fichários</h1>
          <button class="btn btn-primary btn-sm" onclick="BindersPage.showCreateBinder()">+ Novo Fichário</button>
        </div>

        <div class="tabs" style="margin-bottom:var(--space-md);">
          <button class="tab active" onclick="BindersPage.switchTab('binders',this)">📖 Fichários</button>
          <button class="tab" onclick="BindersPage.switchTab('skins',this)">🎨 Skins</button>
          <button class="tab" onclick="BindersPage.switchTab('showcases',this)">🏛️ Vitrines</button>
        </div>

        <div id="binders-tab-content"></div>
      </div>

      <style>
        .binder-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:var(--space-md); }
        .binder-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:var(--space-lg); cursor:pointer; transition:all var(--transition-normal); position:relative; overflow:hidden; }
        .binder-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-xl); }
        .binder-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; border-radius:var(--radius-lg) var(--radius-lg) 0 0; }
        .binder-icon { font-size:2.5rem; margin-bottom:var(--space-sm); }
        .binder-count { font-size:0.8rem; color:var(--text-muted); }
        .skin-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:var(--space-md); text-align:center; transition:all var(--transition-normal); cursor:pointer; }
        .skin-card:hover { border-color:var(--mana-gold); transform:translateY(-2px); }
        .skin-preview { width:80px; height:112px; border-radius:6px; margin:0 auto var(--space-sm); position:relative; overflow:hidden; background:var(--bg-tertiary); border:2px solid var(--border-subtle); }
        .skin-preview-overlay { position:absolute; inset:0; pointer-events:none; }
        .showcase-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:var(--space-lg); transition:all var(--transition-normal); }
        .showcase-card:hover { border-color:var(--border-gold); }
        .create-binder-modal .form-group input, .create-binder-modal .form-group select { background:var(--bg-tertiary); }
        .color-picker-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
        .color-dot { width:28px; height:28px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all var(--transition-fast); }
        .color-dot.selected { border-color:white; transform:scale(1.15); }
      </style>`;

    this.loadTab('binders');
  },

  switchTab(tab, el) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    this.loadTab(tab);
  },

  async loadTab(tab) {
    const el = document.getElementById('binders-tab-content');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    if (!AppState.user) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-title">Login Necessário</div></div>';
      return;
    }

    switch (tab) {
      case 'binders': return this.renderBinders(el);
      case 'skins': return this.renderSkins(el);
      case 'showcases': return this.renderShowcases(el);
    }
  },

  async renderBinders(el) {
    try {
      const data = await API.getMyBinders();
      const binders = data.binders || [];

      el.innerHTML = `
        <div class="binder-grid">
          ${binders.map(b => `
            <div class="binder-card" style="border-left:3px solid ${b.color || '#D4A017'};" onclick="BindersPage.openBinder('${b.id}')">
              <div class="binder-icon">${b.icon || '📖'}</div>
              <div style="font-weight:700;margin-bottom:4px;">${b.name}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:var(--space-sm);">${b.description || ''}</div>
              <div class="binder-count">${b.card_count || 0} cartas</div>
              <div style="position:absolute;top:var(--space-sm);right:var(--space-sm);">
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();BindersPage.deleteBinder('${b.id}')" style="padding:2px 6px;font-size:0.7rem;">🗑️</button>
              </div>
            </div>
          `).join('')}
          <div class="binder-card" style="border:2px dashed var(--border-default);display:flex;align-items:center;justify-content:center;min-height:160px;" onclick="BindersPage.showCreateBinder()">
            <div style="text-align:center;color:var(--text-muted);">
              <div style="font-size:2rem;">+</div>
              <div>Novo Fichário</div>
            </div>
          </div>
        </div>`;
    } catch (err) {
      el.innerHTML = '<div class="empty-state"><p>Erro ao carregar fichários</p></div>';
    }
  },

  async renderSkins(el) {
    try {
      const [allSkins, mySkins] = await Promise.all([API.getCardSkins(), API.getMySkins()]);
      const owned = (mySkins.skins || []).map(s => s.skin_id);

      el.innerHTML = `
        <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:var(--space-lg);">Personalize suas cartas com efeitos visuais únicos! Aplique skins para deixar sua coleção ainda mais especial.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-md);">
          ${(allSkins.skins || []).map(s => {
            const isOwned = owned.includes(s.id);
            return `
              <div class="skin-card" onclick="${isOwned ? `BindersPage.equipSkin('${s.id}')` : `BindersPage.buySkin('${s.id}')`}">
                <div class="skin-preview" style="background:${s.css_effect};">
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🃏</div>
                </div>
                <div style="font-weight:600;font-size:0.85rem;margin-bottom:2px;">${s.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-xs);">${s.description}</div>
                <div style="font-size:0.7rem;text-transform:uppercase;color:${s.rarity === 'mythic' ? '#ff8000' : s.rarity === 'rare' ? '#0070dd' : '#1eff00'};">${s.rarity}</div>
                ${isOwned
                  ? '<div style="color:#00c853;font-size:0.75rem;margin-top:4px;">✅ Possuída</div>'
                  : `<div style="margin-top:4px;"><span style="font-size:0.8rem;">🪙 ${s.price_gold}</span> <span style="font-size:0.7rem;color:var(--text-muted);">+ 💎 ${s.price_gems}</span></div>`
                }
              </div>`;
          }).join('')}
        </div>`;
    } catch (err) {
      el.innerHTML = '<div class="empty-state"><p>Erro ao carregar skins</p></div>';
    }
  },

  async renderShowcases(el) {
    try {
      const data = await API.getMyShowcases();
      const showcases = data.showcases || [];

      el.innerHTML = `
        <div style="display:flex;gap:var(--space-md);flex-wrap:wrap;">
          ${showcases.map(s => `
            <div class="showcase-card" style="flex:1;min-width:280px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
                <h3 style="margin:0;">${s.name}</h3>
                <span style="font-size:0.75rem;color:var(--text-muted);">${s.is_public ? '🌍 Pública' : '🔒 Privada'}</span>
              </div>
              <p style="font-size:0.85rem;color:var(--text-muted);">${s.description || ''}</p>
              <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-sm);font-size:0.8rem;color:var(--text-muted);">
                <span>👁 ${s.views || 0}</span>
                <span>❤️ ${s.likes || 0}</span>
              </div>
            </div>
          `).join('')}
          <div class="showcase-card" style="flex:1;min-width:280px;border:2px dashed var(--border-default);display:flex;align-items:center;justify-content:center;min-height:120px;cursor:pointer;" onclick="BindersPage.createShowcase()">
            <div style="text-align:center;color:var(--text-muted);">+ Criar Vitrine</div>
          </div>
        </div>`;
    } catch (err) {
      el.innerHTML = '<div class="empty-state"><p>Erro ao carregar vitrines</p></div>';
    }
  },

  showCreateBinder() {
    const existing = document.getElementById('create-binder-modal');
    if (existing) existing.remove();

    const colors = ['#D4A017', '#FF4500', '#00BFFF', '#00C853', '#800080', '#FF69B4', '#1A73E8', '#FF8C00'];
    const icons = ['📖', '⭐', '💎', '🔥', '❄️', '🌿', '💀', '⚔️', '🛡️', '🎭', '🏆', '🎵'];

    const modal = document.createElement('div');
    modal.id = 'create-binder-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal create-binder-modal" style="max-width:400px;">
        <button class="modal-close" onclick="document.getElementById('create-binder-modal').remove()">✕</button>
        <h2 style="margin-bottom:var(--space-lg);">📖 Novo Fichário</h2>
        <div class="form-group">
          <label>Nome</label>
          <input type="text" id="binder-name" placeholder="Ex: Minha Coleção Rara" value="Novo Fichário">
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <input type="text" id="binder-desc" placeholder="O que este fichário guarda?">
        </div>
        <div class="form-group">
          <label>Ícone</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${icons.map(i => `<span class="color-dot" style="background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:1.2rem;cursor:pointer;" onclick="document.querySelectorAll('.icon-dot').forEach(d=>d.classList.remove('selected'));this.classList.add('selected');document.getElementById('binder-icon').value='${i}'" data-icon="${i}">${i}</span>`).join('')}
          </div>
          <input type="hidden" id="binder-icon" value="📖">
        </div>
        <div class="form-group">
          <label>Cor</label>
          <div class="color-picker-row">
            ${colors.map((c, i) => `<div class="color-dot ${i===0?'selected':''}" style="background:${c};" onclick="document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('selected'));this.classList.add('selected');document.getElementById('binder-color').value='${c}'"></div>`).join('')}
          </div>
          <input type="hidden" id="binder-color" value="#D4A017">
        </div>
        <button class="btn btn-primary btn-full" onclick="BindersPage.createBinder()">Criar Fichário</button>
      </div>`;
    document.body.appendChild(modal);
  },

  async createBinder() {
    const name = document.getElementById('binder-name')?.value || 'Novo Fichário';
    const desc = document.getElementById('binder-desc')?.value || '';
    const color = document.getElementById('binder-color')?.value || '#D4A017';
    const icon = document.getElementById('binder-icon')?.value || '📖';

    try {
      await API.createBinder({ name, description: desc, color, icon });
      document.getElementById('create-binder-modal')?.remove();
      showToast('Fichário criado! 📖', 'success');
      this.loadTab('binders');
    } catch (err) {
      showToast('Erro ao criar fichário', 'error');
    }
  },

  async deleteBinder(id) {
    if (!confirm('Remover este fichário e todas as cartas?')) return;
    try {
      await API.deleteBinder(id);
      showToast('Fichário removido', 'info');
      this.loadTab('binders');
    } catch (err) {
      showToast('Erro ao remover', 'error');
    }
  },

  async openBinder(id) {
    showToast('Abrindo fichário... 📖', 'info');
  },

  async buySkin(skinId) {
    try {
      const result = await API.buyCardSkin(skinId);
      showToast(result.message || 'Skin comprada!', 'success');
      this.loadTab('skins');
    } catch (err) {
      showToast(err.message || 'Erro ao comprar skin', 'error');
    }
  },

  async equipSkin(skinId) {
    try {
      await API.equipSkin(skinId);
      showToast('Skin equipada! 🎨', 'success');
    } catch (err) {
      showToast('Erro ao equipar', 'error');
    }
  },

  async createShowcase() {
    try {
      const result = await API.createShowcase({ name: 'Minha Vitrine', description: 'Cartas que eu amo!' });
      showToast('Vitrine criada! 🏛️', 'success');
      this.loadTab('showcases');
    } catch (err) {
      showToast('Erro ao criar vitrine', 'error');
    }
  }
};
