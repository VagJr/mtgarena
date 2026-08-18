/* Counter System — All MTG counter types */
const CounterSystem = {
  types: {
    '+1/+1': { color: '#4CAF50', icon: '⬆️', cssClass: 'counter-plus' },
    '-1/-1': { color: '#F44336', icon: '⬇️', cssClass: 'counter-minus' },
    'loyalty': { color: '#1A73E8', icon: '💠', cssClass: 'counter-loyalty' },
    'charge': { color: '#FFD700', icon: '⚡', cssClass: 'counter-generic' },
    'shield': { color: '#4FC3F7', icon: '🛡️', cssClass: 'counter-shield' },
    'stun': { color: '#FF9800', icon: '⚡', cssClass: 'counter-stun' },
    'time': { color: '#9C27B0', icon: '⏳', cssClass: 'counter-generic' },
    'lore': { color: '#D4A017', icon: '📖', cssClass: 'counter-generic' },
    'quest': { color: '#E65100', icon: '❗', cssClass: 'counter-generic' },
    'defense': { color: '#795548', icon: '🏰', cssClass: 'counter-generic' },
    'finality': { color: '#333', icon: '💀', cssClass: 'counter-minus' },
    'page': { color: '#9E9E9E', icon: '📄', cssClass: 'counter-generic' },
    'fade': { color: '#607D8B', icon: '💨', cssClass: 'counter-generic' },
    'storage': { color: '#78909C', icon: '📦', cssClass: 'counter-generic' }
  },
  keywordCounters: ['flying','first_strike','double_strike','deathtouch','haste','hexproof','indestructible','lifelink','menace','reach','trample','vigilance','shadow','decayed'],
  renderCounterPips(counters) {
    if (!counters || Object.keys(counters).length === 0) return '';
    return '<div class="card-counters">' + Object.entries(counters).map(([type, val]) => {
      const info = this.types[type] || { cssClass: 'counter-generic', color: '#999' };
      return `<span class="card-counter-pip ${info.cssClass}" title="${type}: ${val}">${val}</span>`;
    }).join('') + '</div>';
  },
  renderCounterMenu(cardId) {
    return `<div class="counter-menu">${Object.entries(this.types).map(([type, info]) =>
      `<button class="btn btn-ghost btn-sm" onclick="GameEngine.addCounter('${cardId}','${type}')">${info.icon} ${type}</button>`
    ).join('')}</div>`;
  }
};
