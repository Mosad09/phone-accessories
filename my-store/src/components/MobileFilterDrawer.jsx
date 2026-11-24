import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

import FilterPanelContent from "./FilterPanelContent";

const MotionButton = motion.button;
const MotionAside = motion.aside;

function MobileFilterDrawer({
  isOpen,
  onClose,
  categories,
  categoryLabels,
  productCounts,
  selectedCategories,
  minPrice,
  maxPrice,
  priceRange,
  sort,
  inStockOnly,
  onSaleOnly,
  onCategoryToggle,
  onPriceChange,
  onSortChange,
  onToggleInStock,
  onToggleOnSale,
  onClearFilters,
}) {
  const { t, i18n } = useTranslation();
  const sliderRef = useRef(null);
  const sliderInstance = useRef(null);
  const closeButtonRef = useRef(null);
  const scrollLockRef = useRef(0);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    minPrice > 0 ||
    (maxPrice < Infinity && maxPrice < priceRange[1]) ||
    inStockOnly ||
    onSaleOnly ||
    sort !== "default";

  const priceMin = priceRange[0];
  const priceMax = priceRange[1];

  useEffect(() => {
    if (!isOpen || !sliderRef.current || priceMin === priceMax) return undefined;

    if (sliderInstance.current) {
      sliderInstance.current.destroy();
      sliderInstance.current = null;
    }

    const slider = noUiSlider.create(sliderRef.current, {
      start: [
        minPrice > 0 ? minPrice : priceMin,
        maxPrice < Infinity ? maxPrice : priceMax,
      ],
      connect: true,
      range: {
        min: priceMin,
        max: priceMax,
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
  }, [isOpen, priceMin, priceMax, minPrice, maxPrice, onPriceChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    scrollLockRef.current = window.scrollY;
    const { style } = document.body;
    const previous = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = "fixed";
    style.top = `-${scrollLockRef.current}px`;
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = previous.position;
      style.top = previous.top;
      style.width = previous.width;
      style.overflow = previous.overflow;
      window.scrollTo(0, scrollLockRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    closeButtonRef.current?.focus();
  }, [isOpen]);

  const drawer = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="filter-drawer-root"
          dir={i18n.dir()}
          role="presentation"
        >
          <MotionButton
            type="button"
            className="filter-drawer-backdrop"
            onClick={onClose}
            aria-label={t("filters.close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <MotionAside
            className="filter-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("filters.title")}
            onClick={(event) => event.stopPropagation()}
            initial={{ y: "100%", opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
          >
            <div className="filter-drawer-handle" aria-hidden="true"></div>
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
            <div className="filter-drawer-body">
              <FilterPanelContent
                categories={categories}
                categoryLabels={categoryLabels}
                productCounts={productCounts}
                selectedCategories={selectedCategories}
                minPrice={minPrice}
                maxPrice={maxPrice}
                priceRange={priceRange}
                sort={sort}
                inStockOnly={inStockOnly}
                onSaleOnly={onSaleOnly}
                sliderRef={sliderRef}
                hasActiveFilters={hasActiveFilters}
                onCategoryToggle={onCategoryToggle}
                onPriceChange={onPriceChange}
                onSortChange={onSortChange}
                onToggleInStock={onToggleInStock}
                onToggleOnSale={onToggleOnSale}
                onClearFilters={onClearFilters}
              />
            </div>
            <div className="filter-drawer-actions">
              <button
                type="button"
                className="filter-drawer-reset"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
              >
                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>
                {t("filters.reset")}
              </button>
              <button
                type="button"
                className="filter-drawer-apply"
                onClick={onClose}
              >
                {t("filters.apply")}
                <i className="bi bi-check2 ms-1" aria-hidden="true"></i>
              </button>
            </div>
          </MotionAside>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(drawer, document.body);
}

export default MobileFilterDrawer;
