/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Customization Shop Page
   Buy skins, card backs, board skins, life counters, emotes
   ═══════════════════════════════════════════════════════════════ */

const CustomizationPage = {
  currentFilter: 'all',

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container page-enter" style="padding-top:80px;padding-bottom:40px;">
        <div class="page-header">
          <h1 class="page-title">🎨 Loja de Customização</h1>
          <p class="page-subtitle">Personalize sua experiência de jogo</p>
        </div>

        <div class="shop-tabs" style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm shop-filter active" data-filter="all" onclick="CustomizationPage.filter('all')">Todos</button>
          <button class="btn btn-ghost btn-sm shop-filter" data-filter="card_back" onclick="CustomizationPage.filter('card_back')">🃏 Volta</button>
          <button class="btn btn-ghost btn-sm shop-filter" data-filter="board_skin" onclick="CustomizationPage.filter('board_skin')">🎲 Mesa</button>
          <button class="btn btn-ghost btn-sm shop-filter" data-filter="life_counter" onclick="CustomizationPage.filter('life_counter')">❤️ Vida</button>
          <button class="btn btn-ghost btn-sm shop-filter" data-filter="avatar_frame" onclick="CustomizationPage.filter('avatar_frame')">👤 Avatar</button>
          <button class="btn btn-ghost btn-sm shop-filter" data-filter="emote" onclick="CustomizationPage.filter('emote')">💬 Emotes</button>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:20px;">
          <button class="btn btn-ghost btn-sm" onclick="CustomizationPage.showMyItems()" id="my-items-btn">📦 Meus Itens</button>
          <button class="btn btn-ghost btn-sm" onclick="CustomizationPage.showVault()" id="vault-btn">🔮 Po de Artesão</button>
        </div>

        <div id="shop-content">
          <div class="loading-state" style="text-align:center;padding:40px;">
            <div class="loading-bar" style="width:200px;margin:0 auto;"><div class="loading-bar-fill"></div></div>
          </div>
        </div>
      </div>
    `;
    this.loadShop();
  },

  async filter(type) {
    this.currentFilter = type;
    document.querySelectorAll('.shop-filter').forEach(f => {
      f.classList.toggle('active', f.dataset.filter === type);
      f.className = f.classList.contains('active') ? 'btn btn-primary btn-sm shop-filter active' : 'btn btn-ghost btn-sm shop-filter';
    });
    this.loadShop();
  },

  async loadShop() {
    const container = document.getElementById('shop-content');
    if (!container) return;

    try {
      const params = this.currentFilter !== 'all' ? { type: this.currentFilter } : {};
      const items = await API.getCustomizationShop(params);
      const myItems = AppState.user ? await API.getMyCustomizations() : [];
      const ownedIds = new Set(myItems.map(i => i.id));

      if (items.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center;padding:40px;"><p style="color:var(--text-muted);">Nenhum item disponível</p></div>';
        return;
      }

      container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;">
          ${items.map(item => this.renderItem(item, ownedIds.has(item.id))).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Erro: ${err.message}</div>`;
    }
  },

  renderItem(item, owned) {
    const rarityColors = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', mythic: '#ff9800' };
    const rarityLabels = { common: 'Comum', uncommon: 'Incomum', rare: 'Raro', mythic: 'Mítico' };
    const typeLabels = { card_back: '🃏 Volta', board_skin: '🎲 Mesa', life_counter: '❤️ Vida', avatar_frame: '👤 Avatar', emote: '💬 Emote' };
    const rc = rarityColors[item.rarity] || '#9e9e9e';

    const cssData = item.css_data || {};
    let previewStyle = '';
    if (item.item_type === 'card_back' || item.item_type === 'avatar_frame') {
      previewStyle = `border:${cssData.border || '2px solid #555'};${cssData.glow ? `box-shadow:${cssData.glow};` : ''}width:60px;height:84px;border-radius:6px;background:var(--surface-card);`;
    } else if (item.item_type === 'board_skin') {
      previewStyle = `background:${cssData.bg || '#2a2a3a'};width:100%;height:40px;border-radius:8px;`;
    } else if (item.item_type === 'life_counter') {
      previewStyle = `font-family:${cssData.font || 'Inter'};color:${cssData.color || '#D4A017'};${cssData.glow ? `text-shadow:${cssData.glow};` : ''}font-size:1.5rem;font-weight:700;display:flex;align-items:center;justify-content:center;height:60px;`;
    } else {
      previewStyle = `font-size:1.2rem;display:flex;align-items:center;justify-content:center;height:60px;color:${cssData.color || 'var(--text-primary)'};`;
    }

    return `
      <div class="shop-item" style="background:var(--surface-card);border:1px solid var(--border-subtle);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;transition:all 0.2s;${owned ? 'opacity:0.7;' : ''}">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="${previewStyle}">${item.item_type === 'emote' ? (cssData.text || '💬') : ''}</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              <h3 style="margin:0;font-size:0.9rem;color:var(--text-primary);">${item.name}</h3>
              <span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:${rc}22;color:${rc};text-transform:uppercase;font-weight:600;">${rarityLabels[item.rarity]}</span>
            </div>
            <p style="margin:4px 0 0;font-size:0.75rem;color:var(--text-secondary);">${item.description}</p>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">${typeLabels[item.item_type] || item.item_type}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;gap:8px;">
            ${item.price_gold > 0 ? `<span style="font-size:0.8rem;color:var(--mana-gold-glow);">🪙 ${item.price_gold}</span>` : '<span style="font-size:0.75rem;color:var(--accent-success);">Grátis</span>'}
            ${item.price_gems > 0 ? `<span style="font-size:0.8rem;color:var(--mana-blue);">💎 ${item.price_gems}</span>` : ''}
          </div>
          ${owned ?
            `<button class="btn btn-ghost btn-sm" onclick="CustomizationPage.equip('${item.id}')">Equipar</button>` :
            `<button class="btn btn-primary btn-sm" onclick="CustomizationPage.buy('${item.id}')">Comprar</button>`
          }
        </div>
      </div>
    `;
  },

  async buy(itemId) {
    if (!AppState.user) return showToast('Faça login para comprar', 'error');
    try {
      const result = await API.buyCustomization(itemId);
      showToast(`${result.item.name} comprado!`, 'success');
      AppState.user.gold = result.balance.gold;
      AppState.user.gems = result.balance.gems;
      AppState.user.xp = result.balance.xp;
      updateAuthUI();
      this.loadShop();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async equip(itemId) {
    try {
      await API.equipCustomization(itemId, true);
      showToast('Item equipado!', 'success');
      this.loadShop();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async showMyItems() {
    const container = document.getElementById('shop-content');
    if (!container) return;

    try {
      const items = await API.getMyCustomizations();
      if (items.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center;padding:40px;"><p style="color:var(--text-muted);">Você não possui nenhum item ainda</p></div>';
        return;
      }

      container.innerHTML = `
        <h3 style="color:var(--text-primary);margin-bottom:16px;">📦 Meus Itens</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;">
          ${items.map(item => `
            <div style="background:var(--surface-card);border:1px solid ${item.equipped ? 'var(--accent-primary)' : 'var(--border-subtle)'};border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;">
              <div style="flex:1;">
                <div style="font-size:0.9rem;color:var(--text-primary);font-weight:500;">${item.name}</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);">${item.description}</div>
              </div>
              <button class="btn ${item.equipped ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="CustomizationPage.equip('${item.id}')">
                ${item.equipped ? 'Equipado' : 'Equipar'}
              </button>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Erro: ${err.message}</div>`;
    }
  },

  async showVault() {
    const container = document.getElementById('shop-content');
    if (!container) return;

    try {
      const vault = await API.getVault();
      container.innerHTML = `
        <div style="background:var(--surface-card);border:1px solid var(--border-subtle);border-radius:16px;padding:24px;max-width:500px;">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 16px;">🔮 Po de Artesão</h3>
          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:2.5rem;font-weight:700;color:var(--mana-gold-glow);">${vault.dust}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Po disponível</div>
          </div>
          <h4 style="color:var(--text-primary);margin-bottom:12px;">Wildcards</h4>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;">
            ${['common','uncommon','rare','mythic'].map(r => {
              const colors = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', mythic: '#ff9800' };
              return `
                <div style="text-align:center;padding:12px;background:var(--surface-elevated);border-radius:8px;">
                  <div style="font-size:1.5rem;font-weight:700;color:${colors[r]};">${vault.wildcards[r] || 0}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);text-transform:capitalize;">${r}</div>
                </div>`;
            }).join('')}
          </div>
          <h4 style="color:var(--text-primary);margin-bottom:12px;">Crafting</h4>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--surface-elevated);border-radius:8px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">5 Comum → 1 Incomum</span>
              <button class="btn btn-ghost btn-sm" onclick="CustomizationPage.craft('common','uncommon')">Craft</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--surface-elevated);border-radius:8px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">3 Incomum + 20 po → 1 Raro</span>
              <button class="btn btn-ghost btn-sm" onclick="CustomizationPage.craft('uncommon','rare')">Craft</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--surface-elevated);border-radius:8px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">4 Raro + 50 po → 1 Mítico</span>
              <button class="btn btn-ghost btn-sm" onclick="CustomizationPage.craft('rare','mythic')">Craft</button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Erro: ${err.message}</div>`;
    }
  },

  async craft(from, to) {
    try {
      const result = await API.craftWildcard(from, to);
      showToast(`Crafted ${result.crafted.quantity}x ${result.crafted.rarity} wildcard!`, 'success');
      this.showVault();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
