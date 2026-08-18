/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Real-Time Social Hub & Presence System
   ═══════════════════════════════════════════════════════════════ */

const onlineUsers = new Map(); // socketId -> { userId, username, avatar, level, status, roomId }

function setupSocialSockets(io) {
  const socialNamespace = io.of('/social');

  socialNamespace.on('connection', (socket) => {
    console.log(`👥 Social client connected: ${socket.id}`);

    socket.on('social:register', (userData) => {
      if (!userData || !userData.username) return;

      onlineUsers.set(socket.id, {
        socketId: socket.id,
        userId: userData.id,
        username: userData.username,
        avatar: userData.avatar || '🧙',
        level: userData.level || 1,
        status: userData.status || 'No Saguão',
        roomId: userData.roomId || null,
        joinedAt: Date.now()
      });

      broadcastOnlineList();
    });

    socket.on('social:updateStatus', (status) => {
      const user = onlineUsers.get(socket.id);
      if (user) {
        user.status = status;
        broadcastOnlineList();
      }
    });

    socket.on('social:globalChat', (data) => {
      const user = onlineUsers.get(socket.id);
      if (!user || !data.message || !data.message.trim()) return;

      const msgPayload = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: user.username,
        avatar: user.avatar,
        level: user.level,
        message: data.message.trim().substring(0, 300),
        timestamp: Date.now()
      };

      socialNamespace.emit('social:globalMessage', msgPayload);
    });

    socket.on('social:sendInvite', (data) => {
      const inviter = onlineUsers.get(socket.id);
      if (!inviter || !data.targetUsername) return;

      // Find target socket
      for (const [targetSocketId, targetUser] of onlineUsers.entries()) {
        if (targetUser.username.toLowerCase() === data.targetUsername.toLowerCase()) {
          socialNamespace.to(targetSocketId).emit('social:inviteReceived', {
            inviterUsername: inviter.username,
            inviterAvatar: inviter.avatar,
            inviterLevel: inviter.level,
            format: data.format || 'standard',
            roomId: data.roomId || `duel-${Date.now().toString(36)}`,
            message: data.message || `⚔️ ${inviter.username} desafiou você para um Duelo de MTG!`
          });
          socket.emit('social:inviteSent', { targetUsername: data.targetUsername });
          return;
        }
      }

      socket.emit('social:inviteError', { message: `Planeswalker "${data.targetUsername}" não está online agora.` });
    });

    socket.on('social:acceptInvite', (data) => {
      const accepter = onlineUsers.get(socket.id);
      if (!accepter) return;

      socialNamespace.emit('social:matchStarting', {
        roomId: data.roomId,
        players: [data.inviterUsername, accepter.username]
      });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      broadcastOnlineList();
    });

    function broadcastOnlineList() {
      const uniqueUsers = [];
      const seen = new Set();
      for (const user of onlineUsers.values()) {
        if (!seen.has(user.username)) {
          seen.add(user.username);
          uniqueUsers.push(user);
        }
      }
      socialNamespace.emit('social:onlineUsers', uniqueUsers);
    }
  });
}

module.exports = { setupSocialSockets };
