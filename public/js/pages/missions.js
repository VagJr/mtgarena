/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Missions Page
   Daily/Weekly/Event missions with progress tracking
   ═══════════════════════════════════════════════════════════════ */

const MissionsPage = {
  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container page-enter" style="padding-top:80px;padding-bottom:40px;">
        <div class="page-header">
          <h1 class="page-title">📋 Missões</h1>
          <p class="page-subtitle">Complete missões para ganhar recompensas exclusivas</p>
        </div>

        <div class="missions-tabs" style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm missions-tab active" data-tab="daily" onclick="MissionsPage.switchTab('daily')">📅 Diárias</button>
          <button class="btn btn-ghost btn-sm missions-tab" data-tab="weekly" onclick="MissionsPage.switchTab('weekly')">📆 Semanais</button>
          <button class="btn btn-ghost btn-sm missions-tab" data-tab="event" onclick="MissionsPage.switchTab('event')">🎯 Eventos</button>
        </div>

        <div id="missions-content" class="missions-grid">
          <div class="loading-state" style="text-align:center;padding:40px;">
            <div class="loading-bar" style="width:200px;margin:0 auto;"><div class="loading-bar-fill"></div></div>
            <p style="color:var(--text-muted);margin-top:12px;">Carregando missões...</p>
          </div>
        </div>
      </div>
    `;
    this.loadMissions('daily');
  },

  async switchTab(tab) {
    document.querySelectorAll('.missions-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
      t.className = t.classList.contains('active') ? 'btn btn-primary btn-sm missions-tab active' : 'btn btn-ghost btn-sm missions-tab';
    });
    this.loadMissions(tab);
  },

  async loadMissions(type) {
    const container = document.getElementById('missions-content');
    if (!container) return;

    try {
      let missions;
      if (type === 'daily') missions = await API.getDailyMissions();
      else if (type === 'weekly') missions = await API.getWeeklyMissions();
      else missions = (await API.getMissions()).filter(m => m.mission_type === 'event');

      if (missions.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="text-align:center;padding:60px 20px;">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">Nenhuma missão disponível</div>
            <p class="empty-state-text">Novas missões serão desbloqueadas em breve!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = missions.map(m => this.renderMission(m)).join('');
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Erro ao carregar missões: ${err.message}</div>`;
    }
  },

  renderMission(m) {
    const progress = Math.min(m.progress, m.target_count);
    const pct = Math.round((progress / m.target_count) * 100);
    const isComplete = m.completed === 1;
    const isClaimed = m.claimed === 1;

    let statusBtn = '';
    if (isClaimed) {
      statusBtn = `<span class="btn btn-ghost btn-sm" style="opacity:0.5;cursor:default;">✅ Coletado</span>`;
    } else if (isComplete) {
      statusBtn = `<button class="btn btn-primary btn-sm" onclick="MissionsPage.claimReward('${m.id}')">🎁 Coletar</button>`;
    } else {
      statusBtn = `<span class="btn btn-ghost btn-sm" style="opacity:0.6;cursor:default;">${progress}/${m.target_count}</span>`;
    }

    const rarityColor = m.mission_type === 'daily' ? 'var(--mana-white)' : m.mission_type === 'weekly' ? 'var(--mana-blue)' : 'var(--mana-gold)';

    return `
      <div class="mission-card ${isComplete ? 'mission-complete' : ''} ${isClaimed ? 'mission-claimed' : ''}"
           style="background:var(--surface-card);border:1px solid var(--border-subtle);border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:16px;transition:all 0.2s;">
        <div class="mission-icon" style="font-size:2rem;width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:var(--surface-elevated);border-radius:12px;flex-shrink:0;">
          ${m.icon}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <h3 style="margin:0;font-size:0.95rem;color:var(--text-primary);">${m.title}</h3>
            <span style="font-size:0.65rem;padding:2px 6px;border-radius:4px;background:${rarityColor}22;color:${rarityColor};text-transform:uppercase;font-weight:600;">${m.mission_type}</span>
          </div>
          <p style="margin:0 0 8px 0;font-size:0.8rem;color:var(--text-secondary);">${m.description}</p>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;height:6px;background:var(--surface-elevated);border-radius:3px;overflow:hidden;max-width:200px;">
              <div style="height:100%;width:${pct}%;background:${isComplete ? 'var(--accent-success)' : 'var(--accent-primary)'};border-radius:3px;transition:width 0.3s;"></div>
            </div>
            <div style="display:flex;gap:8px;font-size:0.75rem;color:var(--text-muted);">
              ${m.reward_gold > 0 ? `<span>🪙 ${m.reward_gold}</span>` : ''}
              ${m.reward_xp > 0 ? `<span>⭐ ${m.reward_xp} XP</span>` : ''}
              ${m.reward_gems > 0 ? `<span>💎 ${m.reward_gems}</span>` : ''}
            </div>
          </div>
        </div>
        <div style="flex-shrink:0;">
          ${statusBtn}
        </div>
      </div>
    `;
  },

  async claimReward(missionId) {
    try {
      const result = await API.claimMissionReward(missionId);
      showToast(`Recompensa coletada! 🪙${result.reward.gold} ⭐${result.reward.xp}`, 'success');
      showXPFloat(result.reward.xp);
      if (result.balance) {
        const prevLevel = AppState.user.level || 1;
        AppState.user.gold = result.balance.gold;
        AppState.user.gems = result.balance.gems;
        AppState.user.xp = result.balance.xp;
        AppState.user.level = result.balance.level;
        updateAuthUI();
        if (result.balance.level > prevLevel) {
          setTimeout(() => showLevelUp(result.balance.level, `+${result.reward.gold} Gold`), 800);
        }
      }
      // Reload current tab
      const activeTab = document.querySelector('.missions-tab.active');
      if (activeTab) this.loadMissions(activeTab.dataset.tab);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
