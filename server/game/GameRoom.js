const { v4: uuidv4 } = require('uuid');

function setupGameSockets(io, getDb) {
  const gameRooms = new Map();

  io.on('connection', (socket) => {
    console.log(`🎮 Player connected: ${socket.id}`);

    // Create game room
    socket.on('game:create', (data) => {
      const roomId = uuidv4().slice(0, 8);
      const room = {
        id: roomId,
        name: data.name || `Game ${roomId}`,
        format: data.format || 'standard',
        maxPlayers: data.format === 'commander' ? 4 : 2,
        host: { socketId: socket.id, username: data.username, userId: data.userId },
        players: [{
          socketId: socket.id,
          username: data.username,
          userId: data.userId,
          seat: 0,
          life: data.format === 'commander' ? 40 : 20,
          poison: 0,
          energy: 0,
          experience: 0,
          rad: 0,
          isMonarch: false,
          hasInitiative: false,
          hasCityBlessing: false,
          commanderDamage: {},
          stormCount: 0,
          battlefield: [],
          hand: [],
          graveyard: [],
          exile: [],
          library: [],
          commandZone: [],
          counters: {}
        }],
        spectators: [],
        status: 'waiting',
        activePlayer: 0,
        turnNumber: 0,
        phase: 'pre-game',
        dayNight: null,
        dungeonProgress: {},
        stack: [],
        chatHistory: [],
        createdAt: Date.now()
      };

      gameRooms.set(roomId, room);
      socket.join(roomId);
      socket.emit('game:created', { roomId, room: sanitizeRoom(room, socket.id) });
      io.emit('lobby:update', getLobbyRooms());
    });

    // Join game room
    socket.on('game:join', (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return socket.emit('game:error', { message: 'Room not found' });
      if (room.players.length >= room.maxPlayers) return socket.emit('game:error', { message: 'Room is full' });
      if (room.status !== 'waiting') return socket.emit('game:error', { message: 'Game already started' });

      room.players.push({
        socketId: socket.id,
        username: data.username,
        userId: data.userId,
        seat: room.players.length,
        life: room.format === 'commander' ? 40 : 20,
        poison: 0,
        energy: 0,
        experience: 0,
        rad: 0,
        isMonarch: false,
        hasInitiative: false,
        hasCityBlessing: false,
        commanderDamage: {},
        stormCount: 0,
        battlefield: [],
        hand: [],
        graveyard: [],
        exile: [],
        library: [],
        commandZone: [],
        counters: {}
      });

      socket.join(data.roomId);
      io.to(data.roomId).emit('game:playerJoined', {
        room: sanitizeRoom(room, socket.id),
        player: data.username
      });
      io.emit('lobby:update', getLobbyRooms());
    });

    // Spectate
    socket.on('game:spectate', (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return socket.emit('game:error', { message: 'Room not found' });

      room.spectators.push({ socketId: socket.id, username: data.username });
      socket.join(data.roomId);
      socket.emit('game:state', sanitizeRoom(room, socket.id, true));
    });

    // Start game
    socket.on('game:start', (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      if (room.host.socketId !== socket.id) return;

      room.status = 'playing';
      room.turnNumber = 1;
      room.phase = 'untap';
      room.activePlayer = 0;

      // Each player sets their deck
      io.to(data.roomId).emit('game:started', { room: sanitizeRoom(room, null) });
      io.emit('lobby:update', getLobbyRooms());
    });

    // Load deck into game
    socket.on('game:loadDeck', (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // Shuffle deck
      const deck = [...data.cards].sort(() => Math.random() - 0.5);
      player.library = deck;

      // Draw opening hand (7 cards)
      player.hand = player.library.splice(0, 7);

      // Set commander if applicable
      if (data.commander) {
        player.commandZone = [data.commander];
      }

      socket.emit('game:deckLoaded', {
        hand: player.hand,
        libraryCount: player.library.length,
        commandZone: player.commandZone
      });

      io.to(data.roomId).emit('game:playerReady', {
        username: player.username,
        libraryCount: player.library.length
      });
    });

    // Game actions
    socket.on('game:action', (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      switch (data.type) {
        case 'drawCard': {
          if (player.library.length === 0) {
            socket.emit('game:error', { message: 'No cards left in library!' });
            return;
          }
          const card = player.library.shift();
          player.hand.push(card);
          socket.emit('game:cardDrawn', { card, libraryCount: player.library.length });
          io.to(data.roomId).emit('game:playerAction', {
            player: player.username, action: 'drew a card',
            libraryCount: player.library.length
          });
          break;
        }

        case 'playCard': {
          const cardIndex = player.hand.findIndex(c => c.id === data.cardId);
          if (cardIndex === -1) return;
          const card = player.hand.splice(cardIndex, 1)[0];
          card.tapped = false;
          card.counters = {};
          card.attachments = [];
          card.position = data.position || { x: 0, y: 0 };
          player.battlefield.push(card);
          io.to(data.roomId).emit('game:cardPlayed', {
            player: player.username,
            card: card,
            zone: 'battlefield'
          });
          break;
        }

        case 'tapCard': {
          const card = player.battlefield.find(c => c.id === data.cardId);
          if (!card) return;
          card.tapped = !card.tapped;
          io.to(data.roomId).emit('game:cardTapped', {
            player: player.username,
            cardId: data.cardId,
            tapped: card.tapped
          });
          break;
        }

        case 'moveCard': {
          const fromZone = data.fromZone || 'battlefield';
          const toZone = data.toZone || 'graveyard';
          const fromArr = player[fromZone];
          const cardIdx = fromArr?.findIndex(c => c.id === data.cardId);
          if (cardIdx === undefined || cardIdx === -1) return;
          const movedCard = fromArr.splice(cardIdx, 1)[0];
          movedCard.tapped = false;
          movedCard.counters = {};
          player[toZone].push(movedCard);
          io.to(data.roomId).emit('game:cardMoved', {
            player: player.username,
            cardId: data.cardId,
            card: movedCard,
            from: fromZone,
            to: toZone
          });
          break;
        }

        case 'moveCardPosition': {
          const card = player.battlefield.find(c => c.id === data.cardId);
          if (!card) return;
          card.position = data.position;
          io.to(data.roomId).emit('game:cardPositionUpdated', {
            player: player.username,
            cardId: data.cardId,
            position: data.position
          });
          break;
        }

        case 'addCounter': {
          const card = player.battlefield.find(c => c.id === data.cardId);
          if (!card) return;
          if (!card.counters) card.counters = {};
          card.counters[data.counterType] = (card.counters[data.counterType] || 0) + (data.amount || 1);
          io.to(data.roomId).emit('game:counterUpdated', {
            player: player.username,
            cardId: data.cardId,
            counters: card.counters,
            counterType: data.counterType
          });
          break;
        }

        case 'clearCounters': {
          const cardClr = player.battlefield.find(c => c.id === data.cardId);
          if (cardClr) {
            cardClr.counters = {};
            io.to(data.roomId).emit('game:counterUpdated', {
              player: player.username,
              cardId: data.cardId,
              counters: {}
            });
          }
          break;
        }

        case 'ping': {
          io.to(data.roomId).emit('game:pingReceived', {
            player: player.username,
            x: data.x,
            y: data.y,
            message: data.message || '📍 Ping!'
          });
          break;
        }

        case 'updateLife': {
          player.life = Math.max(0, player.life + (data.amount || 0));
          io.to(data.roomId).emit('game:lifeUpdated', {
            player: player.username,
            seat: player.seat,
            life: player.life,
            change: data.amount
          });
          break;
        }

        case 'updatePoison': {
          player.poison = Math.max(0, Math.min(10, player.poison + (data.amount || 0)));
          io.to(data.roomId).emit('game:poisonUpdated', {
            player: player.username,
            seat: player.seat,
            poison: player.poison
          });
          break;
        }

        case 'updateEnergy': {
          player.energy = Math.max(0, player.energy + (data.amount || 0));
          io.to(data.roomId).emit('game:energyUpdated', {
            player: player.username,
            seat: player.seat,
            energy: player.energy
          });
          break;
        }

        case 'updateCommanderDamage': {
          if (!player.commanderDamage[data.sourcePlayer]) player.commanderDamage[data.sourcePlayer] = 0;
          player.commanderDamage[data.sourcePlayer] += data.amount || 0;
          io.to(data.roomId).emit('game:commanderDamageUpdated', {
            player: player.username,
            seat: player.seat,
            commanderDamage: player.commanderDamage
          });
          break;
        }

        case 'setMonarch': {
          room.players.forEach(p => p.isMonarch = false);
          player.isMonarch = true;
          io.to(data.roomId).emit('game:monarchChanged', { player: player.username });
          break;
        }

        case 'setInitiative': {
          room.players.forEach(p => p.hasInitiative = false);
          player.hasInitiative = true;
          io.to(data.roomId).emit('game:initiativeChanged', { player: player.username });
          break;
        }

        case 'setCityBlessing': {
          player.hasCityBlessing = true;
          io.to(data.roomId).emit('game:cityBlessingGained', { player: player.username });
          break;
        }

        case 'setDayNight': {
          room.dayNight = data.value; // 'day' or 'night'
          io.to(data.roomId).emit('game:dayNightChanged', { value: data.value });
          break;
        }

        case 'createToken': {
          const token = {
            id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: data.tokenName || 'Token',
            type_line: data.typeLine || 'Token Creature',
            power: data.power || '1',
            toughness: data.toughness || '1',
            isToken: true,
            tapped: false,
            counters: {},
            position: data.position || { x: 0, y: 0 },
            tokenType: data.tokenType || 'creature',
            image_uri: data.image_uri || ''
          };
          player.battlefield.push(token);
          io.to(data.roomId).emit('game:tokenCreated', { player: player.username, token });
          break;
        }

        case 'rollDice': {
          const sides = data.sides || 6;
          const result = Math.floor(Math.random() * sides) + 1;
          io.to(data.roomId).emit('game:diceRolled', {
            player: player.username, sides, result
          });
          break;
        }

        case 'flipCoin': {
          const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
          io.to(data.roomId).emit('game:coinFlipped', {
            player: player.username, result: coinResult
          });
          break;
        }

        case 'scry': {
          const count = Math.min(data.count || 1, player.library.length);
          const topCards = player.library.slice(0, count);
          socket.emit('game:scryResult', { cards: topCards, count });
          break;
        }

        case 'scryDecision': {
          // data.top = [indices to keep on top], data.bottom = [indices to put on bottom]
          const topIndices = data.top || [];
          const bottomIndices = data.bottom || [];
          const scryCount = topIndices.length + bottomIndices.length;
          const scryCards = player.library.splice(0, scryCount);
          const topCards2 = topIndices.map(i => scryCards[i]);
          const bottomCards = bottomIndices.map(i => scryCards[i]);
          player.library.unshift(...topCards2);
          player.library.push(...bottomCards);
          socket.emit('game:scryComplete', { libraryCount: player.library.length });
          break;
        }

        case 'searchLibrary': {
          socket.emit('game:libraryContents', { cards: player.library });
          break;
        }

        case 'tutorCard': {
          const tutorIdx = player.library.findIndex(c => c.id === data.cardId);
          if (tutorIdx === -1) return;
          const tutored = player.library.splice(tutorIdx, 1)[0];
          player.hand.push(tutored);
          // Shuffle library
          player.library.sort(() => Math.random() - 0.5);
          socket.emit('game:tutorComplete', { card: tutored, libraryCount: player.library.length });
          io.to(data.roomId).emit('game:playerAction', {
            player: player.username,
            action: 'searched their library'
          });
          break;
        }

        case 'mulligan': {
          // Put hand back, shuffle, draw one less
          const handSize = player.hand.length;
          player.library.push(...player.hand);
          player.hand = [];
          player.library.sort(() => Math.random() - 0.5);
          player.hand = player.library.splice(0, Math.max(0, handSize - 1));
          socket.emit('game:mulliganComplete', {
            hand: player.hand,
            libraryCount: player.library.length
          });
          io.to(data.roomId).emit('game:playerAction', {
            player: player.username,
            action: `mulliganed to ${player.hand.length} cards`
          });
          break;
        }

        case 'untapAll': {
          player.battlefield.forEach(c => c.tapped = false);
          io.to(data.roomId).emit('game:untapAll', { player: player.username, seat: player.seat });
          break;
        }

        case 'nextPhase': {
          const phases = ['untap', 'upkeep', 'draw', 'main1', 'combat_begin', 'combat_attackers', 'combat_blockers', 'combat_damage', 'combat_end', 'main2', 'end', 'cleanup'];
          const currentIdx = phases.indexOf(room.phase);
          room.phase = phases[(currentIdx + 1) % phases.length];
          if (room.phase === 'untap') {
            room.activePlayer = (room.activePlayer + 1) % room.players.length;
            room.turnNumber++;
            room.players[room.activePlayer].stormCount = 0;
          }
          io.to(data.roomId).emit('game:phaseChanged', {
            phase: room.phase,
            activePlayer: room.players[room.activePlayer]?.username,
            turnNumber: room.turnNumber
          });
          break;
        }

        case 'chat': {
          const chatMsg = {
            player: player.username,
            message: data.message,
            timestamp: Date.now()
          };
          room.chatHistory.push(chatMsg);
          io.to(data.roomId).emit('game:chat', chatMsg);
          break;
        }

        case 'concede': {
          io.to(data.roomId).emit('game:playerConceded', { player: player.username });
          break;
        }
      }
    });

    // Get lobby rooms
    socket.on('lobby:getRooms', () => {
      socket.emit('lobby:update', getLobbyRooms());
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🎮 Player disconnected: ${socket.id}`);

      // Remove from game rooms
      for (const [roomId, room] of gameRooms.entries()) {
        const playerIdx = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIdx !== -1) {
          const disconnectedPlayer = room.players[playerIdx];
          room.players.splice(playerIdx, 1);
          io.to(roomId).emit('game:playerLeft', { player: disconnectedPlayer.username });

          if (room.players.length === 0) {
            gameRooms.delete(roomId);
          }
        }

        // Remove spectators
        room.spectators = room.spectators.filter(s => s.socketId !== socket.id);
      }

      io.emit('lobby:update', getLobbyRooms());
    });
  });

  function getLobbyRooms() {
    const rooms = [];
    for (const [id, room] of gameRooms.entries()) {
      rooms.push({
        id,
        name: room.name,
        format: room.format,
        host: room.host.username,
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        status: room.status,
        spectators: room.spectators.length
      });
    }
    return rooms;
  }

  function sanitizeRoom(room, socketId, isSpectator = false) {
    return {
      id: room.id,
      name: room.name,
      format: room.format,
      status: room.status,
      turnNumber: room.turnNumber,
      phase: room.phase,
      activePlayer: room.players[room.activePlayer]?.username,
      dayNight: room.dayNight,
      players: room.players.map(p => ({
        username: p.username,
        seat: p.seat,
        life: p.life,
        poison: p.poison,
        energy: p.energy,
        experience: p.experience,
        isMonarch: p.isMonarch,
        hasInitiative: p.hasInitiative,
        hasCityBlessing: p.hasCityBlessing,
        commanderDamage: p.commanderDamage,
        battlefieldCount: p.battlefield.length,
        handCount: p.hand.length,
        graveyardCount: p.graveyard.length,
        exileCount: p.exile.length,
        libraryCount: p.library.length,
        // Only show own hand cards
        hand: p.socketId === socketId ? p.hand : undefined,
        battlefield: p.battlefield,
        graveyard: p.graveyard,
        exile: p.exile,
        commandZone: p.commandZone,
        library: p.socketId === socketId ? p.library : undefined
      })),
      stack: room.stack,
      chatHistory: room.chatHistory.slice(-50)
    };
  }
}

module.exports = { setupGameSockets };
