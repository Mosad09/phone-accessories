import { useTranslation } from "react-i18next";
import { formatPrice } from "../utils/pricing";

function ActiveFilters({
  totalResults,
  currentPageResults,
  selectedCategories,
  categoryLabels = {},
  minPrice,
  maxPrice,
  priceRange,
  search,
  sort,
  inStockOnly,
  onSaleOnly,
  onRemoveCategory,
  onClearPrice,
  onClearSearch,
  onClearSort,
  onClearInStock,
  onClearOnSale,
  onClearAll,
}) {
  const { t, i18n } = useTranslation();
  const chips = [];

  selectedCategories.forEach((cat) => {
    chips.push({
      key: `cat-${cat}`,
      label: categoryLabels[cat] || cat,
      onRemove: () => onRemoveCategory(cat),
    });
  });

  if (minPrice > priceRange[0] || (maxPrice < Infinity && maxPrice < priceRange[1])) {
    const label = `${t("navbar.currency")} ${formatPrice(minPrice, i18n.language)} – ${formatPrice(maxPrice < Infinity ? maxPrice : priceRange[1], i18n.language)}`;
    chips.push({
      key: "price",
      label,
      onRemove: onClearPrice,
    });
  }

  if (inStockOnly && onClearInStock) {
    chips.push({
      key: "inStock",
      label: t("filters.in_stock_only"),
      onRemove: onClearInStock,
    });
  }

  if (onSaleOnly && onClearOnSale) {
    chips.push({
      key: "onSale",
      label: t("filters.on_sale_only"),
      onRemove: onClearOnSale,
    });
  }

  if (search) {
    chips.push({
      key: "search",
      label: `"${search}"`,
      onRemove: onClearSearch,
    });
  }

  const sortLabels = {
    "price-asc": t("filters.sort_price_asc"),
    "price-desc": t("filters.sort_price_desc"),
    "discount": t("filters.sort_discount"),
    "name-asc": t("filters.sort_name_asc"),
  };
  if (sort && sort !== "default") {
    chips.push({
      key: "sort",
      label: sortLabels[sort] || sort,
      onRemove: onClearSort,
    });
  }

  const hasFilters = chips.length > 0;

  return (
    <div className="active-filters-bar">
      <div className="results-count">
        <span className="results-count-number">{totalResults}</span>{" "}
        {totalResults === 1 ? t("filters.results_one") : t("filters.results_other")}
        {currentPageResults < totalResults && (
          <span className="results-showing"> · {t("filters.showing", { count: currentPageResults })}</span>
        )}
      </div>

      {hasFilters && (
        <div className="filter-chips-row">
          {chips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button
                type="button"
                className="filter-chip-remove"
                onClick={chip.onRemove}
                aria-label={`${t("cart.remove")}: ${chip.label}`}
              >
                <i className="bi bi-x"></i>
              </button>
            </span>
          ))}
          <button type="button" className="clear-all-link" onClick={onClearAll}>
            {t("filters.clear_all")}
          </button>
        </div>
      )}
    </div>
  );
}

export default ActiveFilters;
