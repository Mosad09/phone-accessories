/**
 * Smart Search Engine
 * - Multi-field search (name, category, details)
 * - Case-insensitive + trimmed
 * - Partial matching
 * - Arabic synonym mapping
 * - Price-aware search
 * - Prioritized results (beginning matches rank higher)
 */

// ───── Synonym Map (Arabic → English) ─────
const SYNONYMS = {
  "سماعات": "headphone",
  "سماعه": "headphone",
  "سماعة": "headphone",
  "كابل": "cable",
  "كابلات": "cable",
  "شاحن": "charger",
  "غطاء": "cover",
  "جراب": "cover",
  "كفر": "cover",
  "كڤر": "cover",
};

/**
 * Expand query with synonyms
 */
function expandQuery(query) {
  const lower = query.toLowerCase().trim();
  const terms = [lower];

  // Check each synonym
  for (const [arabic, english] of Object.entries(SYNONYMS)) {
    if (lower.includes(arabic)) {
      terms.push(english);
    }
    if (lower.includes(english)) {
      terms.push(arabic);
    }
  }

  return [...new Set(terms)];
}

/**
 * Check if query looks like a price number
 */
function extractPriceFromQuery(query) {
  const trimmed = query.trim();
  const match = trimmed.match(/^(\d+)$/);
  if (match) return Number(match[1]);
  return null;
}

/**
 * Score a product against search terms
 * Higher score = better match
 */
function scoreProduct(product, terms, priceQuery) {
  let score = 0;
  const name = (product.name || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  const details = (product.details || "").toLowerCase();

  for (const term of terms) {
    if (!term) continue;

    // Name matches (highest priority)
    if (name.startsWith(term)) {
      score += 100; // Starts with = highest rank
    } else if (name.includes(term)) {
      score += 60;
    }

    // Category matches
    if (category.startsWith(term)) {
      score += 50;
    } else if (category.includes(term)) {
      score += 30;
    }

    // Details matches
    if (details.includes(term)) {
      score += 20;
    }
  }

  // Price-aware: if query is a number, boost products near that price
  if (priceQuery !== null && product.price) {
    const priceDiff = Math.abs(product.price - priceQuery);
    const tolerance = priceQuery * 0.25; // ±25%
    if (priceDiff <= tolerance) {
      score += 40 - (priceDiff / tolerance) * 30; // Closer = higher score
    }
  }

  return score;
}

/**
 * Search & filter products
 * Returns filtered + scored + sorted results
 */
export function searchProducts(products, query) {
  if (!query || !query.trim()) return products;

  const terms = expandQuery(query);
  const priceQuery = extractPriceFromQuery(query);

  const scored = products
    .map(product => ({
      product,
      score: scoreProduct(product, terms, priceQuery),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(item => item.product);
}

/**
 * Check if a single product matches the search query
 * (used for filtering the full product list)
 */
export function matchesSearch(product, query) {
  if (!query || !query.trim()) return true;

  const terms = expandQuery(query);
  const priceQuery = extractPriceFromQuery(query);
  return scoreProduct(product, terms, priceQuery) > 0;
}

/**
 * Generate search suggestions
 * Returns top N results with highlighted match info
 */
export function getSuggestions(products, query, limit = 8) {
  if (!query || query.trim().length < 1) return [];

  const terms = expandQuery(query);
  const priceQuery = extractPriceFromQuery(query);
  const lowerQuery = query.toLowerCase().trim();

  const scored = products
    .map(product => {
      const score = scoreProduct(product, terms, priceQuery);
      return { product, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ product, score }) => {
    // Find where to highlight in the name
    const name = product.name || "";
    const lowerName = name.toLowerCase();
    const matchIndex = lowerName.indexOf(lowerQuery);

    let highlightedName;
    if (matchIndex >= 0) {
      const before = name.slice(0, matchIndex);
      const match = name.slice(matchIndex, matchIndex + lowerQuery.length);
      const after = name.slice(matchIndex + lowerQuery.length);
      highlightedName = { before, match, after };
    } else {
      highlightedName = { before: name, match: "", after: "" };
    }

    return {
      product,
      score,
      highlightedName,
    };
  });
}

/**
 * Apply combined filters: categories, price range, search
 * Then sort results
 */
export function filterAndSort(products, {
  categories = [],
  minPrice = 0,
  maxPrice = Infinity,
  search = "",
  sort = "default",
}) {
  let result = [...products];

  // 1. Category filter (multi-select)
  if (categories.length > 0) {
    result = result.filter(p =>
      categories.includes(p.category)
    );
  }

  // 2. Price range filter
  result = result.filter(p =>
    p.price >= minPrice && p.price <= maxPrice
  );

  // 3. Search filter (with smart matching)
  if (search && search.trim()) {
    result = searchProducts(result, search);
  }

  // 4. Sort
  switch (sort) {
    case "price-asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;
    default:
      // If searching, keep relevance order from searchProducts
      break;
  }

  return result;
}
