/* VFX Engine — Visual effects for game actions */
const VFXEngine = {
  createParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.width = p.style.height = (3 + Math.random() * 5) + 'px';
      p.style.background = color;
      p.style.setProperty('--px', (Math.random() * 100 - 50) + 'px');
      p.style.setProperty('--py', (Math.random() * -80 - 20) + 'px');
      p.style.boxShadow = `0 0 6px ${color}`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  },
  damageFlash() { const l = document.createElement('div'); l.className = 'vfx-layer'; l.style.background = 'rgba(183,28,28,0.15)'; l.style.animation = 'fadeIn 0.1s ease'; document.body.appendChild(l); setTimeout(() => l.remove(), 400); },
  healFlash() { const l = document.createElement('div'); l.className = 'vfx-layer'; l.style.boxShadow = 'inset 0 0 100px rgba(76,175,80,0.2)'; document.body.appendChild(l); setTimeout(() => l.remove(), 600); },
  castSpell(color) { const colors = { W:'#F0E68C', U:'#4FC3F7', B:'#9C27B0', R:'#FF5252', G:'#66BB6A' }; this.createParticles(window.innerWidth/2, window.innerHeight/2, colors[color] || '#FFD700', 25); },
  showDiceResult(sides, result) {
    const d = document.createElement('div'); d.className = 'dice-result';
    d.innerHTML = `<div class="dice-result-number">${result}</div><div class="dice-result-label">d${sides}</div>`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2000);
  },
  showCoinResult(result) {
    const d = document.createElement('div'); d.className = 'dice-result';
    d.innerHTML = `<div class="dice-result-number">${result === 'heads' ? '👑' : '🛡️'}</div><div class="dice-result-label">${result === 'heads' ? 'Cara' : 'Coroa'}</div>`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2000);
  }
};
