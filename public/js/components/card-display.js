/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Card Display Component (Clean 2-Column Showcase)
   ═══════════════════════════════════════════════════════════════ */

const CardDisplay = {
  render(card, options = {}) {
    const { showQuantity, quantity, compact, clickable = true } = options;
    const imageUri = this.getImageUri(card, compact ? 'small' : 'normal');
    const rarityClass = card.rarity ? `rarity-${card.rarity}` : '';
    const foilClass = card.foil ? 'foil' : '';

    return `
      <div class="mtg-card ${rarityClass} ${foilClass}"
           ${clickable ? `onclick="showCardDetail('${card.id || ''}')"` : ''}
           data-card-id="${card.id || ''}"
           data-card-name="${(card.name || '').replace(/"/g, '&quot;')}"
           title="${card.name || ''}">
        <img src="${imageUri}" alt="${card.name || 'Card'}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 63 88%22><rect fill=%22%231a1a2e%22 width=%2263%22 height=%2288%22 rx=%224%22/><text x=%2231.5%22 y=%2244%22 text-anchor=%22middle%22 fill=%22%23555%22 font-size=%228%22>🃏</text></svg>'">
        <div class="card-foil-overlay"></div>
        ${showQuantity && quantity > 1 ? `<span class="card-quantity-badge">×${quantity}</span>` : ''}
      </div>
    `;
  },

  renderDetailed(card) {
    const imageUri = this.getImageUri(card, 'large');
    const rarityColor = card.rarity === 'mythic' ? '#FF6D00' : card.rarity === 'rare' ? '#D4A017' : card.rarity === 'uncommon' ? '#6A8CA8' : '#A0A0A0';

    return `
      <!-- Left Column: HD Card Image View -->
      <div class="card-detail-visual">
        <div class="card-detail-image-wrapper" style="box-shadow: 0 0 30px ${rarityColor}40;">
          <img class="card-detail-image" src="${imageUri}" alt="${card.name}">
          <div class="card-foil-overlay"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:center;width:100%;">
          <button class="btn btn-secondary btn-sm" id="btn-toggle-translate" onclick="CardDisplay.toggleTranslate()">🌐 Traduzir (PT-BR)</button>
          ${AppState.user ? `<button class="btn btn-primary btn-sm" onclick="addCardToCollection('${card.id}', '${(card.name || '').replace(/'/g, "\\'")}', '${card.set || ''}', '${card.rarity || ''}', '${(this.getImageUri(card, 'normal') || '').replace(/'/g, "\\'")}')">📚 + Coleção</button>` : ''}
        </div>
      </div>

      <!-- Right Column: Full Width Rules & Technical Details -->
      <div class="card-detail-info" id="card-modal-data"
           data-card-id="${card.id || ''}"
           data-card-name="${(card.name || '').replace(/"/g, '&quot;')}"
           data-oracle="${(card.oracle_text || '').replace(/"/g, '&quot;')}"
           data-type="${(card.type_line || '').replace(/"/g, '&quot;')}">
        
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;margin-bottom:12px;">
          <div>
            <h2 id="modal-card-name" style="font-size:1.4rem;margin:0 0 4px;color:var(--text-primary);font-family:var(--font-heading);">${card.name}</h2>
            <p class="card-detail-type" id="modal-card-type" style="margin:0;font-size:0.85rem;color:var(--text-muted);">${card.type_line || ''}</p>
          </div>
          <div class="mana-cost" style="font-size:1.2rem;white-space:nowrap;">${ManaSymbols.render(card.mana_cost)}</div>
        </div>
        
        <div class="card-detail-oracle" id="modal-card-oracle">
          ${this.formatOracleText(card.oracle_text)}
        </div>

        ${card.flavor_text ? `<div id="modal-card-flavor" style="color:var(--text-muted);font-style:italic;font-size:0.82rem;margin:10px 0;border-left:2px solid var(--border-subtle);padding-left:10px;line-height:1.4;">"${card.flavor_text}"</div>` : ''}
        
        <!-- Technical Grid -->
        <div class="card-detail-stats">
          ${card.power !== undefined && card.power !== null ? `<div class="card-stat"><span class="card-stat-label">Poder / Resistência</span><b>${card.power}/${card.toughness}</b></div>` : ''}
          ${card.loyalty ? `<div class="card-stat"><span class="card-stat-label">Lealdade</span><b>${card.loyalty}</b></div>` : ''}
          <div class="card-stat"><span class="card-stat-label">Raridade</span><span class="badge badge-${card.rarity}">${(card.rarity || 'N/A').toUpperCase()}</span></div>
          <div class="card-stat"><span class="card-stat-label">Coleção</span><b>${(card.set_name || card.set || '').toUpperCase()}</b></div>
          ${card.artist ? `<div class="card-stat"><span class="card-stat-label">Ilustrador</span>${card.artist}</div>` : ''}
          ${card.prices?.usd ? `<div class="card-stat"><span class="card-stat-label">Cotação Mercado</span><b style="color:var(--mana-gold-glow);">$${card.prices.usd} USD</b></div>` : ''}
        </div>

        ${card.legalities ? `
          <div style="margin-top:14px;">
            <h4 style="margin:0 0 6px;font-size:0.72rem;color:var(--text-muted);letter-spacing:0.05em;text-transform:uppercase;">Legalidade nos Formatos Oficiais</h4>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              ${Object.entries(card.legalities).filter(([, v]) => v === 'legal').slice(0, 10).map(([f]) =>
                `<span class="badge" style="background:rgba(76,175,80,0.15);color:var(--success);font-size:0.65rem;padding:3px 8px;border:1px solid rgba(76,175,80,0.3);">${f.toUpperCase()}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  getImageUri(card, size = 'normal') {
    if (!card) return '';
    if (card.image_uris) return card.image_uris[size] || card.image_uris.normal || card.image_uris.small || '';
    if (card.image_uri) return card.image_uri;
    if (card.card_faces && card.card_faces[0]?.image_uris) {
      return card.card_faces[0].image_uris[size] || card.card_faces[0].image_uris.normal || '';
    }
    return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name || '')}&format=image&version=${size}`;
  },

  formatOracleText(text) {
    if (!text) return '<span style="color:var(--text-muted);font-style:italic;">Sem texto de regras adicional.</span>';
    return text
      .replace(/\{([^}]+)\}/g, (_, s) => ManaSymbols.render(`{${s}}`))
      .replace(/\n/g, '<br><br>');
  },

  async toggleTranslate() {
    const modalData = document.getElementById('card-modal-data');
    if (!modalData) return;

    const nameEl = document.getElementById('modal-card-name');
    const typeEl = document.getElementById('modal-card-type');
    const oracleEl = document.getElementById('modal-card-oracle');
    const btn = document.getElementById('btn-toggle-translate');

    const card = {
      id: modalData.dataset.cardId,
      name: modalData.dataset.cardName,
      type_line: modalData.dataset.type,
      oracle_text: modalData.dataset.oracle
    };

    if (modalData.dataset.translated === 'true') {
      nameEl.textContent = card.name;
      typeEl.textContent = card.type_line;
      oracleEl.innerHTML = this.formatOracleText(card.oracle_text);
      modalData.dataset.translated = 'false';
      btn.textContent = '🌐 Traduzir (PT-BR)';
      showToast('Texto original (EN)', 'info', 1200);
    } else {
      btn.textContent = '⏳ Traduzindo...';
      const trans = await TranslationEngine.translateCard(card, 'pt');

      nameEl.textContent = trans.name || card.name;
      typeEl.textContent = trans.type_line || card.type_line;
      oracleEl.innerHTML = `
        <div style="font-size:0.75rem;color:var(--mana-gold-glow);margin-bottom:6px;font-weight:600;">
          🇧🇷 Tradução Oficial (PT-BR):
        </div>
        ${this.formatOracleText(trans.oracle_text)}
      `;
      modalData.dataset.translated = 'true';
      btn.textContent = '🇺🇸 Ver em Inglês';
      showToast('Carta traduzida para Português! 🇧🇷', 'success', 1800);
    }
  },

  renderSkeleton(count = 12) {
    return Array(count).fill('<div class="skeleton skeleton-card"></div>').join('');
  },

  // Interactive 3D Card Physics with Gyroscopic Holographic Reflection
  init3DTilt(container) {
    if (!container) return;
    let isDragging = false;

    function handleMove(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (clientX - centerX) / (rect.width / 2);
      const deltaY = (clientY - centerY) / (rect.height / 2);

      // Max rotation: 24 degrees
      const rotateY = Math.max(-24, Math.min(24, deltaX * 22));
      const rotateX = Math.max(-24, Math.min(24, -deltaY * 22));

      container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`;
      container.style.boxShadow = `${-deltaX * 15}px ${deltaY * 15 + 10}px 35px rgba(0,0,0,0.8), 0 0 35px rgba(212,160,23,0.45)`;

      const foil = container.querySelector('.card-foil-overlay');
      if (foil) {
        foil.style.opacity = '0.75';
        foil.style.backgroundPosition = `${50 + deltaX * 40}% ${50 + deltaY * 40}%`;
      }
    }

    function resetTilt() {
      container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      container.style.boxShadow = '';
      const foil = container.querySelector('.card-foil-overlay');
      if (foil) {
        foil.style.opacity = '0.35';
        foil.style.backgroundPosition = 'center';
      }
    }

    container.addEventListener('pointerdown', (e) => {
      isDragging = true;
      try { container.setPointerCapture(e.pointerId); } catch(err) {}
      handleMove(e.clientX, e.clientY);
    });

    container.addEventListener('pointermove', (e) => {
      if (isDragging || e.pointerType === 'mouse') {
        handleMove(e.clientX, e.clientY);
      }
    });

    container.addEventListener('pointerup', (e) => {
      isDragging = false;
      resetTilt();
    });

    container.addEventListener('pointercancel', resetTilt);
    container.addEventListener('pointerleave', (e) => {
      if (!isDragging) resetTilt();
    });
  }
};

async function showCardDetail(cardId) {
  if (!cardId) return;
  try {
    const card = await API.getCardById(cardId);
    const content = document.getElementById('card-detail-content');
    if (content) {
      content.innerHTML = CardDisplay.renderDetailed(card);
      const wrapper = content.querySelector('.card-detail-image-wrapper');
      if (wrapper) CardDisplay.init3DTilt(wrapper);
    }
    openModal('card-modal');
  } catch (err) {
    showToast('Erro ao carregar carta: ' + err.message, 'error');
  }
}

function hideCardModal() {
  closeModal('card-modal');
}

async function addCardToCollection(cardId, cardName, setCode, rarity, imageUri) {
  if (!AppState.user) return showToast('Faça login primeiro', 'warning');
  try {
    await API.addToCollection({ card_id: cardId, card_name: cardName, set_code: setCode, rarity, image_uri: imageUri });
    showToast(`${cardName} adicionada à coleção! 📚`, 'success');
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
