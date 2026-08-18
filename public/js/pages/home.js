/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Home Page
   ═══════════════════════════════════════════════════════════════ */

const HomePage = {
  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page-enter">
        <!-- Hero Section -->
        <section class="hero-section">
          <div class="hero-bg"></div>
          <div class="container hero-content">
            <h1 class="hero-title">
              <span class="hero-title-line">Bem-vindo ao</span>
              <span class="hero-title-accent">MTG Arena Social</span>
            </h1>
            <p class="hero-subtitle">A comunidade definitiva de Magic: The Gathering. Colecione, construa decks, abra boosters e jogue no simulador tabletop.</p>
            <div class="hero-actions">
              ${AppState.user
                ? `<button class="btn btn-primary btn-lg" onclick="navigateTo('/boosters')">✨ Abrir Booster</button>
                   <button class="btn btn-secondary btn-lg" onclick="navigateTo('/play')">⚔️ Jogar Agora</button>`
                : `<button class="btn btn-primary btn-lg" onclick="showAuthModal()">⚔️ Entrar no Plano</button>
                   <button class="btn btn-secondary btn-lg" onclick="navigateTo('/search')">🔍 Explorar Cartas</button>`
              }
            </div>
          </div>
        </section>

        <!-- Featured Card -->
        <section class="container" style="margin-top:-40px;position:relative;z-index:2;">
          <div class="featured-card-section panel panel-glass">
            <div class="section-header">
              <h2 class="section-title">✨ Carta do Dia</h2>
              <button class="btn btn-ghost btn-sm" onclick="HomePage.loadRandomCard()">🔄 Outra</button>
            </div>
            <div id="featured-card" class="featured-card-container">
              <div class="skeleton skeleton-card" style="width:250px;"></div>
            </div>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="container mt-lg">
          <h2 class="section-title mb-md">🎯 Portais do Multiverso</h2>
          <div class="quick-actions-grid">
            <div class="quick-action-card" onclick="navigateTo('/boosters')">
              <div class="quick-action-icon">✨</div>
              <h3>Abrir Boosters (15 Cards)</h3>
              <p>Abra boosters autênticos com drop rates reais de todas as coleções.</p>
            </div>
            <div class="quick-action-card" onclick="navigateTo('/play')">
              <div class="quick-action-icon">⚔️</div>
              <h3>Mesa Tabletop</h3>
              <p>Simulador físico com todos os formatos (Standard a Commander).</p>
            </div>
            <div class="quick-action-card" onclick="navigateTo('/social')">
              <div class="quick-action-icon">👥</div>
              <h3>Comunidade & Feed</h3>
              <p>Amigos, DMs, posts, ranking e interação entre Planeswalkers.</p>
            </div>
            <div class="quick-action-card" onclick="CardOCR.showScannerModal()">
              <div class="quick-action-icon">📷</div>
              <h3>OCR & Tradução</h3>
              <p>Reconheça cartas por foto e traduza para Português em tempo real.</p>
            </div>
            <div class="quick-action-card" onclick="navigateTo('/collection')">
              <div class="quick-action-icon">📚</div>
              <h3>Minha Coleção</h3>
              <p>Gerencie seu acervo de cartas com acabamento foil e stats.</p>
            </div>
            <div class="quick-action-card" onclick="navigateTo('/decks')">
              <div class="quick-action-icon">🃏</div>
              <h3>Deck Builder</h3>
              <p>Construa, importe e exporte listas para qualquer formato.</p>
            </div>
          </div>
        </section>

        <!-- News Section -->
        <section class="container mt-xl">
          <div class="section-header">
            <div>
              <h2 class="section-title">📰 Notícias & Spoilers do Multiverso</h2>
              <p style="font-size:0.8rem;color:var(--text-muted);">Fique por dentro das novidades diárias do mundo de Magic: The Gathering.</p>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('/news')">Ver Todas ↗</button>
          </div>
          <div id="home-news-preview" class="news-grid" style="margin-top:var(--space-sm);">${CardDisplay.renderSkeleton(3)}</div>
        </section>

        <!-- Stats Section -->
        ${AppState.user ? `
        <section class="container mt-xl mb-lg">
          <h2 class="section-title mb-lg">📊 Seu Progresso</h2>
          <div class="stats-grid" id="home-stats">
            <div class="stat-card">
              <div class="stat-value" id="stat-gold">${AppState.user.gold || 0}</div>
              <div class="stat-label">🪙 Gold</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="stat-gems">${AppState.user.gems || 0}</div>
              <div class="stat-label">💎 Gems</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="stat-level">${AppState.user.level || 1}</div>
              <div class="stat-label">⭐ Level</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="stat-xp">${AppState.user.xp || 0}</div>
              <div class="stat-label">✨ XP</div>
            </div>
          </div>
          <div style="text-align:center;margin-top:var(--space-lg);">
            <button class="btn btn-primary" onclick="HomePage.claimDaily()">🎁 Recompensa Diária</button>
          </div>
        </section>
        ` : ''}

        <div style="height:60px;"></div>
      </div>

      <style>
        .hero-section {
          position: relative;
          padding: 40px 0 60px;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(180deg, rgba(106, 13, 173, 0.15) 0%, rgba(26, 115, 232, 0.08) 50%, transparent 100%);
        }
        .hero-bg::after {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: radial-gradient(ellipse at 30% 40%, rgba(212, 160, 23, 0.08) 0%, transparent 60%);
        }
        .hero-content { position: relative; text-align: center; }
        .hero-title { margin-bottom: var(--space-lg); }
        .hero-title-line {
          display: block;
          font-size: clamp(1rem, 3vw, 1.3rem);
          color: var(--text-secondary);
          font-weight: 400;
        }
        .hero-title-accent {
          display: block;
          font-family: var(--font-heading-decorative);
          font-size: clamp(2rem, 6vw, 3.5rem);
          background: linear-gradient(135deg, var(--mana-gold), var(--text-primary), var(--mana-gold-glow), var(--mana-blue-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 300% 300%;
          animation: shimmer 6s linear infinite;
        }
        .hero-subtitle {
          max-width: 600px;
          margin: 0 auto var(--space-xl);
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          color: var(--text-secondary);
          line-height: 1.7;
        }
        .hero-actions { display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap; }

        .featured-card-container {
          display: flex;
          gap: var(--space-xl);
          align-items: center;
          flex-wrap: wrap;
        }
        .featured-card-image {
          width: 250px;
          flex-shrink: 0;
        }
        .featured-card-info { flex: 1; min-width: 250px; }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-md);
        }
        .quick-action-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          cursor: pointer;
          transition: all var(--transition-normal);
          position: relative;
          overflow: hidden;
        }
        .quick-action-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(135deg, transparent 60%, rgba(212, 160, 23, 0.03));
          transition: all var(--transition-normal);
        }
        .quick-action-card:hover {
          border-color: var(--border-gold);
          transform: translateY(-4px);
          box-shadow: var(--shadow-glow-gold);
        }
        .quick-action-card:hover::before {
          background: linear-gradient(135deg, transparent 40%, rgba(212, 160, 23, 0.08));
        }
        .quick-action-icon { font-size: 2.5rem; margin-bottom: var(--space-md); }
        .quick-action-card h3 {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          margin-bottom: var(--space-sm);
          color: var(--text-primary);
        }
        .quick-action-card p { font-size: 0.85rem; color: var(--text-muted); }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: var(--space-md);
        }
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          text-align: center;
        }
        .stat-value {
          font-family: var(--font-heading-decorative);
          font-size: 2rem;
          color: var(--mana-gold-glow);
          margin-bottom: var(--space-xs);
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
      </style>
    `;

    this.loadRandomCard();
    this.loadNewsPreview();
  },

  async loadNewsPreview() {
    try {
      const data = await API.getNews();
      const container = document.getElementById('home-news-preview');
      if (!container) return;
      const list = (data.data || []).slice(0, 3);
      container.innerHTML = list.map(n => `
        <div class="news-card">
          <div class="news-card-img-wrapper" style="height:140px;">
            <img class="news-card-img" src="${n.image}" alt="${n.title}" onerror="this.src='https://api.scryfall.com/cards/named?exact=Black%20Lotus&format=image&version=art_crop'">
            <span class="news-card-badge">${n.category || 'MTG'}</span>
          </div>
          <div class="news-card-body" style="padding:10px;">
            <div class="news-card-source">📡 ${n.source}</div>
            <h3 style="font-size:0.95rem;margin:0 0 6px;" class="news-card-title">${n.title}</h3>
            <p style="font-size:0.75rem;margin:0 0 10px;" class="news-card-summary">${n.summary.substring(0, 110)}...</p>
            <div class="news-card-footer">
              <span class="news-card-date">🕒 ${new Date(n.date).toLocaleDateString('pt-BR')}</span>
              <a href="${n.url}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Ler ↗</a>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  },

  async loadRandomCard() {
    try {
      const card = await API.getRandomCard('is:firstprint');
      const container = document.getElementById('featured-card');
      if (!container) return;
      container.innerHTML = `
        <div class="featured-card-image">
          ${CardDisplay.render(card, { clickable: true })}
        </div>
        <div class="featured-card-info">
          <h2 style="margin-bottom:var(--space-sm);">${card.name}</h2>
          <div class="mana-cost" style="margin-bottom:var(--space-md);">${ManaSymbols.render(card.mana_cost)}</div>
          <p class="card-detail-type" style="margin-bottom:var(--space-md);">${card.type_line || ''}</p>
          ${card.oracle_text ? `<div class="card-detail-oracle">${CardDisplay.formatOracleText(card.oracle_text)}</div>` : ''}
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
            <span class="badge badge-${card.rarity}">${card.rarity}</span>
            <span class="badge" style="background:var(--bg-tertiary);color:var(--text-secondary);">${card.set_name || ''}</span>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Featured card error:', err);
    }
  },

  async claimDaily() {
    if (!AppState.user) return showToast('Faça login primeiro', 'warning');
    try {
      const data = await API.claimDaily();
      AppState.user.gold = data.balance.gold;
      AppState.user.gems = data.balance.gems;
      AppState.user.xp = data.balance.xp;
      AppState.user.level = data.balance.level;
      updateAuthUI();
      showToast(`🎁 Recompensa: +${data.reward.gold} Gold, +${data.reward.xp} XP!`, 'success');

      const goldEl = document.getElementById('stat-gold');
      const xpEl = document.getElementById('stat-xp');
      if (goldEl) goldEl.textContent = data.balance.gold;
      if (xpEl) xpEl.textContent = data.balance.xp;
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  }
};
