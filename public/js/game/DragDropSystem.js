/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Drag & Drop System
   Hand cards: horizontal swipe → carousel zoom
   Hand cards: vertical swipe → drag to play
   Battlefield cards: always drag
   ═══════════════════════════════════════════════════════════════ */

const DragDropSystem = {
  activeCard: null,
  ghostEl: null,
  startX: 0,
  startY: 0,
  isDragging: false,
  suppressClick: false,
  listenersBound: false,

  // Direction decision state
  pendingDecision: false,
  committedMode: null, // 'drag' | 'carousel' | null

  // Carousel state
  isCarousel: false,
  carouselLastCardId: null,
  handCardsCache: [],

  // Touch drag inspector state
  touchDragInspectId: null,

  init(container) {
    if (this.listenersBound) return;
    this.listenersBound = true;
    document.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
  },

  destroy() {
    this.listenersBound = false;
    this.activeCard = null;
    this.suppressClick = false;
    this.isDragging = false;
    this.pendingDecision = false;
    this.committedMode = null;
    this.isCarousel = false;
    this.carouselLastCardId = null;
    this.touchDragInspectId = null;
    if (this.ghostEl) {
      this.ghostEl.remove();
      this.ghostEl = null;
    }
  },

  onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const card = e.target.closest('[data-draggable]');
    if (!card) return;

    const isHandCard = card.dataset.zone === 'hand';
    const startX = e.clientX || 0;
    const startY = e.clientY || 0;
    const hand = isHandCard ? card.closest('#my-hand') : null;

    this.activeCard = card;
    this.isDragging = false;
    this.startX = startX;
    this.startY = startY;
    this.pendingDecision = true;
    this.committedMode = null;
    this.isCarousel = false;
    this.carouselLastCardId = null;

    if (isHandCard && hand) {
      this.handCardsCache = Array.from(hand.querySelectorAll('.hand-card'));
    } else {
      this.handCardsCache = [];
    }

    const onPointerMove = (moveEvent) => {
      const clientX = moveEvent.clientX || 0;
      const clientY = moveEvent.clientY || 0;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dist = Math.hypot(dx, dy);

      // ─── DECISION PHASE: determine mode from first ~12px of movement ───
      if (this.pendingDecision && dist > 12) {
        this.pendingDecision = false;

        if (isHandCard) {
          const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
          if (isHorizontal && hand) {
            // CAROUSEL MODE — horizontal swipe on hand card
            this.committedMode = 'carousel';
            this.isCarousel = true;
            this.suppressClick = true;
            hand.style.scrollSnapType = 'none';
            this._updateCarousel(clientX);
            return;
          } else {
            // DRAG MODE — vertical swipe, play the card
            this.committedMode = 'drag';
          }
        } else {
          this.committedMode = 'drag';
        }
      }

      if (this.pendingDecision) return;

      // ─── CAROUSEL MODE ───
      if (this.isCarousel) {
        if (moveEvent.cancelable) moveEvent.preventDefault();
        this._updateCarousel(clientX);
        return;
      }

      // ─── DRAG MODE ───
      if (this.committedMode === 'drag' && !this.isDragging) {
        this.isDragging = true;
        this.suppressClick = true;
        this.createGhost(card, clientX, clientY);
        card.style.opacity = '0.2';
        card.style.transition = 'opacity 0.15s ease';
      }

      if (this.isDragging && this.ghostEl) {
        if (moveEvent.cancelable) moveEvent.preventDefault();
        this.ghostEl.style.left = `${clientX}px`;
        this.ghostEl.style.top = `${clientY}px`;

        const target = document.elementFromPoint(clientX, clientY);
        document.querySelectorAll('.drop-zone-highlight').forEach(z => z.classList.remove('drop-zone-highlight'));
        const zone = target?.closest('[data-drop-zone]');
        if (zone) zone.classList.add('drop-zone-highlight');

        // Touch drag: update inspector to card under finger
        if (moveEvent.pointerType === 'touch') {
          const cardUnder = target?.closest('[data-card-id]');
          if (cardUnder) {
            const uid = cardUnder.dataset.cardId;
            if (uid && uid !== this.touchDragInspectId) {
              this.touchDragInspectId = uid;
              GameEngine.inspectCardInstant(uid);
            }
          }
        }
      }
    };

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const clientX = upEvent.clientX || startX;
      const clientY = upEvent.clientY || startY;

      // ─── CAROUSEL END ───
      if (this.isCarousel && this.carouselLastCardId) {
        if (hand) hand.style.scrollSnapType = '';
        GameEngine.inspectCard(this.carouselLastCardId);
        this.handCardsCache.forEach(c => c.classList.remove('carousel-active'));
      }

      // ─── DRAG END ───
      if (this.isDragging && this.activeCard) {
        const target = document.elementFromPoint(clientX, clientY);
        const zone = target?.closest('[data-drop-zone]');

        if (zone) {
          const event = new CustomEvent('card-dropped', {
            detail: {
              cardId: this.activeCard.dataset.cardId,
              fromZone: this.activeCard.dataset.zone,
              toZone: zone.dataset.dropZone,
              targetZoneId: zone.id,
              x: clientX,
              y: clientY
            }
          });
          document.dispatchEvent(event);
        }
      }

      if (this.ghostEl) {
        this.ghostEl.remove();
        this.ghostEl = null;
      }
      if (this.activeCard) {
        this.activeCard.style.opacity = '';
        this.activeCard.style.transition = '';
        this.activeCard = null;
      }

      this.isDragging = false;
      this.isCarousel = false;
      this.pendingDecision = false;
      this.committedMode = null;
      this.carouselLastCardId = null;
      this.handCardsCache = [];
      this.touchDragInspectId = null;
      document.querySelectorAll('.drop-zone-highlight').forEach(z => z.classList.remove('drop-zone-highlight'));

      setTimeout(() => {
        this.suppressClick = false;
      }, 250);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  },

  _updateCarousel(clientX) {
    if (!this.handCardsCache.length) return;

    let closestCard = null;
    let closestDist = Infinity;
    this.handCardsCache.forEach(c => {
      const rect = c.getBoundingClientRect();
      const dist = Math.abs(clientX - (rect.left + rect.width / 2));
      if (dist < closestDist) {
        closestDist = dist;
        closestCard = c;
      }
    });

    if (closestCard) {
      const cardId = closestCard.dataset.cardId;
      if (cardId && cardId !== this.carouselLastCardId) {
        this.carouselLastCardId = cardId;
        GameEngine.inspectCardInstant(cardId);

        this.handCardsCache.forEach(c => c.classList.remove('carousel-active'));
        closestCard.classList.add('carousel-active');

        try { navigator.vibrate?.(8); } catch(err) {}
      }
    }
  },

  createGhost(card, clientX, clientY) {
    const img = card.querySelector('img');
    const ghost = document.createElement('div');
    ghost.className = 'card-drag-ghost';
    ghost.style.left = `${clientX}px`;
    ghost.style.top = `${clientY}px`;

    if (img) {
      const ghostImg = document.createElement('img');
      ghostImg.src = img.src;
      ghost.appendChild(ghostImg);
    } else {
      ghost.innerHTML = card.innerHTML;
    }

    document.body.appendChild(ghost);
    this.ghostEl = ghost;
  }
};
