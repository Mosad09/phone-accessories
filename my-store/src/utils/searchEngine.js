/**
 * Smart Search Engine
 * - Multi-field search (name, category, description — English & Arabic)
 * - Case-insensitive + trimmed
 * - Partial matching
 * - Arabic synonym mapping
 * - Price-aware search (using effective discounted price)
 * - Prioritized results (beginning matches rank higher)
 */

import { getLocalizedField } from "./localization";
import { getDiscountPercent, getEffectivePrice, hasDiscount } from "./pricing";

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
  "باور": "power",
  "ساعة": "watch",
  "سماعة بلوتوث": "bluetooth",
};

function expandQuery(query) {
  const lower = query.toLowerCase().trim();
  const terms = [lower];

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

function extractPriceFromQuery(query) {
  const trimmed = query.trim();
  const match = trimmed.match(/^(\d+)$/);
  if (match) return Number(match[1]);
  return null;
}

function scoreProduct(product, terms, priceQuery) {
  let score = 0;
  const name = (product.name || "").toLowerCase();
  const nameAr = (product.nameAr || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  const categoryAr = (product.categoryAr || "").toLowerCase();
  const details = (product.details || product.description || "").toLowerCase();
  const descriptionAr = (product.descriptionAr || "").toLowerCase();
  const effectivePrice = getEffectivePrice(product);

  for (const term of terms) {
    if (!term) continue;

    if (name.startsWith(term)) {
      score += 100;
    } else if (name.includes(term)) {
      score += 60;
    }

    if (nameAr.startsWith(term)) {
      score += 100;
    } else if (nameAr.includes(term)) {
      score += 60;
    }

    if (category.startsWith(term)) {
      score += 50;
    } else if (category.includes(term)) {
      score += 30;
    }

    if (categoryAr.startsWith(term)) {
      score += 50;
    } else if (categoryAr.includes(term)) {
      score += 30;
    }

    if (details.includes(term)) {
      score += 20;
    }

    if (descriptionAr.includes(term)) {
      score += 20;
    }
  }

  if (priceQuery !== null && effectivePrice > 0) {
    const priceDiff = Math.abs(effectivePrice - priceQuery);
    const tolerance = priceQuery * 0.25;
    if (priceDiff <= tolerance) {
      score += 40 - (priceDiff / tolerance) * 30;
    }
  }

  return score;
}

export function searchProducts(products, query) {
  if (!query || !query.trim()) return products;

  const terms = expandQuery(query);
  const priceQuery = extractPriceFromQuery(query);

  const scored = products
    .map((product) => ({
      product,
      score: scoreProduct(product, terms, priceQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.product);
}

export function matchesSearch(product, query) {
  if (!query || !query.trim()) return true;

  const terms = expandQuery(query);
  const priceQuery = extractPriceFromQuery(query);
  return scoreProduct(product, terms, priceQuery) > 0;
}

export function getSuggestions(products, query, limit = 8) {
  if (!query || query.trim().length < 1) return [];

  const terms = expandQuery(query);
  const priceQuery = extractPriceFromQuery(query);
  const lowerQuery = query.toLowerCase().trim();

  const scored = products
    .map((product) => ({
      product,
      score: scoreProduct(product, terms, priceQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ product, score }) => {
    const displayName = getLocalizedField(product, "name");
    const searchNames = [displayName, product.name, product.nameAr].filter(Boolean);
    let highlightedName = { before: displayName, match: "", after: "" };

    for (const candidate of searchNames) {
      const lowerCandidate = candidate.toLowerCase();
      const matchIndex = lowerCandidate.indexOf(lowerQuery);
      if (matchIndex >= 0) {
        highlightedName = {
          before: candidate.slice(0, matchIndex),
          match: candidate.slice(matchIndex, matchIndex + lowerQuery.length),
          after: candidate.slice(matchIndex + lowerQuery.length),
        };
        break;
      }
    }

    return {
      product,
      score,
      highlightedName,
    };
  });
}

/**
 * Apply combined filters: categories, price range, availability, sale, search
 * Then sort results
 */
export function filterAndSort(products, {
  categories = [],
  minPrice = 0,
  maxPrice = Infinity,
  search = "",
  sort = "default",
  inStockOnly = false,
  onSaleOnly = false,
}) {
  let result = [...products];

  // 1. Category filter (multi-select)
  if (categories.length > 0) {
    result = result.filter((p) => categories.includes(p.category));
  }

  // 2. Stock / Sale filters
  if (inStockOnly) {
    result = result.filter((p) => Number(p.stock) > 0);
  }

  if (onSaleOnly) {
    result = result.filter((p) => hasDiscount(p));
  }

  // 3. Price range filter (uses effective price)
  result = result.filter((p) => {
    const effectivePrice = getEffectivePrice(p);
    return effectivePrice >= minPrice && effectivePrice <= maxPrice;
  });

  // 4. Search filter
  if (search && search.trim()) {
    result = searchProducts(result, search);
  }

  // 5. Sort
  switch (sort) {
    case "price-asc":
      result.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
      break;
    case "price-desc":
      result.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
      break;
    case "name-asc":
      result.sort((a, b) =>
        getLocalizedField(a, "name").localeCompare(getLocalizedField(b, "name"))
      );
      break;
    case "discount":
      result.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
      break;
    default:
      break;
  }

  return result;
}
