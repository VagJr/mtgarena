/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Game Lobby Page
   ═══════════════════════════════════════════════════════════════ */
const GameLobbyPage = {
  socket: null,
  rooms: [],

  async render() {
    this.socket = io();
    this.socket.emit('lobby:getRooms');
    this.socket.on('lobby:update', (rooms) => { this.rooms = rooms; this.renderRooms(); });

    document.getElementById('app').innerHTML = `
      <div class="page-enter container" style="padding-top:var(--space-xl);">
        <div class="section-header">
          <h1 class="section-title">⚔️ Mesas de Jogo</h1>
          ${AppState.user ? `<button class="btn btn-primary" onclick="GameLobbyPage.showCreateRoom()">+ Criar Mesa</button>` : ''}
        </div>
        ${!AppState.user ? '<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-title">Login Necessário</div><button class="btn btn-primary mt-lg" onclick="showAuthModal()">Entrar</button></div>' : `
        <div class="tabs">
          <button class="tab active" onclick="GameLobbyPage.filterFormat('all',this)">Todas</button>
          <button class="tab" onclick="GameLobbyPage.filterFormat('standard',this)">Standard</button>
          <button class="tab" onclick="GameLobbyPage.filterFormat('modern',this)">Modern</button>
          <button class="tab" onclick="GameLobbyPage.filterFormat('commander',this)">Commander</button>
          <button class="tab" onclick="GameLobbyPage.filterFormat('legacy',this)">Legacy</button>
          <button class="tab" onclick="GameLobbyPage.filterFormat('pioneer',this)">Pioneer</button>
        </div>
        <div id="rooms-list" class="rooms-grid"></div>`}
      </div>
      <div id="create-room-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('create-room-modal').style.display='none'">✕</button>
          <h2 style="margin-bottom:var(--space-lg);">⚔️ Criar Mesa</h2>
          <form onsubmit="GameLobbyPage.createRoom(event)">
            <div class="form-group"><label>Nome da Mesa</label><input type="text" id="room-name" required placeholder="Ex: Mesa Casual Standard"></div>
            <div class="form-group"><label>Formato</label>
              <select id="room-format"><option value="standard">Standard (1v1, 20 vida)</option><option value="modern">Modern (1v1, 20 vida)</option><option value="pioneer">Pioneer (1v1, 20 vida)</option><option value="legacy">Legacy (1v1, 20 vida)</option><option value="vintage">Vintage (1v1, 20 vida)</option><option value="pauper">Pauper (1v1, 20 vida)</option><option value="commander">Commander (Multiplayer, 40 vida)</option></select>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Criar Mesa</button>
          </form>
        </div>
      </div>
      <style>
        .rooms-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:var(--space-md); }
        .room-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:var(--space-lg); transition:all var(--transition-normal); }
        .room-card:hover { border-color:var(--border-gold); }
        .room-card-header { display:flex; justify-content:space-between; margin-bottom:var(--space-md); }
        .room-card h3 { font-size:1rem; }
        .room-players { display:flex; gap:4px; align-items:center; font-size:0.85rem; color:var(--text-secondary); margin-bottom:var(--space-md); }
        .room-status { display:inline-block; width:8px; height:8px; border-radius:50%; }
        .room-status.waiting { background:var(--success); box-shadow:0 0 6px var(--success); }
        .room-status.playing { background:var(--warning); box-shadow:0 0 6px var(--warning); }
      </style>`;
  },

  formatFilter: 'all',
  filterFormat(f, el) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    this.formatFilter = f;
    this.renderRooms();
  },

  renderRooms() {
    const list = document.getElementById('rooms-list');
    if (!list) return;
    const filtered = this.formatFilter === 'all' ? this.rooms : this.rooms.filter(r => r.format === this.formatFilter);
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">🎲</div><div class="empty-state-title">Nenhuma mesa aberta</div><p class="empty-state-text">Crie uma mesa e convide jogadores!</p></div>`;
      return;
    }
    list.innerHTML = filtered.map(r => `
      <div class="room-card">
        <div class="room-card-header">
          <h3>${r.name}</h3>
          <span class="badge badge-${r.format==='commander'?'mythic':'rare'}">${r.format}</span>
        </div>
        <div class="room-players">
          <span class="room-status ${r.status}"></span>
          ${r.status === 'waiting' ? 'Aguardando' : 'Em jogo'} • ${r.players}/${r.maxPlayers} jogadores
          ${r.spectators > 0 ? ` • 👁 ${r.spectators}` : ''}
        </div>
        <div style="display:flex;gap:var(--space-sm);">
          ${r.status === 'waiting' ? `<button class="btn btn-primary btn-sm" onclick="GameLobbyPage.joinRoom('${r.id}')">Entrar</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="GameLobbyPage.spectateRoom('${r.id}')">👁 Assistir</button>
        </div>
      </div>`).join('');
  },

  showCreateRoom() { document.getElementById('create-room-modal').style.display = 'flex'; },

  createRoom(e) {
    e.preventDefault();
    const name = document.getElementById('room-name').value;
    const format = document.getElementById('room-format').value;
    this.socket.emit('game:create', { name, format, username: AppState.user.username, userId: AppState.user.id });
    this.socket.once('game:created', (data) => {
      document.getElementById('create-room-modal').style.display = 'none';
      showToast('Mesa criada! ⚔️', 'success');
      // Navigate to game
      AppState.currentRoom = data.roomId;
      GameEngine.init(this.socket, data.roomId, data.room);
    });
  },

  joinRoom(roomId) {
    this.socket.emit('game:join', { roomId, username: AppState.user.username, userId: AppState.user.id });
    this.socket.once('game:playerJoined', (data) => {
      AppState.currentRoom = roomId;
      GameEngine.init(this.socket, roomId, data.room);
    });
    this.socket.once('game:error', (data) => showToast(data.message, 'error'));
  },

  spectateRoom(roomId) {
    this.socket.emit('game:spectate', { roomId, username: AppState.user?.username || 'Guest' });
    this.socket.once('game:state', (room) => {
      AppState.currentRoom = roomId;
      GameEngine.init(this.socket, roomId, room, true);
    });
  }
};
