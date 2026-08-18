require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDb, saveDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const cardRoutes = require('./routes/cards');
const collectionRoutes = require('./routes/collection');
const deckRoutes = require('./routes/decks');
const economyRoutes = require('./routes/economy');
const tradeRoutes = require('./routes/trade');
const socialRoutes = require('./routes/social');
const { setupGameSockets } = require('./game/GameRoom');

const newsRoutes = require('./routes/news');
const profileRoutes = require('./routes/profile');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Make db available to routes
app.use((req, res, next) => {
  req.db = getDb();
  req.saveDb = saveDatabase;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/profile', profileRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
async function start() {
  await initDatabase();

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🃏 ═══════════════════════════════════════════`);
    console.log(`🃏  MTG Arena Social — Server Running`);
    console.log(`🃏  http://localhost:${PORT}`);
    console.log(`🃏 ═══════════════════════════════════════════\n`);
  });

  setupGameSockets(io, getDb);
}

start().catch(console.error);

module.exports = { app, server, io };
