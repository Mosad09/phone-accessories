import { useEffect, useState, useMemo, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import FilterSidebar from "./components/FilterSidebar";
import ActiveFilters from "./components/ActiveFilters";
import Pagination from "./components/Pagination";
import useUrlState from "./hooks/useUrlState";
import { filterAndSort } from "./utils/searchEngine";
import Papa from "papaparse";
import { auth } from "./utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Profile from "./components/Profile";
import Orders from "./components/Orders";
import { syncUser, createOrder } from "./services/db";
function App() {
  // ================= STATE =================
  const [products, setProducts] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("home");

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  // ================= URL STATE =================
  const { filters, updateFilters, clearFilters } = useUrlState();

  // ================= RESPONSIVE =================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ================= AUTH =================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const syncedUser = await syncUser(currentUser);
          setDbUser(syncedUser);
        } catch (err) {
          console.error("Error syncing user:", err);
          setDbUser({ name: currentUser.displayName, email: currentUser.email });
        }
      } else {
        setDbUser(null);
        setCurrentPage("home");
      }
    });
    return unsub;
  }, []);

  // ================= FETCH =================
  const fetchData = () => {
    setLoading(true);
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoSuf820fkc_ob9BS2_zhqJhlwT7pk-2Zlb_S_CWZHqlKI_S7FV_TaBDS_u5ce8qa85mW0sea92BJ_/pub?output=csv";
    
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedProducts = results.data.map((item, index) => ({
          id: item.id || `product-${index}`,
          name: item["Product Name"],
          price: parseFloat(item["Price"]) || 0,
          image: item["Image"],
          category: item["category"],
          details: item["Details"],
        }));
        setProducts(parsedProducts);
        setLoading(false);
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        setLoading(false);
      },
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================= SAVE CART =================
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // ================= DERIVED DATA =================
  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  const priceRange = useMemo(() => {
    if (products.length === 0) return [0, 1000];
    const prices = products.map((p) => p.price).filter(Boolean);
    return [Math.min(...prices), Math.max(...prices)];
  }, [products]);

  const productCounts = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // ================= FILTERED + SORTED =================
  const filteredProducts = useMemo(() => {
    return filterAndSort(products, {
      categories: filters.categories,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      search: filters.search,
      sort: filters.sort,
    });
  }, [products, filters.categories, filters.minPrice, filters.maxPrice, filters.search, filters.sort]);

  // ================= PAGINATION =================
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / filters.perPage));
  const safePage = Math.min(filters.page, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * filters.perPage;
    return filteredProducts.slice(start, start + filters.perPage);
  }, [filteredProducts, safePage, filters.perPage]);

  // ================= CART LOGIC =================
  const [cartPulse, setCartPulse] = useState(false);

  const addToCart = (product) => {
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 300);

    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQuantity = (id, newQty) => {
    setCart((prev) =>
      prev.map((p) => (p.id === id ? { ...p, qty: newQty } : p))
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const handleCheckout = async () => {
    if (!user) {
      alert("Please sign in to place an order.");
      return;
    }

    const hasAddress = typeof dbUser?.address === 'object' 
      ? (dbUser.address.governorate && dbUser.address.city && dbUser.address.detail)
      : !!dbUser?.address;

    if (!hasAddress || !dbUser?.phone) {
      alert("Please update your profile with your delivery address and phone number before checking out.");
      setShowCart(false);
      setCurrentPage("profile");
      return;
    }

    try {
      const orderData = {
        userId: user.uid,
        userName: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        address: dbUser.address,
        items: cart,
        totalPrice: totalPrice
      };
      
      await createOrder(orderData);
      setCart([]);
      setShowCart(false);
      setCurrentPage("orders");
      alert("Order placed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to place order. Please try again.");
    }
  };

  // ================= FILTER HANDLERS =================
  const handleCategoryToggle = useCallback(
    (cat) => {
      const current = filters.categories;
      const updated = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      updateFilters({ categories: updated });
    },
    [filters.categories, updateFilters]
  );

  const handlePriceChange = useCallback(
    (min, max) => {
      updateFilters({ minPrice: min, maxPrice: max });
    },
    [updateFilters]
  );

  const handleSortChange = useCallback(
    (sort) => {
      updateFilters({ sort });
    },
    [updateFilters]
  );

  const handleSearchChange = useCallback(
    (search) => {
      updateFilters({ search });
    },
    [updateFilters]
  );

  const handlePageChange = useCallback(
    (page) => {
      updateFilters({ page });
    },
    [updateFilters]
  );

  const handlePerPageChange = useCallback(
    (perPage) => {
      updateFilters({ perPage });
    },
    [updateFilters]
  );

  // ================= ACTIVE FILTER REMOVAL =================
  const handleRemoveCategory = useCallback(
    (cat) => {
      updateFilters({
        categories: filters.categories.filter((c) => c !== cat),
      });
    },
    [filters.categories, updateFilters]
  );

  const handleClearPrice = useCallback(() => {
    updateFilters({ minPrice: 0, maxPrice: Infinity });
  }, [updateFilters]);

  const handleClearSearch = useCallback(() => {
    updateFilters({ search: "" });
  }, [updateFilters]);

  const handleClearSort = useCallback(() => {
    updateFilters({ sort: "default" });
  }, [updateFilters]);

  // ================= CHECK ACTIVE FILTERS (for hero visibility) =================
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minPrice > 0 ||
    (filters.maxPrice < Infinity && filters.maxPrice < priceRange[1]) ||
    filters.search ||
    (filters.sort && filters.sort !== "default");

  // ================= UI =================
  return (
    <div>
      {/* NAVBAR */}
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + item.qty, 0)}
        search={filters.search}
        onSearchChange={handleSearchChange}
        toggleCart={() => setShowCart(!showCart)}
        cartPulse={cartPulse}
        products={products}
        onToggleFilters={() => setShowMobileFilters(!showMobileFilters)}
        isMobile={isMobile}
        user={user}
        dbUser={dbUser}
        navigate={setCurrentPage}
      />

      {/* CART DRAWER */}
      {showCart && (
        <Cart
          cart={cart}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          closeCart={() => setShowCart(false)}
          totalPrice={totalPrice}
          handleCheckout={handleCheckout}
        />
      )}

      {currentPage === "profile" ? (
        <Profile user={user} dbUser={dbUser} setDbUser={setDbUser} />
      ) : currentPage === "orders" ? (
        <Orders user={user} navigate={setCurrentPage} />
      ) : (
        <div className="container mt-4">
        {/* HERO SECTION */}
        {!hasActiveFilters && (
          <div className="hero-section text-center px-4">
            <h1 className="fw-bold mb-3 display-4">Discover Premium Tech.</h1>
            <p className="lead opacity-75 mb-4 max-w-md mx-auto">
              Elevate your device experience with our curated selection of
              high-quality cases, chargers, and audio gear.
            </p>
            <button
              className="btn btn-light rounded-pill px-4 py-2 fw-semibold shadow-sm"
              onClick={() =>
                window.scrollTo({ top: 400, behavior: "smooth" })
              }
            >
              Shop Now <i className="bi bi-arrow-down ms-1"></i>
            </button>
          </div>
        )}

        {/* SHOP LAYOUT */}
        <div className="shop-layout">
          {/* FILTER SIDEBAR */}
          <FilterSidebar
            categories={categories}
            productCounts={productCounts}
            selectedCategories={filters.categories}
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            priceRange={priceRange}
            sort={filters.sort}
            onCategoryToggle={handleCategoryToggle}
            onPriceChange={handlePriceChange}
            onSortChange={handleSortChange}
            onClearFilters={clearFilters}
            isMobile={isMobile}
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
          />

          {/* MAIN CONTENT */}
          <main className="shop-main">
            {/* ACTIVE FILTERS BAR */}
            <ActiveFilters
              totalResults={filteredProducts.length}
              currentPageResults={paginatedProducts.length}
              selectedCategories={filters.categories}
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              priceRange={priceRange}
              search={filters.search}
              sort={filters.sort}
              onRemoveCategory={handleRemoveCategory}
              onClearPrice={handleClearPrice}
              onClearSearch={handleClearSearch}
              onClearSort={handleClearSort}
              onClearAll={clearFilters}
            />

            {/* PRODUCTS GRID */}
            {loading ? (
              <div className="row">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="col-12 col-sm-6 col-md-4 col-lg-4 mb-4"
                  >
                    <div className="skeleton skeleton-card"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {paginatedProducts.length === 0 ? (
                  <div className="text-center py-5">
                    <i
                      className="bi bi-search text-muted-custom"
                      style={{ fontSize: "3rem" }}
                    ></i>
                    <h4 className="mt-3 text-muted-custom">
                      No products found.
                    </h4>
                    <p className="text-muted-custom opacity-75">
                      Try adjusting your search or filters.
                    </p>
                    {hasActiveFilters && (
                      <button
                        className="btn btn-outline-custom mt-2"
                        onClick={clearFilters}
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="row product-grid-animated">
                    {paginatedProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        addToCart={addToCart}
                      />
                    ))}
                  </div>
                )}

                {/* PAGINATION */}
                {filteredProducts.length > 0 && (
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    perPage={filters.perPage}
                    onPageChange={handlePageChange}
                    onPerPageChange={handlePerPageChange}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
      )}
    </div>
  );
}

export default App;