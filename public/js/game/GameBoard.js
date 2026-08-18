/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Game Board (Adaptive Desktop & Mobile UI)
   ═══════════════════════════════════════════════════════════════ */

const GameBoard = {
  handExpanded: false,

  render(room, myUsername) {
    const me = room.players.find(p => p.username === myUsername);
    const opponents = room.players.filter(p => p.username !== myUsername);
    const phases = ['untap','upkeep','draw','main1','combat_begin','combat_attackers','combat_blockers','combat_damage','combat_end','main2','end','cleanup'];
    const phaseLabels = { untap:'Desvirar', upkeep:'Manutenção', draw:'Compra', main1:'Principal 1', combat_begin:'Combate', combat_attackers:'Atacantes', combat_blockers:'Bloqueadores', combat_damage:'Dano', combat_end:'Fim Combate', main2:'Principal 2', end:'Final', cleanup:'Limpeza' };

    document.body.classList.add('in-game');
    document.getElementById('main-nav').style.display = 'none';

    // Separate player cards into Creatures (Frontline) and Support/Lands (Backline)
    const myCreatures = (me?.battlefield || []).filter(c => (c.type_line || '').toLowerCase().includes('creature') || c.power !== undefined);
    const mySupport = (me?.battlefield || []).filter(c => !((c.type_line || '').toLowerCase().includes('creature') || c.power !== undefined));

    document.getElementById('app').innerHTML = `
      <div class="game-table" oncontextmenu="return false;">
        
        <!-- TOP BAR (Responsive for PC & Mobile) -->
        <div class="game-top-bar">
          <div class="game-top-bar-left">
            <div class="game-phase-indicator" id="phase-stepper">
              ${phases.map(p => `<span class="phase-step ${room.phase === p ? 'active' : ''}" data-phase="${p}" onclick="GameEngine.setPhase('${p}')">${phaseLabels[p]||p}</span>`).join('')}
            </div>
            <div class="game-turn-info">Turno ${room.turnNumber} • <b style="color:var(--mana-gold-glow);">${room.activePlayer || '—'}</b></div>
          </div>
          
          <div class="game-top-bar-actions">
            <button class="game-menu-btn mobile-hidden" onclick="GameEngine.sendPingPrompt()">📍 Ping</button>
            <button class="game-menu-btn mobile-hidden" onclick="GameEngine.showOnboardingModal()">❓ Guia</button>
            <button class="game-menu-btn mobile-hidden" onclick="GameEngine.showShortcutsModal()">⌨️ Atalhos</button>
            <button class="game-menu-btn" onclick="GameEngine.showDeckSelector()">📚 Deck</button>
            <button class="game-menu-btn btn-pass-phase" onclick="GameEngine.nextPhase()">Fase ▶</button>
            <button class="game-menu-btn" onclick="GameBoard.toggleMobileQuickMenu()">⚙️ Ações</button>
            <button class="game-menu-btn btn-leave-game mobile-hidden" onclick="GameEngine.leaveGame()">✕ Sair</button>
          </div>
        </div>

        <!-- BATTLEFIELD CONTAINER -->
        <div class="battlefield-container" id="main-battlefield-container" onclick="GameEngine.handleBattlefieldClick(event)">
          
          <!-- OPPONENTS PLAYMAT ZONE -->
          <div class="battlefield-zone opponent" id="opponent-battlefield">
            <div class="playmat-surface">
              ${opponents.map(opp => `
                <div class="opponent-hud-bar" onclick="GameEngine.handleOpponentClick('${opp.username}')" title="Clique para mirar ataque no oponente">
                  <div class="opp-info-tag">
                    <span>⚔️ <b>${opp.username}</b></span>
                    <span class="opp-life-badge">❤️ <b id="opp-life-${opp.username}">${opp.life}</b>${opp.poison > 0 ? ` ☠️${opp.poison}` : ''}</span>
                    <span class="opp-hand-badge">🃏 ${opp.handCount}</span>
                  </div>
                  <span class="opp-target-prompt">🎯 Alvo de Ataque</span>
                </div>

                <div class="playmat-zone-slot frontline-combat-zone opp-frontline">
                  <span class="playmat-slot-label">CAMPO DO OPONENTE</span>
                  ${(opp.battlefield || []).map(c => CardRenderer.renderBattlefieldCard(c, false)).join('')}
                </div>
              `).join('')}
            </div>

            <!-- Opponent Side Slots (Interactive Graveyard & Exile) -->
            <div class="playmat-side-slots opp-side-slots">
              <div class="playmat-dedicated-slot" title="Grimório do Oponente">
                <span class="playmat-dedicated-slot-title">📚 Deck</span>
                <span class="playmat-dedicated-slot-count">${opponents[0]?.libraryCount || 0}</span>
              </div>
              <div class="playmat-dedicated-slot clickable-slot" onclick="GameEngine.showZone('graveyard', '${opponents[0]?.username}')" title="Ver Cemitério do Oponente">
                <span class="playmat-dedicated-slot-title">⚰️ Cem.</span>
                <span class="playmat-dedicated-slot-count">${opponents[0]?.graveyardCount || (opponents[0]?.graveyard||[]).length || 0}</span>
              </div>
              <div class="playmat-dedicated-slot clickable-slot" onclick="GameEngine.showZone('exile', '${opponents[0]?.username}')" title="Ver Exílio do Oponente">
                <span class="playmat-dedicated-slot-title">🌀 Exílio</span>
                <span class="playmat-dedicated-slot-count">${opponents[0]?.exileCount || (opponents[0]?.exile||[]).length || 0}</span>
              </div>
            </div>
          </div>

          <!-- CENTRAL DIVIDER & FLOATING MANA -->
          <div class="battlefield-divider">
            <div class="center-stack-zone" title="Zona da Pilha / Resoluções">
              <span>⚡ PILHA:</span>
              <span id="stack-count" style="color:var(--text-muted);font-weight:600;">0</span>
            </div>
            
            <!-- Quick Mana Pool -->
            <div class="floating-mana-bar" id="floating-mana-pool">
              <span class="mana-pool-pip" onclick="GameEngine.addMana('W')">☀️<span id="mana-w">0</span></span>
              <span class="mana-pool-pip" onclick="GameEngine.addMana('U')">💧<span id="mana-u">0</span></span>
              <span class="mana-pool-pip" onclick="GameEngine.addMana('B')">💀<span id="mana-b">0</span></span>
              <span class="mana-pool-pip" onclick="GameEngine.addMana('R')">🔥<span id="mana-r">0</span></span>
              <span class="mana-pool-pip" onclick="GameEngine.addMana('G')">🌲<span id="mana-g">0</span></span>
              <span class="mana-pool-pip" onclick="GameEngine.addMana('C')">◇<span id="mana-c">0</span></span>
              <span class="mana-pool-pip" style="color:var(--text-muted);" onclick="GameEngine.clearMana()" title="Zerar Reserva">✕</span>
            </div>
          </div>

          <!-- PLAYER BATTLEFIELD ZONE -->
          <div class="battlefield-zone player" id="my-battlefield">
            <div class="playmat-surface">
              <!-- Frontline: Creatures -->
              <div class="playmat-zone-slot frontline-combat-zone" id="my-frontline" data-drop-zone="battlefield">
                <span class="playmat-slot-label">⚔️ LINHA DE FRENTE (CRIATURAS)</span>
                ${myCreatures.map(c => CardRenderer.renderBattlefieldCard(c, true)).join('')}
              </div>
              <!-- Backline: Support & Lands -->
              <div class="playmat-zone-slot backline-mana-zone" id="my-backline" data-drop-zone="battlefield">
                <span class="playmat-slot-label">🌲 RETAGUARDA (TERRENOS & ARTEFATOS)</span>
                ${mySupport.map(c => CardRenderer.renderBattlefieldCard(c, true)).join('')}
              </div>
            </div>

            <!-- Player Dedicated Side Slots (Interactive) -->
            <div class="playmat-side-slots player-side-slots">
              <div class="playmat-dedicated-slot clickable-slot" onclick="GameEngine.action('drawCard')" title="Comprar Carta [D]">
                <span class="playmat-dedicated-slot-title">📚 Deck</span>
                <span class="playmat-dedicated-slot-count" id="playmat-library-count">${me?.library?.length || me?.libraryCount || 0}</span>
              </div>
              <div class="playmat-dedicated-slot clickable-slot" onclick="GameEngine.showZone('graveyard')" title="Ver Meu Cemitério">
                <span class="playmat-dedicated-slot-title">⚰️ Cem.</span>
                <span class="playmat-dedicated-slot-count" id="playmat-graveyard-count">${me?.graveyard?.length || me?.graveyardCount || 0}</span>
              </div>
              <div class="playmat-dedicated-slot clickable-slot" onclick="GameEngine.showZone('exile')" title="Ver Meu Exílio">
                <span class="playmat-dedicated-slot-title">🌀 Exílio</span>
                <span class="playmat-dedicated-slot-count" id="playmat-exile-count">${me?.exile?.length || me?.exileCount || 0}</span>
              </div>
              <div class="playmat-dedicated-slot clickable-slot" onclick="GameEngine.showZone('commandZone')" title="Ver Zona de Comando">
                <span class="playmat-dedicated-slot-title">👑 Cmd</span>
                <span class="playmat-dedicated-slot-count">${me?.commandZone?.length || 0}</span>
              </div>
            </div>
          </div>

          <!-- Chat Draggable / Collapsible Panel -->
          <div class="game-chat draggable-panel" id="game-chat" style="display:none;">
            <div class="draggable-header" onmousedown="GameEngine.makeDraggable(document.getElementById('game-chat'), event)">
              <span style="font-size:0.75rem;color:var(--mana-gold-glow);font-weight:600;">💬 Chat da Partida</span>
              <span style="font-size:0.75rem;color:var(--text-muted);cursor:pointer;padding:2px 6px;" onclick="document.getElementById('game-chat').style.display='none'">✕</span>
            </div>
            <div class="game-chat-messages" id="chat-messages">
              ${(room.chatHistory || []).map(m => `<div class="chat-message${m.player ? '' : ' system'}"><span class="chat-author">${m.player || 'Sistema'}:</span> ${m.message}</div>`).join('')}
            </div>
            <div class="game-chat-input">
              <input type="text" id="chat-input" placeholder="Mensagem..." onkeydown="if(event.key==='Enter')GameEngine.sendChat()">
              <button onclick="GameEngine.sendChat()">▶</button>
            </div>
          </div>
        </div>

        <!-- PLAYER HUD, ACTION BAR & EXPANDABLE HAND TRAY -->
        <div id="player-hand-panel-wrapper" class="player-hand-panel-wrapper">
          
          <!-- Quick Action Bar -->
          <div class="game-action-bar">
            <button class="game-action-btn primary" onclick="GameEngine.action('drawCard')">📥 Comprar [D]</button>
            <button class="game-action-btn" onclick="GameEngine.action('untapAll')">🔄 Desvirar [U]</button>
            <button class="game-action-btn" onclick="GameEngine.action('scry',{count:1})">👁 Vidência 1 [S]</button>
            <button class="game-action-btn" onclick="GameEngine.action('rollDice',{sides:20})">🎲 D20 [F]</button>
            <button class="game-action-btn" onclick="GameEngine.showTokenMenu()">🎭 Token</button>
            <button class="game-action-btn" onclick="GameEngine.action('mulligan')">♻️ Mulligan</button>
            <button class="game-action-btn" onclick="GameEngine.action('searchLibrary')">🔍 Tutor Deck</button>
            <button class="game-action-btn toggle-hand-btn" onclick="GameBoard.toggleHandExpand()">
              <span id="hand-toggle-label">🃏 Mão (${me?.hand?.length || 0}) ▲</span>
            </button>
          </div>

          <!-- Hand & Player Life Tray with Horizontal Navigation -->
          <div class="player-hand-area" id="player-hand-area">
            
            <!-- Player Life Counter & Counters Hub -->
            <div class="player-info-bar">
              <div class="life-display">
                <button class="life-btn minus" onclick="GameEngine.action('updateLife',{amount:-1})">−</button>
                <div class="life-value-wrapper">
                  <span class="life-number ${me && me.life <= 5 ? 'critical' : me && me.life <= 10 ? 'low' : ''}" id="my-life">${me?.life || 20}</span>
                  <span class="life-label-sub">VIDA</span>
                </div>
                <button class="life-btn plus" onclick="GameEngine.action('updateLife',{amount:1})">+</button>
                <div class="life-quick-btns">
                  <button class="life-quick-btn" onclick="GameEngine.action('updateLife',{amount:5})">+5</button>
                  <button class="life-quick-btn" onclick="GameEngine.action('updateLife',{amount:-5})">-5</button>
                </div>
              </div>
              
              <div class="player-aux-counters">
                <span class="mini-counter poison-counter" onclick="GameEngine.action('updatePoison',{amount:1})" title="Adicionar veneno">☠️ ${me?.poison || 0}</span>
                <span class="mini-counter energy-counter" onclick="GameEngine.action('updateEnergy',{amount:1})" title="Adicionar energia">⚡ ${me?.energy || 0}</span>
              </div>
            </div>

            <!-- Hand Scroll Left Arrow -->
            <button class="hand-scroll-btn hand-scroll-left" onclick="GameBoard.scrollHand(-160)" title="Rolar cartas para esquerda">◀</button>

            <!-- Hand Cards Fan with Wheel Scroll Support -->
            <div class="hand-cards" id="my-hand" onwheel="GameBoard.handleHandWheel(event)">
              ${me && me.hand && me.hand.length > 0
                ? me.hand.map(c => CardRenderer.renderHandCard(c)).join('')
                : '<div class="hand-empty-prompt">Clique em <b>"Deck"</b> no topo para importar e jogar com seu deck!</div>'}
            </div>

            <!-- Hand Scroll Right Arrow -->
            <button class="hand-scroll-btn hand-scroll-right" onclick="GameBoard.scrollHand(160)" title="Rolar cartas para direita">▶</button>
          </div>
        </div>

        <!-- MOBILE QUICK ACTIONS DRAWER MODAL -->
        <div id="mobile-quick-menu" class="mobile-actions-drawer" style="display:none;">
          <div class="drawer-header">
            <span>⚙️ Menu da Partida</span>
            <button class="modal-close" onclick="GameBoard.toggleMobileQuickMenu()">✕</button>
          </div>
          <div class="drawer-grid">
            <button class="drawer-action-btn" onclick="GameEngine.showDeckSelector(); GameBoard.toggleMobileQuickMenu();">📚 Trocar / Importar Deck</button>
            <button class="drawer-action-btn" onclick="GameEngine.action('searchLibrary'); GameBoard.toggleMobileQuickMenu();">🔍 Buscar no Deck (Tutor)</button>
            <button class="drawer-action-btn" onclick="GameEngine.showTokenMenu(); GameBoard.toggleMobileQuickMenu();">🎭 Criar Ficha (Token)</button>
            <button class="drawer-action-btn" onclick="GameEngine.action('rollDice',{sides:20}); GameBoard.toggleMobileQuickMenu();">🎲 Rolar D20</button>
            <button class="drawer-action-btn" onclick="GameEngine.action('mulligan'); GameBoard.toggleMobileQuickMenu();">♻️ Fazer Mulligan</button>
            <button class="drawer-action-btn" onclick="GameEngine.sendPingPrompt(); GameBoard.toggleMobileQuickMenu();">📍 Enviar Radar Ping</button>
            <button class="drawer-action-btn" onclick="document.getElementById('game-chat').style.display='flex'; GameBoard.toggleMobileQuickMenu();">💬 Abrir Chat</button>
            <button class="drawer-action-btn" onclick="GameEngine.showOnboardingModal(); GameBoard.toggleMobileQuickMenu();">❓ Guia de Regras</button>
            <button class="drawer-action-btn danger" onclick="GameEngine.leaveGame()">✕ Sair da Mesa</button>
          </div>
        </div>

      </div>
    `;

    const frontline = document.getElementById('my-frontline');
    if (frontline) DragDropSystem.init(frontline);
    const backline = document.getElementById('my-backline');
    if (backline) DragDropSystem.init(backline);
    const hand = document.getElementById('my-hand');
    if (hand) DragDropSystem.init(hand);

    GameEngine.bindKeyboardShortcuts();
  },

  handleHandWheel(e) {
    const container = document.getElementById('my-hand');
    if (container) {
      e.preventDefault();
      container.scrollLeft += (e.deltaY || e.deltaX) * 1.5;
    }
  },

  scrollHand(amount) {
    const container = document.getElementById('my-hand');
    if (container) {
      container.scrollBy({ left: amount, behavior: 'smooth' });
    }
  },

  toggleHandExpand() {
    const handArea = document.getElementById('player-hand-area');
    const label = document.getElementById('hand-toggle-label');
    this.handExpanded = !this.handExpanded;

    if (handArea) {
      if (this.handExpanded) {
        handArea.classList.add('hand-expanded');
        if (label) label.textContent = '🃏 Recolher Mão ▼';
      } else {
        handArea.classList.remove('hand-expanded');
        if (label) label.textContent = '🃏 Expandir Mão ▲';
      }
    }
  },

  toggleMobileQuickMenu() {
    const menu = document.getElementById('mobile-quick-menu');
    if (!menu) return;
    if (menu.style.display === 'none' || !menu.style.display) {
      menu.style.display = 'flex';
      document.body.classList.add('modal-open');
    } else {
      menu.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  }
};
