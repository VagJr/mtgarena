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

  // Save to disk
  saveDatabase();

  console.log('📦 Database initialized successfully with Social & Community tables');
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

module.exports = { initDatabase, getDb, saveDatabase };
