const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
const DB_PATH = path.join(__dirname, '..', 'data', 'mtg.db');

async function initDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT 'default',
      gold INTEGER DEFAULT 1000,
      gems INTEGER DEFAULT 100,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      bio TEXT DEFAULT 'Planeswalker explorando o multiverso.',
      favorite_color TEXT DEFAULT 'WUBRG',
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      card_name TEXT,
      set_code TEXT,
      rarity TEXT,
      image_uri TEXT,
      quantity INTEGER DEFAULT 1,
      foil INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, card_id, foil)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      format TEXT DEFAULT 'standard',
      cards_json TEXT DEFAULT '[]',
      sideboard_json TEXT DEFAULT '[]',
      commander_id TEXT,
      cover_card_id TEXT,
      is_public INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      cards_offered TEXT DEFAULT '[]',
      cards_wanted TEXT DEFAULT '[]',
      message TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      format TEXT DEFAULT 'standard',
      max_players INTEGER DEFAULT 2,
      status TEXT DEFAULT 'waiting',
      host_id TEXT NOT NULL,
      game_state TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (host_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      seat INTEGER DEFAULT 0,
      life INTEGER DEFAULT 20,
      poison INTEGER DEFAULT 0,
      energy INTEGER DEFAULT 0,
      experience INTEGER DEFAULT 0,
      is_monarch INTEGER DEFAULT 0,
      has_initiative INTEGER DEFAULT 0,
      has_city_blessing INTEGER DEFAULT 0,
      commander_damage TEXT DEFAULT '{}',
      joined_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES game_rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id),
      UNIQUE(user_id, friend_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT,
      content TEXT NOT NULL,
      msg_type TEXT DEFAULT 'text',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      post_type TEXT DEFAULT 'general',
      card_data TEXT DEFAULT '{}',
      deck_id TEXT,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_likes (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS booster_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      set_code TEXT NOT NULL,
      cards_json TEXT NOT NULL,
      cost_type TEXT DEFAULT 'gold',
      cost_amount INTEGER DEFAULT 0,
      opened_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS card_cache (
      cache_key TEXT PRIMARY KEY,
      card_data TEXT NOT NULL,
      cached_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── ECONOMY: Seasons ───
  db.run(`
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      rewards_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── ECONOMY: User Season Progress ───
  db.run(`
    CREATE TABLE IF NOT EXISTS user_seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      xp_earned INTEGER DEFAULT 0,
      tier INTEGER DEFAULT 1,
      rank_points INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      claimed_rewards TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (season_id) REFERENCES seasons(id),
      UNIQUE(user_id, season_id)
    )
  `);

  // ─── ECONOMY: Missions (daily/weekly/event) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      mission_type TEXT DEFAULT 'daily',
      category TEXT DEFAULT 'play',
      target_count INTEGER DEFAULT 1,
      reward_gold INTEGER DEFAULT 0,
      reward_xp INTEGER DEFAULT 0,
      reward_gems INTEGER DEFAULT 0,
      reward_item TEXT DEFAULT NULL,
      icon TEXT DEFAULT '⚔️',
      season_id TEXT DEFAULT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── ECONOMY: User Mission Progress ───
  db.run(`
    CREATE TABLE IF NOT EXISTS user_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      claimed INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (mission_id) REFERENCES missions(id),
      UNIQUE(user_id, mission_id)
    )
  `);

  // ─── ECONOMY: Achievements ───
  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT DEFAULT 'collection',
      tier TEXT DEFAULT 'bronze',
      icon TEXT DEFAULT '🏅',
      target_count INTEGER DEFAULT 1,
      reward_gold INTEGER DEFAULT 0,
      reward_xp INTEGER DEFAULT 0,
      reward_gems INTEGER DEFAULT 0,
      reward_item TEXT DEFAULT NULL,
      hidden INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── ECONOMY: User Achievement Progress ───
  db.run(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT DEFAULT NULL,
      claimed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id),
      UNIQUE(user_id, achievement_id)
    )
  `);

  // ─── ECONOMY: Customization Items (skins, shields, glows, boards) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS customization_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      item_type TEXT NOT NULL,
      rarity TEXT DEFAULT 'common',
      price_gold INTEGER DEFAULT 0,
      price_gems INTEGER DEFAULT 0,
      preview_url TEXT DEFAULT '',
      css_data TEXT DEFAULT '{}',
      limited INTEGER DEFAULT 0,
      available_from TEXT DEFAULT NULL,
      available_until TEXT DEFAULT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── ECONOMY: User Owned Customizations ───
  db.run(`
    CREATE TABLE IF NOT EXISTS user_customizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      equipped INTEGER DEFAULT 0,
      slot TEXT DEFAULT NULL,
      acquired_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES customization_items(id),
      UNIQUE(user_id, item_id)
    )
  `);

  // ─── ECONOMY: Daily Streak Tracking ───
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_streaks (
      user_id TEXT PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_claim_date TEXT DEFAULT NULL,
      total_days INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── ECONOMY: Vault (duplicate card conversion) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS vault (
      user_id TEXT PRIMARY KEY,
      progress REAL DEFAULT 0,
      total_dust INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── ECONOMY: Wildcards ───
  db.run(`
    CREATE TABLE IF NOT EXISTS wildcards (
      user_id TEXT NOT NULL,
      rarity TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, rarity),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── ECONOMY: Booster Pity Counter ───
  db.run(`
    CREATE TABLE IF NOT EXISTS pity_counters (
      user_id TEXT PRIMARY KEY,
      mythic_pity INTEGER DEFAULT 0,
      wild_pity INTEGER DEFAULT 0,
      last_mythic_at TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── ECONOMY: Crafting Recipes ───
  db.run(`
    CREATE TABLE IF NOT EXISTS crafting_recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      input_rarity TEXT NOT NULL,
      input_count INTEGER DEFAULT 4,
      output_rarity TEXT NOT NULL,
      output_count INTEGER DEFAULT 1,
      dust_cost INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  // ─── SOCIAL: Leaderboard Cache ───
  db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard_cache (
      category TEXT NOT NULL,
      period TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (category, period)
    )
  `);

  // ─── USER: Onboarding State ───
  db.run(`
    CREATE TABLE IF NOT EXISTS onboarding (
      user_id TEXT PRIMARY KEY,
      step INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      reward_claimed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── TAVERN: Games History ───
  db.run(`
    CREATE TABLE IF NOT EXISTS tavern_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      bet INTEGER DEFAULT 0,
      result_json TEXT DEFAULT '{}',
      won INTEGER DEFAULT 0,
      reward INTEGER DEFAULT 0,
      played_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── TAVERN: Daily NPC Deals ───
  db.run(`
    CREATE TABLE IF NOT EXISTS tavern_deals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      deal_date TEXT NOT NULL,
      deals_json TEXT NOT NULL,
      claimed TEXT DEFAULT '[]',
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, deal_date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS market_listings (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      card_name TEXT NOT NULL,
      set_code TEXT,
      rarity TEXT,
      image_uri TEXT,
      foil INTEGER DEFAULT 0,
      price_gold INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // ─── BOT ECONOMY: Bot Players ───
  db.run(`
    CREATE TABLE IF NOT EXISTS bot_players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      personality TEXT DEFAULT 'balanced',
      avatar TEXT DEFAULT '🤖',
      specialty TEXT DEFAULT 'general',
      gold INTEGER DEFAULT 50000,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      description TEXT DEFAULT '',
      buy_threshold REAL DEFAULT 0.8,
      sell_threshold REAL DEFAULT 1.2,
      aggression REAL DEFAULT 0.5,
      last_action_at TEXT DEFAULT (datetime('now')),
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── BOT ECONOMY: Bot Inventory ───
  db.run(`
    CREATE TABLE IF NOT EXISTS bot_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      card_name TEXT,
      set_code TEXT,
      rarity TEXT,
      image_uri TEXT,
      quantity INTEGER DEFAULT 1,
      foil INTEGER DEFAULT 0,
      acquired_price INTEGER DEFAULT 0,
      acquired_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bot_id) REFERENCES bot_players(id),
      UNIQUE(bot_id, card_id, foil)
    )
  `);

  // ─── BOT ECONOMY: Bot Activity Log ───
  db.run(`
    CREATE TABLE IF NOT EXISTS bot_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT NOT NULL,
      action TEXT NOT NULL,
      card_name TEXT,
      card_id TEXT,
      price INTEGER DEFAULT 0,
      quantity INTEGER DEFAULT 1,
      target_user TEXT,
      details TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bot_id) REFERENCES bot_players(id)
    )
  `);

  // ─── ECONOMY: Dynamic Pricing ───
  db.run(`
    CREATE TABLE IF NOT EXISTS dynamic_pricing (
      card_id TEXT PRIMARY KEY,
      card_name TEXT,
      base_price INTEGER DEFAULT 100,
      current_price INTEGER DEFAULT 100,
      supply INTEGER DEFAULT 0,
      demand INTEGER DEFAULT 0,
      demand_score REAL DEFAULT 1.0,
      trend TEXT DEFAULT 'stable',
      last_updated TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── ECONOMY: Market Events ───
  db.run(`
    CREATE TABLE IF NOT EXISTS market_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      rarity_modifier REAL DEFAULT 1.0,
      color_modifier TEXT DEFAULT '',
      duration_minutes INTEGER DEFAULT 60,
      active INTEGER DEFAULT 0,
      expires_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── PLAYER SHOWCASES ───
  db.run(`
    CREATE TABLE IF NOT EXISTS player_showcases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Minha Vitrine',
      description TEXT DEFAULT '',
      cover_card_id TEXT,
      featured_card_ids TEXT DEFAULT '[]',
      theme TEXT DEFAULT 'default',
      is_public INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── PLAYER BINDERS (Folders) ───
  db.run(`
    CREATE TABLE IF NOT EXISTS player_binders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Fichário',
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#D4A017',
      icon TEXT DEFAULT '📖',
      sort_order INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── BINDER CARDS ───
  db.run(`
    CREATE TABLE IF NOT EXISTS binder_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      binder_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      card_name TEXT,
      set_code TEXT,
      rarity TEXT,
      image_uri TEXT,
      sort_order INTEGER DEFAULT 0,
      added_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (binder_id) REFERENCES player_binders(id),
      UNIQUE(binder_id, card_id)
    )
  `);

  // ─── CARD SKINS ───
  db.run(`
    CREATE TABLE IF NOT EXISTS card_skins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      target_rarity TEXT DEFAULT 'any',
      css_effect TEXT NOT NULL,
      preview_url TEXT DEFAULT '',
      price_gold INTEGER DEFAULT 500,
      price_gems INTEGER DEFAULT 50,
      rarity TEXT DEFAULT 'rare',
      limited INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── USER CARD SKINS ───
  db.run(`
    CREATE TABLE IF NOT EXISTS user_card_skins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      skin_id TEXT NOT NULL,
      card_id TEXT DEFAULT NULL,
      equipped INTEGER DEFAULT 0,
      acquired_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (skin_id) REFERENCES card_skins(id),
      UNIQUE(user_id, skin_id)
    )
  `);

  // ─── COLLECTION VALUE CACHE ───
  db.run(`
    CREATE TABLE IF NOT EXISTS collection_value (
      user_id TEXT PRIMARY KEY,
      total_cards INTEGER DEFAULT 0,
      unique_cards INTEGER DEFAULT 0,
      total_value_gold INTEGER DEFAULT 0,
      mythic_count INTEGER DEFAULT 0,
      rare_count INTEGER DEFAULT 0,
      uncommon_count INTEGER DEFAULT 0,
      common_count INTEGER DEFAULT 0,
      foil_count INTEGER DEFAULT 0,
      completion_pct REAL DEFAULT 0,
      last_calculated TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_trades_sender ON trades(sender_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_trades_receiver ON trades(receiver_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_market_status ON market_listings(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_market_seller ON market_listings(seller_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_seasons_user ON user_seasons(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_customizations_user ON user_customizations(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_bot_inventory_bot ON bot_inventory(bot_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_bot_activity_bot ON bot_activity_log(bot_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_card ON dynamic_pricing(card_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_player_showcases_user ON player_showcases(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_player_binders_user ON player_binders(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_binder_cards_binder ON binder_cards(binder_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_market_seller ON market_listings(seller_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_seasons_user ON user_seasons(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_customizations_user ON user_customizations(user_id)');

  // Seed default missions
  seedMissions(db);
  // Seed default achievements
  seedAchievements(db);
  // Seed default customization items
  seedCustomizationItems(db);
  // Seed default crafting recipes
  seedCraftingRecipes(db);
  // Seed active season if none
  seedCurrentSeason(db);
  // Seed bot players
  seedBotPlayers(db);
  // Seed card skins
  seedCardSkins(db);
  // Seed default binders for existing users
  seedDefaultBinders(db);

  // Save to disk
  saveDatabase();

  console.log('📦 Database initialized successfully with Economy & Collectible tables');
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDb() {
  return db;
}

// Auto-save every 30 seconds
setInterval(() => {
  saveDatabase();
}, 30000);

// Save on process exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

// ─── SEED FUNCTIONS ───

function seedMissions(db) {
  const existing = db.exec("SELECT COUNT(*) FROM missions");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const missions = [
    { id: 'daily-win-1', title: 'Primeira Vitória', description: 'Vença 1 partida', type: 'daily', category: 'play', target: 1, gold: 100, xp: 30, icon: '🏆' },
    { id: 'daily-win-3', title: 'Sequência de Vitórias', description: 'Vença 3 partidas', type: 'daily', category: 'play', target: 3, gold: 200, xp: 60, icon: '🔥' },
    { id: 'daily-play-5', title: 'Planeswalker Ativo', description: 'Jogue 5 partidas', type: 'daily', category: 'play', target: 5, gold: 150, xp: 40, icon: '⚔️' },
    { id: 'daily-cast-20', title: 'Mestre das Magias', description: 'Conjure 20 feitiços', type: 'daily', category: 'spell', target: 20, gold: 120, xp: 35, icon: '✨' },
    { id: 'daily-open-booster', title: 'Caça ao Tesouro', description: 'Abra 1 booster', type: 'daily', category: 'collection', target: 1, gold: 50, xp: 20, icon: '📦' },
    { id: 'daily-trade-1', title: 'Mercador Justo', description: 'Complete 1 troca', type: 'daily', category: 'social', target: 1, gold: 75, xp: 25, icon: '🤝' },
    { id: 'daily-craft-1', title: 'Artesão de Planeswalker', description: 'Realize 1 crafting', type: 'daily', category: 'collection', target: 1, gold: 80, xp: 25, icon: '🔨' },

    { id: 'weekly-win-10', title: 'Dominação Semanal', description: 'Vença 10 partidas na semana', type: 'weekly', category: 'play', target: 10, gold: 500, xp: 150, icon: '👑' },
    { id: 'weekly-play-20', title: 'Veterano da Mesa', description: 'Jogue 20 partidas na semana', type: 'weekly', category: 'play', target: 20, gold: 400, xp: 120, icon: '🗡️' },
    { id: 'weekly-collect-50', title: 'Colecionador Ávido', description: 'Adicione 50 cartas à coleção', type: 'weekly', category: 'collection', target: 50, gold: 350, xp: 100, icon: '📚' },
    { id: 'weekly-deck-2', title: 'Construtor de Decks', description: 'Crie 2 decks novos', type: 'weekly', category: 'deck', target: 2, gold: 300, xp: 80, icon: '🃏' },
    { id: 'weekly-commander-5', title: 'Líder de Comando', description: 'Jogue 5 partidas Commander', type: 'weekly', category: 'play', target: 5, gold: 450, xp: 130, icon: '⚜️' },

    { id: 'event-first-game', title: 'Primeiro Passo', description: 'Jogue sua primeira partida', type: 'event', category: 'onboarding', target: 1, gold: 200, xp: 100, icon: '🌟' },
    { id: 'event-first-deck', title: 'Construa Seu Deck', description: 'Crie seu primeiro deck', type: 'event', category: 'onboarding', target: 1, gold: 150, xp: 75, icon: '📝' },
    { id: 'event-first-booster', title: 'Abertura Inaugural', description: 'Abra seu primeiro booster', type: 'event', category: 'onboarding', target: 1, gold: 100, xp: 50, icon: '🎁' },
    { id: 'event-level-5', title: 'Ascendente', description: 'Alcance nível 5', type: 'event', category: 'progression', target: 5, gold: 500, xp: 200, icon: '⬆️' },
    { id: 'event-level-10', title: 'Planeswalker Experiente', description: 'Alcance nível 10', type: 'event', category: 'progression', target: 10, gold: 1000, xp: 500, icon: '🌟' },
  ];

  for (const m of missions) {
    db.run(
      `INSERT OR IGNORE INTO missions (id, title, description, mission_type, category, target_count, reward_gold, reward_xp, reward_gems, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [m.id, m.title, m.description, m.type, m.category, m.target, m.gold, m.xp, m.icon]
    );
  }
}

function seedAchievements(db) {
  const existing = db.exec("SELECT COUNT(*) FROM achievements");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const achievements = [
    { id: 'ach-first-win', title: 'Primeiro Triunfo', desc: 'Vença sua primeira partida', cat: 'play', tier: 'bronze', icon: '🏅', target: 1, gold: 100, xp: 50 },
    { id: 'ach-win-10', title: 'Guerreiro', desc: 'Vença 10 partidas', cat: 'play', tier: 'silver', icon: '⚔️', target: 10, gold: 300, xp: 100 },
    { id: 'ach-win-50', title: 'Lenda da Mesa', desc: 'Vença 50 partidas', cat: 'play', tier: 'gold', icon: '👑', target: 50, gold: 1000, xp: 500 },
    { id: 'ach-win-100', title: 'Invicto', desc: 'Vença 100 partidas', cat: 'play', tier: 'platinum', icon: '🏆', target: 100, gold: 2500, xp: 1000 },
    { id: 'ach-collect-100', title: 'Colecionador Iniciante', desc: 'Tenha 100 cartas únicas', cat: 'collection', tier: 'bronze', icon: '📚', target: 100, gold: 200, xp: 75 },
    { id: 'ach-collect-500', title: 'Colecionador Dedicado', desc: 'Tenha 500 cartas únicas', cat: 'collection', tier: 'silver', icon: '📖', target: 500, gold: 500, xp: 200 },
    { id: 'ach-collect-1000', title: 'Arquivo Completo', desc: 'Tenha 1000 cartas únicas', cat: 'collection', tier: 'gold', icon: '🏛️', target: 1000, gold: 1500, xp: 750 },
    { id: 'ach-booster-10', title: 'Caçador de Boosters', desc: 'Abra 10 boosters', cat: 'collection', tier: 'bronze', icon: '📦', target: 10, gold: 150, xp: 50 },
    { id: 'ach-booster-50', title: 'Viciado em Boosters', desc: 'Abra 50 boosters', cat: 'collection', tier: 'silver', icon: '🎁', target: 50, gold: 500, xp: 200 },
    { id: 'ach-deck-5', title: 'Engenheiro de Decks', desc: 'Crie 5 decks', cat: 'deck', tier: 'bronze', icon: '🃏', target: 5, gold: 200, xp: 75 },
    { id: 'ach-trade-10', title: 'Mercador', desc: 'Complete 10 trocas', cat: 'social', tier: 'bronze', icon: '🤝', target: 10, gold: 200, xp: 75 },
    { id: 'ach-streak-7', title: 'Dedicado', desc: 'Tenha um streak de 7 dias', cat: 'social', tier: 'silver', icon: '🔥', target: 7, gold: 500, xp: 200 },
    { id: 'ach-streak-30', title: 'Inabalável', desc: 'Tenha um streak de 30 dias', cat: 'social', tier: 'gold', icon: '💎', target: 30, gold: 2000, xp: 1000 },
    { id: 'ach-level-10', title: 'Veterano', desc: 'Alcance nível 10', cat: 'progression', tier: 'silver', icon: '⬆️', target: 10, gold: 500, xp: 200 },
    { id: 'ach-level-25', title: 'Mestre Planeswalker', desc: 'Alcance nível 25', cat: 'progression', tier: 'gold', icon: '🌟', target: 25, gold: 2000, xp: 1000 },
    { id: 'ach-commander-10', title: 'Líder Supremo', desc: 'Jogue 10 partidas Commander', cat: 'play', tier: 'bronze', icon: '⚜️', target: 10, gold: 300, xp: 100 },
    { id: 'ach-mythic-5', title: 'Caçador de Míticas', desc: 'Tenha 5 cartas míticas', cat: 'collection', tier: 'silver', icon: '🔮', target: 5, gold: 500, xp: 200 },
    { id: 'ach-foil-10', title: 'Luz Brilhante', desc: 'Tenha 10 cartas foil', cat: 'collection', tier: 'bronze', icon: '✨', target: 10, gold: 200, xp: 75 },
  ];

  for (const a of achievements) {
    db.run(
      `INSERT OR IGNORE INTO achievements (id, title, description, category, tier, icon, target_count, reward_gold, reward_xp, reward_gems)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [a.id, a.title, a.desc, a.cat, a.tier, a.icon, a.target, a.gold, a.xp]
    );
  }
}

function seedCustomizationItems(db) {
  const existing = db.exec("SELECT COUNT(*) FROM customization_items");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const items = [
    // Card Backs
    { id: 'cb-default', name: 'Volta Padrão', desc: 'A clássica volta de carta Magic', type: 'card_back', rarity: 'common', gold: 0, gems: 0, css: '{"border":"2px solid #8B6914"}' },
    { id: 'cb-fire', name: 'Volta Flamejante', desc: 'Embraveça seus oponentes com chamas', type: 'card_back', rarity: 'uncommon', gold: 300, gems: 30, css: '{"border":"2px solid #FF4500","glow":"0 0 12px #FF4500"}' },
    { id: 'cb-ice', name: 'Volta Glacial', desc: 'Congele seus adversários com gelo', type: 'card_back', rarity: 'uncommon', gold: 300, gems: 30, css: '{"border":"2px solid #00BFFF","glow":"0 0 12px #00BFFF"}' },
    { id: 'cb-void', name: 'Volta do Vazio', desc: 'Poder sombrio emanando do plano', type: 'card_back', rarity: 'rare', gold: 800, gems: 80, css: '{"border":"2px solid #800080","glow":"0 0 20px #800080"}' },
    { id: 'cb-arcane', name: 'Volta Arcana', desc: 'Magia arcano pulsante', type: 'card_back', rarity: 'rare', gold: 800, gems: 80, css: '{"border":"2px solid #FFD700","glow":"0 0 20px #FFD700"}' },
    { id: 'cb-mythic', name: 'Volta Mítica', desc: 'Aureola dourada de poder mítico', type: 'card_back', rarity: 'mythic', gold: 2000, gems: 200, css: '{"border":"3px solid #FFD700","glow":"0 0 30px #FFD700, 0 0 60px #FF8C00"}' },

    // Battlefield Skins
    { id: 'bs-stone', name: 'Mesa de Pedra', desc: 'Superfície clássica de pedra', type: 'board_skin', rarity: 'common', gold: 0, gems: 0, css: '{"bg":"#2a2a3a"}' },
    { id: 'bs-forest', name: 'Floresta Ancestral', desc: 'Jogue em meio à natureza', type: 'board_skin', rarity: 'uncommon', gold: 500, gems: 50, css: '{"bg":"linear-gradient(135deg, #1a3a1a 0%, #2d5a2d 100%)"}' },
    { id: 'bs-volcanic', name: 'Planalto Vulcânico', desc: 'Lava borbulhante sob seus pés', type: 'board_skin', rarity: 'uncommon', gold: 500, gems: 50, css: '{"bg":"linear-gradient(135deg, #3a1a0a 0%, #5a2a1a 100%)"}' },
    { id: 'bs-azorius', name: 'Tribunal Azorius', desc: 'Ordem e justiça nas colunas brancas', type: 'board_skin', rarity: 'rare', gold: 1200, gems: 120, css: '{"bg":"linear-gradient(135deg, #1a2a4a 0%, #2a3a6a 100%)"}' },
    { id: 'bs-phyrexian', name: 'Fosso Phyrexiano', desc: 'Carne e metal se fundindo', type: 'board_skin', rarity: 'rare', gold: 1200, gems: 120, css: '{"bg":"linear-gradient(135deg, #1a0a1a 0%, #3a1a3a 100%)"}' },
    { id: 'bs-celestial', name: 'Vazio Celestial', desc: 'Estrelas cintilantes no plano etéreo', type: 'board_skin', rarity: 'mythic', gold: 3000, gems: 300, css: '{"bg":"radial-gradient(ellipse at center, #0a0a2a 0%, #000011 100%)"}' },

    // Life Counter Skins
    { id: 'lc-classic', name: 'Contador Clássico', desc: 'Display de vida tradicional', type: 'life_counter', rarity: 'common', gold: 0, gems: 0, css: '{"font":"Cinzel","color":"#D4A017"}' },
    { id: 'lc-neon', name: 'Contador Neon', desc: 'Números brilhantes em neon', type: 'life_counter', rarity: 'uncommon', gold: 400, gems: 40, css: '{"font":"Fira Code","color":"#00FF88","glow":"0 0 10px #00FF88"}' },
    { id: 'lc-gothic', name: 'Contador Gótico', desc: 'Estilo sombrio e elegante', type: 'life_counter', rarity: 'rare', gold: 900, gems: 90, css: '{"font":"Cinzel Decorative","color":"#8B0000","glow":"0 0 8px #FF0000"}' },

    // Avatar Frames
    { id: 'af-plain', name: 'Quadro Simples', desc: 'Borda básica para avatar', type: 'avatar_frame', rarity: 'common', gold: 0, gems: 0, css: '{"border":"2px solid #555"}' },
    { id: 'af-gold', name: 'Quadro Dourado', desc: 'Borda dourada reluzente', type: 'avatar_frame', rarity: 'uncommon', gold: 400, gems: 40, css: '{"border":"3px solid #FFD700","glow":"0 0 8px #FFD700"}' },
    { id: 'af-diamond', name: 'Quadro de Diamante', desc: 'Borda cristalina e rara', type: 'avatar_frame', rarity: 'rare', gold: 1000, gems: 100, css: '{"border":"3px solid #B9F2FF","glow":"0 0 12px #B9F2FF"}' },
    { id: 'af-mythic', name: 'Quadro Mítico', desc: 'Aura de poder absoluto', type: 'avatar_frame', rarity: 'mythic', gold: 2500, gems: 250, css: '{"border":"3px solid #FFD700","glow":"0 0 20px #FFD700, 0 0 40px #FF8C00"}' },

    // Emotes
    { id: 'em-gg', name: 'Boa Jogo', desc: 'Emote de boas-vindas', type: 'emote', rarity: 'common', gold: 100, gems: 10, css: '{"text":"GG!"}' },
    { id: 'em-wp', name: 'Bem Jogado', desc: 'Reconheça a habilidade do oponente', type: 'emote', rarity: 'common', gold: 100, gems: 10, css: '{"text":"WP!"}' },
    { id: 'em-hello', name: 'Saudação Planar', desc: 'Cumprimente seu oponente', type: 'emote', rarity: 'common', gold: 100, gems: 10, css: '{"text":"Olá, Planeswalker!"}' },
    { id: 'em-thanks', name: 'Agradecimento', desc: 'Agradeça pelo jogo', type: 'emote', rarity: 'uncommon', gold: 200, gems: 20, css: '{"text":"Obrigado!"}' },
  ];

  for (const item of items) {
    db.run(
      `INSERT OR IGNORE INTO customization_items (id, name, description, item_type, rarity, price_gold, price_gems, css_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.name, item.desc, item.type, item.rarity, item.gold, item.gems, item.css]
    );
  }
}

function seedCraftingRecipes(db) {
  const existing = db.exec("SELECT COUNT(*) FROM crafting_recipes");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const recipes = [
    { id: 'craft-common-to-uncommon', name: 'Comum → Incomum', input: 'common', count: 5, output: 'uncommon', out_count: 1, dust: 0 },
    { id: 'craft-uncommon-to-rare', name: 'Incomum → Raro', input: 'uncommon', count: 3, output: 'rare', out_count: 1, dust: 20 },
    { id: 'craft-rare-to-mythic', name: 'Raro → Mítico', input: 'rare', count: 4, output: 'mythic', out_count: 1, dust: 50 },
    { id: 'craft-dust-rare', name: 'Desmanchar Raro', input: 'rare', count: 1, output: 'dust', out_count: 20, dust: 0 },
    { id: 'craft-dust-mythic', name: 'Desmanchar Mítico', input: 'mythic', count: 1, output: 'dust', out_count: 40, dust: 0 },
  ];

  for (const r of recipes) {
    db.run(
      `INSERT OR IGNORE INTO crafting_recipes (id, name, input_rarity, input_count, output_rarity, output_count, dust_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.name, r.input, r.count, r.output, r.out_count, r.dust]
    );
  }
}

function seedCurrentSeason(db) {
  const existing = db.exec("SELECT COUNT(*) FROM seasons WHERE status = 'active'");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 3);

  const seasonId = `season-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  db.run(
    `INSERT OR IGNORE INTO seasons (id, name, description, start_date, end_date, status, rewards_json)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    [
      seasonId,
      `Temporada ${now.getFullYear()} - T${Math.ceil((now.getMonth() + 1) / 3)}`,
      'Temporada competitiva com recompensas exclusivas!',
      now.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      JSON.stringify({
        tiers: [
          { tier: 1, xp_required: 0, reward: { gold: 100 } },
          { tier: 2, xp_required: 500, reward: { gold: 200, item: 'cb-fire' } },
          { tier: 3, xp_required: 1500, reward: { gold: 300, gems: 30 } },
          { tier: 4, xp_required: 3000, reward: { gold: 500, item: 'bs-forest' } },
          { tier: 5, xp_required: 5000, reward: { gold: 800, gems: 80 } },
          { tier: 6, xp_required: 8000, reward: { gold: 1200, item: 'af-gold' } },
          { tier: 7, xp_required: 12000, reward: { gold: 1500, gems: 150 } },
          { tier: 8, xp_required: 18000, reward: { gold: 2000, item: 'bs-azorius' } },
          { tier: 9, xp_required: 25000, reward: { gold: 3000, gems: 300 } },
          { tier: 10, xp_required: 35000, reward: { gold: 5000, gems: 500, item: 'cb-mythic' } },
        ]
      })
    ]
  );
}

function seedBotPlayers(db) {
  const existing = db.exec("SELECT COUNT(*) FROM bot_players");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const bots = [
    { id: 'bot-vendedor-ralph', name: 'Ralph, o Ferreiro', personality: 'merchant', avatar: '⚒️', specialty: 'artifacts', gold: 80000, level: 15, desc: 'Mercador de artifactos e equipamentos. Compra e vende tudo que reluz.', buy_thresh: 0.75, sell_thresh: 1.3, aggression: 0.4 },
    { id: 'bot-colecionadora-elena', name: 'Elena, a Colecionadora', personality: 'collector', avatar: '📚', specialty: 'rare_cards', gold: 120000, level: 22, desc: 'Colecionadora obcecada por cartas raras e míticas. Paga premium pelas melhores.', buy_thresh: 0.9, sell_thresh: 1.5, aggression: 0.3 },
    { id: 'bot-especulador-zane', name: 'Zane, o Especulador', personality: 'speculator', avatar: '📈', specialty: 'value', gold: 200000, level: 30, desc: 'Gênio financeiro. Compra barato, vende caro. Manipula o mercado sutilmente.', buy_thresh: 0.6, sell_thresh: 1.8, aggression: 0.7 },
    { id: 'bot-novato-pip', name: 'Pip, o Novato', personality: 'novice', avatar: '🌱', specialty: 'commons', gold: 5000, level: 3, desc: 'Começou agora. Compra cartas baratas e aprende a negociar.', buy_thresh: 0.5, sell_thresh: 1.1, aggression: 0.2 },
    { id: 'bot-mecenas-theron', name: 'Theron, o Mecenas', personality: 'patron', avatar: '🎭', specialty: 'foils', gold: 150000, level: 25, desc: 'Aristocrata que coleciona apenas versões foil e premium.', buy_thresh: 0.85, sell_thresh: 1.4, aggression: 0.35 },
    { id: 'bot-caos-blitz', name: 'Blitz, o Caótico', personality: 'chaotic', avatar: '⚡', specialty: 'all', gold: 30000, level: 10, desc: 'Imprevisível. Compra e vende em lotes aleatórios. Ninguém sabe seu plano.', buy_thresh: 0.7, sell_thresh: 1.2, aggression: 0.8 },
    { id: 'bot-mentor-aria', name: 'Aria, a Mentora', personality: 'mentor', avatar: '🌟', specialty: 'starter', gold: 20000, level: 12, desc: 'Vende cartas básicas e incomuns a preços acessíveis para novos jogadores.', buy_thresh: 0.65, sell_thresh: 1.05, aggression: 0.15 },
    { id: 'bot-vilao-morlock', name: 'Morlock, o Sombrio', personality: 'aggressive', avatar: '💀', specialty: 'black_cards', gold: 90000, level: 18, desc: 'Especialista em cartas negras e stratégias de morte. Impiedoso nos negócios.', buy_thresh: 0.8, sell_thresh: 1.6, aggression: 0.9 },
  ];

  for (const b of bots) {
    db.run(
      `INSERT OR IGNORE INTO bot_players (id, name, personality, avatar, specialty, gold, level, description, buy_threshold, sell_threshold, aggression)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.name, b.personality, b.avatar, b.specialty, b.gold, b.level, b.desc, b.buy_thresh, b.sell_thresh, b.aggression]
    );
  }

  console.log('🤖 Bot players seeded:', bots.length);
}

function seedCardSkins(db) {
  const existing = db.exec("SELECT COUNT(*) FROM card_skins");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const skins = [
    { id: 'skin-foil-basic', name: 'Foil Básico', desc: 'Brilho holográfico sutil', effect: 'linear-gradient(135deg, transparent 20%, rgba(255,215,0,0.15) 30%, rgba(0,200,255,0.15) 40%, transparent 80%)', price_gold: 200, price_gems: 20, rarity: 'common' },
    { id: 'skin-foil-prismatic', name: 'Foil Prismático', desc: 'Arco-íris cambiante', effect: 'linear-gradient(135deg, #ff0000 0%, #ff8800 16%, #ffff00 33%, #00ff00 50%, #0088ff 66%, #8800ff 83%, #ff0000 100%)', price_gold: 500, price_gems: 50, rarity: 'uncommon' },
    { id: 'skin-foil-galaxy', name: 'Foil Galáxia', desc: 'Estrelas cintilantes no fundo', effect: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 2%), radial-gradient(circle at 80% 70%, rgba(200,200,255,0.2) 0%, transparent 1.5%), radial-gradient(circle at 50% 50%, #0a0a2a 0%, #1a0a3a 50%, #0a0a1a 100%)', price_gold: 800, price_gems: 80, rarity: 'rare' },
    { id: 'skin-foil-phoenix', name: 'Foi Fênix', desc: 'Chamas douradas envolvendo a carta', effect: 'linear-gradient(to top, rgba(255,69,0,0.3) 0%, rgba(255,165,0,0.2) 30%, rgba(255,215,0,0.15) 60%, transparent 100%)', price_gold: 1000, price_gems: 100, rarity: 'rare' },
    { id: 'skin-void', name: 'Aura do Vazio', desc: 'Energia sombria pulsante', effect: 'radial-gradient(ellipse at center, rgba(128,0,128,0.3) 0%, rgba(48,0,48,0.2) 50%, transparent 100%)', price_gold: 1200, price_gems: 120, rarity: 'rare' },
    { id: 'skin-mythic-aura', name: 'Aura Mítica', desc: 'Aureola dourada de poder absoluto', effect: 'radial-gradient(ellipse at center, rgba(255,215,0,0.4) 0%, rgba(255,140,0,0.2) 40%, transparent 70%)', price_gold: 2500, price_gems: 250, rarity: 'mythic' },
    { id: 'skin-ice-bound', name: 'Prisão Glacial', desc: 'Cristais de gelo formando-se', effect: 'linear-gradient(135deg, rgba(0,191,255,0.2) 0%, rgba(135,206,250,0.15) 25%, rgba(255,255,255,0.1) 50%, rgba(0,191,255,0.2) 75%, rgba(135,206,250,0.15) 100%)', price_gold: 900, price_gems: 90, rarity: 'rare' },
    { id: 'skin-eldritch', name: 'Eldritch', desc: 'Horror cósmico transcendente', effect: 'conic-gradient(from 0deg at 50% 50%, rgba(0,255,0,0.1) 0deg, rgba(128,0,128,0.15) 90deg, rgba(255,0,0,0.1) 180deg, rgba(0,0,255,0.15) 270deg, rgba(0,255,0,0.1) 360deg)', price_gold: 3000, price_gems: 300, rarity: 'mythic' },
  ];

  for (const s of skins) {
    db.run(
      `INSERT OR IGNORE INTO card_skins (id, name, description, css_effect, price_gold, price_gems, rarity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.desc, s.effect, s.price_gold, s.price_gems, s.rarity]
    );
  }

  console.log('🎨 Card skins seeded:', skins.length);
}

function seedDefaultBinders(db) {
  const existing = db.exec("SELECT COUNT(*) FROM player_binders");
  if (existing.length > 0 && existing[0].values[0][0] > 0) return;

  const users = db.exec("SELECT id FROM users");
  if (!users.length || !users[0].values.length) return;

  const defaultBinders = [
    { name: 'Favoritas', desc: 'Suas cartas favoritas', icon: '⭐', color: '#FFD700' },
    { name: 'Para Troca', desc: 'Cartas disponíveis para troca', icon: '🔄', color: '#00BFFF' },
    { name: 'Raras & Míticas', desc: 'As melhores cartas da coleção', icon: '💎', color: '#FF6B6B' },
  ];

  for (const row of users[0].values) {
    const userId = row[0];
    for (const b of defaultBinders) {
      const binderId = `binder-${userId}-${b.name.toLowerCase().replace(/\s+/g, '-')}`;
      db.run(
        `INSERT OR IGNORE INTO player_binders (id, user_id, name, description, icon, color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [binderId, userId, b.name, b.desc, b.icon, b.color]
      );
    }
  }
}

module.exports = { initDatabase, getDb, saveDatabase };
