/* Life Counter Component */
const LifeCounter = {
  render(life, options = {}) {
    const { playerId = 'player', editable = true, compact = false } = options;
    const lifeClass = life <= 5 ? 'critical' : life <= 10 ? 'low' : '';
    if (compact) {
      return `<span class="life-number ${lifeClass}">${life}</span>`;
    }
    return `
      <div class="life-display">
        ${editable ? `<button class="life-btn minus" onclick="updateLife('${playerId}', -1)">−</button>` : ''}
        <span class="life-number ${lifeClass}" id="life-${playerId}">${life}</span>
        ${editable ? `<button class="life-btn plus" onclick="updateLife('${playerId}', 1)">+</button>` : ''}
      </div>
    `;
  }
};
