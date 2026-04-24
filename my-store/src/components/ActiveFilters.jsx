function ActiveFilters({
  totalResults,
  currentPageResults,
  selectedCategories,
  minPrice,
  maxPrice,
  priceRange,
  search,
  sort,
  onRemoveCategory,
  onClearPrice,
  onClearSearch,
  onClearSort,
  onClearAll,
}) {
  const chips = [];

  // Category chips
  selectedCategories.forEach((cat) => {
    chips.push({
      key: `cat-${cat}`,
      label: cat,
      onRemove: () => onRemoveCategory(cat),
    });
  });

  // Price chip
  if (minPrice > priceRange[0] || (maxPrice < Infinity && maxPrice < priceRange[1])) {
    const label = `EGP ${minPrice} – ${maxPrice < Infinity ? maxPrice : priceRange[1]}`;
    chips.push({
      key: "price",
      label,
      onRemove: onClearPrice,
    });
  }

  // Search chip
  if (search) {
    chips.push({
      key: "search",
      label: `"${search}"`,
      onRemove: onClearSearch,
    });
  }

  // Sort chip
  const sortLabels = {
    "price-asc": "Price: Low → High",
    "price-desc": "Price: High → Low",
    "name-asc": "Name: A → Z",
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
        <span className="results-count-number">{totalResults}</span>
        {totalResults === 1 ? " product" : " products"} found
        {currentPageResults < totalResults && (
          <span className="results-showing"> · Showing {currentPageResults}</span>
        )}
      </div>

      {hasFilters && (
        <div className="filter-chips-row">
          {chips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button
                className="filter-chip-remove"
                onClick={chip.onRemove}
                aria-label={`Remove filter: ${chip.label}`}
              >
                <i className="bi bi-x"></i>
              </button>
            </span>
          ))}
          <button className="clear-all-link" onClick={onClearAll}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

export default ActiveFilters;
