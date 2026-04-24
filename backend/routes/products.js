const express = require("express");
const router = express.Router();
const axios = require("axios");

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoSuf820fkc_ob9BS2_zhqJhlwT7pk-2Zlb_S_CWZHqlKI_S7FV_TaBDS_u5ce8qa85mW0sea92BJ_/pub?output=csv";

// In-memory cache for products to avoid fetching Google sheets on every request
let productsCache = [];
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

const fetchProducts = async () => {
  if (Date.now() - lastFetchTime < CACHE_TTL && productsCache.length > 0) {
    return productsCache;
  }

  try {
    const res = await axios.get(SHEET_URL);
    const data = res.data;
    const rows = data.split("\n").slice(1); // skip header line

    const result = rows.map((row, index) => {
      const parts = row.split(",");
      const name = parts[0];
      const price = parts[1];
      const image = parts[2];
      const category = parts[3];
      const details = parts.slice(4).join(",");

      return {
        id: `prod-${index}`,
        name: name?.trim(),
        price: Number(price?.trim()),
        image: image?.trim(),
        category: category?.trim(),
        details: details?.trim(),
      };
    }).filter(p => p.name); // basic validation

    productsCache = result;
    lastFetchTime = Date.now();
    return result;
  } catch (error) {
    console.error("Error fetching products:", error.message);
    if (productsCache.length > 0) return productsCache; // stale fallback
    throw error;
  }
};

router.get("/", async (req, res) => {
  try {
    const products = await fetchProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const products = await fetchProducts();
    const product = products.find(p => p.id === req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

module.exports = router;
