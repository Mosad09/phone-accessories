const express = require("express");
const router = express.Router();
const db = require("../db/database");
const { verifyToken } = require("../middleware/authMiddleware");

// Get current user profile
router.get("/me", verifyToken, (req, res) => {
  const uid = req.user.uid;
  db.get(`SELECT * FROM users WHERE id = ?`, [uid], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(row);
  });
});

// Update user profile
router.put("/me", verifyToken, (req, res) => {
  const uid = req.user.uid;
  const { name, phone, city, street, building } = req.body;

  db.run(
    `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), city = COALESCE(?, city), street = COALESCE(?, street), building = COALESCE(?, building) WHERE id = ?`,
    [name, phone, city, street, building, uid],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Fetch updated user
      db.get(`SELECT * FROM users WHERE id = ?`, [uid], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Could not fetch updated user" });
        res.json(row);
      });
    }
  );
});

module.exports = router;
