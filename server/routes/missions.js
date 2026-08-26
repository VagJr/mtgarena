const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

const router = express.Router();

// Get all missions with user progress
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const missions = db.exec("SELECT * FROM missions WHERE active = 1 ORDER BY mission_type, category");
    if (missions.length === 0) return res.json([]);

    const userMissions = db.exec("SELECT mission_id, progress, completed, claimed FROM user_missions WHERE user_id = ?", [req.user.id]);
    const userMap = {};
    if (userMissions.length > 0) {
      for (const row of userMissions[0].values) {
        userMap[row[0]] = { progress: row[1], completed: row[2], claimed: row[3] };
      }
    }

    const result = missions[0].values.map(row => {
      const um = userMap[row[0]] || { progress: 0, completed: 0, claimed: 0 };
      return {
        id: row[0], title: row[1], description: row[2],
        mission_type: row[3], category: row[4], target_count: row[5],
        reward_gold: row[6], reward_xp: row[7], reward_gems: row[8],
        reward_item: row[9], icon: row[10],
        progress: um.progress, completed: um.completed, claimed: um.claimed
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get daily missions only
router.get('/daily', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const missions = db.exec("SELECT * FROM missions WHERE active = 1 AND mission_type = 'daily' ORDER BY category");
    if (missions.length === 0) return res.json([]);

    const userMissions = db.exec("SELECT mission_id, progress, completed, claimed FROM user_missions WHERE user_id = ?", [req.user.id]);
    const userMap = {};
    if (userMissions.length > 0) {
      for (const row of userMissions[0].values) {
        userMap[row[0]] = { progress: row[1], completed: row[2], claimed: row[3] };
      }
    }

    const result = missions[0].values.map(row => {
      const um = userMap[row[0]] || { progress: 0, completed: 0, claimed: 0 };
      return {
        id: row[0], title: row[1], description: row[2],
        mission_type: row[3], category: row[4], target_count: row[5],
        reward_gold: row[6], reward_xp: row[7], reward_gems: row[8],
        icon: row[10],
        progress: um.progress, completed: um.completed, claimed: um.claimed
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get weekly missions only
router.get('/weekly', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const missions = db.exec("SELECT * FROM missions WHERE active = 1 AND mission_type = 'weekly' ORDER BY category");
    if (missions.length === 0) return res.json([]);

    const userMissions = db.exec("SELECT mission_id, progress, completed, claimed FROM user_missions WHERE user_id = ?", [req.user.id]);
    const userMap = {};
    if (userMissions.length > 0) {
      for (const row of userMissions[0].values) {
        userMap[row[0]] = { progress: row[1], completed: row[2], claimed: row[3] };
      }
    }

    const result = missions[0].values.map(row => {
      const um = userMap[row[0]] || { progress: 0, completed: 0, claimed: 0 };
      return {
        id: row[0], title: row[1], description: row[2],
        mission_type: row[3], category: row[4], target_count: row[5],
        reward_gold: row[6], reward_xp: row[7], reward_gems: row[8],
        icon: row[10],
        progress: um.progress, completed: um.completed, claimed: um.claimed
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update mission progress (called by game/engine events)
router.post('/progress', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { category, amount = 1 } = req.body;

    // Find missions matching category
    const missions = db.exec("SELECT id, target_count FROM missions WHERE active = 1 AND category = ?", [category]);
    if (missions.length === 0) return res.json({ updated: 0 });

    let updated = 0;
    for (const row of missions[0].values) {
      const missionId = row[0];
      const target = row[1];

      // Upsert progress
      const existing = db.exec("SELECT id, progress, completed FROM user_missions WHERE user_id = ? AND mission_id = ?",
        [req.user.id, missionId]);

      if (existing.length > 0 && existing[0].values.length > 0) {
        const currentProgress = existing[0].values[0][1];
        const isCompleted = existing[0].values[0][2];
        if (!isCompleted) {
          const newProgress = Math.min(currentProgress + amount, target);
          const completed = newProgress >= target ? 1 : 0;
          db.run("UPDATE user_missions SET progress = ?, completed = ?, completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END WHERE user_id = ? AND mission_id = ?",
            [newProgress, completed, completed, req.user.id, missionId]);
          updated++;
        }
      } else {
        const newProgress = Math.min(amount, target);
        const completed = newProgress >= target ? 1 : 0;
        db.run("INSERT INTO user_missions (user_id, mission_id, progress, completed, completed_at) VALUES (?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)",
          [req.user.id, missionId, newProgress, completed, completed]);
        updated++;
      }
    }

    saveDatabase();
    res.json({ updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim mission reward
router.post('/claim', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const { mission_id } = req.body;

    const mission = db.exec("SELECT * FROM missions WHERE id = ?", [mission_id]);
    if (mission.length === 0 || mission[0].values.length === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const m = mission[0].values[0];

    const userMission = db.exec("SELECT progress, completed, claimed FROM user_missions WHERE user_id = ? AND mission_id = ?",
      [req.user.id, mission_id]);
    if (userMission.length === 0 || userMission[0].values.length === 0) {
      return res.status(400).json({ error: 'Mission not started' });
    }

    const um = userMission[0].values[0];
    if (!um[1]) return res.status(400).json({ error: 'Mission not completed yet' });
    if (um[2]) return res.status(400).json({ error: 'Already claimed' });

    // Grant rewards
    if (m[6] > 0) db.run("UPDATE users SET gold = gold + ? WHERE id = ?", [m[6], req.user.id]);
    if (m[7] > 0) db.run("UPDATE users SET xp = xp + ? WHERE id = ?", [m[7], req.user.id]);
    if (m[8] > 0) db.run("UPDATE users SET gems = gems + ? WHERE id = ?", [m[8], req.user.id]);
    if (m[9]) db.run("INSERT OR IGNORE INTO user_customizations (user_id, item_id) VALUES (?, ?)", [req.user.id, m[9]]);

    db.run("UPDATE user_missions SET claimed = 1 WHERE user_id = ? AND mission_id = ?", [req.user.id, mission_id]);

    saveDatabase();

    const userResult = db.exec("SELECT gold, gems, xp, level FROM users WHERE id = ?", [req.user.id]);
    const row = userResult[0]?.values[0] || [0, 0, 0, 1];

    res.json({
      reward: { gold: m[6], xp: m[7], gems: m[8], item: m[9] },
      balance: { gold: row[0], gems: row[1], xp: row[2], level: row[3] }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset daily missions (called daily by cron or on login)
router.post('/reset-daily', authenticateToken, (req, res) => {
  try {
    const db = req.db;
    const today = new Date().toISOString().split('T')[0];

    // Delete completed daily missions older than today
    db.run(`DELETE FROM user_missions WHERE mission_id IN (SELECT id FROM missions WHERE mission_type = 'daily')`);

    saveDatabase();
    res.json({ success: true, message: 'Daily missions reset' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
