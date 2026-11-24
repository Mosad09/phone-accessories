import { useState, useCallback, useEffect } from "react";

/**
 * Custom hook to sync filter state with URL query parameters.
 */

const DEFAULTS = {
  categories: [],
  minPrice: 0,
  maxPrice: Infinity,
  search: "",
  sort: "default",
  inStockOnly: false,
  onSaleOnly: false,
  page: 1,
  perPage: 12,
};

function parseUrl() {
  const params = new URLSearchParams(window.location.search);

  const categories = params.get("category")
    ? params.get("category").split(",").filter(Boolean)
    : [];

  const minPrice = params.has("min") ? Number(params.get("min")) : DEFAULTS.minPrice;
  const maxPrice = params.has("max") ? Number(params.get("max")) : DEFAULTS.maxPrice;
  const search = params.get("search") || DEFAULTS.search;
  const sort = params.get("sort") || DEFAULTS.sort;
  const inStockOnly = params.get("inStock") === "1";
  const onSaleOnly = params.get("sale") === "1";
  const page = params.has("page") ? Math.max(1, Number(params.get("page"))) : DEFAULTS.page;
  const perPage = params.has("perPage") ? Number(params.get("perPage")) : DEFAULTS.perPage;

  return {
    categories,
    minPrice,
    maxPrice,
    search,
    sort,
    inStockOnly,
    onSaleOnly,
    page,
    perPage,
  };
}

function writeUrl(state) {
  const params = new URLSearchParams();

  if (state.categories.length > 0) {
    params.set("category", state.categories.join(","));
  }
  if (state.minPrice > 0) {
    params.set("min", String(state.minPrice));
  }
  if (state.maxPrice < Infinity && state.maxPrice > 0) {
    params.set("max", String(state.maxPrice));
  }
  if (state.search) {
    params.set("search", state.search);
  }
  if (state.sort && state.sort !== "default") {
    params.set("sort", state.sort);
  }
  if (state.inStockOnly) {
    params.set("inStock", "1");
  }
  if (state.onSaleOnly) {
    params.set("sale", "1");
  }
  if (state.page > 1) {
    params.set("page", String(state.page));
  }
  if (state.perPage !== 12) {
    params.set("perPage", String(state.perPage));
  }

  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

  window.history.replaceState(null, "", newUrl);
}

export default function useUrlState() {
  const [filters, setFilters] = useState(() => parseUrl());

  useEffect(() => {
    writeUrl(filters);
  }, [filters]);

  const updateFilters = useCallback((updates) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };

      const isPageChange = "page" in updates;
      const isPerPageChange = "perPage" in updates;
      if (!isPageChange && !isPerPageChange) {
        next.page = 1;
      }
      if (isPerPageChange) {
        next.page = 1;
      }

      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ ...DEFAULTS });
  }, []);

  return { filters, updateFilters, clearFilters };
}
