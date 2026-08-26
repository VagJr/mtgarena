const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get current active season
router.get('/current', (req, res) => {
  try {
    const db = req.db;
    const result = db.exec("SELECT * FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1");
    if (result.length === 0 || result[0].values.length === 0) {
      return res.json(null);
    }
    const row = result[0].values[0];
    res.json({
      id: row[0], name: row[1], description: row[2],
      start_date: row[3], end_date: row[4],
      rewards: JSON.parse(row[5] || '{}'),
      status: row[6]
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all seasons
router.get('/', (req, res) => {
  try {
    const db = req.db;
    const result = db.exec("SELECT * FROM seasons ORDER BY created_at DESC");
    const seasons = result.length > 0 ? result[0].values.map(row => ({
      id: row[0], name: row[1], description: row[2],
      start_date: row[3], end_date: row[4],
      rewards: JSON.parse(row[5] || '{}'),
      status: row[6]
    })) : [];
    res.json(seasons);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's season progress
router.get('/my-progress', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const seasonResult = db.exec("SELECT id FROM seasons WHERE status = 'active' LIMIT 1");
    if (seasonResult.length === 0 || seasonResult[0].values.length === 0) {
      return res.json(null);
    }
    const seasonId = seasonResult[0].values[0][0];

    const progress = db.exec(
      "SELECT * FROM user_seasons WHERE user_id = ? AND season_id = ?",
      [req.user.id, seasonId]
    );

    if (progress.length === 0 || progress[0].values.length === 0) {
      // Auto-enroll
      db.run("INSERT INTO user_seasons (user_id, season_id) VALUES (?, ?)", [req.user.id, seasonId]);
      saveDatabase();
      return res.json({ season_id: seasonId, xp_earned: 0, tier: 1, rank_points: 0, games_played: 0, wins: 0, losses: 0, claimed_rewards: [] });
    }

    const row = progress[0].values[0];
    res.json({
      id: row[0], user_id: row[1], season_id: row[2],
      xp_earned: row[3], tier: row[4], rank_points: row[5],
      games_played: row[6], wins: row[7], losses: row[8],
      claimed_rewards: JSON.parse(row[9] || '[]')
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim season tier reward
router.post('/claim-reward', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { tier } = req.body;

    const seasonResult = db.exec("SELECT id, rewards_json FROM seasons WHERE status = 'active' LIMIT 1");
    if (seasonResult.length === 0 || seasonResult[0].values.length === 0) {
      return res.status(404).json({ error: 'No active season' });
    }

    const seasonId = seasonResult[0].values[0][0];
    const rewards = JSON.parse(seasonResult[0].values[0][1] || '{}');
    const tierReward = rewards.tiers?.find(t => t.tier === tier);

    if (!tierReward) return res.status(400).json({ error: 'Invalid tier' });

    const progress = db.exec("SELECT tier, claimed_rewards FROM user_seasons WHERE user_id = ? AND season_id = ?",
      [req.user.id, seasonId]);
    if (progress.length === 0 || progress[0].values.length === 0) {
      return res.status(400).json({ error: 'Not enrolled in season' });
    }

    const currentTier = progress[0].values[0][0];
    const claimed = JSON.parse(progress[0].values[0][1] || '[]');

    if (currentTier < tier) return res.status(400).json({ error: 'Tier not reached yet' });
    if (claimed.includes(tier)) return res.status(400).json({ error: 'Already claimed' });

    // Grant rewards
    if (tierReward.reward.gold) db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [tierReward.reward.gold, req.user.id]);
    if (tierReward.reward.gems) db.run("UPDATE users SET gems = gems + ? WHERE id = ?", [tierReward.reward.gems, req.user.id]);
    if (tierReward.reward.item) {
      db.run("INSERT OR IGNORE INTO user_customizations (user_id, item_id) VALUES (?, ?)", [req.user.id, tierReward.reward.item]);
    }

    claimed.push(tier);
    db.run("UPDATE user_seasons SET claimed_rewards = ? WHERE user_id = ? AND season_id = ?",
      [JSON.stringify(claimed), req.user.id, seasonId]);

    saveDatabase();

    const userResult = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = userResult[0]?.values[0] || [0, 0, 0, 1];

    res.json({
      reward: tierReward.reward,
      balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const db = req.db;
    const { category = 'xp', limit = 50 } = req.query;

    let orderBy = 'xp DESC';
    if (category === 'wins') orderBy = '(SELECT COUNT(*) FROM game_players gp JOIN game_rooms gr ON gp.room_id = gr.id WHERE gr.status = \'finished\') DESC';
    if (category === 'level') orderBy = 'level DESC, xp DESC';
    if (category === 'streak') orderBy = '(SELECT COALESCE(current_streak, 0) FROM daily_streaks ds WHERE ds.user_id = u.id) DESC';

    const result = db.exec(
      `SELECT u.id, u.username, u.avatar, u.level, u.xp, u.gold, u.gems,
        (SELECT COALESCE(current_streak, 0) FROM daily_streaks ds WHERE ds.user_id = u.id) as streak
       FROM users u
       ORDER BY ${orderBy}
       LIMIT ?`,
      [parseInt(limit)]
    );

    if (result.length === 0) return res.json([]);

    const leaderboard = result[0].values.map((row, idx) => ({
      rank: idx + 1,
      user_id: row[0], username: row[1], avatar: row[2],
      level: row[3], xp: row[4], gold: row[5], gems: row[6], streak: row[7]
    }));

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Record game result (called after game ends)
router.post('/record-game', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { won, format } = req.body;

    const seasonResult = db.exec("SELECT id FROM seasons WHERE status = 'active' LIMIT 1");
    if (seasonResult.length > 0 && seasonResult[0].values.length > 0) {
      const seasonId = seasonResult[0].values[0][0];

      // Enroll if needed
      db.run("INSERT OR IGNORE INTO user_seasons (user_id, season_id) VALUES (?, ?)", [req.user.id, seasonId]);

      const xpGain = won ? 75 : 25;
      const rankGain = won ? 15 : 5;

      db.run(`UPDATE user_seasons SET
        games_played = games_played + 1,
        wins = wins + ?,
        losses = losses + ?,
        xp_earned = xp_earned + ?,
        rank_points = rank_points + ?
        WHERE user_id = ? AND season_id = ?`,
        [won ? 1 : 0, won ? 0 : 1, xpGain, rankGain, req.user.id, seasonId]);

      // Check tier up
      const progress = db.exec("SELECT xp_earned, tier FROM user_seasons WHERE user_id = ? AND season_id = ?",
        [req.user.id, seasonId]);
      if (progress.length > 0 && progress[0].values.length > 0) {
        const xpEarned = progress[0].values[0][0];
        const currentTier = progress[0].values[0][1];
        const seasonData = db.exec("SELECT rewards_json FROM seasons WHERE id = ?", [seasonId]);
        if (seasonData.length > 0 && seasonData[0].values.length > 0) {
          const rewards = JSON.parse(seasonData[0].values[0][0] || '{}');
          const nextTier = rewards.tiers?.find(t => t.tier === currentTier + 1);
          if (nextTier && xpEarned >= nextTier.xp_required) {
            db.run("UPDATE user_seasons SET tier = ? WHERE user_id = ? AND season_id = ?",
              [currentTier + 1, req.user.id, seasonId]);
          }
        }
      }
    }

    // Award XP
    const xpGain = won ? 75 : 25;
    db.run("UPDATE users SET xp = xp + ? WHERE id = ?", [xpGain, req.user.id]);

    saveDatabase();
    res.json({ success: true, xp_gained: xpGain });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
