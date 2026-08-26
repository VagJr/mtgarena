/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Main App Controller
   SPA Router, State Management, Initialization
   ═══════════════════════════════════════════════════════════════ */

// Global State
const AppState = {
  user: null,
  currentRoute: '/',
  currentRoom: null
};

// Route map
const routes = {
  '/': HomePage,
  '/collection': CollectionPage,
  '/search': SearchPage,
  '/decks': DeckBuilderPage,
  '/boosters': BoosterPage,
  '/play': GameLobbyPage,
  '/social': SocialPage,
  '/market': MarketPage,
  '/meta': MetaPage,
  '/news': NewsPage,
  '/profile': ProfilePage
};

// Router
function navigateTo(path) {
  AppState.currentRoute = path;
  window.history.pushState({}, '', path);
  renderCurrentPage();
  updateActiveNav();
}

function renderCurrentPage() {
  const page = routes[AppState.currentRoute];
  if (page && page.render) {
    page.render();
  } else {
    // 404
    document.getElementById('app').innerHTML = `
      <div class="container page-enter" style="padding-top:80px;text-align:center;">
        <div class="empty-state">
          <div class="empty-state-icon">🌀</div>
          <div class="empty-state-title">Plano Não Encontrado</div>
          <p class="empty-state-text">Esta dimensão não existe no multiverso.</p>
          <button class="btn btn-primary mt-lg" onclick="navigateTo('/')">Voltar ao Início</button>
        </div>
      </div>`;
  }
}

function updateActiveNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.route === AppState.currentRoute);
  });
}

function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  const economy = document.getElementById('nav-economy');
  const goldEl = document.getElementById('user-gold');
  const gemsEl = document.getElementById('user-gems');
  const mobileHeader = document.getElementById('mobile-nav-user-header');
  const mobileName = document.getElementById('mobile-user-name');
  const mobileStats = document.getElementById('mobile-user-stats');

  if (AppState.user) {
    authBtn.textContent = AppState.user.username;
    authBtn.onclick = () => {
      if (confirm('Deslogar?')) {
        API.setToken(null);
        AppState.user = null;
        updateAuthUI();
        navigateTo('/');
        showToast('Até logo, Planeswalker! 👋', 'info');
      }
    };
    economy.style.display = 'flex';
    goldEl.textContent = `🪙 ${AppState.user.gold || 0}`;
    gemsEl.textContent = `💎 ${AppState.user.gems || 0}`;

    if (mobileHeader) {
      mobileHeader.style.display = 'block';
      if (mobileName) mobileName.textContent = AppState.user.username;
      if (mobileStats) mobileStats.textContent = `🪙 ${AppState.user.gold || 0} Gold • 💎 ${AppState.user.gems || 0} Gems • Nível ${AppState.user.level || 1}`;
    }

    // Re-register social presence
    if (window.SocialDock && SocialDock.socket) {
      SocialDock.socket.emit('social:register', {
        id: AppState.user.id,
        username: AppState.user.username,
        avatar: AppState.user.avatar || '🧙',
        level: AppState.user.level || 1,
        status: 'No Saguão'
      });
    }
  } else {
    authBtn.textContent = 'Entrar';
    authBtn.onclick = showAuthModal;
    economy.style.display = 'none';
    if (mobileHeader) mobileHeader.style.display = 'none';
  }
}

// Navigation event listeners
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.route);
  });
});

document.querySelector('.nav-brand')?.addEventListener('click', () => navigateTo('/'));

// Handle browser back/forward
window.addEventListener('popstate', () => {
  AppState.currentRoute = window.location.pathname;
  renderCurrentPage();
  updateActiveNav();
});

// Close modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.zone-overlay').forEach(z => z.remove());
  }
});

// Initialize App
async function initApp() {
  // Check for existing token
  if (API.token) {
    try {
      AppState.user = await API.getMe();
    } catch (err) {
      API.setToken(null);
    }
  }

  updateAuthUI();

  // Parse initial route
  AppState.currentRoute = window.location.pathname || '/';
  if (!routes[AppState.currentRoute]) AppState.currentRoute = '/';

  // Render initial page
  renderCurrentPage();
  updateActiveNav();

  // Initialize Real-time Social Dock
  if (window.SocialDock) {
    SocialDock.init();
  }

  // Hide loading screen
  setTimeout(() => {
    const loading = document.getElementById('loading-screen');
    if (loading) loading.classList.add('hidden');
  }, 1500);
}

// Start
initApp();
