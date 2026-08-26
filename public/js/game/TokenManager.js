/* Token Manager — Predefined and custom token creation */
const TokenManager = {
  presets: [
    { name:'Treasure', type:'Artifact', icon:'💰', power:'', toughness:'', tokenType:'artifact' },
    { name:'Food', type:'Artifact — Food', icon:'🍎', power:'', toughness:'', tokenType:'artifact' },
    { name:'Clue', type:'Artifact — Clue', icon:'🔍', power:'', toughness:'', tokenType:'artifact' },
    { name:'Blood', type:'Artifact — Blood', icon:'🩸', power:'', toughness:'', tokenType:'artifact' },
    { name:'Map', type:'Artifact — Map', icon:'🗺️', power:'', toughness:'', tokenType:'artifact' },
    { name:'Powerstone', type:'Artifact', icon:'💎', power:'', toughness:'', tokenType:'artifact' },
    { name:'Gold', type:'Artifact', icon:'🪙', power:'', toughness:'', tokenType:'artifact' },
    { name:'1/1 Soldier', type:'Creature — Human Soldier', icon:'🛡️', power:'1', toughness:'1', tokenType:'creature' },
    { name:'2/2 Zombie', type:'Creature — Zombie', icon:'🧟', power:'2', toughness:'2', tokenType:'creature' },
    { name:'1/1 Goblin', type:'Creature — Goblin', icon:'👺', power:'1', toughness:'1', tokenType:'creature' },
    { name:'1/1 Spirit', type:'Creature — Spirit', icon:'👻', power:'1', toughness:'1', tokenType:'creature' },
    { name:'4/4 Angel', type:'Creature — Angel', icon:'👼', power:'4', toughness:'4', tokenType:'creature' },
    { name:'Custom', type:'', icon:'✏️', power:'', toughness:'', tokenType:'creature' }
  ],
  renderPresets() {
    return `<div class="token-presets">${this.presets.map((t,i) =>
      `<div class="token-preset" onclick="TokenManager.createFromPreset(${i})"><span class="token-preset-icon">${t.icon}</span>${t.name}</div>`
    ).join('')}</div>`;
  },
  createFromPreset(idx) {
    const p = this.presets[idx];
    if (p.name === 'Custom') { this.showCustomForm(); return; }
    if (GameEngine.socket && GameEngine.roomId) {
      GameEngine.socket.emit('game:action', {
        roomId: GameEngine.roomId, type: 'createToken',
        tokenName: p.name, typeLine: p.type, power: p.power, toughness: p.toughness, tokenType: p.tokenType
      });
    }
  },
  showCustomForm() { /* simplified: prompt */ 
    const name = prompt('Nome do Token:');
    const power = prompt('Power:') || '1';
    const toughness = prompt('Toughness:') || '1';
    if (!name) return;
    if (GameEngine.socket && GameEngine.roomId) {
      GameEngine.socket.emit('game:action', {
        roomId: GameEngine.roomId, type: 'createToken',
        tokenName: name, typeLine: `Token Creature — ${name}`, power, toughness, tokenType: 'creature'
      });
    }
  }
};
