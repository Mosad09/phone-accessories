import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

function FilterSidebar({
  categories,
  categoryLabels,
  productCounts,
  selectedCategories,
  minPrice,
  maxPrice,
  priceRange,
  sort,
  onCategoryToggle,
  onPriceChange,
  onSortChange,
  onClearFilters,
  isMobile,
  isOpen,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const sliderRef = useRef(null);
  const sliderInstance = useRef(null);
  const closeButtonRef = useRef(null);
  useEffect(() => {
    if (!sliderRef.current || priceRange[0] === priceRange[1]) return;

    if (sliderInstance.current) {
      sliderInstance.current.destroy();
      sliderInstance.current = null;
    }

    const slider = noUiSlider.create(sliderRef.current, {
      start: [
        minPrice > 0 ? minPrice : priceRange[0],
        maxPrice < Infinity ? maxPrice : priceRange[1],
      ],
      connect: true,
      range: {
        min: priceRange[0],
        max: priceRange[1],
      },
      step: 5,
      tooltips: [
        { to: (v) => `${Math.round(v)}` },
        { to: (v) => `${Math.round(v)}` },
      ],
      format: {
        to: (v) => Math.round(v),
        from: (v) => Number(v),
      },
    });

    slider.on("change", (values) => {
      onPriceChange(values[0], values[1]);
    });

    sliderInstance.current = slider;

    return () => {
      if (sliderInstance.current) {
        sliderInstance.current.destroy();
        sliderInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange[0], priceRange[1]]);

  useEffect(() => {
    if (sliderInstance.current) {
      const currentValues = sliderInstance.current.get();
      const newMin = minPrice > 0 ? minPrice : priceRange[0];
      const newMax = maxPrice < Infinity ? maxPrice : priceRange[1];
      if (currentValues[0] !== newMin || currentValues[1] !== newMax) {
        sliderInstance.current.set([newMin, newMax]);
      }
    }
  }, [minPrice, maxPrice, priceRange]);

  useEffect(() => {
    if (!isMobile || !isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (!isMobile || !isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isOpen, onClose]);

  useEffect(() => {
    if (!isMobile || !isOpen) return undefined;
    closeButtonRef.current?.focus();
  }, [isMobile, isOpen]);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    minPrice > 0 ||
    (maxPrice < Infinity && maxPrice < priceRange[1]) ||
    sort !== "default";

  const formatPriceLabel = (value) =>
    `${t("navbar.currency")} ${Number(value).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-EG")}`;

  const sidebarContent = (
    <>
      <div className="filter-section">
        <h6 className="filter-section-title">
          <i className="bi bi-sort-down me-2" aria-hidden="true"></i>
          {t("filters.sort_by")}
        </h6>
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label={t("filters.sort_by")}
        >
          <option value="default">{t("filters.sort_relevance")}</option>
          <option value="price-asc">{t("filters.sort_price_asc")}</option>
          <option value="price-desc">{t("filters.sort_price_desc")}</option>
          <option value="name-asc">{t("filters.sort_name_asc")}</option>
        </select>
      </div>

      <div className="filter-section">
        <h6 className="filter-section-title">
          <i className="bi bi-grid me-2" aria-hidden="true"></i>
          {t("filters.categories")}
        </h6>
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
      </div>

      <div className="filter-section">
        <h6 className="filter-section-title">
          <i className="bi bi-cash me-2" aria-hidden="true"></i>
          {t("filters.price_range")}
        </h6>
        <div className="price-slider-wrapper">
          <div ref={sliderRef} className="price-slider-el"></div>
        </div>
        <div className="price-labels">
          <span>{formatPriceLabel(priceRange[0])}</span>
          <span>{formatPriceLabel(priceRange[1])}</span>
        </div>
      </div>

      {hasActiveFilters && (
        <button type="button" className="clear-filters-btn" onClick={onClearFilters}>
          <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
          {t("filters.clear_all")}
        </button>
      )}
    </>
  );

  if (isMobile) {
    const mobileDrawer = (
      <>
        <div
          className={`filter-drawer-overlay ${isOpen ? "open" : ""}`}
          onClick={onClose}
          aria-hidden={!isOpen}
          tabIndex={isOpen ? -1 : undefined}
        />
        <aside
          className={`filter-drawer ${isOpen ? "open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={t("filters.title")}
          aria-hidden={!isOpen}
        >
          <div className="filter-drawer-header">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-funnel me-2" aria-hidden="true"></i>
              {t("filters.title")}
            </h5>
            <button
              ref={closeButtonRef}
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label={t("filters.close")}
            />
          </div>
          <div className="filter-drawer-body">{sidebarContent}</div>
        </aside>
      </>
    );

    return createPortal(mobileDrawer, document.body);
  }

  return (
    <aside className="filter-sidebar">{sidebarContent}</aside>
  );
}

export default FilterSidebar;
