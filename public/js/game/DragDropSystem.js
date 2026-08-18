/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Drag & Drop System (Safe Touch & Mouse Dragging)
   ═══════════════════════════════════════════════════════════════ */

const DragDropSystem = {
  activeCard: null,
  ghostEl: null,
  startX: 0,
  startY: 0,
  isDragging: false,
  suppressClick: false,

  init(container) {
    if (!container) return;
    container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  },

  onPointerDown(e) {
    if (e.button !== 0 && e.button !== undefined) return;
    const card = e.target.closest('[data-draggable]');
    if (!card) return;

    this.activeCard = card;
    this.isDragging = false;
    this.startX = e.clientX;
    this.startY = e.clientY;

    const onPointerMove = (moveEvent) => {
      const dist = Math.hypot(moveEvent.clientX - this.startX, moveEvent.clientY - this.startY);

      if (!this.isDragging && dist > 8) {
        this.isDragging = true;
        this.suppressClick = true;
        this.createGhost(card, moveEvent.clientX, moveEvent.clientY);
        card.style.opacity = '0.3';
      }

      if (this.isDragging && this.ghostEl) {
        moveEvent.preventDefault();
        this.ghostEl.style.left = `${moveEvent.clientX}px`;
        this.ghostEl.style.top = `${moveEvent.clientY}px`;

        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        document.querySelectorAll('.drop-zone-highlight').forEach(z => z.classList.remove('drop-zone-highlight'));
        const zone = target?.closest('[data-drop-zone]');
        if (zone) zone.classList.add('drop-zone-highlight');
      }
    };

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (this.isDragging && this.activeCard) {
        const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const zone = target?.closest('[data-drop-zone]');

        if (zone) {
          const toZone = zone.dataset.dropZone;
          const fromZone = this.activeCard.dataset.zone;
          if (fromZone !== toZone) {
            const event = new CustomEvent('card-dropped', {
              detail: {
                cardId: this.activeCard.dataset.cardId,
                fromZone,
                toZone,
                x: upEvent.clientX,
                y: upEvent.clientY
              }
            });
            document.dispatchEvent(event);
          }
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

      // Keep suppressClick active for 200ms to ignore subsequent click event from drag
      setTimeout(() => {
        this.suppressClick = false;
      }, 200);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
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
    }

    document.body.appendChild(ghost);
    this.ghostEl = ghost;
  }
};
