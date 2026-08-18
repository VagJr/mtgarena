/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Game Engine (PC Controls, Radar Pings, RMB & Zoom)
   ═══════════════════════════════════════════════════════════════ */

const GameEngine = {
  socket: null,
  roomId: null,
  room: null,
  isSpectator: false,
  manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
  selectedCardId: null,
  attackingCardId: null,
  shortcutsBound: false,

  init(socket, roomId, room, spectator = false) {
    this.socket = socket;
    this.roomId = roomId;
    this.room = room;
    this.isSpectator = spectator;

    GameBoard.render(room, AppState.user?.username);
    this.setupListeners();

    document.addEventListener('card-dropped', (e) => this.handleCardDrop(e.detail));

    // Close context menu on global click
    window.addEventListener('click', () => this.closeContextMenu());

    if (!localStorage.getItem('mtg_onboarding_seen')) {
      setTimeout(() => this.showOnboardingModal(), 600);
    }
  },

  setupListeners() {
    const s = this.socket;

    s.on('game:cardDrawn', (data) => {
      const hand = document.getElementById('my-hand');
      if (hand) hand.insertAdjacentHTML('beforeend', CardRenderer.renderHandCard(data.card));
      const libCount = document.getElementById('playmat-library-count');
      if (libCount) libCount.textContent = data.libraryCount;
    });

    s.on('game:cardPlayed', (data) => {
      const nameLower = (data.card.name || '').toLowerCase();
      const typeLower = (data.card.type_line || '').toLowerCase();
      const isLand = typeLower.includes('land') ||
                     nameLower.includes('floresta') || nameLower.includes('forest') ||
                     nameLower.includes('ilha') || nameLower.includes('island') ||
                     nameLower.includes('planície') || nameLower.includes('plains') ||
                     nameLower.includes('pântano') || nameLower.includes('swamp') ||
                     nameLower.includes('montanha') || nameLower.includes('mountain');
      const isSupport = isLand || typeLower.includes('artifact') || typeLower.includes('enchantment');
      const isCreature = !isLand && (typeLower.includes('creature') || (data.card.power !== undefined && data.card.power !== ''));

      if (data.player === AppState.user?.username) {
        const handCard = document.querySelector(`#my-hand [data-card-id="${data.card.id}"]`);
        if (handCard) handCard.remove();

        const targetRow = (isSupport && !isCreature)
          ? (document.getElementById('my-backline') || document.getElementById('my-frontline'))
          : (document.getElementById('my-frontline') || document.getElementById('my-backline'));

        if (targetRow) targetRow.insertAdjacentHTML('beforeend', CardRenderer.renderBattlefieldCard(data.card, true));
      } else {
        const oppRow = (isSupport && !isCreature)
          ? document.querySelector('#opponent-battlefield')
          : document.querySelector('#opponent-battlefield .frontline-combat-zone');
        if (oppRow) oppRow.insertAdjacentHTML('beforeend', CardRenderer.renderBattlefieldCard(data.card, false));
      }
      VFXEngine.castSpell(data.card.colors?.[0] || 'C');
      this.addSystemChat(`${data.player} conjurou ${data.card.name}`);
    });

    s.on('game:cardTapped', (data) => {
      const card = document.querySelector(`[data-card-id="${data.cardId}"]`);
      if (card) card.classList.toggle('tapped', data.tapped);
    });

    s.on('game:cardMoved', (data) => {
      // Update local room state for accurate zone contents
      if (this.room && this.room.players) {
        const player = this.room.players.find(p => p.username === data.player);
        if (player) {
          if (!player.graveyard) player.graveyard = [];
          if (!player.exile) player.exile = [];
          if (!player.hand) player.hand = [];
          if (!player.battlefield) player.battlefield = [];

          // Remove from origin zone
          if (Array.isArray(player[data.from])) {
            const idx = player[data.from].findIndex(c => c.id === data.cardId);
            if (idx !== -1) player[data.from].splice(idx, 1);
          }

          // Add to destination zone
          if (data.card && Array.isArray(player[data.to])) {
            const exists = player[data.to].some(c => c.id === data.card.id);
            if (!exists) player[data.to].push(data.card);
          }
        }
      }

      // If moved within the battlefield, do nothing destructive
      if (data.from === 'battlefield' && data.to === 'battlefield') return;
      const card = document.querySelector(`[data-card-id="${data.cardId}"]`);
      if (card) card.remove();
      this.addSystemChat(`${data.player} moveu ${data.card?.name || 'uma carta'} para ${data.to}`);
      
      // Update count indicators on playmat
      if (data.player === AppState.user?.username) {
        const me = this.room?.players?.find(p => p.username === AppState.user?.username);
        if (me) {
          const gy = document.getElementById('playmat-graveyard-count');
          if (gy) gy.textContent = me.graveyard?.length || 0;
          const ex = document.getElementById('playmat-exile-count');
          if (ex) ex.textContent = me.exile?.length || 0;
        }
      }
    });

    s.on('game:lifeUpdated', (data) => {
      if (data.player === AppState.user?.username) {
        const el = document.getElementById('my-life');
        if (el) {
          el.textContent = data.life;
          el.className = `life-number ${data.life <= 5 ? 'critical' : data.life <= 10 ? 'low' : ''}`;
        }
        if (data.change < 0) VFXEngine.damageFlash();
        else if (data.change > 0) VFXEngine.healFlash();
      } else {
        const oppEl = document.getElementById(`opp-life-${data.player}`);
        if (oppEl) oppEl.textContent = data.life;
        if (data.change < 0) VFXEngine.damageFlash();
      }
    });

    s.on('game:counterUpdated', (data) => {
      const card = document.querySelector(`[data-card-id="${data.cardId}"]`);
      if (card) {
        let pips = card.querySelector('.card-counters');
        if (pips) pips.remove();
        card.insertAdjacentHTML('beforeend', CounterSystem.renderCounterPips(data.counters));
      }
    });

    s.on('game:tokenCreated', (data) => {
      if (data.player === AppState.user?.username) {
        const isSupport = data.token.tokenType === 'artifact' || data.token.power === undefined;
        const bf = isSupport
          ? (document.getElementById('my-backline') || document.getElementById('my-frontline'))
          : (document.getElementById('my-frontline') || document.getElementById('my-backline'));
        if (bf) bf.insertAdjacentHTML('beforeend', CardRenderer.renderBattlefieldCard(data.token, true));
      }
      this.addSystemChat(`${data.player} colocou a ficha ${data.token.name} no campo`);
    });

    s.on('game:pingReceived', (data) => {
      this.renderPingAnimation(data.x, data.y, data.player);
      this.addSystemChat(`📍 ${data.player} marcou o campo de batalha.`);
    });

    s.on('game:phaseChanged', (data) => {
      document.querySelectorAll('.phase-step').forEach(p => p.classList.toggle('active', p.dataset.phase === data.phase));
      const turnInfo = document.querySelector('.game-turn-info');
      if (turnInfo) turnInfo.innerHTML = `Turno ${data.turnNumber} • <b style="color:var(--mana-gold-glow);">${data.activePlayer || '—'}</b>`;
    });

    s.on('game:untapAll', () => {
      document.querySelectorAll('.battlefield-card.tapped').forEach(c => c.classList.remove('tapped'));
      showToast('Todas as suas permanentes foram desviradas! 🔄', 'info', 1500);
    });

    s.on('game:diceRolled', (data) => {
      VFXEngine.showDiceResult(data.sides, data.result);
      this.addSystemChat(`🎲 ${data.player} rolou d${data.sides}: ${data.result}`);
    });

    s.on('game:chat', (data) => {
      const msgs = document.getElementById('chat-messages');
      if (msgs) {
        msgs.insertAdjacentHTML('beforeend', `<div class="chat-message"><span class="chat-author">${data.player}:</span> ${data.message}</div>`);
        msgs.scrollTop = msgs.scrollHeight;
      }
    });

    s.on('game:deckLoaded', (data) => {
      const hand = document.getElementById('my-hand');
      if (hand) hand.innerHTML = data.hand.map(c => CardRenderer.renderHandCard(c)).join('');
      const libCount = document.getElementById('playmat-library-count');
      if (libCount) libCount.textContent = data.libraryCount;
      showToast('Deck carregado! Mão inicial de 7 cartas comprada. 🃏', 'success');
    });

    s.on('game:scryResult', (data) => {
      showToast(`Vidência (Scry): ${data.cards.map(c => c.name).join(', ')}`, 'info', 4000);
    });

    s.on('game:error', (data) => showToast(data.message, 'error'));
  },

  bindKeyboardShortcuts() {
    if (this.shortcutsBound) return;
    this.shortcutsBound = true;

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!this.roomId) return;

      const key = e.key.toLowerCase();

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        this.nextPhase();
      } else if (key === 'z' && this.selectedCardId) {
        this.showFullCardZoom(this.selectedCardId);
      } else if (key === 'd') {
        this.action('drawCard');
      } else if (key === 'u') {
        this.action('untapAll');
      } else if (key === 'm') {
        this.action('mulligan');
      } else if (key === 's') {
        this.action('scry', { count: 1 });
      } else if (key === 't' && this.selectedCardId) {
        this.tapCard(this.selectedCardId);
      } else if (key === 'f') {
        this.action('rollDice', { sides: 20 });
      } else if (key === '1') this.addMana('W');
      else if (key === '2') this.addMana('U');
      else if (key === '3') this.addMana('B');
      else if (key === '4') this.addMana('R');
      else if (key === '5') this.addMana('G');
      else if (key === '6') this.addMana('C');
      else if (key === '?') this.showShortcutsModal();
    });
  },

  action(type, data = {}) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('game:action', { roomId: this.roomId, type, ...data });
  },

  playCard(cardId) { this.action('playCard', { cardId }); },
  tapCard(cardId) { this.action('tapCard', { cardId }); },
  addCounter(cardId, counterType) { this.action('addCounter', { cardId, counterType }); },
  nextPhase() { this.action('nextPhase'); },
  setPhase(phase) { this.action('nextPhase'); },

  // Right-Click (RMB) & Long-Press Context Menu with Strict Viewport Clamping
  showContextMenu(e, cardId, isOwn) {
    if (e && e.preventDefault) e.preventDefault();
    this.closeContextMenu();
    this.selectedCardId = cardId;

    const cardEl = document.getElementById(`card-node-${cardId}`);
    const cardName = cardEl?.dataset.cardName || 'Carta';
    const isCreature = cardEl?.dataset.cardPower !== undefined && cardEl?.dataset.cardPower !== '';

    // Backdrop for reliable outside clicks/touches
    const backdrop = document.createElement('div');
    backdrop.id = 'context-menu-backdrop';
    backdrop.className = 'context-menu-backdrop';
    backdrop.onclick = () => GameEngine.closeContextMenu();
    backdrop.ontouchstart = () => GameEngine.closeContextMenu();
    document.body.appendChild(backdrop);

    const menu = document.createElement('div');
    menu.id = 'active-context-menu';
    menu.className = 'game-context-menu';

    // Viewport Boundary Clamping
    const clientX = e?.clientX || (e?.touches && e.touches[0]?.clientX) || (e?.changedTouches && e.changedTouches[0]?.clientX) || (window.innerWidth / 2);
    const clientY = e?.clientY || (e?.touches && e.touches[0]?.clientY) || (e?.changedTouches && e.changedTouches[0]?.clientY) || (window.innerHeight / 2);

    const menuWidth = 195;
    const menuHeight = isOwn ? 300 : 120;

    let posX = clientX;
    let posY = clientY;

    if (posX + menuWidth > window.innerWidth - 8) {
      posX = window.innerWidth - menuWidth - 8;
    }
    if (posX < 8) posX = 8;

    if (posY + menuHeight > window.innerHeight - 10) {
      posY = window.innerHeight - menuHeight - 10;
    }
    if (posY < 35) posY = 35;

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    menu.innerHTML = `
      <div style="font-weight:700;font-size:0.75rem;padding:4px 8px;color:var(--mana-gold-glow);border-bottom:1px solid var(--border-subtle);">${cardName}</div>
      <div class="context-menu-item" onclick="GameEngine.showFullCardZoom('${cardId}'); GameEngine.closeContextMenu();">🔍 Zoom em Alta Definição [Z]</div>
      <div class="context-menu-item" onclick="GameEngine.inspectCard('${cardId}'); GameEngine.closeContextMenu();">📖 Traduzir & Inspecionar</div>
      ${isOwn ? `
        <div class="context-menu-divider"></div>
        ${isCreature ? `<div class="context-menu-item" style="color:var(--mana-red-glow);font-weight:600;" onclick="GameEngine.startAttackMode('${cardId}'); GameEngine.closeContextMenu();">⚔️ Atacar com Esta Criatura</div>` : ''}
        <div class="context-menu-item" onclick="GameEngine.tapCard('${cardId}'); GameEngine.closeContextMenu();">🔄 Virar / Desvirar</div>
        <div class="context-menu-item" onclick="GameEngine.addCounter('${cardId}','+1/+1'); GameEngine.closeContextMenu();">➕ Adicionar Marcador +1/+1</div>
        <div class="context-menu-item" onclick="GameEngine.addCounter('${cardId}','-1/-1'); GameEngine.closeContextMenu();">➖ Adicionar Marcador -1/-1</div>
        <div class="context-menu-item" onclick="GameEngine.action('clearCounters',{cardId:'${cardId}'}); GameEngine.closeContextMenu();">🗑️ Zerar Marcadores</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="GameEngine.action('moveCard',{cardId:'${cardId}',fromZone:'battlefield',toZone:'graveyard'}); GameEngine.closeContextMenu();">⚰️ Enviar para Cemitério</div>
        <div class="context-menu-item" onclick="GameEngine.action('moveCard',{cardId:'${cardId}',fromZone:'battlefield',toZone:'exile'}); GameEngine.closeContextMenu();">🌀 Enviar para Exílio</div>
        <div class="context-menu-item" onclick="GameEngine.action('moveCard',{cardId:'${cardId}',fromZone:'battlefield',toZone:'hand'}); GameEngine.closeContextMenu();">📥 Devolver para a Mão</div>
      ` : ''}
    `;

    document.body.appendChild(menu);
  },

  showHandContextMenu(e, cardId) {
    if (e && e.preventDefault) e.preventDefault();
    this.closeContextMenu();

    const backdrop = document.createElement('div');
    backdrop.id = 'context-menu-backdrop';
    backdrop.className = 'context-menu-backdrop';
    backdrop.onclick = () => GameEngine.closeContextMenu();
    backdrop.ontouchstart = () => GameEngine.closeContextMenu();
    document.body.appendChild(backdrop);

    const menu = document.createElement('div');
    menu.id = 'active-context-menu';
    menu.className = 'game-context-menu';

    const clientX = e?.clientX || (e?.touches && e.touches[0]?.clientX) || (e?.changedTouches && e.changedTouches[0]?.clientX) || (window.innerWidth / 2);
    const clientY = e?.clientY || (e?.touches && e.touches[0]?.clientY) || (e?.changedTouches && e.changedTouches[0]?.clientY) || (window.innerHeight / 2);

    const menuWidth = 195;
    const menuHeight = 190;

    let posX = clientX;
    let posY = clientY;

    if (posX + menuWidth > window.innerWidth - 8) {
      posX = window.innerWidth - menuWidth - 8;
    }
    if (posX < 8) posX = 8;

    if (posY + menuHeight > window.innerHeight - 10) {
      posY = window.innerHeight - menuHeight - 10;
    }
    if (posY < 35) posY = 35;

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    menu.innerHTML = `
      <div class="context-menu-item" onclick="GameEngine.playCard('${cardId}'); GameEngine.closeContextMenu();">⚔️ Conjurar para o Campo</div>
      <div class="context-menu-item" onclick="GameEngine.showFullCardZoom('${cardId}'); GameEngine.closeContextMenu();">🔍 Zoom em Alta Resolução [Z]</div>
      <div class="context-menu-item" onclick="GameEngine.inspectCard('${cardId}'); GameEngine.closeContextMenu();">📖 Inspecionar & Tradução</div>
      <div class="context-menu-item" onclick="GameEngine.action('moveCard',{cardId:'${cardId}',fromZone:'hand',toZone:'graveyard'}); GameEngine.closeContextMenu();">⚰️ Descartar no Cemitério</div>
      <div class="context-menu-item" onclick="GameEngine.action('moveCard',{cardId:'${cardId}',fromZone:'hand',toZone:'exile'}); GameEngine.closeContextMenu();">🌀 Exilar da Mão</div>
    `;
    document.body.appendChild(menu);
  },

  closeContextMenu() {
    const menu = document.getElementById('active-context-menu');
    if (menu) menu.remove();
    const backdrop = document.getElementById('context-menu-backdrop');
    if (backdrop) backdrop.remove();
  },

  // Mouse Wheel: Quick adjust counters
  handleCardWheel(e, cardId) {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.addCounter(cardId, '+1/+1');
    } else {
      this.action('removeCounter', { cardId, counterType: '+1/+1', amount: 1 });
    }
  },

  // Alt + Click: Ping on battlefield
  handleBattlefieldClick(e) {
    if (e.altKey) {
      e.preventDefault();
      const rect = document.getElementById('main-battlefield-container')?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      this.action('ping', { x, y, message: '📍 Ping!' });
    }
  },

  sendPingPrompt() {
    this.showTacticalPingMenu();
  },

  showTacticalPingMenu(targetX = 50, targetY = 50) {
    const existing = document.getElementById('tactical-ping-menu');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'tactical-ping-menu';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '3700';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
      <div class="modal" style="max-width:520px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">
          <h3 style="margin:0;color:var(--mana-gold-glow);font-size:1.1rem;">📍 Pings Táticos & Avisos de MTG</h3>
          <button class="btn btn-ghost btn-sm" onclick="this.closest('#tactical-ping-menu').remove()">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;max-height:65vh;overflow-y:auto;padding-right:4px;">
          <!-- Compra & Mão -->
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--mana-blue-light);margin-bottom:4px;">📥 COMPRA & MÃO</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Compre sua carta do turno! 🃏', ${targetX}, ${targetY})">🃏 "Compre sua carta!"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Você esqueceu de comprar carta! ⚠️', ${targetX}, ${targetY})">⚠️ "Você não comprou!"</button>
            </div>
          </div>

          <!-- Fases & Desvirar -->
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--mana-gold-glow);margin-bottom:4px;">🔄 FASES & DESVIRAR</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Desvire suas permanentes! 🔄', ${targetX}, ${targetY})">🔄 "Desvire suas cartas!"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Você não desvirou suas cartas! ✋', ${targetX}, ${targetY})">✋ "Você não desvirou!"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Passando prioridade. Alguma resposta? ⏳', ${targetX}, ${targetY})">⏳ "Alguma resposta?"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Passo o turno! 🏁', ${targetX}, ${targetY})">🏁 "Passo o turno"</button>
            </div>
          </div>

          <!-- Combate -->
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--mana-red-glow);margin-bottom:4px;">⚔️ COMBATE & ATAQUE</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Declare seus atacantes! ⚔️', ${targetX}, ${targetY})">⚔️ "Declare atacantes!"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Declare seus bloqueadores! 🛡️', ${targetX}, ${targetY})">🛡️ "Declare bloqueadores!"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Resolução do dano de combate! 💥', ${targetX}, ${targetY})">💥 "Dano de combate"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Total de dano letal! 💀', ${targetX}, ${targetY})">💀 "Dano letal!"</button>
            </div>
          </div>

          <!-- Marcadores & Zonas -->
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--success);margin-bottom:4px;">➕ MARCADORES, PILHA & ZONAS</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Coloque o marcador na permanente! ➕', ${targetX}, ${targetY})">➕ "Coloque marcador!"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Gatilho de habilidade na pilha! ⚡', ${targetX}, ${targetY})">⚡ "Gatilho na pilha!"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Atenção ao cemitério! ⚰️', ${targetX}, ${targetY})">⚰️ "Atenção ao Cemitério"</button>
              <button class="btn btn-secondary btn-sm" onclick="GameEngine.sendCustomPing('Verifique a zona de exílio! 🌀', ${targetX}, ${targetY})">🌀 "Verifique o Exílio"</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  sendCustomPing(message, x = 50, y = 50) {
    document.getElementById('tactical-ping-menu')?.remove();
    this.action('ping', { x, y, message });
  },

  renderPingAnimation(xPct, yPct, playerName, message = 'Alerta!') {
    const container = document.getElementById('main-battlefield-container');
    if (!container) return;

    const ping = document.createElement('div');
    ping.className = 'ping-indicator';
    ping.style.left = `${xPct}%`;
    ping.style.top = `${yPct}%`;
    ping.innerHTML = `
      <div class="ping-label" style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <span style="color:var(--mana-gold-glow);font-weight:700;">📍 ${playerName}</span>
        <span style="font-size:0.72rem;color:#fff;background:rgba(0,0,0,0.9);padding:2px 8px;border-radius:4px;border:1px solid var(--mana-gold);white-space:nowrap;">${message}</span>
      </div>
    `;
    container.appendChild(ping);

    setTimeout(() => ping.remove(), 3500);
  },

  // FULL HD REAL SIZED CARD ZOOM MODAL
  async showFullCardZoom(cardId) {
    const cardEl = document.getElementById(`card-node-${cardId}`) || document.querySelector(`[data-card-id="${cardId}"]`);
    if (!cardEl) return;

    const cardName = cardEl.dataset.cardName || 'Card';
    const cardOracle = cardEl.dataset.cardOracle || '';
    const cardType = cardEl.dataset.cardType || '';
    const cardImage = cardEl.dataset.cardImage || '';

    const modal = document.createElement('div');
    modal.className = 'card-zoom-modal';
    document.body.classList.add('modal-open');
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
      }
    };

    modal.innerHTML = `
      <div class="card-zoom-box">
        <button class="modal-close" style="position:absolute;top:10px;right:10px;" onclick="this.closest('.card-zoom-modal').remove(); document.body.classList.remove('modal-open');">✕</button>
        <img class="card-zoom-img" src="${cardImage}" alt="${cardName}">
        <div class="card-zoom-details">
          <div style="font-size:0.75rem;color:var(--mana-gold-glow);font-weight:700;">VISUALIZAÇÃO COMPLETA EM ALTA DEFINIÇÃO</div>
          <h2 style="font-size:1.3rem;margin:0;" id="zoom-title">${cardName}</h2>
          <div style="color:var(--text-muted);font-size:0.85rem;" id="zoom-type">${cardType}</div>
          <div class="live-inspector-oracle" id="zoom-oracle" style="margin-top:8px;font-size:0.88rem;max-height:260px;overflow-y:auto;">
            <span>⏳ Carregando tradução em Português...</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-sm" onclick="this.closest('.card-zoom-modal').remove(); document.body.classList.remove('modal-open');">Fechar Zoom [Esc]</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const translated = await TranslationEngine.translateCard({
      id: cardId,
      name: cardName,
      type_line: cardType,
      oracle_text: cardOracle
    }, 'pt');

    const zTitle = document.getElementById('zoom-title');
    const zType = document.getElementById('zoom-type');
    const zOracle = document.getElementById('zoom-oracle');

    if (zTitle) zTitle.innerHTML = `<b>${translated.name || cardName}</b> <span style="font-size:0.8rem;color:var(--text-muted);">(${cardName})</span>`;
    if (zType) zType.textContent = translated.type_line || cardType;
    if (zOracle) zOracle.innerHTML = CardDisplay.formatOracleText(translated.oracle_text || 'Sem texto de regras.');
  },

  handleCardClick(cardId) {
    if (this.attackingCardId) {
      this.resolveCombatAttack(this.attackingCardId, cardId);
      return;
    }
    this.inspectCard(cardId);
  },

  handleOpponentClick(oppUsername) {
    if (this.attackingCardId) {
      this.resolveCombatAttack(this.attackingCardId, 'player:' + oppUsername);
    } else {
      showToast(`Oponente ${oppUsername} selecionado.`, 'info', 1000);
    }
  },

  startAttackMode(cardId) {
    this.attackingCardId = cardId;
    const cardEl = document.getElementById(`card-node-${cardId}`);
    if (cardEl) cardEl.classList.add('attacking');

    showToast('🎯 MIRA DE ATAQUE ATIVADA: Clique no Oponente (topo) ou em uma criatura defensora!', 'warning', 4500);
    document.querySelectorAll('#opponent-battlefield .battlefield-card').forEach(c => c.classList.add('targetable'));
  },

  cancelAttackMode() {
    if (this.attackingCardId) {
      const cardEl = document.getElementById(`card-node-${this.attackingCardId}`);
      if (cardEl) cardEl.classList.remove('attacking');
      this.attackingCardId = null;
      document.querySelectorAll('.targetable').forEach(c => c.classList.remove('targetable'));
    }
  },

  resolveCombatAttack(attackerCardId, targetId) {
    const attackerEl = document.getElementById(`card-node-${attackerCardId}`);
    if (!attackerEl) return this.cancelAttackMode();

    const attackerName = attackerEl.dataset.cardName || 'Criatura';
    const attackerPower = parseInt(attackerEl.dataset.cardPower || '2') || 2;

    if (targetId.startsWith('player:')) {
      const oppPlayer = targetId.replace('player:', '');
      this.action('updateLife', { targetPlayer: oppPlayer, amount: -attackerPower });
      this.tapCard(attackerCardId);
      VFXEngine.damageFlash();
      this.addSystemChat(`⚔️ [COMBATE] ${attackerName} atacou ${oppPlayer} causando ${attackerPower} de dano!`);
      showToast(`⚔️ ${attackerPower} de dano causado diretamente no oponente!`, 'success', 2500);
    } else {
      const defenderEl = document.getElementById(`card-node-${targetId}`);
      if (defenderEl) {
        const defenderName = defenderEl.dataset.cardName || 'Criatura Defensora';
        const defenderToughness = parseInt(defenderEl.dataset.cardToughness || '2') || 2;

        this.tapCard(attackerCardId);

        if (attackerPower >= defenderToughness) {
          this.action('moveCard', { cardId: targetId, fromZone: 'battlefield', toZone: 'graveyard' });
          VFXEngine.damageFlash();
          this.addSystemChat(`⚔️ [COMBATE] ${attackerName} causou ${attackerPower} de dano letal em ${defenderName} (Resistência ${defenderToughness}) — A criatura foi destruída e enviada ao cemitério! 💥`);
          showToast(`💥 ${defenderName} destruída em combate!`, 'success', 3000);
        } else {
          this.addSystemChat(`⚔️ [COMBATE] ${attackerName} causou ${attackerPower} de dano em ${defenderName}.`);
          showToast(`⚔️ Combate resolvido!`, 'info', 2000);
        }
      }
    }

    this.cancelAttackMode();
  },

  async inspectCard(cardId) {
    if (DragDropSystem.suppressClick) return;
    this.selectedCardId = cardId;
    const cardEl = document.getElementById(`card-node-${cardId}`) || document.querySelector(`[data-card-id="${cardId}"]`);
    if (!cardEl) return;

    document.querySelectorAll('.battlefield-card.selected').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');

    const cardName = cardEl.dataset.cardName || 'Card';
    let cardOracle = cardEl.dataset.cardOracle || '';
    let cardType = cardEl.dataset.cardType || '';
    const cardImage = cardEl.dataset.cardImage || '';
    const cardPower = cardEl.dataset.cardPower;
    const cardToughness = cardEl.dataset.cardToughness;
    const isOwn = cardEl.dataset.isOwn === 'true';

    let panel = document.getElementById('live-inspector-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'live-inspector-panel';
      panel.className = 'live-inspector-panel draggable-panel';
      const gameTable = document.querySelector('.game-table');
      if (gameTable) gameTable.appendChild(panel);
    }

    panel.innerHTML = `
      <div class="draggable-header" id="insp-drag-handle" onmousedown="GameEngine.makeDraggable(document.getElementById('live-inspector-panel'), event)" ontouchstart="GameEngine.makeDraggable(document.getElementById('live-inspector-panel'), event)">
        <span style="font-size:0.75rem;color:var(--mana-gold-glow);font-weight:700;">🔍 ${cardName}</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:0.8rem;" onclick="GameEngine.toggleInspectorCollapse()" title="Recolher / Expandir">_</button>
          <button class="btn btn-ghost btn-sm" style="padding:1px 6px;" onclick="GameEngine.closeInspector()" title="Fechar">✕</button>
        </div>
      </div>
      <div class="live-inspector-body" id="live-inspector-body">
        <div class="live-inspector-content">
          <img class="live-inspector-img" src="${cardImage}" alt="${cardName}" onclick="GameEngine.showFullCardZoom('${cardId}')" title="Clique para abrir Zoom em Alta Definição">
          <div class="live-inspector-details">
            <div class="live-inspector-name" id="insp-name">${cardName}</div>
            <div class="live-inspector-type" id="insp-type">${cardType}</div>
            ${cardPower !== undefined && cardPower !== '' ? `<div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--mana-gold-glow);margin-top:2px;"><b>P/T:</b> ${cardPower}/${cardToughness}</div>` : ''}
            <div class="live-inspector-oracle" id="insp-oracle">
              <span style="color:var(--text-muted);font-size:0.72rem;">⏳ Traduzindo regras...</span>
            </div>
          </div>
        </div>
        <div class="live-inspector-actions">
          <button class="live-action-chip" onclick="GameEngine.showFullCardZoom('${cardId}')">🔍 Zoom HD [Z]</button>
          ${isOwn && (cardPower !== undefined && cardPower !== '') ? `
            <button class="live-action-chip attack-btn" onclick="GameEngine.startAttackMode('${cardId}')">⚔️ Atacar</button>
          ` : ''}
          <button class="live-action-chip" onclick="GameEngine.tapCard('${cardId}')">🔄 Virar/Desvirar</button>
          <button class="live-action-chip" onclick="GameEngine.addCounter('${cardId}','+1/+1')">+1/+1</button>
          <button class="live-action-chip" onclick="GameEngine.addCounter('${cardId}','-1/-1')">−1/−1</button>
          <button class="live-action-chip" onclick="GameEngine.action('clearCounters',{cardId:'${cardId}'})">🗑️ Zerar</button>
          <button class="live-action-chip" onclick="GameEngine.action('moveCard',{cardId:'${cardId}',fromZone:'battlefield',toZone:'graveyard'})">⚰️ Cemitério</button>
          <button class="live-action-chip" onclick="GameEngine.action('moveCard',{cardId:'${cardId}',fromZone:'battlefield',toZone:'exile'})">🌀 Exílio</button>
        </div>
      </div>
    `;

    const translated = await TranslationEngine.translateCard({
      id: cardId,
      name: cardName,
      type_line: cardType,
      oracle_text: cardOracle
    }, 'pt');

    const inspName = document.getElementById('insp-name');
    const inspType = document.getElementById('insp-type');
    const inspOracle = document.getElementById('insp-oracle');

    if (inspName) inspName.innerHTML = `<b>${translated.name || cardName}</b> <span style="font-size:0.7rem;color:var(--text-muted);">(${cardName})</span>`;
    if (inspType) inspType.textContent = translated.type_line || cardType;
    if (inspOracle) {
      inspOracle.innerHTML = CardDisplay.formatOracleText(translated.oracle_text || 'Sem texto de regras.');
    }
  },

  toggleInspectorCollapse() {
    const body = document.getElementById('live-inspector-body');
    const panel = document.getElementById('live-inspector-panel');
    if (!body || !panel) return;
    if (body.style.display === 'none') {
      body.style.display = '';
      panel.classList.remove('inspector-collapsed');
    } else {
      body.style.display = 'none';
      panel.classList.add('inspector-collapsed');
    }
  },

  closeInspector() {
    const panel = document.getElementById('live-inspector-panel');
    if (panel) panel.remove();
    document.querySelectorAll('.battlefield-card.selected').forEach(c => c.classList.remove('selected'));
  },

  makeDraggable(element, event) {
    if (!element) return;
    const clientX = event.clientX || (event.touches && event.touches[0]?.clientX) || 0;
    const clientY = event.clientY || (event.touches && event.touches[0]?.clientY) || 0;

    let shiftX = clientX - element.getBoundingClientRect().left;
    let shiftY = clientY - element.getBoundingClientRect().top;

    function moveAt(pageX, pageY) {
      element.style.left = Math.max(4, Math.min(window.innerWidth - element.offsetWidth - 4, pageX - shiftX)) + 'px';
      element.style.top = Math.max(35, Math.min(window.innerHeight - element.offsetHeight - 20, pageY - shiftY)) + 'px';
      element.style.bottom = 'auto';
      element.style.right = 'auto';
    }

    function onMove(e) {
      const x = e.pageX || (e.touches && e.touches[0]?.pageX) || 0;
      const y = e.pageY || (e.touches && e.touches[0]?.pageY) || 0;
      moveAt(x, y);
    }

    function onEnd() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  },

  addMana(color) {
    this.manaPool[color] = (this.manaPool[color] || 0) + 1;
    const el = document.getElementById(`mana-${color.toLowerCase()}`);
    if (el) el.textContent = this.manaPool[color];
    VFXEngine.castSpell(color);
  },

  clearMana() {
    this.manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    ['w','u','b','r','g','c'].forEach(c => {
      const el = document.getElementById(`mana-${c}`);
      if (el) el.textContent = '0';
    });
    showToast('Reserva de mana esvaziada.', 'info', 1000);
  },

  showOnboardingModal() {
    localStorage.setItem('mtg_onboarding_seen', 'true');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:560px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2 style="margin-bottom:6px;color:var(--mana-gold-glow);">⚔️ Guia Oficial de Controles MTG (PC & Mobile)</h2>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">Navegação com mouse, teclado e playmat oficial:</p>

        <div style="display:flex;flex-direction:column;gap:8px;font-size:0.82rem;line-height:1.5;">
          <div style="background:var(--bg-tertiary);padding:8px 12px;border-radius:6px;border-left:3px solid var(--mana-gold);">
            <b>🖱️ Botão Direito (RMB):</b> Abre o menu de contexto completo (atacar, adicionar marcadores, exilar, devolver para a mão).
          </div>
          <div style="background:var(--bg-tertiary);padding:8px 12px;border-radius:6px;border-left:3px solid var(--mana-blue-glow);">
            <b>🔍 Zoom em Alta Definição:</b> Pressione a tecla <b>[Z]</b> ou clique na imagem da carta para ver em tamanho real com tradução.
          </div>
          <div style="background:var(--bg-tertiary);padding:8px 12px;border-radius:6px;border-left:3px solid var(--success);">
            <b>🔄 Scroll do Mouse (Wheel):</b> Passe o mouse sobre a carta e gire a rodinha para adicionar ou retirar marcadores +1/+1 instantaneamente!
          </div>
          <div style="background:var(--bg-tertiary);padding:8px 12px;border-radius:6px;border-left:3px solid var(--mana-red-glow);">
            <b>📍 Pings no Campo:</b> Segure <b>[Alt] e clique</b> em qualquer lugar do campo para emitir um radar de alerta sonoro-visual para todos na partida.
          </div>
        </div>

        <button class="btn btn-primary btn-full mt-md" onclick="this.closest('.modal-overlay').remove()">Pronto para Jogar!</button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  showShortcutsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2 style="margin-bottom:8px;color:var(--mana-gold-glow);">⌨️ Atalhos de Teclado no PC</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8rem;margin-top:8px;">
          <div class="panel" style="padding:6px 10px;"><b>[Espaço]</b> ou <b>[Enter]</b> : Próxima Fase</div>
          <div class="panel" style="padding:6px 10px;"><b>[Z]</b> : Zoom HD em Tamanho Real</div>
          <div class="panel" style="padding:6px 10px;"><b>[Alt + Clique]</b> : Ping no Campo 📍</div>
          <div class="panel" style="padding:6px 10px;"><b>[D]</b> : Comprar Card</div>
          <div class="panel" style="padding:6px 10px;"><b>[U]</b> : Desvirar Tudo</div>
          <div class="panel" style="padding:6px 10px;"><b>[M]</b> : Mulligan</div>
          <div class="panel" style="padding:6px 10px;"><b>[S]</b> : Vidência 1 (Scry)</div>
          <div class="panel" style="padding:6px 10px;"><b>[T]</b> : Virar/Desvirar</div>
          <div class="panel" style="padding:6px 10px;"><b>[Scroll]</b> : Marcadores +/-</div>
          <div class="panel" style="padding:6px 10px;"><b>[1 a 6]</b> : Adicionar Mana WUBRGC</div>
        </div>
        <button class="btn btn-secondary btn-full mt-md" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  showManaAndLifeModal() {
    const me = this.room?.players?.find(p => p.username === AppState.user?.username);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2 style="margin-bottom:8px;color:var(--mana-gold-glow);">❤️ Contador de Vida & Mana</h2>
        
        <div style="font-size:3.5rem;font-family:var(--font-heading);color:var(--mana-gold-glow);margin:10px 0;" id="modal-life-display">
          ${me?.life || 20}
        </div>

        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
          <button class="btn btn-danger btn-lg" onclick="GameEngine.action('updateLife',{amount:-5})">-5</button>
          <button class="btn btn-secondary btn-lg" onclick="GameEngine.action('updateLife',{amount:-1})">-1</button>
          <button class="btn btn-primary btn-lg" onclick="GameEngine.action('updateLife',{amount:1})">+1</button>
          <button class="btn btn-primary btn-lg" onclick="GameEngine.action('updateLife',{amount:5})">+5</button>
        </div>

        <h3 style="font-size:0.95rem;margin-bottom:8px;color:var(--text-secondary);">Reserva de Mana Flutuante</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="GameEngine.addMana('W')">☀️ Branco (+1)</button>
          <button class="btn btn-ghost btn-sm" onclick="GameEngine.addMana('U')">💧 Azul (+1)</button>
          <button class="btn btn-ghost btn-sm" onclick="GameEngine.addMana('B')">💀 Preto (+1)</button>
          <button class="btn btn-ghost btn-sm" onclick="GameEngine.addMana('R')">🔥 Vermelho (+1)</button>
          <button class="btn btn-ghost btn-sm" onclick="GameEngine.addMana('G')">🌲 Verde (+1)</button>
          <button class="btn btn-ghost btn-sm" onclick="GameEngine.addMana('C')">◇ Incolor (+1)</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  async showDeckSelector() {
    try {
      const decks = await API.getDecks();
      if (!decks || decks.length === 0) {
        showToast('Nenhum deck encontrado. Acesse o Deck Builder ou compre um Starter Deck!', 'warning');
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
          <h2 style="margin-bottom:var(--space-md);">📚 Selecionar Deck para a Partida</h2>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;">
            ${decks.map(d => `
              <div class="panel" style="padding:10px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
                   onclick="GameEngine.loadSelectedDeck('${d.id}', '${d.name.replace(/'/g, "\\'")}'); this.closest('.modal-overlay').remove();">
                <div>
                  <div style="font-weight:600;color:var(--mana-gold-glow);">${d.name}</div>
                  <span style="font-size:0.75rem;color:var(--text-muted);">${d.format} • ${(d.cards||[]).reduce((a,c)=>a+(c.quantity||1),0)} cartas</span>
                </div>
                <button class="btn btn-primary btn-sm">Carregar</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    } catch(e) {
      showToast('Erro ao carregar lista de decks: ' + e.message, 'error');
    }
  },

  async loadSelectedDeck(deckId, deckName) {
    try {
      showToast(`Carregando "${deckName}"... 🃏`, 'info');
      const deck = await API.getDeck(deckId);

      const fullCards = [];
      for (const item of (deck.cards || [])) {
        const nameLow = (item.name || '').toLowerCase();
        const isBasicLand = nameLow.includes('mountain') || nameLow.includes('montanha') ||
                            nameLow.includes('island') || nameLow.includes('ilha') ||
                            nameLow.includes('plains') || nameLow.includes('planície') ||
                            nameLow.includes('swamp') || nameLow.includes('pântano') ||
                            nameLow.includes('forest') || nameLow.includes('floresta');
        const isLand = isBasicLand || (item.type_line && item.type_line.toLowerCase().includes('land'));

        for (let i = 0; i < (item.quantity || 1); i++) {
          fullCards.push({
            id: `game-card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: item.name,
            power: isLand ? undefined : (item.power !== undefined ? item.power : (item.name.includes('Lontras') ? 3 : item.name.includes('Terror') ? 5 : item.name.includes('Goblin') ? 2 : 3)),
            toughness: isLand ? undefined : (item.toughness !== undefined ? item.toughness : 3),
            oracle_text: item.oracle_text || '',
            type_line: isLand ? (item.type_line || 'Basic Land') : (item.type_line || 'Creature'),
            image_uri: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(item.name)}&format=image&version=normal`,
            image_uris: {
              small: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(item.name)}&format=image&version=small`,
              normal: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(item.name)}&format=image&version=normal`
            }
          });
        }
      }

      this.socket.emit('game:loadDeck', {
        roomId: this.roomId,
        cards: fullCards,
        commander: deck.commander_id ? { id: deck.commander_id, name: deck.commander_id } : null
      });
    } catch(e) {
      showToast('Erro ao carregar deck: ' + e.message, 'error');
    }
  },

  handleCardDrop(detail) {
    if (!detail || !detail.cardId) return;
    if (detail.fromZone === 'hand' && detail.toZone === 'battlefield') {
      this.playCard(detail.cardId);
    } else if (detail.fromZone === 'battlefield' && (detail.toZone === 'graveyard' || detail.toZone === 'exile' || detail.toZone === 'hand')) {
      this.action('moveCard', { cardId: detail.cardId, fromZone: 'battlefield', toZone: detail.toZone });
    }
  },

  sendChat() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    this.action('chat', { message: input.value.trim() });
    input.value = '';
  },

  addSystemChat(msg) {
    const msgs = document.getElementById('chat-messages');
    if (msgs) {
      msgs.insertAdjacentHTML('beforeend', `<div class="chat-message system">${msg}</div>`);
      msgs.scrollTop = msgs.scrollHeight;
    }
  },

  showZone(zone, targetPlayerUsername = null) {
    if (!this.room) return;
    const username = targetPlayerUsername || AppState.user?.username;
    const player = this.room.players?.find(p => p.username === username);
    const cards = player?.[zone] || [];
    const zoneNames = {
      graveyard: 'Cemitério ⚰️',
      exile: 'Exílio 🌀',
      commandZone: 'Zona de Comando 👑',
      library: 'Grimório 📚'
    };
    const isOwn = username === AppState.user?.username;
    const zoneTitle = `${zoneNames[zone] || zone.toUpperCase()} • ${username} (${cards.length} cartas)`;
    this.showZoneOverlay(zoneTitle, cards, zone, isOwn);
  },

  showZoneOverlay(title, cards, zone, isOwn) {
    const existing = document.querySelector('.zone-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'zone-overlay';
    document.body.classList.add('modal-open');

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        document.body.classList.remove('modal-open');
      }
    };

    overlay.innerHTML = `
      <div class="zone-overlay-modal">
        <div class="zone-overlay-header">
          <h2 class="zone-overlay-title">${title}</h2>
          <button class="btn btn-ghost" onclick="this.closest('.zone-overlay').remove(); document.body.classList.remove('modal-open');">✕ Fechar</button>
        </div>
        <div class="zone-overlay-cards">
          ${cards.map(c => `
            <div class="zone-card-item">
              <div onclick="GameEngine.showFullCardZoom('${c.id}')" style="cursor:zoom-in;width:100%;text-align:center;">
                <img src="${c.image_uris?.normal || c.image_uri || CardDisplay.getImageUri(c, 'normal')}" alt="${c.name}" style="width:100px;aspect-ratio:var(--card-ratio);border-radius:6px;box-shadow:var(--shadow-md);" loading="lazy">
                <div style="font-weight:700;font-size:0.75rem;margin-top:4px;color:var(--mana-gold-glow);">${c.name}</div>
              </div>
              ${isOwn ? `
                <div class="zone-card-actions">
                  <button class="zone-card-action-btn" onclick="GameEngine.action('moveCard',{cardId:'${c.id}',fromZone:'${zone}',toZone:'battlefield'}); document.querySelector('.zone-overlay')?.remove(); document.body.classList.remove('modal-open');">⚔️ Campo</button>
                  <button class="zone-card-action-btn" onclick="GameEngine.action('moveCard',{cardId:'${c.id}',fromZone:'${zone}',toZone:'hand'}); document.querySelector('.zone-overlay')?.remove(); document.body.classList.remove('modal-open');">📥 Mão</button>
                  ${zone !== 'exile' ? `<button class="zone-card-action-btn" onclick="GameEngine.action('moveCard',{cardId:'${c.id}',fromZone:'${zone}',toZone:'exile'}); document.querySelector('.zone-overlay')?.remove(); document.body.classList.remove('modal-open');">🌀 Exilar</button>` : ''}
                </div>
              ` : `
                <div class="zone-card-actions">
                  <button class="zone-card-action-btn" onclick="GameEngine.showFullCardZoom('${c.id}')">🔍 Zoom HD</button>
                </div>
              `}
            </div>
          `).join('') || '<div style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:40px;">Esta zona está vazia no momento.</div>'}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  showTokenMenu() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2 style="margin-bottom:var(--space-md);">🎭 Criar Tokens de MTG</h2>
        ${TokenManager.renderPresets()}
      </div>
    `;
    document.body.appendChild(overlay);
  },

  leaveGame() {
    if (!confirm('Deseja realmente sair da mesa?')) return;
    document.body.classList.remove('in-game');
    document.getElementById('main-nav').style.display = '';
    this.socket?.disconnect();
    this.socket = null;
    this.roomId = null;
    this.room = null;
    navigateTo('/play');
  }
};
