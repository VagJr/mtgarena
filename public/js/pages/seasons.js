/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Seasons Page
   Current season progress, leaderboard, tier rewards
   ═══════════════════════════════════════════════════════════════ */

const SeasonsPage = {
  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container page-enter" style="padding-top:80px;padding-bottom:40px;">
        <div class="page-header">
          <h1 class="page-title">🏆 Temporada</h1>
          <p class="page-subtitle">Suba de tier e conquiste recompensas exclusivas</p>
        </div>
        <div id="seasons-content">
          <div class="loading-state" style="text-align:center;padding:40px;">
            <div class="loading-bar" style="width:200px;margin:0 auto;"><div class="loading-bar-fill"></div></div>
          </div>
        </div>
      </div>
    `;
    this.loadSeason();
  },

  async loadSeason() {
    const container = document.getElementById('seasons-content');
    if (!container) return;

    try {
      const [season, progress] = await Promise.all([
        API.getCurrentSeason(),
        AppState.user ? API.getMySeasonProgress() : Promise.resolve(null)
      ]);

      if (!season) {
        container.innerHTML = `
          <div class="empty-state" style="text-align:center;padding:60px;">
            <div class="empty-state-icon">🌍</div>
            <div class="empty-state-title">Nenhuma temporada ativa</div>
            <p class="empty-state-text">Aguarde a próxima temporada começar!</p>
          </div>`;
        return;
      }

      const rewards = season.rewards || {};
      const tiers = rewards.tiers || [];
      const claimedRewards = progress?.claimed_rewards || [];
      const currentTier = progress?.tier || 1;
      const xpEarned = progress?.xp_earned || 0;

      container.innerHTML = `
        <div class="season-banner" style="background:linear-gradient(135deg, #0a1628 0%, #1a0a28 50%, #0a1628 100%);border:2px solid var(--accent-primary);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 30% 50%, rgba(212,160,23,0.1) 0%, transparent 50%);"></div>
          <h2 style="font-size:1.5rem;color:var(--mana-gold-glow);margin:0 0 8px 0;position:relative;">${season.name}</h2>
          <p style="color:var(--text-secondary);margin:0 0 16px 0;position:relative;">${season.description}</p>
          <div style="display:flex;justify-content:center;gap:24px;position:relative;">
            <div style="text-align:center;">
              <div style="font-size:0.75rem;color:var(--text-muted);">Tier Atual</div>
              <div style="font-size:1.8rem;font-weight:700;color:var(--accent-primary);">${currentTier}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.75rem;color:var(--text-muted);">XP Ganho</div>
              <div style="font-size:1.8rem;font-weight:700;color:var(--mana-gold-glow);">${xpEarned.toLocaleString()}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.75rem;color:var(--text-muted);">Vitórias</div>
              <div style="font-size:1.8rem;font-weight:700;color:var(--accent-success);">${progress?.wins || 0}</div>
            </div>
          </div>
        </div>

        <h3 style="color:var(--text-primary);margin-bottom:16px;">🎖️ Recompensas da Temporada</h3>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:32px;">
          ${tiers.map(t => this.renderTier(t, currentTier, claimedRewards.includes(t.tier))).join('')}
        </div>

        <div class="season-tabs" style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="btn btn-primary btn-sm" onclick="SeasonsPage.showLeaderboard('xp')">XP</button>
          <button class="btn btn-ghost btn-sm" onclick="SeasonsPage.showLeaderboard('level')">Nível</button>
          <button class="btn btn-ghost btn-sm" onclick="SeasonsPage.showLeaderboard('streak')">Sequência</button>
        </div>
        <div id="leaderboard-container"></div>
      `;

      this.showLeaderboard('xp');
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Erro: ${err.message}</div>`;
    }
  },

  renderTier(tier, currentTier, claimed) {
    const reached = currentTier >= tier.tier;
    const r = tier.reward || {};
    let rewardText = [];
    if (r.gold) rewardText.push(`🪙 ${r.gold}`);
    if (r.gems) rewardText.push(`💎 ${r.gems}`);
    if (r.item) rewardText.push(`🎨 Item`);

    return `
      <div class="tier-row" style="display:flex;align-items:center;gap:16px;padding:12px 16px;background:${reached ? 'var(--surface-card)' : 'var(--surface-elevated)'};border:1px solid ${reached ? 'var(--accent-primary)' : 'var(--border-subtle)'};border-radius:10px;opacity:${reached ? 1 : 0.5};">
        <div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;flex-shrink:0;background:${reached ? 'var(--accent-primary)' : 'var(--surface-muted)'};color:${reached ? '#fff' : 'var(--text-muted)'};">
          ${tier.tier}
        </div>
        <div style="flex:1;">
          <div style="font-size:0.85rem;color:var(--text-primary);font-weight:600;">Tier ${tier.tier}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${tier.xp_required.toLocaleString()} XP necessário</div>
        </div>
        <div style="display:flex;gap:8px;font-size:0.8rem;color:var(--text-secondary);">${rewardText.join(' ')}</div>
        <div style="flex-shrink:0;">
          ${claimed ? '<span style="font-size:0.75rem;color:var(--accent-success);">✅ Coletado</span>' :
            reached ? `<button class="btn btn-primary btn-sm" onclick="SeasonsPage.claimTier(${tier.tier})">Coletar</button>` :
            `<span style="font-size:0.75rem;color:var(--text-muted);">🔒</span>`}
        </div>
      </div>
    `;
  },

  async claimTier(tier) {
    try {
      const result = await API.claimSeasonReward(tier);
      showToast(`Recompensa do Tier ${tier} coletada!`, 'success');
      if (result.balance) {
        AppState.user.gold = result.balance.gold;
        AppState.user.gems = result.balance.gems;
        updateAuthUI();
      }
      this.loadSeason();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async showLeaderboard(category) {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    try {
      const leaderboard = await API.getLeaderboard(category);
      if (leaderboard.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Nenhum jogador ainda</p>';
        return;
      }

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${leaderboard.map(p => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface-card);border-radius:8px;${p.user_id === AppState.user?.id ? 'border:1px solid var(--accent-primary);' : ''}">
              <span style="width:24px;text-align:center;font-weight:700;color:${p.rank <= 3 ? 'var(--mana-gold-glow)' : 'var(--text-muted)'};font-size:${p.rank <= 3 ? '1.1rem' : '0.85rem'};">${p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : p.rank}</span>
              <span style="font-size:1.2rem;">${p.avatar || '🧙'}</span>
              <span style="flex:1;font-size:0.85rem;color:var(--text-primary);font-weight:500;">${p.username}</span>
              <span style="font-size:0.75rem;color:var(--text-secondary);">Nv.${p.level}</span>
              <span style="font-size:0.75rem;color:var(--mana-gold-glow);">${category === 'streak' ? `🔥 ${p.streak}` : category === 'level' ? `⭐ ${p.xp} XP` : `⭐ ${p.xp} XP`}</span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Erro ao carregar leaderboard</div>`;
    }
  }
};
