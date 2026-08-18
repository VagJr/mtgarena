/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — PWA Mobile Installer & Android Prompt
   ═══════════════════════════════════════════════════════════════ */

const PWAInstaller = {
  deferredPrompt: null,
  isInstalled: false,

  init() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('📱 Service Worker registrado:', reg.scope))
          .catch((err) => console.warn('Service Worker erro:', err));
      });
    }

    // 2. Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      this.isInstalled = true;
      return;
    }

    // 3. Catch Android / Chrome PWA install event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('📱 beforeinstallprompt capturado!');

      // If user hasn't dismissed recently, show the install popup
      const dismissed = localStorage.getItem('mtg_pwa_dismissed_time');
      const oneDay = 24 * 60 * 60 * 1000;
      if (!dismissed || (Date.now() - parseInt(dismissed) > oneDay)) {
        setTimeout(() => this.showInstallBanner(), 1800);
      }
    });

    // 4. App successfully installed
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.closeInstallBanner();
      if (typeof showToast === 'function') {
        showToast('⚔️ MTG Arena Social instalado com sucesso na sua Área de Trabalho!', 'success', 4000);
      }
    });

    // 5. Check for iOS Safari mobile
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS && isMobile && !this.isInstalled) {
      const dismissed = localStorage.getItem('mtg_pwa_dismissed_time');
      if (!dismissed) {
        setTimeout(() => this.showIOSBanner(), 3500);
      }
    }
  },

  showInstallBanner() {
    if (this.isInstalled) return;
    const existing = document.getElementById('pwa-install-modal');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = 'pwa-install-modal';
    overlay.className = 'pwa-install-overlay';
    overlay.innerHTML = `
      <div class="pwa-install-card">
        <button class="modal-close" style="position:absolute;top:10px;right:10px;" onclick="PWAInstaller.dismissBanner()">✕</button>
        
        <div class="pwa-install-header">
          <div class="pwa-logo-box">
            <img src="/logomtg.png" alt="MTG Arena Logo" class="pwa-app-icon">
          </div>
          <div class="pwa-app-details">
            <h3 class="pwa-app-title">MTG Arena Social</h3>
            <span class="pwa-app-sub">Instalar App na Área de Trabalho</span>
            <div class="pwa-app-badges">
              <span class="badge badge-mythic">⚡ PWA Nativo</span>
              <span class="badge badge-rare">📱 Android & Mobile</span>
            </div>
          </div>
        </div>

        <p class="pwa-app-desc">
          Jogue Magic: The Gathering em tela cheia com máxima performance, sem barra de navegação e com acesso instantâneo da sua tela inicial!
        </p>

        <div class="pwa-actions-row">
          <button class="btn btn-ghost btn-sm" onclick="PWAInstaller.dismissBanner()">Depois</button>
          <button class="btn btn-primary btn-lg pwa-install-btn" onclick="PWAInstaller.triggerInstall()">
            📲 Instalar Aplicativo
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  },

  showIOSBanner() {
    const existing = document.getElementById('pwa-install-modal');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = 'pwa-install-modal';
    overlay.className = 'pwa-install-overlay';
    overlay.innerHTML = `
      <div class="pwa-install-card">
        <button class="modal-close" style="position:absolute;top:10px;right:10px;" onclick="PWAInstaller.dismissBanner()">✕</button>
        
        <div class="pwa-install-header">
          <div class="pwa-logo-box">
            <img src="/logomtg.png" alt="MTG Arena Logo" class="pwa-app-icon">
          </div>
          <div class="pwa-app-details">
            <h3 class="pwa-app-title">MTG Arena Social</h3>
            <span class="pwa-app-sub">Adicionar à Tela de Início no iPhone/iPad</span>
          </div>
        </div>

        <div style="background:var(--bg-tertiary);padding:10px;border-radius:8px;font-size:0.8rem;line-height:1.5;margin:10px 0;border-left:3px solid var(--mana-gold);">
          <b>Como instalar no iOS Safari:</b><br>
          1. Toque no botão de <b>Compartilhar [ ⎋ ]</b> na barra do Safari.<br>
          2. Role e selecione <b>"Adicionar à Tela de Início" ➕</b>.<br>
          3. Toque em <b>"Adicionar"</b> no topo direito!
        </div>

        <button class="btn btn-primary btn-full" onclick="PWAInstaller.dismissBanner()">Entendi!</button>
      </div>
    `;

    document.body.appendChild(overlay);
  },

  async triggerInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`📱 Resultado da instalação PWA: ${outcome}`);
      if (outcome === 'accepted') {
        this.closeInstallBanner();
      }
      this.deferredPrompt = null;
    } else {
      if (typeof showToast === 'function') {
        showToast('Para instalar, clique no menu do navegador (⋮) e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".', 'info', 4500);
      }
      this.closeInstallBanner();
    }
  },

  dismissBanner() {
    localStorage.setItem('mtg_pwa_dismissed_time', Date.now().toString());
    this.closeInstallBanner();
  },

  closeInstallBanner() {
    const el = document.getElementById('pwa-install-modal');
    if (el) el.remove();
  }
};

// Initialize PWA listener
PWAInstaller.init();
