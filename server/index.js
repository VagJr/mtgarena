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
const marketRoutes = require('./routes/market');
const seasonRoutes = require('./routes/seasons');
const missionRoutes = require('./routes/missions');
const achievementRoutes = require('./routes/achievements');
const customizationRoutes = require('./routes/customization');
const tavernRoutes = require('./routes/tavern');
const botRoutes = require('./routes/bots');
const pricingRoutes = require('./routes/pricing');
const showcaseRoutes = require('./routes/showcases');
const { setupSocialSockets } = require('./social/SocialSocket');

const BotEngine = require('./economy/BotEngine');
const PricingEngine = require('./economy/PricingEngine');

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
app.use('/api/market', marketRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/tavern', tavernRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/showcases', showcaseRoutes);

// Health-check endpoint for Render / Uptime monitors
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'MTG Arena Social',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Auto-ping routine to keep free-tier instances awake on Render
function startKeepAlive() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  if (!targetUrl) {
    console.log('💡 Keep-alive: RENDER_EXTERNAL_URL ou APP_URL não definidos. O auto-ping iniciará automaticamente quando hospedado no Render.');
    return;
  }

  const pingUrl = targetUrl.endsWith('/') ? `${targetUrl}health` : `${targetUrl}/health`;
  console.log(`⏱️ Keep-alive ativado para: ${pingUrl} (intervalo: 10 minutos)`);

  // Ping every 10 minutes (600,000 ms)
  setInterval(async () => {
    try {
      const res = await fetch(pingUrl);
      console.log(`💓 [Keep-Alive Ping] Status: ${res.status} - ${new Date().toLocaleTimeString('pt-BR')}`);
    } catch (err) {
      console.warn(`⚠️ [Keep-Alive Ping Falhou]:`, err.message);
    }
  }, 10 * 60 * 1000);
}

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
  setupSocialSockets(io);
  startKeepAlive();

  const botEngine = new BotEngine(getDb());
  botEngine.start();

  const pricingEngine = new PricingEngine(getDb());
  pricingEngine.start();
}

start().catch(console.error);

module.exports = { app, server, io };
