/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Onboarding Page
   Tutorial flow for new players
   ═══════════════════════════════════════════════════════════════ */

const OnboardingPage = {
  steps: [
    {
      icon: '🌟',
      title: 'Bem-vindo, Planeswalker!',
      description: 'Você foi convocado para o multiverso de Magic: The Gathering! Vamos te guiar pelos primeiros passos.',
      action: null
    },
    {
      icon: '🔍',
      title: 'Explore o Multiverso',
      description: 'Use a busca para encontrar cartas por nome, cor ou tipo. Experimente buscar por "Lightning Bolt"!',
      action: { label: 'Ir para Busca', route: '/search' }
    },
    {
      icon: '📚',
      title: 'Sua Coleção',
      description: 'Suas cartas ficam na Coleção. Comece abrindo um booster para adicionar cartas!',
      action: { label: 'Abrir Booster', route: '/boosters' }
    },
    {
      icon: '🃏',
      title: 'Construa seu Deck',
      description: 'Monte um deck com suas cartas. Você pode importar decks prontos ou criar do zero.',
      action: { label: 'Criar Deck', route: '/decks' }
    },
    {
      icon: '⚔️',
      title: 'Entre na Mesa',
      description: 'Pronto para jogar? Crie uma sala e desafie outros Planeswalkers!',
      action: { label: 'Criar Sala', route: '/play' }
    },
    {
      icon: '📋',
      title: 'Complete Missões',
      description: 'Missões diárias e semanais te recompensam com Gold, XP e itens especiais.',
      action: { label: 'Ver Missões', route: '/missions' }
    },
    {
      icon: '🎨',
      title: 'Personalize',
      description: 'Use Gold e Gems na Loja para comprar voltas, skins de mesa e emotes.',
      action: { label: 'Ir à Loja', route: '/shop' }
    },
    {
      icon: '🎁',
      title: 'Recompensa de Boas-Vindas!',
      description: 'Como presente, você ganhou 500 Gold e 50 Gems! Bem-vindo à comunidade!',
      action: { label: 'Começar!', route: '/', reward: true }
    }
  ],

  currentStep: 0,

  async render() {
    if (!AppState.user) {
      document.getElementById('app').innerHTML = `
        <div class="container page-enter" style="padding-top:80px;text-align:center;">
          <div class="empty-state">
            <div class="empty-state-icon">🔒</div>
            <div class="empty-state-title">Faça Login Primeiro</div>
            <p class="empty-state-text">Entre na sua conta para começar o tutorial.</p>
            <button class="btn btn-primary mt-lg" onclick="showAuthModal()">Entrar</button>
          </div>
        </div>`;
      return;
    }

    this.currentStep = 0;
    this.renderStep();
  },

  renderStep() {
    const step = this.steps[this.currentStep];
    const app = document.getElementById('app');
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;

    app.innerHTML = `
      <div class="container page-enter" style="padding-top:80px;max-width:600px;margin:0 auto;padding-bottom:40px;">
        <div style="margin-bottom:24px;">
          <div style="height:4px;background:var(--surface-elevated);border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${progress}%;background:var(--accent-primary);border-radius:2px;transition:width 0.3s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.75rem;color:var(--text-muted);">
            <span>Passo ${this.currentStep + 1} de ${this.steps.length}</span>
            <span>${Math.round(progress)}%</span>
          </div>
        </div>

        <div style="background:var(--surface-card);border:1px solid var(--border-subtle);border-radius:16px;padding:40px 32px;text-align:center;">
          <div style="font-size:4rem;margin-bottom:16px;">${step.icon}</div>
          <h2 style="color:var(--text-primary);margin:0 0 12px;font-size:1.4rem;">${step.title}</h2>
          <p style="color:var(--text-secondary);margin:0 0 28px;line-height:1.6;">${step.description}</p>

          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            ${this.currentStep > 0 ? `<button class="btn btn-ghost" onclick="OnboardingPage.prevStep()">← Voltar</button>` : ''}
            ${step.action ? `
              <button class="btn btn-primary" onclick="OnboardingPage.handleAction('${step.action.route}', ${step.action.reward || false})">
                ${step.action.label}
              </button>
            ` : `
              <button class="btn btn-primary" onclick="OnboardingPage.nextStep()">Continuar →</button>
            `}
          </div>
        </div>

        <div style="text-align:center;margin-top:20px;">
          <button class="btn btn-ghost btn-sm" onclick="OnboardingPage.skip()" style="font-size:0.8rem;color:var(--text-muted);">
            Pular Tutorial
          </button>
        </div>
      </div>
    `;
  },

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    }
  },

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  },

  async handleAction(route, reward) {
    if (reward) {
      try {
        await API.claimDaily();
        showToast('🎁 Recompensa de boas-vindas coletada!', 'success');
      } catch (e) { /* ignore */ }
    }
    navigateTo(route);
  },

  skip() {
    if (confirm('Pular o tutorial? Você pode acessar depois pela página de Missões.')) {
      navigateTo('/');
    }
  }
};
