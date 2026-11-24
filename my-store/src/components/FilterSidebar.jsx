import { useEffect, useRef } from "react";

import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

import FilterPanelContent from "./FilterPanelContent";

function FilterSidebar({
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
  const sliderRef = useRef(null);
  const sliderInstance = useRef(null);

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

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    minPrice > 0 ||
    (maxPrice < Infinity && maxPrice < priceRange[1]) ||
    inStockOnly ||
    onSaleOnly ||
    sort !== "default";

  return (
    <aside className="filter-sidebar">
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
    </aside>
  );
}

export default FilterSidebar;
