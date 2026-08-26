/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Community & Social Page
   ═══════════════════════════════════════════════════════════════ */

const SocialPage = {
  currentTab: 'feed',
  activeFriendId: null,
  activeFriendName: '',

  async render() {
    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);">
        <div class="section-header">
          <h1 class="section-title">👥 Comunidade Planeswalker</h1>
          ${AppState.user ? `
            <div class="flex gap-sm">
              <button class="btn btn-primary btn-sm" onclick="SocialPage.showNewPostModal()">✍️ Novo Post</button>
              <button class="btn btn-secondary btn-sm" onclick="SocialPage.showAddFriendModal()">➕ Adicionar Amigo</button>
            </div>
          ` : ''}
        </div>

        <div class="tabs">
          <button class="tab active" onclick="SocialPage.switchTab('feed', this)">📰 Feed da Comunidade</button>
          <button class="tab" onclick="SocialPage.switchTab('friends', this)">👥 Amigos & DMs</button>
          <button class="tab" onclick="SocialPage.switchTab('leaderboard', this)">🏆 Ranking</button>
        </div>

        <div id="social-tab-content">
          <div class="skeleton skeleton-card" style="height:200px;"></div>
        </div>
      </div>

      <!-- New Post Modal -->
      <div id="new-post-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('new-post-modal').style.display='none'">✕</button>
          <h2 style="margin-bottom:var(--space-md);">✍️ Criar Post no Feed</h2>
          <form onsubmit="SocialPage.handleCreatePost(event)">
            <div class="form-group">
              <label>O que está acontecendo no Multiverso?</label>
              <textarea id="post-content" rows="4" required placeholder="Compartilhe um combo, vitória em torneio ou debate sobre o meta..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Publicar no Feed</button>
          </form>
        </div>
      </div>

      <!-- Add Friend Modal -->
      <div id="add-friend-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('add-friend-modal').style.display='none'">✕</button>
          <h2 style="margin-bottom:var(--space-md);">➕ Convidar Planeswalker</h2>
          <form onsubmit="SocialPage.handleAddFriend(event)">
            <div class="form-group">
              <label>Username do Jogador</label>
              <input type="text" id="friend-username-input" required placeholder="Digite o username exato...">
            </div>
            <button type="submit" class="btn btn-primary btn-full">Enviar Solicitação</button>
          </form>
        </div>
      </div>

      <style>
        .feed-container { display:flex; flex-direction:column; gap:var(--space-md); max-width:800px; margin:0 auto; }
        .post-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:var(--space-lg); transition:border-color var(--transition-fast); }
        .post-card:hover { border-color:var(--border-default); }
        .post-header { display:flex; align-items:center; gap:var(--space-sm); margin-bottom:var(--space-sm); }
        .post-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,var(--mana-blue),var(--mana-black)); display:flex; align-items:center; justify-content:center; font-size:1.2rem; border:1px solid var(--border-gold); }
        .post-author { font-family:var(--font-heading); font-size:0.95rem; color:var(--text-primary); }
        .post-time { font-size:0.75rem; color:var(--text-muted); }
        .post-body { font-size:0.9rem; line-height:1.6; color:var(--text-secondary); margin-bottom:var(--space-md); white-space:pre-wrap; }
        .post-actions { display:flex; gap:var(--space-md); border-top:1px solid var(--border-subtle); padding-top:var(--space-sm); }
        .post-action-btn { background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.85rem; display:flex; align-items:center; gap:6px; transition:color var(--transition-fast); }
        .post-action-btn:hover, .post-action-btn.liked { color:var(--mana-red-glow); }

        .friends-layout { display:grid; grid-template-columns:260px 1fr; gap:var(--space-md); min-height:450px; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); overflow:hidden; }
        .friends-sidebar { border-right:1px solid var(--border-subtle); padding:var(--space-md); display:flex; flex-direction:column; gap:var(--space-sm); overflow-y:auto; }
        .friend-item { display:flex; align-items:center; gap:var(--space-sm); padding:8px 12px; border-radius:var(--radius-md); cursor:pointer; transition:background var(--transition-fast); }
        .friend-item:hover, .friend-item.active { background:var(--bg-hover); }
        .friend-chat-area { display:flex; flex-direction:column; height:100%; }
        .friend-chat-header { padding:12px 16px; border-bottom:1px solid var(--border-subtle); font-family:var(--font-heading); font-size:1rem; color:var(--mana-gold-glow); display:flex; justify-content:space-between; align-items:center; }
        .friend-chat-messages { flex:1; padding:16px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; max-height:350px; }
        .dm-bubble { max-width:70%; padding:10px 14px; border-radius:14px; font-size:0.85rem; line-height:1.5; }
        .dm-bubble.me { align-self:flex-end; background:linear-gradient(135deg,#0E4C92,#1A73E8); color:white; border-bottom-right-radius:2px; }
        .dm-bubble.other { align-self:flex-start; background:var(--bg-tertiary); color:var(--text-primary); border-bottom-left-radius:2px; border:1px solid var(--border-subtle); }
        .dm-input-row { display:flex; border-top:1px solid var(--border-subtle); padding:8px; gap:8px; background:var(--bg-secondary); }
        .dm-input-row input { flex:1; background:var(--bg-tertiary); border:1px solid var(--border-default); border-radius:var(--radius-md); padding:8px 12px; color:var(--text-primary); }

        .leaderboard-table { width:100%; border-collapse:collapse; background:var(--bg-card); border-radius:var(--radius-lg); overflow:hidden; }
        .leaderboard-table th, .leaderboard-table td { padding:12px 16px; text-align:left; border-bottom:1px solid var(--border-subtle); font-size:0.85rem; }
        .leaderboard-table th { background:var(--bg-tertiary); font-family:var(--font-heading); color:var(--mana-gold-glow); }
        .rank-badge { font-weight:700; font-family:var(--font-mono); width:28px; height:28px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; }
        .rank-1 { background:#FFD700; color:#0A0A12; }
        .rank-2 { background:#C0C0C0; color:#0A0A12; }
        .rank-3 { background:#CD7F32; color:#0A0A12; }

        @media(max-width:768px) {
          .friends-layout { grid-template-columns:1fr; }
        }
      </style>
    `;

    this.switchTab('feed', document.querySelector('.tabs .tab'));
  },

  switchTab(tab, el) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    this.currentTab = tab;

    if (tab === 'feed') this.loadFeed();
    else if (tab === 'friends') this.loadFriends();
    else if (tab === 'leaderboard') this.loadLeaderboard();
  },

  async loadFeed() {
    const container = document.getElementById('social-tab-content');
    container.innerHTML = '<div class="feed-container">' + CardDisplay.renderSkeleton(4) + '</div>';

    try {
      const posts = await API.get('/social/feed');
      if (!posts || posts.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📰</div>
            <div class="empty-state-title">Nenhum post no feed ainda</div>
            <p class="empty-state-text">Seja o primeiro Planeswalker a compartilhar sua jornada!</p>
            ${AppState.user ? `<button class="btn btn-primary mt-lg" onclick="SocialPage.showNewPostModal()">✍️ Criar Post</button>` : ''}
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="feed-container">
          ${posts.map(p => `
            <div class="post-card">
              <div class="post-header">
                <div class="post-avatar">🧙</div>
                <div>
                  <div class="post-author">${p.username} <span class="badge badge-rare" style="font-size:0.65rem;">Lvl ${p.level}</span></div>
                  <div class="post-time">${new Date(p.created_at).toLocaleString('pt-BR')}</div>
                </div>
              </div>
              <div class="post-body">${p.content}</div>
              <div class="post-actions">
                <button class="post-action-btn ${p.user_liked ? 'liked' : ''}" onclick="SocialPage.likePost('${p.id}', this)">
                  ❤️ <span>${p.likes}</span> Curtidas
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch(e) {
      container.innerHTML = `<div class="auth-error">Erro ao carregar feed: ${e.message}</div>`;
    }
  },

  async likePost(postId, btn) {
    if (!AppState.user) return showAuthModal();
    try {
      const res = await API.post(`/social/posts/${postId}/like`, {});
      btn.classList.toggle('liked', res.liked);
      const span = btn.querySelector('span');
      let count = parseInt(span.textContent || '0');
      span.textContent = res.liked ? count + 1 : Math.max(0, count - 1);
    } catch(e) {
      showToast('Erro ao curtir post', 'error');
    }
  },

  showNewPostModal() {
    if (!AppState.user) return showAuthModal();
    document.getElementById('new-post-modal').style.display = 'flex';
  },

  async handleCreatePost(e) {
    e.preventDefault();
    const content = document.getElementById('post-content').value;
    try {
      await API.post('/social/posts', { content });
      document.getElementById('new-post-modal').style.display = 'none';
      document.getElementById('post-content').value = '';
      showToast('Post publicado com sucesso! ✨ (+15 XP)', 'success');
      this.loadFeed();
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  showAddFriendModal() {
    if (!AppState.user) return showAuthModal();
    document.getElementById('add-friend-modal').style.display = 'flex';
  },

  async handleAddFriend(e) {
    e.preventDefault();
    const username = document.getElementById('friend-username-input').value;
    try {
      await API.post('/social/friends/request', { username });
      document.getElementById('add-friend-modal').style.display = 'none';
      document.getElementById('friend-username-input').value = '';
      showToast('Solicitação de amizade enviada! 💌', 'success');
      this.loadFriends();
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async loadFriends() {
    if (!AppState.user) {
      document.getElementById('social-tab-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔒</div>
          <div class="empty-state-title">Login Necessário</div>
          <p class="empty-state-text">Faça login para ver seus amigos e mensagens diretas.</p>
          <button class="btn btn-primary mt-lg" onclick="showAuthModal()">Entrar</button>
        </div>
      `;
      return;
    }

    try {
      const data = await API.get('/social/friends');
      const friends = data.friends || [];
      const pending = data.pending || [];

      document.getElementById('social-tab-content').innerHTML = `
        <div class="friends-layout">
          <div class="friends-sidebar">
            <h4 style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;">SOLICITAÇÕES (${pending.length})</h4>
            ${pending.map(p => `
              <div style="background:var(--bg-tertiary);padding:8px;border-radius:6px;font-size:0.8rem;margin-bottom:6px;">
                <b>${p.username}</b> (Lvl ${p.level})
                <div style="display:flex;gap:4px;margin-top:4px;">
                  <button class="btn btn-primary btn-sm" style="padding:2px 8px;font-size:0.7rem;" onclick="SocialPage.respondFriend('${p.friendship_id}', 'accept')">Aceitar</button>
                  <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:0.7rem;" onclick="SocialPage.respondFriend('${p.friendship_id}', 'reject')">Recusar</button>
                </div>
              </div>
            `).join('') || '<p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">Nenhuma pendente.</p>'}

            <h4 style="font-size:0.85rem;color:var(--text-muted);margin:8px 0 4px;">AMIGOS (${friends.length})</h4>
            ${friends.map(f => `
              <div class="friend-item ${this.activeFriendId === f.id ? 'active' : ''}" onclick="SocialPage.openDM('${f.id}', '${f.username.replace(/'/g, "\\'")}')">
                <div style="font-size:1.1rem;">🧙</div>
                <div style="flex:1;">
                  <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${f.username}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);">Lvl ${f.level}</div>
                </div>
              </div>
            `).join('') || '<p style="font-size:0.75rem;color:var(--text-muted);">Nenhum amigo adicionado.</p>'}
          </div>

          <div class="friend-chat-area" id="friend-chat-container">
            <div class="empty-state" style="margin:auto;">
              <div class="empty-state-icon">💬</div>
              <div class="empty-state-title">Selecione um amigo</div>
              <p class="empty-state-text">Clique em um amigo na lista para iniciar o chat direto.</p>
            </div>
          </div>
        </div>
      `;

      if (friends.length > 0 && !this.activeFriendId) {
        this.openDM(friends[0].id, friends[0].username);
      }
    } catch(e) {
      document.getElementById('social-tab-content').innerHTML = `<div class="auth-error">Erro ao carregar amigos: ${e.message}</div>`;
    }
  },

  async respondFriend(friendshipId, action) {
    try {
      await API.put(`/social/friends/${friendshipId}`, { action });
      showToast(`Solicitação ${action === 'accept' ? 'aceita' : 'recusada'}!`, 'info');
      this.loadFriends();
    } catch(e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async openDM(friendId, friendName) {
    this.activeFriendId = friendId;
    this.activeFriendName = friendName;

    const chatContainer = document.getElementById('friend-chat-container');
    if (!chatContainer) return;

    chatContainer.innerHTML = `
      <div class="friend-chat-header">
        <span>⚔️ Conversa com ${friendName}</span>
      </div>
      <div class="friend-chat-messages" id="dm-messages-box">
        <p style="color:var(--text-muted);text-align:center;font-size:0.8rem;">Carregando mensagens...</p>
      </div>
      <form class="dm-input-row" onsubmit="SocialPage.sendDM(event)">
        <input type="text" id="dm-text-input" placeholder="Mensagem para ${friendName}..." autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
      </form>
    `;

    this.pollDM();
  },

  async pollDM() {
    if (!this.activeFriendId) return;
    try {
      const messages = await API.get(`/social/messages/${this.activeFriendId}`);
      const box = document.getElementById('dm-messages-box');
      if (!box) return;

      if (messages.length === 0) {
        box.innerHTML = '<p style="color:var(--text-muted);text-align:center;font-size:0.8rem;margin:auto;">Envie a primeira mensagem para selar a aliança!</p>';
        return;
      }

      box.innerHTML = messages.map(m => `
        <div class="dm-bubble ${m.is_me ? 'me' : 'other'}">
          ${m.content}
        </div>
      `).join('');

      box.scrollTop = box.scrollHeight;
    } catch(e) {}
  },

  async sendDM(e) {
    e.preventDefault();
    const input = document.getElementById('dm-text-input');
    const content = input.value.trim();
    if (!content || !this.activeFriendId) return;

    try {
      await API.post('/social/messages', { receiver_id: this.activeFriendId, content });
      input.value = '';
      this.pollDM();
    } catch(e) {
      showToast('Erro ao enviar mensagem', 'error');
    }
  },

  async loadLeaderboard() {
    const container = document.getElementById('social-tab-content');
    container.innerHTML = '<div class="skeleton skeleton-card" style="height:300px;"></div>';

    try {
      const list = await API.get('/social/leaderboard');
      container.innerHTML = `
        <div style="overflow-x:auto;">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th style="width:60px;">Rank</th>
                <th>Planeswalker</th>
                <th>Nível</th>
                <th>XP</th>
                <th>Coleção</th>
                <th>Decks</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(u => `
                <tr>
                  <td><span class="rank-badge rank-${u.rank}">${u.rank <= 3 ? (u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : '🥉') : u.rank}</span></td>
                  <td><b>${u.username}</b></td>
                  <td><span class="badge badge-mythic">Lvl ${u.level}</span></td>
                  <td style="font-family:var(--font-mono);">${u.xp} XP</td>
                  <td>📚 ${u.card_count} cartas</td>
                  <td>🃏 ${u.deck_count} decks</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch(e) {
      container.innerHTML = `<div class="auth-error">Erro ao carregar ranking: ${e.message}</div>`;
    }
  }
};
