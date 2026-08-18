/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Drag & Drop System (Mobile Touch & Desktop Mouse)
   ═══════════════════════════════════════════════════════════════ */

const DragDropSystem = {
  activeCard: null,
  ghostEl: null,
  startX: 0,
  startY: 0,
  isDragging: false,
  suppressClick: false,
  initialized: false,

  init(container) {
    if (this.initialized) return;
    this.initialized = true;

    // Global document listeners for unified, glitch-free dragging on mobile & desktop
    document.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
  },

  onPointerDown(e) {
    if (e.button !== 0 && e.button !== undefined) return;
    const card = e.target.closest('[data-draggable]');
    if (!card) return;

    this.activeCard = card;
    this.isDragging = false;
    this.startX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    this.startY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    const onPointerMove = (moveEvent) => {
      const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0]?.clientX) || 0;
      const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0]?.clientY) || 0;
      const dist = Math.hypot(clientX - this.startX, clientY - this.startY);

      if (!this.isDragging && dist > 6) {
        this.isDragging = true;
        this.suppressClick = true;
        this.createGhost(card, clientX, clientY);
        card.style.opacity = '0.25';
      }

      if (this.isDragging && this.ghostEl) {
        if (moveEvent.cancelable) moveEvent.preventDefault();
        this.ghostEl.style.left = `${clientX}px`;
        this.ghostEl.style.top = `${clientY}px`;

        const target = document.elementFromPoint(clientX, clientY);
        document.querySelectorAll('.drop-zone-highlight').forEach(z => z.classList.remove('drop-zone-highlight'));
        const zone = target?.closest('[data-drop-zone]');
        if (zone) zone.classList.add('drop-zone-highlight');
      }
    };

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      const clientX = upEvent.clientX || (upEvent.changedTouches && upEvent.changedTouches[0]?.clientX) || this.startX;
      const clientY = upEvent.clientY || (upEvent.changedTouches && upEvent.changedTouches[0]?.clientY) || this.startY;

      if (this.isDragging && this.activeCard) {
        const target = document.elementFromPoint(clientX, clientY);
        const zone = target?.closest('[data-drop-zone]');

        if (zone) {
          const toZone = zone.dataset.dropZone;
          const fromZone = this.activeCard.dataset.zone;
          const event = new CustomEvent('card-dropped', {
            detail: {
              cardId: this.activeCard.dataset.cardId,
              fromZone,
              toZone,
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
        this.activeCard = null;
      }
      this.isDragging = false;
      document.querySelectorAll('.drop-zone-highlight').forEach(z => z.classList.remove('drop-zone-highlight'));

      setTimeout(() => {
        this.suppressClick = false;
      }, 250);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
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
