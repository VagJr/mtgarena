/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Mana Symbols Component
   ═══════════════════════════════════════════════════════════════ */

const ManaSymbols = {
  symbolMap: {
    'W': { class: 'mana-W', label: '☀️', text: 'W' },
    'U': { class: 'mana-U', label: '💧', text: 'U' },
    'B': { class: 'mana-B', label: '💀', text: 'B' },
    'R': { class: 'mana-R', label: '🔥', text: 'R' },
    'G': { class: 'mana-G', label: '🌲', text: 'G' },
    'C': { class: 'mana-C', label: '◇', text: 'C' },
    'X': { class: 'mana-generic', label: 'X', text: 'X' },
  },

  render(manaCost) {
    if (!manaCost) return '';
    const symbols = manaCost.match(/\{([^}]+)\}/g);
    if (!symbols) return manaCost;

    return symbols.map(s => {
      const inner = s.replace(/[{}]/g, '');
      const info = this.symbolMap[inner];
      if (info) {
        return `<span class="mana-symbol ${info.class}" title="${inner}">${info.text}</span>`;
      }
      // Generic mana (numbers)
      if (/^\d+$/.test(inner)) {
        return `<span class="mana-symbol mana-generic" title="${inner}">${inner}</span>`;
      }
      // Hybrid mana
      if (inner.includes('/')) {
        const parts = inner.split('/');
        return `<span class="mana-symbol mana-generic" title="${inner}" style="font-size:0.55rem">${parts.join('/')}</span>`;
      }
      return `<span class="mana-symbol mana-generic" title="${inner}">${inner}</span>`;
    }).join('');
  },

  renderColorIdentity(colors) {
    if (!colors || colors.length === 0) return '<span class="mana-symbol mana-C">C</span>';
    return colors.map(c => {
      const info = this.symbolMap[c];
      return info ? `<span class="mana-symbol ${info.class}">${info.text}</span>` : '';
    }).join('');
  }
};
