import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const MotionDiv = motion.div;

const sectionVariants = {
  open: { height: "auto", opacity: 1 },
  collapsed: { height: 0, opacity: 0 },
};

const PRICE_PRESETS = [
  { id: "under-100", min: 0, max: 100, labelKey: "filters.price_under_100" },
  { id: "100-250", min: 100, max: 250, labelKey: "filters.price_100_250" },
  { id: "250-500", min: 250, max: 500, labelKey: "filters.price_250_500" },
  { id: "500-1000", min: 500, max: 1000, labelKey: "filters.price_500_1000" },
  { id: "above-1000", min: 1000, max: Infinity, labelKey: "filters.price_above_1000" },
];

function FilterPanelContent({
  categories,
  categoryLabels,
  productCounts,
  selectedCategories,
  minPrice,
  maxPrice,
  priceRange,
  sort,
  inStockOnly = false,
  onSaleOnly = false,
  sliderRef,
  hasActiveFilters,
  onCategoryToggle,
  onPriceChange,
  onSortChange,
  onToggleInStock,
  onToggleOnSale,
  onClearFilters,
  className = "",
}) {
  const { t, i18n } = useTranslation();
  const [openSections, setOpenSections] = useState({
    sort: true,
    categories: true,
    price: true,
    availability: true,
  });

  const formatPriceLabel = (value) =>
    `${t("navbar.currency")} ${Number(value).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-EG")}`;

  const selectedPresetId = useMemo(() => {
    const currentMin = minPrice > 0 ? Number(minPrice) : 0;
    const currentMax = maxPrice < Infinity ? Number(maxPrice) : Infinity;
    return PRICE_PRESETS.find((preset) => preset.min === currentMin && preset.max === currentMax)?.id || "";
  }, [minPrice, maxPrice]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderSection = (id, icon, title, children) => {
    const isOpen = openSections[id];
    return (
      <section className="filter-section">
        <button
          type="button"
          className="filter-section-toggle"
          onClick={() => toggleSection(id)}
          aria-expanded={isOpen}
          aria-controls={`filter-section-${id}`}
        >
          <span className="filter-section-title">
            <i className={`bi ${icon} me-2`} aria-hidden="true"></i>
            {title}
          </span>
          <i className={`bi bi-chevron-down filter-section-chevron ${isOpen ? "is-open" : ""}`} aria-hidden="true"></i>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <MotionDiv
              id={`filter-section-${id}`}
              className="filter-section-content"
              variants={sectionVariants}
              initial="collapsed"
              animate="open"
              exit="collapsed"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </MotionDiv>
          )}
        </AnimatePresence>
      </section>
    );
  };

  return (
    <div className={className}>
      {renderSection("sort", "bi-sort-down", t("filters.sort_by"), (
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label={t("filters.sort_by")}
        >
          <option value="default">{t("filters.sort_relevance")}</option>
          <option value="price-asc">{t("filters.sort_price_asc")}</option>
          <option value="price-desc">{t("filters.sort_price_desc")}</option>
          <option value="discount">{t("filters.sort_discount")}</option>
          <option value="name-asc">{t("filters.sort_name_asc")}</option>
        </select>
      ))}

      {renderSection("availability", "bi-stars", t("filters.availability"), (
        <div className="filter-checkbox-list">
          <label className="filter-checkbox-row">
            <input
              type="checkbox"
              className="filter-checkbox-input"
              checked={Boolean(inStockOnly)}
              onChange={() => onToggleInStock?.(!inStockOnly)}
            />
            <span className="filter-checkbox-label">{t("filters.in_stock_only")}</span>
          </label>
          <label className="filter-checkbox-row">
            <input
              type="checkbox"
              className="filter-checkbox-input"
              checked={Boolean(onSaleOnly)}
              onChange={() => onToggleOnSale?.(!onSaleOnly)}
            />
            <span className="filter-checkbox-label">{t("filters.on_sale_only")}</span>
          </label>
        </div>
      ))}

      {renderSection("categories", "bi-grid", t("filters.categories"), (
        <div className="filter-checkbox-list">
          {categories.map((cat) => (
            <label key={cat} className="filter-checkbox-row">
              <input
                type="checkbox"
                className="filter-checkbox-input"
                checked={selectedCategories.includes(cat)}
                onChange={() => onCategoryToggle(cat)}
              />
              <span className="filter-checkbox-label">{categoryLabels?.[cat] || cat}</span>
              <span className="filter-checkbox-count">
                {productCounts[cat] || 0}
              </span>
            </label>
          ))}
        </div>
      ))}

      {renderSection("price", "bi-cash", t("filters.price_range"), (
        <>
          <div className="price-preset-grid" role="radiogroup" aria-label={t("filters.quick_selection")}>
            {PRICE_PRESETS.map((preset) => {
              const presetMax = preset.max === Infinity ? priceRange[1] : Math.min(preset.max, priceRange[1]);
              const isDisabled = preset.min > priceRange[1] || presetMax < priceRange[0];
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`price-preset-btn ${isSelected ? "active" : ""}`}
                  onClick={() => onPriceChange(Math.max(preset.min, priceRange[0]), preset.max === Infinity ? Infinity : presetMax)}
                  disabled={isDisabled}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="price-preset-check" aria-hidden="true">
                    {isSelected && <i className="bi bi-check"></i>}
                  </span>
                  {t(preset.labelKey)}
                </button>
              );
            })}
          </div>
          <div className="advanced-price-label">{t("filters.advanced_slider")}</div>
          <div className="price-slider-wrapper">
            <div ref={sliderRef} className="price-slider-el"></div>
          </div>
          <div className="price-labels">
            <span>{formatPriceLabel(priceRange[0])}</span>
            <span>{formatPriceLabel(priceRange[1])}</span>
          </div>
        </>
      ))}

      {hasActiveFilters && (
        <button type="button" className="clear-filters-btn" onClick={onClearFilters}>
          <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
          {t("filters.clear_all")}
        </button>
      )}
    </div>
  );
}

export default FilterPanelContent;
