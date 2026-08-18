/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Card Renderer (Touch & Mouse Long-Press + RMB)
   ═══════════════════════════════════════════════════════════════ */

const CardRenderer = {
  lastTapTime: {},
  longPressTimer: null,
  pressStartX: 0,
  pressStartY: 0,

  renderBattlefieldCard(card, isOwn = true) {
    const tapped = card.tapped ? 'tapped' : '';
    const phased = card.phasedOut ? 'phased-out' : '';
    const faceDown = card.faceDown ? 'face-down' : '';
    const imgUri = CardDisplay.getImageUri(card, 'normal');

    const img = card.isToken
      ? `<div style="width:100%;height:100%;background:var(--bg-elevated);border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:0.58rem;padding:3px;border:1px solid var(--border-default);"><span style="font-size:1rem;">${card.tokenType==='artifact'?'⚙️':'⚔️'}</span><b>${card.name}</b>${card.power?`<span>${card.power}/${card.toughness}</span>`:''}</div>`
      : `<img src="${imgUri}" alt="${card.name}" draggable="false" loading="lazy">`;

    return `
      <div class="battlefield-card ${tapped} ${phased} ${faceDown}"
           id="card-node-${card.id}"
           data-card-id="${card.id}"
           data-card-name="${(card.name || '').replace(/"/g, '&quot;')}"
           data-card-oracle="${(card.oracle_text || '').replace(/"/g, '&quot;')}"
           data-card-type="${(card.type_line || '').replace(/"/g, '&quot;')}"
           data-card-power="${card.power !== undefined ? card.power : ''}"
           data-card-toughness="${card.toughness !== undefined ? card.toughness : ''}"
           data-card-image="${imgUri}"
           data-is-own="${isOwn ? 'true' : 'false'}"
           data-draggable data-zone="battlefield"
           onclick="CardRenderer.handleCardTap(event, '${card.id}', ${isOwn}, 'battlefield')"
           onpointerdown="CardRenderer.handlePointerDown(event, '${card.id}', ${isOwn}, 'battlefield')"
           onpointermove="CardRenderer.handlePointerMove(event)"
           onpointerup="CardRenderer.handlePointerUp()"
           onpointercancel="CardRenderer.handlePointerUp()"
           ${isOwn ? `ondblclick="GameEngine.tapCard('${card.id}')"` : ''}
           oncontextmenu="GameEngine.showContextMenu(event, '${card.id}', ${isOwn}); return false;"
           onwheel="GameEngine.handleCardWheel(event, '${card.id}')"
           title="${card.name}${card.power ? ` (${card.power}/${card.toughness})` : ''} • Segure ou Clique Direito para Opções">
        ${img}
        ${CounterSystem.renderCounterPips(card.counters)}
      </div>`;
  },

  renderHandCard(card) {
    const imgUri = CardDisplay.getImageUri(card, 'normal');
    return `
      <div class="hand-card"
           id="card-node-${card.id}"
           data-card-id="${card.id}"
           data-card-name="${(card.name || '').replace(/"/g, '&quot;')}"
           data-card-oracle="${(card.oracle_text || '').replace(/"/g, '&quot;')}"
           data-card-type="${(card.type_line || '').replace(/"/g, '&quot;')}"
           data-card-image="${imgUri}"
           data-draggable data-zone="hand"
           onclick="CardRenderer.handleCardTap(event, '${card.id}', true, 'hand')"
           onpointerdown="CardRenderer.handlePointerDown(event, '${card.id}', true, 'hand')"
           onpointermove="CardRenderer.handlePointerMove(event)"
           onpointerup="CardRenderer.handlePointerUp()"
           onpointercancel="CardRenderer.handlePointerUp()"
           ondblclick="GameEngine.playCard('${card.id}')"
           oncontextmenu="GameEngine.showHandContextMenu(event, '${card.id}'); return false;"
           title="${card.name} (Arraste para a mesa • Segure para opções)">
        <img src="${imgUri}" alt="${card.name}" draggable="false" loading="lazy">
      </div>`;
  },

  handlePointerDown(e, cardId, isOwn, zone) {
    this.handlePointerUp();
    this.pressStartX = e.clientX || 0;
    this.pressStartY = e.clientY || 0;

    // Trigger Long-Press in 400ms for both Touch and Left-Click hold
    this.longPressTimer = setTimeout(() => {
      if (DragDropSystem.isDragging) return;
      try { navigator.vibrate?.(45); } catch(err) {}
      if (zone === 'hand') {
        GameEngine.showHandContextMenu(e, cardId);
      } else {
        GameEngine.showContextMenu(e, cardId, isOwn);
      }
      this.longPressTimer = null;
    }, 400);
  },

  handlePointerMove(e) {
    if (this.longPressTimer) {
      const dist = Math.hypot(e.clientX - this.pressStartX, e.clientY - this.pressStartY);
      if (dist > 8) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }
  },

  handlePointerUp() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  },

  handleCardTap(e, cardId, isOwn, zone) {
    this.handlePointerUp();
    if (DragDropSystem.suppressClick) return;

    const isTouch = e.pointerType === 'touch' || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (isTouch) {
      const now = Date.now();
      const lastTap = this.lastTapTime[cardId] || 0;
      this.lastTapTime[cardId] = now;

      // Touch Double Tap (<300ms) -> HD Zoom Modal
      if (now - lastTap < 300) {
        this.lastTapTime[cardId] = 0;
        GameEngine.showFullCardZoom(cardId);
        return;
      }
    }

    // Single Tap
    if (zone === 'hand') {
      GameEngine.inspectCard(cardId);
    } else {
      GameEngine.handleCardClick(cardId);
    }
  }
};
