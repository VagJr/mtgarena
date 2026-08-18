/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Global Real-Time Social Dock & Presence
   ═══════════════════════════════════════════════════════════════ */

const SocialDock = {
  socket: null,
  isOpen: false,
  activeTab: 'online', // 'online' | 'chat'
  onlineUsers: [],
  globalMessages: [],

  init() {
    this.renderDock();
    this.connectSocket();
  },

  connectSocket() {
    if (this.socket) return;
    try {
      this.socket = io('/social');

      this.socket.on('connect', () => {
        if (AppState.user) {
          this.socket.emit('social:register', {
            id: AppState.user.id,
            username: AppState.user.username,
            avatar: AppState.user.avatar || '🧙',
            level: AppState.user.level || 1,
            status: 'No Saguão'
          });
        }
      });

      this.socket.on('social:onlineUsers', (users) => {
        this.onlineUsers = users || [];
        this.updateOnlineBadge();
        if (this.isOpen && this.activeTab === 'online') {
          this.renderOnlineList();
        }
      });

      this.socket.on('social:globalMessage', (msg) => {
        this.globalMessages.push(msg);
        if (this.globalMessages.length > 80) this.globalMessages.shift();
        if (this.isOpen && this.activeTab === 'chat') {
          this.appendChatMessage(msg);
        }
      });

      this.socket.on('social:inviteReceived', (data) => {
        this.showInviteNotification(data);
      });

      this.socket.on('social:inviteSent', (data) => {
        showToast(`⚔️ Desafio enviado para ${data.targetUsername}!`, 'info');
      });

      this.socket.on('social:inviteError', (data) => {
        showToast(data.message, 'warning');
      });
    } catch(e) {
      console.warn('Social socket connection error:', e);
    }
  },

  renderDock() {
    const existing = document.getElementById('global-social-dock');
    if (existing) existing.remove();

    const dock = document.createElement('div');
    dock.id = 'global-social-dock';
    dock.className = 'social-dock';

    dock.innerHTML = `
      <div id="social-dock-panel" class="social-dock-panel" style="display:none;">
        <div class="social-dock-header">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="social-online-pip"></span>
            <span style="font-weight:700;font-size:0.85rem;color:var(--mana-gold-glow);">Planeswalkers Online</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="SocialDock.toggle()">✕</button>
        </div>

        <div class="social-dock-tabs">
          <button class="social-dock-tab active" id="tab-btn-online" onclick="SocialDock.switchTab('online')">👥 Jogadores (<span id="social-online-count">0</span>)</button>
          <button class="social-dock-tab" id="tab-btn-chat" onclick="SocialDock.switchTab('chat')">💬 Chat Global</button>
        </div>

        <div class="social-dock-content" id="social-dock-content">
          <!-- Dynamically Loaded Content -->
        </div>
      </div>

      <button class="social-dock-btn" onclick="SocialDock.toggle()">
        <span class="social-online-pip"></span>
        <span>Comunidade</span>
        <span id="dock-btn-count" style="background:rgba(212,160,23,0.2);padding:1px 6px;border-radius:10px;font-size:0.75rem;">1</span>
      </button>
    `;

    document.body.appendChild(dock);
  },

  toggle() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('social-dock-panel');
    if (!panel) return;
    panel.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      if (this.activeTab === 'online') this.renderOnlineList();
      else this.renderChat();
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.social-dock-tab').forEach(t => t.classList.remove('active'));
    const btn = document.getElementById(`tab-btn-${tab}`);
    if (btn) btn.classList.add('active');

    if (tab === 'online') this.renderOnlineList();
    else this.renderChat();
  },

  updateOnlineBadge() {
    const count = this.onlineUsers.length || 1;
    const badge1 = document.getElementById('social-online-count');
    const badge2 = document.getElementById('dock-btn-count');
    if (badge1) badge1.textContent = count;
    if (badge2) badge2.textContent = count;
  },

  renderOnlineList() {
    const container = document.getElementById('social-dock-content');
    if (!container) return;

    if (this.onlineUsers.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 10px;color:var(--text-muted);font-size:0.8rem;">
          🧙 Você é o único Planeswalker no salão no momento.<br>
          <span style="font-size:0.75rem;">Convide amigos para batalhar!</span>
        </div>
      `;
      return;
    }

    container.innerHTML = this.onlineUsers.map(u => {
      const isMe = u.username === AppState.user?.username;
      return `
        <div class="social-user-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="font-size:1.1rem;">${u.avatar || '🧙'}</div>
            <div>
              <div style="font-size:0.82rem;font-weight:700;color:${isMe ? 'var(--mana-gold-glow)' : 'var(--text-primary)'};">
                ${u.username} ${isMe ? '(Você)' : ''}
              </div>
              <div style="font-size:0.68rem;color:var(--text-muted);">
                Lvl ${u.level} • <span style="color:#00E676;">● ${u.status || 'No Saguão'}</span>
              </div>
            </div>
          </div>
          ${!isMe ? `
            <button class="btn btn-primary btn-sm" style="padding:2px 8px;font-size:0.7rem;" onclick="SocialDock.sendMatchInvite('${u.username.replace(/'/g, "\\'")}')" title="Desafiar para duelo">
              ⚔️ Desafiar
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  renderChat() {
    const container = document.getElementById('social-dock-content');
    if (!container) return;

    container.innerHTML = `
      <div class="social-chat-messages" id="social-chat-stream">
        ${this.globalMessages.map(m => `
          <div class="social-chat-msg">
            <div class="social-chat-author">${m.sender} <span style="font-size:0.65rem;color:var(--text-muted);">Lvl ${m.level}</span></div>
            <div>${m.message}</div>
          </div>
        `).join('') || '<div style="color:var(--text-muted);font-size:0.75rem;text-align:center;margin:auto;">Chat global limpo. Diga Olá ao Multiverso! ✨</div>'}
      </div>
      <form class="social-chat-input-box" onsubmit="SocialDock.sendChatMessage(event)">
        <input type="text" id="social-global-input" placeholder="Mensagem para o Multiverso..." autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
      </form>
    `;

    const stream = document.getElementById('social-chat-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;
  },

  appendChatMessage(m) {
    const stream = document.getElementById('social-chat-stream');
    if (!stream) return;

    stream.insertAdjacentHTML('beforeend', `
      <div class="social-chat-msg">
        <div class="social-chat-author">${m.sender} <span style="font-size:0.65rem;color:var(--text-muted);">Lvl ${m.level}</span></div>
        <div>${m.message}</div>
      </div>
    `);
    stream.scrollTop = stream.scrollHeight;
  },

  sendChatMessage(e) {
    e.preventDefault();
    if (!AppState.user) {
      showToast('Faça login para conversar no chat global.', 'warning');
      return showAuthModal();
    }
    const input = document.getElementById('social-global-input');
    if (!input || !input.value.trim()) return;

    this.socket.emit('social:globalChat', { message: input.value.trim() });
    input.value = '';
  },

  sendMatchInvite(targetUsername) {
    if (!AppState.user) return showAuthModal();
    this.socket.emit('social:sendInvite', {
      targetUsername,
      format: 'standard'
    });
  },

  showInviteNotification(data) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center;border:2px solid var(--mana-gold);box-shadow:0 0 35px rgba(212,160,23,0.5);">
        <div style="font-size:3rem;margin-bottom:8px;">⚔️</div>
        <h2 style="font-size:1.2rem;color:var(--mana-gold-glow);margin-bottom:6px;">Desafio de Duelo MTG!</h2>
        <p style="font-size:0.88rem;color:var(--text-primary);margin-bottom:16px;">
          <b>${data.inviterUsername}</b> desafiou você para uma partida oficial de Magic: The Gathering!
        </p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Recusar</button>
          <button class="btn btn-primary" onclick="SocialDock.acceptInvite('${data.roomId}', '${data.inviterUsername}'); this.closest('.modal-overlay').remove();">⚔️ Aceitar Duelo</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  acceptInvite(roomId, inviterUsername) {
    this.socket.emit('social:acceptInvite', { roomId, inviterUsername });
    showToast(`Entrando na partida contra ${inviterUsername}... ⚔️`, 'success');
    navigateTo(`/play?room=${roomId}`);
  }
};
