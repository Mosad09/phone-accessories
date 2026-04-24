import { useEffect, useRef } from "react";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

function FilterSidebar({
  categories,        // string[] — all available categories
  productCounts,     // { [category]: number } — count per category
  selectedCategories,// string[] — currently selected
  minPrice,
  maxPrice,
  priceRange,        // [absoluteMin, absoluteMax]
  sort,
  onCategoryToggle,
  onPriceChange,
  onSortChange,
  onClearFilters,
  isMobile,
  isOpen,
  onClose,
}) {
  const sliderRef = useRef(null);
  const sliderInstance = useRef(null);

  // ───── noUiSlider Setup ─────
  useEffect(() => {
    if (!sliderRef.current || priceRange[0] === priceRange[1]) return;

    // Destroy previous instance if exists
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
    // Only re-create when priceRange changes (products load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange[0], priceRange[1]]);

  // Update slider positions when external state changes (e.g. clear filters)
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

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    minPrice > 0 ||
    (maxPrice < Infinity && maxPrice < priceRange[1]) ||
    sort !== "default";

  const sidebarContent = (
    <>
      {/* ─── Sort ─── */}
      <div className="filter-section">
        <h6 className="filter-section-title">
          <i className="bi bi-sort-down me-2"></i>Sort By
        </h6>
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="default">Relevance</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="name-asc">Name: A → Z</option>
        </select>
      </div>

      {/* ─── Categories ─── */}
      <div className="filter-section">
        <h6 className="filter-section-title">
          <i className="bi bi-grid me-2"></i>Category
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
              <span className="filter-checkbox-label">{cat}</span>
              <span className="filter-checkbox-count">
                {productCounts[cat] || 0}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ─── Price Range ─── */}
      <div className="filter-section">
        <h6 className="filter-section-title">
          <i className="bi bi-cash me-2"></i>Price Range
        </h6>
        <div className="price-slider-wrapper">
          <div ref={sliderRef} className="price-slider-el"></div>
        </div>
        <div className="price-labels">
          <span>EGP {priceRange[0]}</span>
          <span>EGP {priceRange[1]}</span>
        </div>
      </div>

      {/* ─── Clear ─── */}
      {hasActiveFilters && (
        <button className="clear-filters-btn" onClick={onClearFilters}>
          <i className="bi bi-x-circle me-1"></i>Clear All Filters
        </button>
      )}
    </>
  );

  // ─── Mobile Drawer ───
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="filter-drawer-overlay" onClick={onClose}></div>
        )}
        <aside className={`filter-drawer ${isOpen ? "open" : ""}`}>
          <div className="filter-drawer-header">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-funnel me-2"></i>Filters
            </h5>
            <button className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="filter-drawer-body">{sidebarContent}</div>
        </aside>
      </>
    );
  }

  // ─── Desktop Sidebar ───
  return (
    <aside className="filter-sidebar">{sidebarContent}</aside>
  );
}

export default FilterSidebar;
