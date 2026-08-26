const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get all achievements with user progress
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const achievements = db.exec("SELECT * FROM achievements ORDER BY category, tier");
    if (achievements.length === 0) return res.json([]);

    const userAchievements = db.exec("SELECT achievement_id, progress, unlocked, claimed FROM user_achievements WHERE user_id = ?", [req.user.id]);
    const userMap = {};
    if (userAchievements.length > 0) {
      for (const row of userAchievements[0].values) {
        userMap[row[0]] = { progress: row[1], unlocked: row[2], claimed: row[3] };
      }
    }

    const result = achievements[0].values.map(row => {
      const ua = userMap[row[0]] || { progress: 0, unlocked: 0, claimed: 0 };
      return {
        id: row[0], title: row[1], description: row[2],
        category: row[3], tier: row[4], icon: row[5],
        target_count: row[6], reward_gold: row[7], reward_xp: row[8],
        reward_gems: row[9], reward_item: row[10], hidden: row[11],
        progress: ua.progress, unlocked: ua.unlocked, claimed: ua.claimed
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get achievements by category
router.get('/category/:category', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const achievements = db.exec("SELECT * FROM achievements WHERE category = ? ORDER BY tier", [req.params.category]);
    if (achievements.length === 0) return res.json([]);

    const userAchievements = db.exec("SELECT achievement_id, progress, unlocked, claimed FROM user_achievements WHERE user_id = ?", [req.user.id]);
    const userMap = {};
    if (userAchievements.length > 0) {
      for (const row of userAchievements[0].values) {
        userMap[row[0]] = { progress: row[1], unlocked: row[2], claimed: row[3] };
      }
    }

    const result = achievements[0].values.map(row => {
      const ua = userMap[row[0]] || { progress: 0, unlocked: 0, claimed: 0 };
      return {
        id: row[0], title: row[1], description: row[2],
        category: row[3], tier: row[4], icon: row[5],
        target_count: row[6], reward_gold: row[7], reward_xp: row[8],
        reward_gems: row[9], reward_item: row[10], hidden: row[11],
        progress: ua.progress, unlocked: ua.unlocked, claimed: ua.claimed
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update achievement progress
router.post('/progress', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { achievement_id, amount = 1 } = req.body;

    const achievement = db.exec("SELECT * FROM achievements WHERE id = ?", [achievement_id]);
    if (achievement.length === 0 || achievement[0].values.length === 0) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    const a = achievement[0].values[0];
    const targetCount = a[6] || 1; // target_count is at index 6

    const existing = db.exec("SELECT id, progress, unlocked FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
      [req.user.id, achievement_id]);

    if (existing.length > 0 && existing[0].values.length > 0) {
      const currentProgress = existing[0].values[0][1];
      const isUnlocked = existing[0].values[0][2];
      if (!isUnlocked) {
        const newProgress = currentProgress + amount;
        const unlocked = newProgress >= targetCount ? 1 : 0;
        db.run("UPDATE user_achievements SET progress = ?, unlocked = ?, unlocked_at = CASE WHEN ? = 1 THEN datetime('now') ELSE unlocked_at END WHERE user_id = ? AND achievement_id = ?",
          [newProgress, unlocked, unlocked, req.user.id, achievement_id]);

        if (unlocked) {
          // Grant rewards
          if (a[7] > 0) db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [a[7], req.user.id]);
          if (a[8] > 0) db.run("UPDATE users SET xp = xp + ? WHERE id = ?", [a[8], req.user.id]);
          if (a[9] > 0) db.run("UPDATE users SET gems = gems + ? WHERE id = ?", [a[9], req.user.id]);
          if (a[10]) db.run("INSERT OR IGNORE INTO user_customizations (user_id, item_id) VALUES (?, ?)", [req.user.id, a[10]]);
        }

        saveDatabase();
        return res.json({ unlocked: !!unlocked, progress: newProgress });
      }
    } else {
      const newProgress = amount;
      const unlocked = newProgress >= targetCount ? 1 : 0;
      db.run("INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked, unlocked_at) VALUES (?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)",
        [req.user.id, achievement_id, newProgress, unlocked, unlocked]);

      if (unlocked) {
        if (a[7] > 0) db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [a[7], req.user.id]);
        if (a[8] > 0) db.run("UPDATE users SET xp = xp + ? WHERE id = ?", [a[8], req.user.id]);
        if (a[9] > 0) db.run("UPDATE users SET gems = gems + ? WHERE id = ?", [a[9], req.user.id]);
        if (a[10]) db.run("INSERT OR IGNORE INTO user_customizations (user_id, item_id) VALUES (?, ?)", [req.user.id, a[10]]);
      }

      saveDatabase();
      return res.json({ unlocked: !!unlocked, progress: newProgress });
    }

    res.json({ unlocked: false, progress: existing[0].values[0][1] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim achievement reward
router.post('/claim', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { achievement_id } = req.body;

    const achievement = db.exec("SELECT * FROM achievements WHERE id = ?", [achievement_id]);
    if (achievement.length === 0 || achievement[0].values.length === 0) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    const a = achievement[0].values[0];

    const userAchievement = db.exec("SELECT unlocked, claimed FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
      [req.user.id, achievement_id]);
    if (userAchievement.length === 0 || userAchievement[0].values.length === 0) {
      return res.status(400).json({ error: 'Achievement not unlocked' });
    }

    const ua = userAchievement[0].values[0];
    if (!ua[0]) return res.status(400).json({ error: 'Achievement not unlocked yet' });
    if (ua[1]) return res.status(400).json({ error: 'Already claimed' });

    // Grant rewards
    if (a[7] > 0) db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [a[7], req.user.id]);
    if (a[8] > 0) db.run("UPDATE users SET xp = xp + ? WHERE id = ?", [a[8], req.user.id]);
    if (a[9] > 0) db.run("UPDATE users SET gems = gems + ? WHERE id = ?", [a[9], req.user.id]);
    if (a[10]) db.run("INSERT OR IGNORE INTO user_customizations (user_id, item_id) VALUES (?, ?)", [req.user.id, a[10]]);

    db.run("UPDATE user_achievements SET claimed = 1 WHERE user_id = ? AND achievement_id = ?", [req.user.id, achievement_id]);

    saveDatabase();

    const userResult = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = userResult[0]?.values[0] || [0, 0, 0, 1];

    res.json({
      reward: { gold: a[7], xp: a[8], gems: a[9], item: a[10] },
      balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
