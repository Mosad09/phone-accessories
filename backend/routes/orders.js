const express = require("express");
const router = express.Router();
const db = require("../db/database");
const { verifyToken } = require("../middleware/authMiddleware");

// Post an order (Checkout)
router.post("/", verifyToken, (req, res) => {
  const uid = req.user.uid;
  const { products, totalPrice, address } = req.body;
  const orderId = "ORD-" + Date.now() + Math.floor(Math.random() * 1000);

  // address is expected to be an object: { city, street, building }
  // products is expected to be an array of objects
  db.run(
    `INSERT INTO orders (id, userId, products, totalPrice, status, address) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      uid,
      JSON.stringify(products),
      totalPrice,
      "Pending (Cash on Delivery)",
      JSON.stringify(address)
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ 
        message: "Order placed successfully", 
        orderId, 
        status: "Pending (Cash on Delivery)" 
      });
    }
  );
});

// Get user's orders
router.get("/", verifyToken, (req, res) => {
  const uid = req.user.uid;
  db.all(`SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC`, [uid], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Parse JSON strings back to objects
    const parsedRows = rows.map(r => ({
      ...r,
      products: JSON.parse(r.products || "[]"),
      address: JSON.parse(r.address || "{}")
    }));
    
    res.json(parsedRows);
  });
});

module.exports = router;
