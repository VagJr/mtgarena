/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Tavern Page
   RPG Economy Hub with NPCs, Games, Crafting, Deals
   ═══════════════════════════════════════════════════════════════ */

const TavernPage = {
  currentNPC: null,
  currentView: 'hub',

  async render() {
    if (!AppState.user) {
      document.getElementById('app').innerHTML = `
        <div class="container page-enter" style="padding-top:80px;text-align:center;">
          <div style="max-width:500px;margin:0 auto;">
            <div style="font-size:6rem;margin-bottom:16px;">🍺</div>
            <h1 style="color:var(--mana-gold-glow);font-size:1.8rem;margin:0 0 8px;">A Taverna do Multiverso</h1>
            <p style="color:var(--text-secondary);margin:0 0 24px;">Entre na taverna para acessar a economia completa, jogos, crafting e muito mais.</p>
            <button class="btn btn-primary btn-lg" onclick="showAuthModal()">🍺 Entrar na Taverna</button>
          </div>
        </div>`;
      return;
    }

    this.currentView = 'hub';
    this.renderHub();
  },

  async renderHub() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="tavern-bg page-enter" style="min-height:100vh;padding-top:70px;padding-bottom:40px;">
        <div class="container">
          ${this.renderTavernHeader()}
          <div id="tavern-content">
            <div style="text-align:center;padding:40px;"><div class="loading-bar" style="width:200px;margin:0 auto;"><div class="loading-bar-fill"></div></div></div>
          </div>
        </div>
      </div>
      <style>
        .tavern-bg { background:linear-gradient(180deg, #0d0a14 0%, #1a1025 30%, #0d0a14 100%); }
        .tavern-header { text-align:center;padding:24px 0 16px;position:relative; }
        .tavern-header h1 { font-size:1.6rem;color:var(--mana-gold-glow);margin:0;text-shadow:0 0 20px rgba(212,160,23,0.3); }
        .tavern-stats { display:flex;justify-content:center;gap:20px;margin-top:12px;flex-wrap:wrap; }
        .tavern-stat { display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--text-secondary);background:rgba(255,255,255,0.04);padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.06); }
        .npc-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin:20px 0; }
        .npc-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:all 0.25s;position:relative;overflow:hidden; }
        .npc-card:hover { border-color:var(--mana-gold);transform:translateY(-3px);box-shadow:0 8px 24px rgba(212,160,23,0.15);background:rgba(212,160,23,0.05); }
        .npc-card .npc-icon { font-size:2.5rem;display:block;margin-bottom:8px;filter:drop-shadow(0 0 8px rgba(212,160,23,0.3)); }
        .npc-card .npc-name { font-size:0.8rem;font-weight:600;color:var(--text-primary);margin-bottom:2px; }
        .npc-card .npc-title { font-size:0.7rem;color:var(--text-muted); }
        .service-panel { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px;margin-top:16px; }
        .deal-card { background:var(--surface-card);border:1px solid var(--border-subtle);border-radius:10px;padding:14px;text-align:center;transition:all 0.2s; }
        .deal-card:hover { border-color:var(--mana-gold);transform:scale(1.02); }
        .game-btn { padding:14px 20px;border-radius:12px;border:2px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);cursor:pointer;text-align:center;transition:all 0.2s;color:var(--text-primary); }
        .game-btn:hover { border-color:var(--mana-gold);background:rgba(212,160,23,0.08);transform:translateY(-2px); }
        .slot-reel { font-size:2.5rem;display:inline-block;animation:slotSpin 0.5s ease-out; }
        @keyframes slotSpin { 0%{transform:translateY(-30px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        .tavern-chat { background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;margin-top:16px;max-height:120px;overflow-y:auto;font-size:0.8rem;color:var(--text-secondary); }
        .tavern-chat .msg { margin-bottom:4px; }
        .tavern-chat .npc-msg { color:var(--mana-gold-glow); }
      </style>`;

    this.loadOverview();
  },

  renderTavernHeader() {
    return `
      <div class="tavern-header">
        <h1>🍺 A Taverna do Multiverso</h1>
        <div class="tavern-stats" id="tavern-stats"></div>
      </div>`;
  },

  async loadOverview() {
    try {
      const data = await API.getTavernOverview();

      // Update stats bar
      const statsEl = document.getElementById('tavern-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="tavern-stat">🪙 ${data.user.gold?.toLocaleString() || 0}</div>
          <div class="tavern-stat">💎 ${data.user.gems || 0}</div>
          <div class="tavern-stat">⭐ Nv.${data.user.level}</div>
          <div class="tavern-stat">📚 ${data.collection.unique_cards} cartas</div>
          <div class="tavern-stat">🃏 ${data.collection.decks} decks</div>
          <div class="tavern-stat">🔥 ${data.streak.current} dias</div>
        `;
      }

      this.renderNPCGrid(data);
    } catch (err) {
      document.getElementById('tavern-content').innerHTML = `<div class="alert alert-error">Erro ao carregar taverna: ${err.message}</div>`;
    }
  },

  renderNPCGrid(data) {
    const container = document.getElementById('tavern-content');
    if (!container) return;

    container.innerHTML = `
      <div class="npc-grid">
        ${data.npcs.map(npc => `
          <div class="npc-card" onclick="TavernPage.openNPC('${npc.id}')">
            <span class="npc-icon">${npc.icon}</span>
            <div class="npc-name">${npc.name.split(',')[0]}</div>
            <div class="npc-title">${npc.title}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
        <div class="service-panel">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">📋 Missões do Dia</h3>
          <div id="tavern-missions">${this.renderMissionsMini(data.missions)}</div>
        </div>
        <div class="service-panel">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">🎲 Jogos da Taverna</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div class="game-btn" onclick="TavernPage.openGame('dice')"><div style="font-size:1.5rem;">🎲</div><div style="font-size:0.75rem;margin-top:4px;">Dados</div></div>
            <div class="game-btn" onclick="TavernPage.openGame('coinflip')"><div style="font-size:1.5rem;">🪙</div><div style="font-size:0.75rem;margin-top:4px;">Cara/Coroa</div></div>
            <div class="game-btn" onclick="TavernPage.openGame('slots')"><div style="font-size:1.5rem;">🎰</div><div style="font-size:0.75rem;margin-top:4px;">Caça-níquel</div></div>
          </div>
        </div>
      </div>

      <div class="tavern-chat" id="tavern-chat">
        <div class="msg npc-msg">🍺 Barmy: "Bem-vindo à taverna, Planeswalker! Escolha um NPC acima para começar."</div>
      </div>
    `;
  },

  renderMissionsMini(missions) {
    if (!missions || missions.length === 0) return '<p style="color:var(--text-muted);font-size:0.8rem;">Nenhuma missão ativa</p>';
    return missions.map(m => {
      const pct = Math.round(((m.progress || 0) / m.target) * 100);
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:1rem;">${m.icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.75rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.title}</div>
            <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:3px;"><div style="height:100%;width:${pct}%;background:${m.completed ? 'var(--accent-success)' : 'var(--accent-primary)'};border-radius:2px;"></div></div>
          </div>
          <span style="font-size:0.7rem;color:var(--text-muted);">${m.progress}/${m.target}</span>
        </div>`;
    }).join('');
  },

  addTavernChat(msg, isNPC = true) {
    const chat = document.getElementById('tavern-chat');
    if (chat) {
      chat.insertAdjacentHTML('beforeend', `<div class="msg ${isNPC ? 'npc-msg' : ''}">${msg}</div>`);
      chat.scrollTop = chat.scrollHeight;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  //  NPC INTERACTION PANELS
  // ═══════════════════════════════════════════════════════════════

  async openNPC(npcId) {
    const npcs = await API.getTavernNPCs();
    const npc = npcs.find(n => n.id === npcId);
    if (!npc) return;

    this.currentNPC = npc;
    this.addTavernChat(`🗣️ ${npc.name.split(',')[0]}: "${npc.greeting}"`);

    const container = document.getElementById('tavern-content');
    if (!container) return;

    let panel = '';
    switch (npcId) {
      case 'barmy': panel = await this.renderBarmyPanel(); break;
      case 'artificer': panel = await this.renderArtificerPanel(); break;
      case 'oracle': panel = await this.renderOraclePanel(); break;
      case 'shadow_merchant': panel = await this.renderShadowMerchantPanel(); break;
      case 'guild_master': panel = await this.renderGuildMasterPanel(); break;
      case 'lorekeeper': panel = await this.renderLorekeeperPanel(); break;
      default: panel = '<p>Em construção...</p>';
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button class="btn btn-ghost btn-sm" onclick="TavernPage.renderHub()">← Voltar</button>
        <span style="font-size:2rem;">${npc.icon}</span>
        <div>
          <h2 style="margin:0;font-size:1.1rem;color:var(--mana-gold-glow);">${npc.name}</h2>
          <p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">${npc.description}</p>
        </div>
      </div>
      ${panel}
    `;
  },

  // ─── BARMY — Daily Deals & Quest Board ───
  async renderBarmyPanel() {
    const [deals, vault] = await Promise.all([API.getDailyDeals(), API.getTavernVault()]);
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="service-panel">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 4px;font-size:0.95rem;">📋 Quadro de Missões</h3>
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 12px;">Complete tarefas para ganhar recompensas</p>
          <div id="barmy-missions"></div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="navigateTo('/missions')">Ver Todas →</button>
        </div>
        <div class="service-panel">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 4px;font-size:0.95rem;">🛒 Ofertas do Dia</h3>
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 12px;">Cartas selecionadas com desconto</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${deals.slice(0, 6).map(d => `
              <div class="deal-card" onclick="TavernPage.buyDeal('${d.id}', '${d.rarity}', '${d.set_code}', ${d.price_gold})">
                <div style="font-size:0.65rem;color:var(--text-muted);">${d.label}</div>
                <div style="font-size:0.9rem;font-weight:700;color:var(--mana-gold-glow);margin:4px 0;">🪙 ${d.price_gold}</div>
                ${d.discount > 5 ? `<div style="font-size:0.6rem;color:var(--accent-success);">-${d.discount}%</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="service-panel" style="margin-top:16px;">
        <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">🍺 Falar com Barmy</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="TavernPage.barmyChat('daily')">📅 Recompensa Diária</button>
          <button class="btn btn-ghost btn-sm" onclick="TavernPage.barmyChat('fortune')">🔮 Ver Sorte do Dia</button>
          <button class="btn btn-ghost btn-sm" onclick="TavernPage.barmyChat('tip')">💡 Dica do Dia</button>
        </div>
      </div>`;
  },

  async buyDeal(dealId, rarity, setCode, price) {
    try {
      const result = await API.buyDailyDeal({ deal_id: dealId, rarity, set_code: setCode, price_gold: price });
      showToast(result.message, 'success');
      AppState.user.gold = result.balance.gold;
      updateAuthUI();
      this.openNPC('barmy');
    } catch (err) { showToast(err.message, 'error'); }
  },

  async barmyChat(topic) {
    const tips = {
      daily: async () => {
        try { await API.claimDaily(); showToast('📅 Recompensa diária coletada!', 'success'); } catch (e) { showToast(e.message, 'error'); }
      },
      fortune: async () => {
        const f = await API.getFortune();
        this.addTavernChat(`🔮 Lyra: "${f.fortune}"`);
      },
      tip: () => {
        const tips = [
          '💡 "Seja paciente com os boosters. A pity system garante algo bom a cada 30 aberturas!"',
          '💡 "Desmanche cartas comuns que você não usa para ganhar po de artesão!"',
          '💡 "Complete missões diárias para subir de nível mais rápido!"',
          '💡 "O Mercador das Sombras tem ofertas únicas. Não perca!"',
          '💡 "Caça-níquel paga 10x se acertar 3 coroas! Mas jogue com moderação..."'
        ];
        this.addTavernChat(tips[Math.floor(Math.random() * tips.length)]);
      }
    };
    if (tips[topic]) tips[topic]();
  },

  // ─── VEX — Disenchant & Craft ───
  async renderArtificerPanel() {
    const vault = await API.getTavernVault();
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="service-panel">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">🔮 Po de Artesão: ${vault.dust}</h3>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;">
            ${['common','uncommon','rare','mythic'].map(r => {
              const colors = { common:'#9e9e9e', uncommon:'#4caf50', rare:'#2196f3', mythic:'#ff9800' };
              return `<div style="text-align:center;padding:10px;background:var(--surface-elevated);border-radius:8px;">
                <div style="font-size:1.3rem;font-weight:700;color:${colors[r]};">${vault.wildcards[r] || 0}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);text-transform:capitalize;">WC ${r}</div>
              </div>`;
            }).join('')}
          </div>
          <h4 style="color:var(--text-primary);margin:0 0 8px;font-size:0.85rem;">⚒️ Forjar Wildcard</h4>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-elevated);border-radius:6px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">5 Comum → 1 Incomum</span>
              <button class="btn btn-ghost btn-sm" onclick="TavernPage.craft('common','uncommon')">Forjar</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-elevated);border-radius:6px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">3 Incomum +25 po → 1 Raro</span>
              <button class="btn btn-ghost btn-sm" onclick="TavernPage.craft('uncommon','rare')">Forjar</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-elevated);border-radius:6px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">4 Raro +60 po → 1 Mítico</span>
              <button class="btn btn-ghost btn-sm" onclick="TavernPage.craft('rare','mythic')">Forjar</button>
            </div>
          </div>
        </div>
        <div class="service-panel">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">♻️ Desmanchar Cartas</h3>
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 12px;">Transforme cartas em po para forjar wildcards</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-elevated);border-radius:6px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">Comum = 5 po</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-elevated);border-radius:6px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">Incomum = 10 po</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-elevated);border-radius:6px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">Raro = 25 po</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-elevated);border-radius:6px;">
              <span style="font-size:0.8rem;color:var(--text-secondary);">Mítico = 50 po</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:12px;width:100%;" onclick="navigateTo('/collection')">Ir à Coleção →</button>
        </div>
      </div>`;
  },

  async craft(from, to) {
    try {
      const result = await API.tavernCraft(from, to);
      showToast(result.message, 'success');
      this.openNPC('artificer');
    } catch (err) { showToast(err.message, 'error'); }
  },

  // ─── LYRA — Mystery Box & Fortune ───
  async renderOraclePanel() {
    const fortune = await API.getFortune();
    return `
      <div class="service-panel">
        <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">🔮 Previsão do Dia</h3>
        <div style="text-align:center;padding:20px;background:rgba(128,0,128,0.1);border-radius:12px;border:1px solid rgba(128,0,128,0.2);">
          <div style="font-size:2rem;margin-bottom:8px;">🔮</div>
          <p style="color:var(--mana-gold-glow);font-style:italic;margin:0;font-size:0.95rem;">"${fortune.fortune}"</p>
        </div>
      </div>
      <div class="service-panel" style="margin-top:16px;">
        <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">📦 Caixa Mistérica — 🪙 300 Gold</h3>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 16px;">5% chance de Wildcard Mítico! 10% Wildcard Raro! Ouro, po e cartas garantidos!</p>
        <div style="text-align:center;">
          <button class="btn btn-primary btn-lg" onclick="TavernPage.openMysteryBox()" style="box-shadow:0 0 20px rgba(128,0,128,0.3);">
            📦 Abrir Caixa (300 Gold)
          </button>
        </div>
        <div id="mystery-result" style="margin-top:12px;"></div>
      </div>`;
  },

  async openMysteryBox() {
    try {
      const result = await API.openMysteryBox();
      AppState.user.gold = result.balance.gold;
      updateAuthUI();
      const el = document.getElementById('mystery-result');
      if (el) el.innerHTML = `<div style="text-align:center;padding:16px;background:rgba(212,160,23,0.1);border-radius:10px;border:1px solid var(--mana-gold);"><p style="color:var(--mana-gold-glow);margin:0;font-weight:600;">${result.reward.message}</p></div>`;
      this.addTavernChat(`📦 Lyra: "${result.reward.message}"`);
    } catch (err) { showToast(err.message, 'error'); }
  },

  // ─── KAEL — Rare Card Deals ───
  async renderShadowMerchantPanel() {
    const deals = await API.getRareDeals();
    return `
      <div class="service-panel">
        <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">🗡️ Ofertas Raras do Dia</h3>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 16px;">Cartas colecionáveis com desconto especial</p>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
          ${deals.map(d => {
            const rarityColors = { rare: '#2196f3', mythic: '#ff9800' };
            return `
              <div class="deal-card" style="text-align:left;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <div style="width:50px;height:70px;background:var(--surface-elevated);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🃏</div>
                  <div>
                    <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${d.name}</div>
                    <div style="font-size:0.7rem;color:${rarityColors[d.rarity]};text-transform:uppercase;">${d.rarity}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <span style="font-size:1rem;font-weight:700;color:var(--mana-gold-glow);">🪙 ${d.price_gold}</span>
                    <span style="font-size:0.7rem;color:var(--accent-success);margin-left:6px;">-${d.discount}%</span>
                  </div>
                  <button class="btn btn-primary btn-sm" onclick="TavernPage.buyRare('${d.name}','${d.set}','${d.rarity}',${d.price_gold})">Comprar</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  async buyRare(name, set, rarity, price) {
    try {
      const result = await API.buyRareDeal({ card_name: name, set_code: set, rarity, price_gold: price });
      showToast(`🗡️ ${name} comprada!`, 'success');
      AppState.user.gold = result.balance.gold;
      updateAuthUI();
      this.openNPC('shadow_merchant');
    } catch (err) { showToast(err.message, 'error'); }
  },

  // ─── ALDRIC — Seasons & Rankings ───
  async renderGuildMasterPanel() {
    return `
      <div class="service-panel">
        <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">⚜️ Arena Competitiva</h3>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 16px;">Suba de tier e conquiste o topo do ranking!</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="navigateTo('/seasons')">🏆 Temporada Atual</button>
          <button class="btn btn-ghost" onclick="navigateTo('/seasons')">📊 Leaderboard</button>
        </div>
      </div>`;
  },

  // ─── THERON — Collection Stats & Achievements ───
  async renderLorekeeperPanel() {
    return `
      <div class="service-panel">
        <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;font-size:0.95rem;">📖 Conquistas & Coleção</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="navigateTo('/missions')">📋 Missões</button>
          <button class="btn btn-ghost" onclick="navigateTo('/collection')">📚 Minha Coleção</button>
        </div>
      </div>`;
  },

  // ═══════════════════════════════════════════════════════════════
  //  TAVERN GAMES
  // ═══════════════════════════════════════════════════════════════

  async openGame(type) {
    const container = document.getElementById('tavern-content');
    if (!container) return;

    let gamePanel = '';
    if (type === 'dice') {
      gamePanel = `
        <div class="service-panel" style="max-width:400px;margin:0 auto;">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;text-align:center;">🎲 Dados da Sorte</h3>
          <p style="font-size:0.8rem;color:var(--text-secondary);text-align:center;margin:0 0 16px;">Acerte alto/baixo para ganhar 1.5x! Acerte o número exato: 5x!</p>
          <div style="text-align:center;font-size:3rem;margin:12px 0;" id="dice-result">🎲</div>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input type="number" id="dice-bet" value="50" min="10" max="500" class="form-input" style="flex:1;">
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="TavernPage.playDiceGame('low')">⬇️ Baixo (1-3)</button>
            <button class="btn btn-secondary btn-sm" onclick="TavernPage.playDiceGame('guess')">🎯 Exato</button>
            <button class="btn btn-primary btn-sm" onclick="TavernPage.playDiceGame('high')">⬆️ Alto (4-6)</button>
          </div>
          <div id="dice-output" style="margin-top:12px;text-align:center;"></div>
        </div>`;
    } else if (type === 'coinflip') {
      gamePanel = `
        <div class="service-panel" style="max-width:400px;margin:0 auto;">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;text-align:center;">🪙 Cara ou Coroa</h3>
          <p style="font-size:0.8rem;color:var(--text-secondary);text-align:center;margin:0 0 16px;">Acerte o lado: ganhe 2x sua aposta!</p>
          <div style="text-align:center;font-size:3rem;margin:12px 0;" id="coin-result">🪙</div>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input type="number" id="coin-bet" value="50" min="10" max="500" class="form-input" style="flex:1;">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button class="btn btn-primary btn-lg" onclick="TavernPage.playCoinGame('heads')">👑 Cara</button>
            <button class="btn btn-secondary btn-lg" onclick="TavernPage.playCoinGame('tails')">🛡️ Coroa</button>
          </div>
          <div id="coin-output" style="margin-top:12px;text-align:center;"></div>
        </div>`;
    } else if (type === 'slots') {
      gamePanel = `
        <div class="service-panel" style="max-width:400px;margin:0 auto;">
          <h3 style="color:var(--mana-gold-glow);margin:0 0 12px;text-align:center;">🎰 Caça-níquel da Taverna</h3>
          <p style="font-size:0.8rem;color:var(--text-secondary);text-align:center;margin:0 0 16px;">3 iguais = 10x! 3 coroas = 20x! 2 iguais = 3x!</p>
          <div style="text-align:center;font-size:3rem;margin:12px 0;letter-spacing:8px;" id="slot-reels">⚔️🛡️🔥</div>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input type="number" id="slot-bet" value="100" min="20" max="1000" class="form-input" style="flex:1;">
          </div>
          <div style="text-align:center;">
            <button class="btn btn-primary btn-lg" onclick="TavernPage.playSlotGame()" style="min-width:200px;">🎰 Girar! (100 Gold)</button>
          </div>
          <div id="slot-output" style="margin-top:12px;text-align:center;"></div>
        </div>`;
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button class="btn btn-ghost btn-sm" onclick="TavernPage.renderHub()">← Voltar</button>
        <span style="font-size:2rem;">🍺</span>
        <h2 style="margin:0;font-size:1.1rem;color:var(--mana-gold-glow);">Jogos da Taverna</h2>
      </div>
      ${gamePanel}`;
  },

  async playDiceGame(guess) {
    const bet = parseInt(document.getElementById('dice-bet')?.value) || 50;
    try {
      const result = await API.playDice(bet, guess);
      document.getElementById('dice-result').textContent = `🎲 ${result.dice}`;
      document.getElementById('dice-output').innerHTML = `<p style="color:${result.won ? 'var(--accent-success)' : 'var(--accent-error)'};font-weight:600;">${result.message}</p>`;
      AppState.user.gold = result.gold;
      updateAuthUI();
    } catch (err) { showToast(err.message, 'error'); }
  },

  async playCoinGame(guess) {
    const bet = parseInt(document.getElementById('coin-bet')?.value) || 50;
    try {
      const result = await API.playCoinflip(bet, guess);
      document.getElementById('coin-result').textContent = result.result === 'heads' ? '👑' : '🛡️';
      document.getElementById('coin-output').innerHTML = `<p style="color:${result.won ? 'var(--accent-success)' : 'var(--accent-error)'};font-weight:600;">${result.message}</p>`;
      AppState.user.gold = result.gold;
      updateAuthUI();
    } catch (err) { showToast(err.message, 'error'); }
  },

  async playSlotGame() {
    const bet = parseInt(document.getElementById('slot-bet')?.value) || 100;
    try {
      const result = await API.playSlots(bet);
      const reels = result.reels || ['⚔️','🛡️','🔥'];
      document.getElementById('slot-reels').innerHTML = reels.map((r, i) => `<span class="slot-reel" style="animation-delay:${i * 0.15}s">${r}</span>`).join('');
      document.getElementById('slot-output').innerHTML = `<p style="color:${result.won ? 'var(--accent-success)' : 'var(--accent-error)'};font-weight:600;">${result.message}</p>`;
      AppState.user.gold = result.gold;
      updateAuthUI();
    } catch (err) { showToast(err.message, 'error'); }
  }
};
