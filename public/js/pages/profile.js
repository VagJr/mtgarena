/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Competitive Player Profile Page
   ═══════════════════════════════════════════════════════════════ */

const ProfilePage = {
  profileData: null,

  async render() {
    if (!AppState.user) {
      document.getElementById('app').innerHTML = `
        <div class="page-enter container" style="padding-top:var(--space-2xl);text-align:center;">
          <div class="empty-state">
            <div class="empty-state-icon">👤</div>
            <div class="empty-state-title">Perfil de Planeswalker</div>
            <p class="empty-state-text">Faça login para visualizar suas estatísticas competitivas, conquistas e personalizar seu perfil.</p>
            <button class="btn btn-primary mt-md" onclick="showAuthModal()">Entrar no Plano</button>
          </div>
        </div>
      `;
      return;
    }

    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-md);">
        <div id="profile-content">${CardDisplay.renderSkeleton(4)}</div>
      </div>
    `;

    this.loadProfile();
  },

  async loadProfile() {
    try {
      const data = await API.getProfile();
      this.profileData = data.profile;
      this.renderProfileView(this.profileData);
    } catch (err) {
      showToast('Erro ao carregar perfil: ' + err.message, 'error');
    }
  },

  renderProfileView(p) {
    const container = document.getElementById('profile-content');
    if (!container) return;

    container.innerHTML = `
      <!-- Profile Header Hero -->
      <div class="profile-hero-card">
        <div class="profile-hero-left">
          <div class="profile-avatar-wrapper" onclick="ProfilePage.showAvatarSelector()" title="Clique para trocar seu avatar">
            <img class="profile-avatar-img" src="${p.avatar || 'https://api.scryfall.com/cards/named?exact=Jace%20the%20Mind%20Sculptor&format=image&version=art_crop'}" alt="${p.username}">
            <div class="profile-avatar-badge">✏️</div>
          </div>
          <div class="profile-user-details">
            <div class="profile-tier-badge">${p.rankingTier} • Elo ${p.elo}</div>
            <h1 class="profile-username">${p.username}</h1>
            <div class="profile-title-tag">👑 ${p.title}</div>
            <p class="profile-bio">${p.bio || 'Planeswalker do multiverso.'}</p>
          </div>
        </div>

        <div class="profile-hero-right">
          <div class="profile-stat-box">
            <span class="profile-stat-num" style="color:var(--mana-gold-glow);">${p.stats.winrate}</span>
            <span class="profile-stat-lbl">Winrate Geral</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-num">${p.stats.wins}V / ${p.stats.losses}D</span>
            <span class="profile-stat-lbl">${p.stats.totalMatches} Partidas</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-num" style="color:#64B5F6;">$${p.stats.collectionValueUsd}</span>
            <span class="profile-stat-lbl">Valor Coleção (USD)</span>
          </div>
        </div>
      </div>

      <!-- Competitive Grid -->
      <div class="profile-sections-grid">
        
        <!-- Column 1: Format Performance -->
        <div class="panel">
          <h2 class="section-subtitle" style="margin-bottom:12px;">📊 Desempenho por Formato</h2>
          <div class="format-rates-list">
            ${Object.entries(p.formatWinrates || {}).map(([fmt, rate]) => `
              <div class="format-rate-row">
                <span class="format-name"><b>${fmt}</b></span>
                <div class="format-progress-bar">
                  <div class="format-progress-fill" style="width:${rate};"></div>
                </div>
                <span class="format-rate-value">${rate}</span>
              </div>
            `).join('')}
          </div>

          <h3 class="section-subtitle" style="margin-top:20px;margin-bottom:8px;">📚 Estatísticas de Coleção</h3>
          <div class="collection-stats-grid">
            <div class="mini-stat-card"><span class="lbl">Total de Cartas</span><b>${p.stats.totalCards}</b></div>
            <div class="mini-stat-card"><span class="lbl">Míticas</span><b style="color:var(--mana-red-glow);">${p.stats.mythicsCount}</b></div>
            <div class="mini-stat-card"><span class="lbl">Raras</span><b style="color:var(--mana-gold-glow);">${p.stats.raresCount}</b></div>
            <div class="mini-stat-card"><span class="lbl">Foils</span><b style="color:#00E5FF;">${p.stats.foilsCount}</b></div>
          </div>
        </div>

        <!-- Column 2: Achievements -->
        <div class="panel">
          <h2 class="section-subtitle" style="margin-bottom:12px;">🏆 Conquistas Desbloqueadas</h2>
          <div class="achievements-list">
            ${(p.achievements || []).map(a => `
              <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${a.icon}</div>
                <div class="achievement-info">
                  <div class="achievement-name">${a.name} ${a.unlocked ? '✅' : '🔒'}</div>
                  <div class="achievement-desc">${a.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <style>
        .profile-hero-card {
          background: linear-gradient(135deg, rgba(20, 16, 38, 0.95), rgba(30, 20, 50, 0.9));
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-lg);
          margin-bottom: var(--space-lg);
          box-shadow: var(--shadow-xl), 0 0 35px rgba(212,160,23,0.15);
        }
        .profile-hero-left {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
        }
        .profile-avatar-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 3px solid var(--mana-gold);
          box-shadow: 0 0 20px var(--mana-gold-glow);
          cursor: pointer;
          overflow: hidden;
          flex-shrink: 0;
        }
        .profile-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .profile-avatar-badge {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.7);
          text-align: center;
          font-size: 0.7rem;
          padding: 2px;
        }
        .profile-tier-badge {
          display: inline-block;
          padding: 2px 10px;
          background: rgba(212, 160, 23, 0.18);
          border: 1px solid var(--mana-gold);
          color: var(--mana-gold-glow);
          font-size: 0.72rem;
          font-weight: 700;
          border-radius: var(--radius-full);
          margin-bottom: 4px;
        }
        .profile-username {
          font-family: var(--font-heading);
          font-size: 1.8rem;
          margin: 0 0 2px;
          color: var(--text-primary);
        }
        .profile-title-tag {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .profile-bio {
          font-size: 0.8rem;
          color: var(--text-muted);
          max-width: 420px;
          margin: 0;
        }
        .profile-hero-right {
          display: flex;
          gap: 12px;
        }
        .profile-stat-box {
          background: rgba(0,0,0,0.4);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 12px 18px;
          text-align: center;
          min-width: 110px;
        }
        .profile-stat-num {
          display: block;
          font-family: var(--font-mono);
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--text-primary);
        }
        .profile-stat-lbl {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .profile-sections-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        .format-rates-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .format-rate-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
        }
        .format-name { width: 90px; }
        .format-progress-bar {
          flex: 1;
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .format-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--mana-blue), var(--mana-gold));
          border-radius: var(--radius-full);
        }
        .format-rate-value {
          width: 40px;
          text-align: right;
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--mana-gold-glow);
        }

        .collection-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .mini-stat-card {
          background: var(--bg-tertiary);
          padding: 8px;
          border-radius: var(--radius-md);
          text-align: center;
          border: 1px solid var(--border-subtle);
        }
        .mini-stat-card .lbl { display: block; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 2px; }

        .achievements-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .achievement-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          transition: all 0.2s ease;
        }
        .achievement-item.unlocked {
          border-color: rgba(76, 175, 80, 0.4);
          background: rgba(76, 175, 80, 0.05);
        }
        .achievement-item.locked {
          opacity: 0.5;
        }
        .achievement-icon { font-size: 1.6rem; }
        .achievement-name { font-weight: 700; font-size: 0.85rem; color: var(--text-primary); }
        .achievement-desc { font-size: 0.72rem; color: var(--text-muted); }

        @media (max-width: 768px) {
          .profile-hero-card { flex-direction: column; text-align: center; }
          .profile-hero-left { flex-direction: column; }
          .profile-sections-grid { grid-template-columns: 1fr; }
          .collection-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      </style>
    `;
  },

  showAvatarSelector() {
    const avatarList = [
      { name: 'Jace Beleren', uri: 'https://api.scryfall.com/cards/named?exact=Jace%20the%20Mind%20Sculptor&format=image&version=art_crop' },
      { name: 'Chandra Nalaar', uri: 'https://api.scryfall.com/cards/named?exact=Chandra,%20Torch%20of%20Defiance&format=image&version=art_crop' },
      { name: 'Liliana Vess', uri: 'https://api.scryfall.com/cards/named?exact=Liliana%20of%20the%20Veil&format=image&version=art_crop' },
      { name: 'Nicol Bolas', uri: 'https://api.scryfall.com/cards/named?exact=Nicol%20Bolas,%20the%20Ravager&format=image&version=art_crop' },
      { name: 'Teferi', uri: 'https://api.scryfall.com/cards/named?exact=Teferi,%20Hero%20of%20Dominaria&format=image&version=art_crop' },
      { name: 'Ajani Goldmane', uri: 'https://api.scryfall.com/cards/named?exact=Ajani%20Goldmane&format=image&version=art_crop' }
    ];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2 style="margin-bottom:12px;color:var(--mana-gold-glow);">👤 Escolha seu Avatar de Planeswalker</h2>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-top:12px;">
          ${avatarList.map(a => `
            <div style="cursor:pointer;text-align:center;" onclick="ProfilePage.selectAvatar('${a.uri}'); this.closest('.modal-overlay').remove();">
              <img src="${a.uri}" style="width:100%;aspect-ratio:1/1;border-radius:50%;object-fit:cover;border:2px solid var(--border-gold);" alt="${a.name}">
              <div style="font-size:0.72rem;margin-top:4px;font-weight:600;">${a.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  async selectAvatar(uri) {
    try {
      await API.updateProfile({ avatar: uri });
      showToast('Avatar atualizado! ✨', 'success');
      this.loadProfile();
    } catch(e) {
      showToast('Erro ao atualizar avatar: ' + e.message, 'error');
    }
  }
};
