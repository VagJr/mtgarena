/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Daily MTG News & Spoilers Page
   ═══════════════════════════════════════════════════════════════ */

const NewsPage = {
  newsList: [],

  async render() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-md);">
        <div class="section-header">
          <div>
            <h1 class="section-title">📰 Diário do Multiverso</h1>
            <p style="font-size:0.8rem;color:var(--text-muted);">Notícias oficiais, metagame, lançamentos e spoilers atualizados automaticamente.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="NewsPage.loadNews()">🔄 Atualizar Feed</button>
        </div>

        <div id="news-grid" class="news-grid">${CardDisplay.renderSkeleton(4)}</div>
      </div>

      <style>
        .news-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-md);
          margin-top: var(--space-sm);
        }
        .news-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-md);
        }
        .news-card:hover {
          border-color: var(--border-gold);
          transform: translateY(-3px);
          box-shadow: var(--shadow-xl), 0 0 20px rgba(212,160,23,0.2);
        }
        .news-card-img-wrapper {
          width: 100%;
          height: 170px;
          position: relative;
          background: #111;
          overflow: hidden;
        }
        .news-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .news-card:hover .news-card-img {
          transform: scale(1.04);
        }
        .news-card-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 2px 8px;
          background: rgba(0,0,0,0.8);
          border: 1px solid var(--mana-gold);
          color: var(--mana-gold-glow);
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }
        .news-card-body {
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .news-card-source {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .news-card-title {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          color: var(--text-primary);
          line-height: 1.3;
          margin: 0 0 8px;
        }
        .news-card-summary {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 var(--space-md);
          flex: 1;
        }
        .news-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 8px;
          margin-top: auto;
        }
        .news-card-date {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
      </style>
    `;

    this.loadNews();
  },

  async loadNews() {
    try {
      const data = await API.getNews();
      this.newsList = data.data || [];
      this.renderNewsList(this.newsList);
    } catch(err) {
      showToast('Erro ao carregar notícias', 'error');
    }
  },

  renderNewsList(list) {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>Nenhuma notícia encontrada no momento.</p></div>';
      return;
    }

    grid.innerHTML = list.map(n => `
      <div class="news-card">
        <div class="news-card-img-wrapper">
          <img class="news-card-img" src="${n.image}" alt="${n.title}" onerror="this.src='https://api.scryfall.com/cards/named?exact=Black%20Lotus&format=image&version=art_crop'">
          <span class="news-card-badge">${n.category || 'MTG'}</span>
        </div>
        <div class="news-card-body">
          <div class="news-card-source">📡 ${n.source}</div>
          <h2 class="news-card-title">${n.title}</h2>
          <p class="news-card-summary">${n.summary}</p>
          <div class="news-card-footer">
            <span class="news-card-date">🕒 ${new Date(n.date).toLocaleDateString('pt-BR')}</span>
            <a href="${n.url}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Ler Matéria ↗</a>
          </div>
        </div>
      </div>
    `).join('');
  }
};
