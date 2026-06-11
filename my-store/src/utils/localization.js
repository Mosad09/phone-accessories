import i18n from "../i18n";

/**
 * Get the localized value of a product field.
 *
 * When Arabic is active, returns the Arabic variant (e.g. nameAr) if available,
 * otherwise falls back to the English field. For English (or any other language),
 * the canonical English field is returned directly.
 *
 * @param {object} product  — the product object
 * @param {string} field    — canonical English field name (e.g. "name", "description", "category")
 * @returns {string}
 */
export function getLocalizedField(product, field) {
  if (!product) return "";
  const lang = i18n.language;

  if (lang === "ar") {
    const arKey = `${field}Ar`;
    return product[arKey] || product[field] || "";
  }

  return product[field] || "";
}
