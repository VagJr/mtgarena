/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Card OCR (Optical Character Recognition)
   Client-side text recognition for card images & translation
   ═══════════════════════════════════════════════════════════════ */

const CardOCR = {
  isProcessing: false,

  // Render OCR Scanner Modal
  showScannerModal() {
    let modal = document.getElementById('ocr-scanner-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ocr-scanner-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal ocr-modal">
          <button class="modal-close" onclick="CardOCR.hideScannerModal()">✕</button>
          <div class="ocr-modal-header">
            <h2>📷 Reconhecimento de Cartas (OCR)</h2>
            <p style="color:var(--text-muted);font-size:0.85rem;">Carregue a foto de uma carta física para reconhecer, buscar e traduzir em tempo real.</p>
          </div>

          <div class="ocr-dropzone" id="ocr-dropzone" onclick="document.getElementById('ocr-file-input').click()">
            <input type="file" id="ocr-file-input" accept="image/*" style="display:none;" onchange="CardOCR.handleFileSelect(event)">
            <div id="ocr-preview-container">
              <div class="ocr-icon">📷</div>
              <p><b>Clique ou arraste uma foto da carta</b></p>
              <span style="font-size:0.75rem;color:var(--text-muted);">Suporta JPG, PNG, WEBP</span>
            </div>
          </div>

          <div id="ocr-status" class="ocr-status" style="display:none;">
            <div class="loading-bar"><div class="loading-bar-fill" id="ocr-progress"></div></div>
            <p id="ocr-status-text" style="font-size:0.85rem;color:var(--mana-gold-glow);margin-top:6px;">Analisando imagem...</p>
          </div>

          <div id="ocr-results" class="ocr-results" style="display:none;"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
  },

  hideScannerModal() {
    const modal = document.getElementById('ocr-scanner-modal');
    if (modal) modal.style.display = 'none';
  },

  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewContainer = document.getElementById('ocr-preview-container');
    const statusEl = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text');
    const progressBar = document.getElementById('ocr-progress');
    const resultsEl = document.getElementById('ocr-results');

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewContainer.innerHTML = `
        <img src="${e.target.result}" style="max-height:180px;border-radius:8px;box-shadow:var(--shadow-md);margin-bottom:8px;" alt="Carta">
        <p style="font-size:0.8rem;color:var(--text-secondary);">${file.name}</p>
      `;
    };
    reader.readAsDataURL(file);

    statusEl.style.display = 'block';
    resultsEl.style.display = 'none';
    progressBar.style.width = '20%';
    statusText.textContent = 'Carregando biblioteca de OCR...';

    try {
      // Dynamically load Tesseract.js if not already present
      if (typeof Tesseract === 'undefined') {
        await this.loadTesseract();
      }

      progressBar.style.width = '50%';
      statusText.textContent = 'Processando texto da carta...';

      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              progressBar.style.width = `${50 + Math.round(m.progress * 40)}%`;
              statusText.textContent = `Reconhecendo: ${Math.round(m.progress * 100)}%`;
            }
          }
        }
      );

      progressBar.style.width = '95%';
      statusText.textContent = 'Buscando carta no banco de dados Scryfall...';

      const recognizedText = result.data.text;
      const cardTitle = this.extractCardTitle(recognizedText);

      // Search Scryfall by extracted title
      let matchedCards = [];
      if (cardTitle) {
        try {
          const searchResult = await API.searchCards(cardTitle);
          matchedCards = searchResult.data || [];
        } catch(e) {
          // If direct search fails, try fuzzy
          try {
            const fuzzyResult = await API.getCardByName(cardTitle, true);
            if (fuzzyResult) matchedCards = [fuzzyResult];
          } catch(err) {}
        }
      }

      progressBar.style.width = '100%';
      statusEl.style.display = 'none';
      resultsEl.style.display = 'block';

      if (matchedCards.length > 0) {
        const topCard = matchedCards[0];
        const translatedOracle = TranslationEngine.translate(topCard.oracle_text || '', 'pt');

        resultsEl.innerHTML = `
          <div class="ocr-match-card panel panel-glass" style="margin-top:var(--space-md);">
            <div style="display:flex;gap:var(--space-md);align-items:flex-start;">
              <img src="${CardDisplay.getImageUri(topCard, 'normal')}" style="width:120px;border-radius:8px;" alt="${topCard.name}">
              <div style="flex:1;">
                <span class="badge" style="background:var(--success);color:white;margin-bottom:4px;">✨ Correspondência Encontrada</span>
                <h3 style="margin-bottom:4px;">${topCard.name}</h3>
                <p style="font-size:0.8rem;color:var(--text-muted);">${topCard.type_line}</p>
                <div class="mana-cost" style="margin:6px 0;">${ManaSymbols.render(topCard.mana_cost)}</div>
                <div class="card-detail-oracle" style="font-size:0.85rem;margin-top:8px;">
                  <b>Tradução (PT-BR):</b><br>
                  ${CardDisplay.formatOracleText(translatedOracle)}
                </div>
                <div style="display:flex;gap:6px;margin-top:var(--space-md);">
                  <button class="btn btn-primary btn-sm" onclick="showCardDetail('${topCard.id}')">Ver Detalhes</button>
                  ${AppState.user ? `<button class="btn btn-secondary btn-sm" onclick="addCardToCollection('${topCard.id}', '${topCard.name.replace(/'/g, "\\'")}', '${topCard.set}', '${topCard.rarity}', '${CardDisplay.getImageUri(topCard, 'normal')}')">Adicionar à Coleção</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        resultsEl.innerHTML = `
          <div class="empty-state" style="padding:var(--space-md);">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">Texto Reconhecido:</div>
            <p style="font-family:var(--font-mono);font-size:0.8rem;background:var(--bg-tertiary);padding:8px;border-radius:6px;max-height:100px;overflow-y:auto;text-align:left;">
              ${recognizedText || 'Nenhum texto legível encontrado.'}
            </p>
            <p class="empty-state-text" style="margin-top:8px;">Tente aproximar a foto da caixa de título da carta com boa iluminação.</p>
          </div>
        `;
      }
    } catch (err) {
      statusEl.style.display = 'none';
      resultsEl.style.display = 'block';
      resultsEl.innerHTML = `<div class="auth-error">Erro ao processar imagem: ${err.message}</div>`;
    }
  },

  extractCardTitle(text) {
    if (!text) return '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    // Usually the first line is the card title
    for (const line of lines) {
      // Clean noise characters
      const cleaned = line.replace(/[^a-zA-Z0-9\s,'-]/g, '').trim();
      if (cleaned.length >= 3 && !/^(creature|instant|sorcery|land|artifact|enchantment|legendary|planeswalker)/i.test(cleaned)) {
        return cleaned;
      }
    }
    return lines[0] || '';
  },

  loadTesseract() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js via CDN'));
      document.head.appendChild(script);
    });
  }
};
