/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Translation Engine (Full Card Translation)
   ═══════════════════════════════════════════════════════════════ */

const TranslationEngine = {
  currentLanguage: localStorage.getItem('mtg_lang') || 'pt',
  translationCache: new Map(),

  languages: [
    { code: 'pt', name: 'Português (BR)', flag: '🇧🇷' },
    { code: 'en', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' }
  ],

  setLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem('mtg_lang', lang);
    showToast(`Idioma de tradução: ${this.languages.find(l => l.code === lang)?.name || lang} 🌐`, 'info');
  },

  // Translate complete card asynchronously with backend API
  async translateCard(card, targetLang = this.currentLanguage) {
    if (!card || targetLang === 'en') {
      return {
        name: card?.name || '',
        type_line: card?.type_line || '',
        oracle_text: card?.oracle_text || '',
        flavor_text: card?.flavor_text || '',
        is_official: true,
        lang: 'en'
      };
    }

    const cacheKey = `${card.id || card.name}_${targetLang}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      const response = await fetch('/api/cards/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card.id,
          card_name: card.name,
          type_line: card.type_line,
          oracle_text: card.oracle_text,
          flavor_text: card.flavor_text,
          set_code: card.set || card.set_code,
          target_lang: targetLang
        })
      });

      if (!response.ok) throw new Error('Translation API failed');
      const data = await response.json();

      this.translationCache.set(cacheKey, data);
      return data;
    } catch (err) {
      console.error('Translation error:', err);
      // Return original on error
      return {
        name: card.name,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
        flavor_text: card.flavor_text,
        is_official: false,
        lang: 'en'
      };
    }
  },

  // Language selector HTML helper
  renderSelector(id = 'lang-selector') {
    return `
      <select id="${id}" class="lang-select" onchange="TranslationEngine.setLanguage(this.value)">
        ${this.languages.map(l => `<option value="${l.code}" ${l.code === this.currentLanguage ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
      </select>
    `;
  }
};
