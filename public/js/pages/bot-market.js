/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Bot Market & Economy Hub
   Where AI NPCs trade and the market comes alive
   ═══════════════════════════════════════════════════════════════ */

const BotMarketPage = {
  async render() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);padding-bottom:80px;">
        <div class="section-header">
          <h1 class="section-title">🤖 Mercado Inteligente</h1>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-sm" onclick="BotMarketPage.refresh()">🔄 Atualizar</button>
          </div>
        </div>

        <div id="market-events-banner" class="market-events-banner" style="display:none;"></div>

        <div class="economy-stats-grid" id="economy-stats"></div>

        <div class="tabs" style="margin-top:var(--space-lg);">
          <button class="tab active" onclick="BotMarketPage.switchTab('overview',this)">📊 Visão Geral</button>
          <button class="tab" onclick="BotMarketPage.switchTab('bots',this)">🤖 Bots</button>
          <button class="tab" onclick="BotMarketPage.switchTab('activity',this)">📜 Atividade</button>
          <button class="tab" onclick="BotMarketPage.switchTab('value',this)">💎 Valor da Coleção</button>
        </div>

        <div id="tab-content" style="margin-top:var(--space-md);"></div>
      </div>

      <style>
        .economy-stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:var(--space-md); }
        .eco-stat-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:var(--space-lg); text-align:center; transition:all var(--transition-normal); }
        .eco-stat-card:hover { border-color:var(--border-gold); transform:translateY(-2px); box-shadow:var(--shadow-glow-gold); }
        .eco-stat-icon { font-size:2rem; margin-bottom:var(--space-sm); }
        .eco-stat-value { font-family:var(--font-heading); font-size:1.5rem; font-weight:700; color:var(--mana-gold-glow); }
        .eco-stat-label { font-size:0.8rem; color:var(--text-muted); margin-top:4px; }
        .market-events-banner { background:linear-gradient(135deg, rgba(212,160,23,0.15) 0%, rgba(255,109,0,0.1) 100%); border:1px solid var(--mana-gold); border-radius:var(--radius-lg); padding:var(--space-md) var(--space-lg); margin-bottom:var(--space-lg); animation:pulse 2s infinite; }
        .event-tag { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.3); color:var(--mana-gold-glow); margin:4px; }
        .bot-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:var(--space-lg); transition:all var(--transition-normal); cursor:pointer; }
        .bot-card:hover { border-color:var(--mana-gold); transform:translateY(-3px); box-shadow:var(--shadow-xl), 0 0 20px rgba(212,160,23,0.2); }
        .bot-avatar { font-size:2.5rem; width:60px; height:60px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:50%; border:2px solid var(--border-gold); margin:0 auto var(--space-sm); }
        .bot-specialty { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); }
        .bot-gold { font-family:var(--font-mono); color:var(--mana-gold-glow); font-weight:700; }
        .activity-item { display:flex; gap:var(--space-md); padding:var(--space-md); border-bottom:1px solid var(--border-subtle); align-items:flex-start; }
        .activity-item:last-child { border-bottom:none; }
        .activity-icon { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1rem; }
        .activity-icon.buy { background:rgba(0,200,83,0.15); border:1px solid rgba(0,200,83,0.3); }
        .activity-icon.sell { background:rgba(255,82,82,0.15); border:1px solid rgba(255,82,82,0.3); }
        .activity-icon.list { background:rgba(26,115,232,0.15); border:1px solid rgba(26,115,232,0.3); }
        .activity-icon.browse { background:rgba(156,39,176,0.15); border:1px solid rgba(156,39,176,0.3); }
        .value-ring { width:120px; height:120px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column; margin:0 auto var(--space-md); position:relative; }
        .value-ring::before { content:''; position:absolute; inset:-3px; border-radius:50%; background:conic-gradient(var(--mana-gold) 0%, var(--mana-gold-glow) var(--pct), transparent var(--pct)); opacity:0.3; }
        .value-ring-inner { width:100%; height:100%; border-radius:50%; background:var(--bg-card); display:flex; align-items:center; justify-content:center; flex-direction:column; border:2px solid var(--border-subtle); position:relative; z-index:1; }
        .rarity-bar { height:8px; border-radius:4px; transition:width 0.5s ease; }
        .card-in-binder { position:relative; border-radius:8px; overflow:hidden; cursor:pointer; transition:all var(--transition-fast); aspect-ratio:488/680; }
        .card-in-binder:hover { transform:scale(1.05); z-index:2; box-shadow:var(--shadow-xl); }
      </style>`;
    this.refresh();
  },

  currentTab: 'overview',

  switchTab(tab, el) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    this.currentTab = tab;
    this.loadTab(tab);
  },

  async refresh() {
    try {
      const [overview, events] = await Promise.all([
        API.getMarketOverview(),
        API.getMarketEvents()
      ]);
      this.renderStats(overview);
      this.renderEvents(events.events || []);
      this.loadTab(this.currentTab);
    } catch (err) {
      console.error('Market refresh error:', err);
    }
  },

  renderStats(overview) {
    const s = overview.stats || {};
    document.getElementById('economy-stats').innerHTML = `
      <div class="eco-stat-card">
        <div class="eco-stat-icon">🛒</div>
        <div class="eco-stat-value">${s.activeListings || 0}</div>
        <div class="eco-stat-label">Anúncios Ativos</div>
      </div>
      <div class="eco-stat-card">
        <div class="eco-stat-icon">✅</div>
        <div class="eco-stat-value">${s.totalSold || 0}</div>
        <div class="eco-stat-label">Vendas Realizadas</div>
      </div>
      <div class="eco-stat-card">
        <div class="eco-stat-icon">💰</div>
        <div class="eco-stat-value">${(s.avgPrice || 0).toLocaleString()}</div>
        <div class="eco-stat-label">Preço Médio (Gold)</div>
      </div>
      <div class="eco-stat-card">
        <div class="eco-stat-icon">📈</div>
        <div class="eco-stat-value">${((s.totalVolume || 0) / 1000).toFixed(0)}k</div>
        <div class="eco-stat-label">Volume Total</div>
      </div>`;
  },

  renderEvents(events) {
    const banner = document.getElementById('market-events-banner');
    if (!events.length) { banner.style.display = 'none'; return; }
    banner.style.display = 'block';
    banner.innerHTML = events.map(e => `
      <div class="event-tag">⚡ ${e.title}</div>
    `).join('') + `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:8px;">${events.map(e => e.description).join(' • ')}</div>`;
  },

  async loadTab(tab) {
    const content = document.getElementById('tab-content');
    if (!content) return;
    content.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    try {
      switch (tab) {
        case 'overview': return await this.renderOverviewTab(content);
        case 'bots': return await this.renderBotsTab(content);
        case 'activity': return await this.renderActivityTab(content);
        case 'value': return await this.renderValueTab(content);
      }
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Erro ao carregar dados</p></div>`;
    }
  },

  async renderOverviewTab(el) {
    const data = await API.getMarketOverview();
    const rarityColors = { common: '#888', uncommon: '#1eff00', rare: '#0070dd', mythic: '#ff8000' };

    el.innerHTML = `
      <h3 style="margin-bottom:var(--space-md);">📊 Preços por Raridade</h3>
      <div style="display:grid;gap:var(--space-md);margin-bottom:var(--space-xl);">
        ${(data.byRarity || []).map(r => `
          <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-md);display:flex;align-items:center;gap:var(--space-md);">
            <div style="width:12px;height:12px;border-radius:50%;background:${rarityColors[r.rarity] || '#888'};flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-weight:600;text-transform:capitalize;">${r.rarity}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">${r.count} anúncios</div>
            </div>
            <div style="text-align:right;">
              <div style="color:var(--mana-gold-glow);font-weight:700;">${Math.round(r.avg_price || 0)} 🪙</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${r.min_price || 0} - ${r.max_price || 0}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <h3 style="margin-bottom:var(--space-md);">🔥 Vendas Recentes</h3>
      <div style="background:var(--bg-card);border-radius:var(--radius-lg);overflow:hidden;">
        ${(data.recentSales || []).map(s => `
          <div class="activity-item">
            <div class="activity-icon sell">💰</div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:0.9rem;">${s.card_name}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">${s.username || 'Jogador'} • ${s.rarity}</div>
            </div>
            <div style="color:var(--mana-gold-glow);font-weight:700;">${s.price_gold} 🪙</div>
          </div>
        `).join('') || '<div class="empty-state" style="padding:var(--space-lg);"><p>Nenhuma venda recente</p></div>'}
      </div>`;
  },

  async renderBotsTab(el) {
    const data = await API.getBots();
    const bots = data.bots || [];

    el.innerHTML = `
      <h3 style="margin-bottom:var(--space-md);">🤖 Comerciantes NPCs</h3>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:var(--space-lg);">Estes bots compram, vendem e negociam cartas automaticamente, mantendo o mercado vivo e dinâmico.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:var(--space-md);">
        ${bots.map(b => `
          <div class="bot-card" onclick="BotMarketPage.showBotDetail('${b.id}')">
            <div class="bot-avatar">${b.avatar}</div>
            <div style="text-align:center;font-weight:700;margin-bottom:4px;">${b.name}</div>
            <div class="bot-specialty">${b.specialty.replace('_', ' ')}</div>
            <div style="text-align:center;margin:var(--space-sm) 0;">
              <span class="bot-gold">🪙 ${(b.gold || 0).toLocaleString()}</span>
              <span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">Lv.${b.level}</span>
            </div>
            <div style="display:flex;justify-content:center;gap:var(--space-md);font-size:0.8rem;color:var(--text-muted);">
              <span>📦 ${b.card_count || 0} cartas</span>
              <span>🛒 ${b.total_buys || 0} compras</span>
            </div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:var(--space-sm);text-align:center;">${b.description || ''}</div>
          </div>
        `).join('')}
      </div>`;
  },

  async renderActivityTab(el) {
    const data = await API.getBotActivity(50);
    const activity = data.activity || [];

    el.innerHTML = `
      <h3 style="margin-bottom:var(--space-md);">📜 Atividade Recente dos Bots</h3>
      <div style="background:var(--bg-card);border-radius:var(--radius-lg);overflow:hidden;">
        ${activity.map(a => `
          <div class="activity-item">
            <div class="activity-icon ${a.action}">
              ${a.action === 'buy' ? '🛒' : a.action === 'sell' ? '💰' : a.action === 'list' ? '📋' : '👁'}
            </div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:0.9rem;">
                <span>${a.bot_avatar || '🤖'} ${a.bot_name}</span>
                <span style="color:var(--text-muted);font-weight:400;">
                  ${a.action === 'buy' ? ' comprou' : a.action === 'sell' ? ' vendeu' : a.action === 'list' ? ' listou' : ' explorou'}
                </span>
                ${a.card_name ? `<span style="color:var(--mana-gold-glow);"> ${a.card_name}</span>` : ''}
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${this.timeAgo(a.created_at)}${a.target_user && a.target_user !== 'market' ? ` • De: ${a.target_user}` : ''}</div>
            </div>
            ${a.price > 0 ? `<div style="font-weight:700;color:var(--mana-gold-glow);">${a.price} 🪙</div>` : ''}
          </div>
        `).join('') || '<div class="empty-state" style="padding:var(--space-lg);"><p>Nenhuma atividade recente</p></div>'}
      </div>`;
  },

  async renderValueTab(el) {
    if (!AppState.user) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-title">Login Necessário</div><p>Faça login para ver o valor da sua coleção</p></div>';
      return;
    }

    try {
      const data = await API.getCollectionValue();
      const rankColors = { 'Mítico': '#ff8000', 'Lendário': '#a335ee', 'Raro': '#0070dd', 'Incomum': '#1eff00', 'Comum': '#888' };
      const rankColor = rankColors[data.rank] || '#888';

      const total = (data.breakdown.common || 0) + (data.breakdown.uncommon || 0) + (data.breakdown.rare || 0) + (data.breakdown.mythic || 0);

      el.innerHTML = `
        <div style="text-align:center;margin-bottom:var(--space-xl);">
          <div class="value-ring" style="--pct:${data.completionPct || 0}%;">
            <div class="value-ring-inner">
              <div style="font-size:0.7rem;color:var(--text-muted);">RANK</div>
              <div style="font-family:var(--font-heading);font-size:1.1rem;font-weight:700;color:${rankColor};">${data.rank}</div>
            </div>
          </div>
          <h2 style="color:var(--mana-gold-glow);margin-bottom:4px;">${(data.totalValue || 0).toLocaleString()} 🪙</h2>
          <p style="color:var(--text-muted);font-size:0.85rem;">Valor Total da Coleção</p>
        </div>

        <div class="economy-stats-grid" style="margin-bottom:var(--space-xl);">
          <div class="eco-stat-card">
            <div class="eco-stat-value">${data.cardCount || 0}</div>
            <div class="eco-stat-label">Total de Cartas</div>
          </div>
          <div class="eco-stat-card">
            <div class="eco-stat-value">${data.uniqueCards || 0}</div>
            <div class="eco-stat-label">Cartas Únicas</div>
          </div>
          <div class="eco-stat-card">
            <div class="eco-stat-value" style="color:#ff8000;">${data.breakdown.mythic || 0}</div>
            <div class="eco-stat-label">Míticas</div>
          </div>
          <div class="eco-stat-card">
            <div class="eco-stat-value" style="color:#0070dd;">${data.breakdown.rare || 0}</div>
            <div class="eco-stat-label">Raras</div>
          </div>
        </div>

        <h3 style="margin-bottom:var(--space-md);">📊 Composição da Coleção</h3>
        <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:var(--space-lg);margin-bottom:var(--space-xl);">
          ${['mythic', 'rare', 'uncommon', 'common'].map(r => {
            const count = data.breakdown[r] || 0;
            const pct = total > 0 ? (count / total * 100) : 0;
            const colors = { mythic: '#ff8000', rare: '#0070dd', uncommon: '#1eff00', common: '#888' };
            return `
              <div style="margin-bottom:var(--space-sm);">
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;">
                  <span style="text-transform:capitalize;color:${colors[r]};">${r}</span>
                  <span>${count} (${pct.toFixed(1)}%)</span>
                </div>
                <div style="height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden;">
                  <div class="rarity-bar" style="width:${pct}%;background:${colors[r]};"></div>
                </div>
              </div>`;
          }).join('')}
        </div>

        <h3 style="margin-bottom:var(--space-md);">🏆 Top Cartas (por valor)</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--space-sm);">
          ${(data.topCards || []).slice(0, 12).map(c => `
            <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-sm);text-align:center;">
              <div style="font-size:0.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.card_name}</div>
              <div style="font-size:0.75rem;color:var(--mana-gold-glow);">${c.total_value} 🪙</div>
              <div style="font-size:0.65rem;color:var(--text-muted);">x${c.quantity}</div>
            </div>
          `).join('')}
        </div>`;
    } catch (err) {
      el.innerHTML = '<div class="empty-state"><p>Erro ao calcular valor</p></div>';
    }
  },

  async showBotDetail(botId) {
    try {
      const data = await API.getBot(botId);
      const b = data.bot;
      if (!b) return;

      const existing = document.getElementById('bot-detail-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'bot-detail-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
          <button class="modal-close" onclick="document.getElementById('bot-detail-modal').remove()">✕</button>
          <div style="text-align:center;margin-bottom:var(--space-lg);">
            <div class="bot-avatar" style="font-size:3rem;width:80px;height:80px;margin:0 auto var(--space-sm);">${b.avatar}</div>
            <h2>${b.name}</h2>
            <div style="color:var(--text-muted);font-size:0.85rem;">${b.description}</div>
            <div style="display:flex;justify-content:center;gap:var(--space-lg);margin-top:var(--space-sm);">
              <span class="bot-gold">🪙 ${(b.gold || 0).toLocaleString()}</span>
              <span>Lv.${b.level}</span>
              <span style="text-transform:capitalize;">${b.personality}</span>
            </div>
          </div>
          <h3 style="margin-bottom:var(--space-sm);">📦 Inventário (${b.inventory?.length || 0} cartas)</h3>
          <div style="max-height:300px;overflow-y:auto;">
            ${(b.inventory || []).map(item => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:0.85rem;">
                <span>${item.card_name}</span>
                <span style="color:var(--text-muted);">${item.rarity} x${item.quantity}</span>
              </div>
            `).join('') || '<p style="color:var(--text-muted);">Inventário vazio</p>'}
          </div>
        </div>`;
      document.body.appendChild(modal);
    } catch (err) {
      console.error('Bot detail error:', err);
    }
  },

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h atrás`;
    return `${Math.floor(mins / 1440)}d atrás`;
  }
};
