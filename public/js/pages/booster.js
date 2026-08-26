/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Booster Opening (Real-Time Physical Tear Physics)
   ═══════════════════════════════════════════════════════════════ */

const BoosterPage = {
  sets: [],
  opening: false,
  openedCards: [],
  tearProgress: 0,

  async render() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-md);">
        <div class="section-header">
          <div>
            <h1 class="section-title">✨ Abertura de Boosters</h1>
            <p style="font-size:0.8rem;color:var(--text-muted);">Coleções oficiais do MTG com 15 cartas físicas por pacote e física de rasgo real.</p>
          </div>
          <div id="booster-balance" class="flex gap-sm">
            ${AppState.user ? `<span class="currency gold-currency">🪙 ${AppState.user.gold||0}</span><span class="currency gem-currency">💎 ${AppState.user.gems||0}</span>` : ''}
          </div>
        </div>

        ${!AppState.user ? `
          <div class="empty-state">
            <div class="empty-state-icon">🔒</div>
            <div class="empty-state-title">Login Necessário</div>
            <p class="empty-state-text">Faça login para abrir boosters e colecionar cartas.</p>
            <button class="btn btn-primary mt-md" onclick="showAuthModal()">Entrar no Plano</button>
          </div>
        ` : `
          <div class="search-bar" style="margin-bottom:var(--space-md);max-width:100%;">
            <span class="search-bar-icon">🔍</span>
            <input type="text" id="set-search" placeholder="Buscar coleção por nome ou código (ex: BLB, OTJ, MH3, DMU, NEO)..." oninput="BoosterPage.filterSets(this.value)">
          </div>

          <div id="sets-grid" class="sets-grid">${CardDisplay.renderSkeleton(8)}</div>
        `}
      </div>

      <style>
        .sets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: var(--space-sm);
        }
        .set-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
          position: relative;
        }
        .set-card:hover {
          border-color: var(--border-gold);
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow-gold);
        }
        .set-card-icon { font-size: 2rem; margin-bottom: 4px; }
        .set-card-name {
          font-family: var(--font-heading);
          font-size: 0.85rem;
          color: var(--text-primary);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .set-card-info { font-size: 0.7rem; color: var(--text-muted); }
        .set-card-cost {
          margin-top: 6px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--mana-gold-glow);
          background: rgba(212, 160, 23, 0.1);
          padding: 2px 6px;
          border-radius: var(--radius-full);
          display: inline-block;
        }
      </style>
    `;

    if (AppState.user) this.loadSets();
  },

  async loadSets() {
    try {
      const data = await API.getSets();
      this.sets = (data.data || []).filter(s =>
        s.set_type === 'expansion' || s.set_type === 'core' || s.set_type === 'masters' || s.set_type === 'draft_innovation'
      );
      this.renderSets(this.sets);
    } catch(e) {
      showToast('Erro ao carregar coleções', 'error');
    }
  },

  renderSets(sets) {
    const grid = document.getElementById('sets-grid');
    if (!grid) return;

    grid.innerHTML = sets.slice(0, 60).map(s => `
      <div class="set-card" onclick="BoosterPage.prepareBoosterOpening('${s.code}','${s.name.replace(/'/g,"\\'")}')">
        ${s.icon_svg_uri ? `<img src="${s.icon_svg_uri}" style="width:28px;height:28px;margin-bottom:4px;filter:invert(1) brightness(0.85);" alt="${s.name}">` : '<div class="set-card-icon">📦</div>'}
        <div class="set-card-name" title="${s.name}">${s.name}</div>
        <div class="set-card-info">${(s.code||'').toUpperCase()} • ${s.released_at ? s.released_at.substring(0,4) : ''} • ${s.card_count} cartas</div>
        <div class="set-card-cost">🪙 200 Gold</div>
      </div>
    `).join('');
  },

  filterSets(term) {
    const t = term.toLowerCase().trim();
    const filtered = this.sets.filter(s =>
      s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t)
    );
    this.renderSets(filtered);
  },

  prepareBoosterOpening(setCode, setName) {
    if (!AppState.user) return showAuthModal();
    this.pendingSetCode = setCode;
    this.pendingSetName = setName;
    this.opening = false;
    this.tearProgress = 0;

    const overlay = document.getElementById('booster-reveal');
    const stagePack = document.getElementById('booster-stage-pack');
    const stageCards = document.getElementById('booster-stage-cards');
    const packName = document.getElementById('pack-set-name');

    // Reset visual pieces
    const cap = document.getElementById('pack-cap-piece');
    const body = document.getElementById('pack-body-piece');
    const fill = document.getElementById('tear-track-fill');
    const handle = document.getElementById('tear-tab-handle');
    const glow = document.getElementById('cards-peek-glow');

    if (cap) {
      cap.style.transform = '';
      cap.classList.remove('pack-cap-flyoff');
    }
    if (body) {
      body.classList.remove('pack-body-burst');
    }
    if (fill) fill.style.width = '0%';
    if (handle) {
      handle.style.left = '0px';
      handle.style.transition = '';
    }
    if (glow) glow.style.opacity = '0';

    if (packName) packName.textContent = setName || setCode.toUpperCase();
    if (stagePack) stagePack.style.display = 'flex';
    if (stageCards) stageCards.style.display = 'none';
    if (overlay) {
      overlay.style.display = 'flex';
      document.body.classList.add('modal-open');
    }

    this.initTearSlider();
  },

  initTearSlider() {
    const handle = document.getElementById('tear-tab-handle');
    const track = document.getElementById('tear-track');
    const cap = document.getElementById('pack-cap-piece');
    const fill = document.getElementById('tear-track-fill');
    const glow = document.getElementById('cards-peek-glow');
    const hint = document.getElementById('tear-hint-text');

    if (!handle || !track) return;

    let isDragging = false;

    const updatePhysics = (clientX) => {
      const trackRect = track.getBoundingClientRect();
      const maxDist = trackRect.width - handle.offsetWidth;
      let currentX = clientX - trackRect.left - handle.offsetWidth / 2;
      currentX = Math.max(0, Math.min(maxDist, currentX));

      const progress = currentX / maxDist;
      this.tearProgress = progress;

      handle.style.left = `${currentX}px`;
      if (fill) fill.style.width = `${progress * 100}%`;

      // Real-time physical bend of the top cap
      if (cap) {
        const translateY = -progress * 26;
        const rotateZ = progress * 18;
        const rotateX = progress * 32;
        cap.style.transform = `translateY(${translateY}px) rotateZ(${rotateZ}deg) rotateX(${rotateX}deg)`;
      }

      // Inside mana glow shines brighter as the tear widens
      if (glow) {
        glow.style.opacity = `${progress * 0.95}`;
      }

      if (hint) {
        if (progress > 0.4) hint.textContent = '⚡ RASGANDO... QUASE LÁ!';
        else hint.textContent = '👉 ARRASTE PARA RASGAR';
      }

      // If dragged past 82%, complete the tear!
      if (progress >= 0.82 && !this.opening) {
        isDragging = false;
        this.executeTearRelease();
      }
    };

    const onDown = (e) => {
      if (this.opening) return;
      isDragging = true;
      try { handle.setPointerCapture(e.pointerId); } catch(err) {}
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      updatePhysics(clientX);
    };

    const onMove = (e) => {
      if (!isDragging || this.opening) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      updatePhysics(clientX);
    };

    const onUp = () => {
      if (!isDragging || this.opening) return;
      isDragging = false;

      if (this.tearProgress >= 0.75) {
        this.executeTearRelease();
      } else {
        // Elastic snap-back
        handle.style.transition = 'left 0.25s ease';
        handle.style.left = '0px';
        if (fill) {
          fill.style.transition = 'width 0.25s ease';
          fill.style.width = '0%';
        }
        if (cap) {
          cap.style.transition = 'transform 0.25s ease';
          cap.style.transform = '';
        }
        if (glow) {
          glow.style.transition = 'opacity 0.25s ease';
          glow.style.opacity = '0';
        }
        if (hint) hint.textContent = '👉 ARRASTE PARA RASGAR';

        setTimeout(() => {
          handle.style.transition = '';
          if (fill) fill.style.transition = '';
          if (cap) cap.style.transition = '';
          if (glow) glow.style.transition = '';
        }, 260);
      }
    };

    handle.onpointerdown = onDown;
    track.onpointerdown = onDown;
    window.onpointermove = onMove;
    window.onpointerup = onUp;
  },

  triggerAutoTear() {
    if (this.opening) return;
    const handle = document.getElementById('tear-tab-handle');
    const track = document.getElementById('tear-track');
    const fill = document.getElementById('tear-track-fill');
    const cap = document.getElementById('pack-cap-piece');
    const glow = document.getElementById('cards-peek-glow');

    if (handle && track) {
      const maxDist = track.offsetWidth - handle.offsetWidth;
      handle.style.transition = 'left 0.35s ease';
      handle.style.left = `${maxDist}px`;
      if (fill) {
        fill.style.transition = 'width 0.35s ease';
        fill.style.width = '100%';
      }
      if (cap) {
        cap.style.transition = 'transform 0.35s ease';
        cap.style.transform = 'translateY(-24px) rotateZ(16deg) rotateX(30deg)';
      }
      if (glow) {
        glow.style.transition = 'opacity 0.35s ease';
        glow.style.opacity = '1';
      }
      setTimeout(() => this.executeTearRelease(), 360);
    } else {
      this.executeTearRelease();
    }
  },

  async executeTearRelease() {
    if (this.opening) return;
    this.opening = true;

    const cap = document.getElementById('pack-cap-piece');
    const body = document.getElementById('pack-body-piece');

    // Trigger explosive release animation
    if (cap) cap.classList.add('pack-cap-flyoff');
    if (body) body.classList.add('pack-body-burst');

    try {
      const setCode = this.pendingSetCode || 'blb';
      const setName = this.pendingSetName || 'Bloomburrow';

      const data = await API.openBooster(setCode);
      AppState.user.gold = data.balance.gold;
      AppState.user.gems = data.balance.gems;
      AppState.user.xp = data.balance.xp;
      AppState.user.level = data.balance.level;
      updateAuthUI();

      this.openedCards = data.cards || [];

      const balEl = document.getElementById('booster-balance');
      if (balEl) balEl.innerHTML = `<span class="currency gold-currency">🪙 ${data.balance.gold}</span><span class="currency gem-currency">💎 ${data.balance.gems}</span>`;

      setTimeout(() => {
        const stagePack = document.getElementById('booster-stage-pack');
        const stageCards = document.getElementById('booster-stage-cards');
        const title = document.getElementById('reveal-title');
        const packCount = document.getElementById('reveal-pack-count');
        const container = document.getElementById('reveal-cards-container');

        if (stagePack) stagePack.style.display = 'none';
        if (stageCards) stageCards.style.display = 'flex';

        title.textContent = `✨ Booster: ${setName || setCode.toUpperCase()}`;
        packCount.textContent = `${this.openedCards.length} cartas físicas adicionadas à sua coleção (+25 XP)`;

        container.innerHTML = this.openedCards.map((c, i) => `
          <div class="booster-card-item" style="animation-delay:${i * 0.05}s">
            <div class="mtg-card rarity-${c.rarity} ${c.foil ? 'foil' : ''}" onclick="showCardDetail('${c.card_id}')">
              <img src="${c.image_uri || c.image_small}" alt="${c.card_name}" loading="lazy">
              <div class="card-foil-overlay"></div>
            </div>
            <div class="booster-card-footer">
              <span class="badge badge-${c.rarity}">${c.rarity}</span>
              ${c.foil ? '<span style="color:var(--mana-gold-glow);font-weight:700;">✨ FOIL</span>' : ''}
            </div>
          </div>
        `).join('');

        const hasMythic = this.openedCards.some(c => c.rarity === 'mythic');
        if (hasMythic) {
          showToast('🔥 PULL ÉPICO! Carta Mítica no booster!', 'success', 4500);
        }
      }, 650);

    } catch(e) {
      showToast('Erro ao abrir booster: ' + e.message, 'error');
      this.closeReveal();
    }
    this.opening = false;
  },

  closeReveal() {
    const overlay = document.getElementById('booster-reveal');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
};
