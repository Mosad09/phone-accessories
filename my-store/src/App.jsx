import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";

import AnnouncementBar from "./components/AnnouncementBar";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import ProductDetailPage from "./components/ProductDetailPage";
import CartPage from "./components/CartPage";
import WishlistPage from "./components/WishlistPage";
import FilterSidebar from "./components/FilterSidebar";
import MobileFilterDrawer from "./components/MobileFilterDrawer";
import ActiveFilters from "./components/ActiveFilters";
import Pagination from "./components/Pagination";
import QuickViewModal from "./components/QuickViewModal";
import CompareModal from "./components/CompareModal";
import TrustBadges from "./components/TrustBadges";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import useUrlState from "./hooks/useUrlState";
import { filterAndSort } from "./utils/searchEngine";
import { auth } from "./utils/firebase";
import { onAuthStateChanged } from "@firebase/auth";
import Profile from "./components/Profile";
import Orders from "./components/Orders";
import { syncUser, updateUserProfile } from "./services/db";
import {
  subscribeToProducts,
  saveOrderToFirestore,
  isUserAdmin,
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./services/firestoreService";
import { toTitleCase } from "./utils/textUtils";
import { getLocalizedField } from "./utils/localization";
import {
  buildCartItemKey,
  formatPrice,
  getCartItemKey,
  getDiscountPercent,
  getEffectivePrice,
  getOriginalPrice,
  hasDiscount,
} from "./utils/pricing";
import { useTranslation } from "react-i18next";

const AdminPanel = lazy(() => import("./components/admin/AdminPanel"));
const MotionSection = motion.section;
const MotionDiv = motion.div;

const getPageFromPath = (pathname) => {
  const normalized = pathname.replace(/^\/+|\/+$/g, "");
  return normalized || "home";
};

function formatAddressForCheck(addr) {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    return [addr.governorate, addr.city, addr.detail].filter(Boolean).join(", ");
  }
  return "";
}

function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();

  // ================= STATE =================
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const currentPage = getPageFromPath(location.pathname);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [compareItems, setCompareItems] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [couponCode, setCouponCode] = useState(() => localStorage.getItem("veltrix_coupon") || "");

  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  // ================= SCROLL PROGRESS =================
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
      setScrollProgress(pct);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ================= THEME STATE =================
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // Sync URL with state
  const setCurrentPage = useCallback((page) => {
    routerNavigate(`/${page === "home" ? "" : page}`);
  }, [routerNavigate]);

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
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
          const adminStatus = await isUserAdmin(currentUser.uid, currentUser.email);
          setIsAdmin(adminStatus);
        } catch (err) {
          console.error("Error syncing user:", err);
          setDbUser({ name: currentUser.displayName, email: currentUser.email });
          setIsAdmin(false);
        }
      } else {
        setDbUser(null);
        setIsAdmin(false);
        if (getPageFromPath(window.location.pathname) === "admin") {
          setCurrentPage("home");
        }
      }
      setIsAuthChecking(false);
    });
    return unsub;
  }, [setCurrentPage]);

  useEffect(() => {
    if (!user?.email) return undefined;
    return subscribeToUserNotifications(user.email, setNotifications);
  }, [user?.email]);

  const activeNotifications = useMemo(
    () => (user?.email ? notifications : []),
    [user?.email, notifications]
  );

  // ================= FETCH PRODUCTS FROM FIRESTORE =================
  useEffect(() => {
    const unsub = subscribeToProducts((firestoreProducts) => {
      const mapped = firestoreProducts.map((p) => ({
        id: p.id,
        name: toTitleCase(p.name || ""),
        nameAr: p.nameAr || "",
        costPrice: parseFloat(p.costPrice) || 0,
        sellPrice: parseFloat(p.sellPrice ?? p.price) || 0,
        price: parseFloat(p.sellPrice ?? p.price) || 0,
        discountPrice: p.discountPrice ? parseFloat(p.discountPrice) : null,
        image: p.image || (p.images && p.images[0]) || "",
        images: p.images || [],
        category: p.category || "",
        categoryAr: p.categoryAr || "",
        details: p.details || p.description || "",
        description: p.description || p.details || "",
        descriptionAr: p.descriptionAr || "",
        stock: Number(p.stock) || 0,
        sizes: p.sizes || [],
        colors: p.colors || [],
        featured: Boolean(p.featured),
      }));
      setProducts(mapped);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ================= SAVE CART, WISHLIST & COUPON =================
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (couponCode) {
      localStorage.setItem("veltrix_coupon", couponCode);
    } else {
      localStorage.removeItem("veltrix_coupon");
    }
  }, [couponCode]);

  // ================= DERIVED DATA =================
  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  const categoryLabels = useMemo(() => {
    const labels = {};
    const isArabic = i18n.language === "ar";
    products.forEach((p) => {
      if (p.category) {
        labels[p.category] = isArabic ? (p.categoryAr || p.category) : p.category;
      }
    });
    return labels;
  }, [products, i18n.language]);

  const priceRange = useMemo(() => {
    if (products.length === 0) return [0, 1000];
    const prices = products.map((p) => getEffectivePrice(p)).filter((v) => v > 0);
    if (prices.length === 0) return [0, 1000];
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

  const featuredProduct = useMemo(() => {
    return (
      products.find((product) => product.featured && product.image) ||
      products.find((product) => product.image) ||
      null
    );
  }, [products]);

  const dealProducts = useMemo(() => {
    return products
      .filter((p) => hasDiscount(p) && p.stock > 0)
      .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))
      .slice(0, 4);
  }, [products]);

  const recentlyViewedIdsSnapshot = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("recently_viewed_products") || "[]");
    } catch {
      return [];
    }
    // Re-read when navigating back to home
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const recentlyViewedHome = useMemo(() => {
    if (!recentlyViewedIdsSnapshot.length || !products.length) return [];
    return recentlyViewedIdsSnapshot
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 4);
  }, [recentlyViewedIdsSnapshot, products]);

  // ================= FILTERED + SORTED =================
  const filteredProducts = useMemo(() => {
    return filterAndSort(products, {
      categories: filters.categories,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      search: filters.search,
      sort: filters.sort,
      inStockOnly: filters.inStockOnly,
      onSaleOnly: filters.onSaleOnly,
    });
  }, [
    products,
    filters.categories,
    filters.minPrice,
    filters.maxPrice,
    filters.search,
    filters.sort,
    filters.inStockOnly,
    filters.onSaleOnly,
  ]);

  // ================= PAGINATION =================
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / filters.perPage));
  const safePage = Math.min(filters.page, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * filters.perPage;
    return filteredProducts.slice(start, start + filters.perPage);
  }, [filteredProducts, safePage, filters.perPage]);

  // ================= CART LOGIC =================
  const [cartPulse, setCartPulse] = useState(false);

  const addToCart = useCallback((product, quantity = 1, options = {}) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const maxStock = Number(product.stock) > 0 ? Number(product.stock) : Infinity;
    const selectedColor = String(options.selectedColor || product.selectedColor || "").trim();
    const selectedSize = String(options.selectedSize || product.selectedSize || "").trim();
    const cartKey = buildCartItemKey(product.id, { selectedColor, selectedSize });

    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 300);

    setCart((prev) => {
      const existing = prev.find((p) => getCartItemKey(p) === cartKey);
      if (existing) {
        return prev.map((p) =>
          getCartItemKey(p) === cartKey
            ? { ...p, qty: Math.min(maxStock, p.qty + safeQuantity) }
            : p
        );
      }
      return [
        ...prev,
        {
          ...product,
          selectedColor,
          selectedSize,
          cartKey,
          qty: Math.min(maxStock, safeQuantity),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((itemKeyOrId, newQty) => {
    const safeQty = Math.max(1, Number(newQty) || 1);
    setCart((prev) =>
      prev.map((p) =>
        getCartItemKey(p) === itemKeyOrId || p.id === itemKeyOrId
          ? { ...p, qty: safeQty }
          : p
      )
    );
  }, []);

  const removeFromCart = useCallback((itemKeyOrId) => {
    setCart((prev) =>
      prev.filter((p) => getCartItemKey(p) !== itemKeyOrId && p.id !== itemKeyOrId)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCouponCode("");
  }, []);

  // ================= WISHLIST LOGIC =================
  const addToWishlist = useCallback((product) => {
    setWishlist((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromWishlist = useCallback((id) => {
    setWishlist((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  // ================= COMPARE LOGIC =================
  const toggleCompare = useCallback((product) => {
    setCompareItems((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        return prev.filter((item) => item.id !== product.id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), product];
      }
      return [...prev, product];
    });
  }, []);

  const isInCompare = useCallback(
    (id) => compareItems.some((item) => item.id === id),
    [compareItems]
  );

  // ================= CHECKOUT → FIRESTORE =================
  const handleOrderConfirmed = async (orderData) => {
    try {
      if (user?.uid) {
        const existingAddressString = formatAddressForCheck(dbUser?.address);
        const shouldPreserveStructuredAddress =
          typeof dbUser?.address === "object" &&
          dbUser.address !== null &&
          orderData.address === existingAddressString;

        const updatedProfile = await updateUserProfile(user.uid, {
          name: orderData.customerName || dbUser?.name || user.displayName || "",
          phone: orderData.phone || "",
          email: orderData.email || user.email || "",
          address: shouldPreserveStructuredAddress
            ? dbUser.address
            : orderData.address || "",
        });
        setDbUser(updatedProfile);
      }

      const firestoreOrder = {
        ...orderData,
        email: orderData.email || user?.email || "",
        userId: user?.uid || null,
        language: i18n.language === "ar" ? "ar" : "en",
      };
      await saveOrderToFirestore(firestoreOrder);
    } catch (err) {
      console.error("Failed to save order to Firestore:", err);
    }
    setCart([]);
    setCouponCode("");
    setCurrentPage("orders");
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

  const handleSelectSingleCategory = useCallback(
    (cat) => {
      if (!cat) {
        updateFilters({ categories: [] });
        return;
      }
      updateFilters({ categories: [cat] });
    },
    [updateFilters]
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

  const handleToggleInStock = useCallback(
    (next) => {
      updateFilters({ inStockOnly: Boolean(next) });
    },
    [updateFilters]
  );

  const handleToggleOnSale = useCallback(
    (next) => {
      updateFilters({ onSaleOnly: Boolean(next) });
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

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minPrice > 0 ||
    (filters.maxPrice < Infinity && filters.maxPrice < priceRange[1]) ||
    Boolean(filters.search) ||
    Boolean(filters.inStockOnly) ||
    Boolean(filters.onSaleOnly) ||
    (filters.sort && filters.sort !== "default");

  // ================= UI =================
  return (
    <div className="app-shell">
      {/* SCROLL PROGRESS BAR */}
      <div className="scroll-progress-track" aria-hidden="true">
        <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }}></div>
      </div>

      {/* PROMO ANNOUNCEMENT BAR */}
      <AnnouncementBar onApplyCoupon={(code) => setCouponCode(code)} />

      {/* NAVBAR */}
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + item.qty, 0)}
        wishlistCount={wishlist.length}
        notifications={activeNotifications}
        notificationCount={activeNotifications.filter((notification) => !notification.read).length}
        onMarkNotificationRead={markNotificationAsRead}
        onMarkAllNotificationsRead={() => markAllNotificationsAsRead(activeNotifications)}
        search={filters.search}
        onSearchChange={handleSearchChange}
        cartPulse={cartPulse}
        products={products}
        onToggleFilters={() => setShowMobileFilters(!showMobileFilters)}
        isMobile={isMobile}
        user={user}
        dbUser={dbUser}
        navigate={setCurrentPage}
        isAdmin={isAdmin}
        pathname={location.pathname}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <MobileFilterDrawer
        isOpen={isMobile && currentPage === "home" && showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        categories={categories}
        categoryLabels={categoryLabels}
        productCounts={productCounts}
        selectedCategories={filters.categories}
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        priceRange={priceRange}
        sort={filters.sort}
        inStockOnly={filters.inStockOnly}
        onSaleOnly={filters.onSaleOnly}
        onCategoryToggle={handleCategoryToggle}
        onPriceChange={handlePriceChange}
        onSortChange={handleSortChange}
        onToggleInStock={handleToggleInStock}
        onToggleOnSale={handleToggleOnSale}
        onClearFilters={clearFilters}
      />

      <main className="app-main">
        <Routes>
          <Route
            path="/product/:id"
            element={
              <ProductDetailPage
                products={products}
                addToCart={addToCart}
                addToWishlist={addToWishlist}
                isInWishlist={(id) => wishlist.some((item) => item.id === id)}
                onQuickView={setQuickViewProduct}
                onToggleCompare={toggleCompare}
                isInCompare={isInCompare}
                navigate={setCurrentPage}
                user={user}
                dbUser={dbUser}
              />
            }
          />
          <Route
            path="*"
            element={
              isAuthChecking ? (
                <div className="container py-5 text-center">
                  <div className="spinner-border text-primary-custom" role="status">
                    <span className="visually-hidden">{t("app.loading")}</span>
                  </div>
                </div>
              ) : currentPage === "admin" ? (
                isAdmin ? (
                  <Suspense
                    fallback={
                      <div className="container py-5 text-center">
                        <div className="spinner-border text-primary-custom" role="status"></div>
                      </div>
                    }
                  >
                    <AdminPanel navigate={setCurrentPage} />
                  </Suspense>
                ) : (
                  <div className="container py-5 text-center">
                    <i className="bi bi-shield-lock fs-1 text-muted-custom"></i>
                    <h3 className="mt-3">{t("app.admin_required")}</h3>
                    <p className="text-muted-custom mb-4">{t("app.admin_permission_denied")}</p>
                    <button
                      type="button"
                      className="btn btn-primary-custom rounded-pill px-4"
                      onClick={() => setCurrentPage("home")}
                    >
                      {t("app.back_to_store")}
                    </button>
                  </div>
                )
              ) : currentPage === "profile" ? (
                <Profile user={user} dbUser={dbUser} setDbUser={setDbUser} />
              ) : currentPage === "orders" ? (
                <Orders user={user} navigate={setCurrentPage} addToCart={addToCart} />
              ) : currentPage === "cart" ? (
                <CartPage
                  cart={cart}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  clearCart={clearCart}
                  couponCode={couponCode}
                  onApplyCoupon={(code) => setCouponCode(code)}
                  onClearCoupon={() => setCouponCode("")}
                  navigate={setCurrentPage}
                  user={user}
                  dbUser={dbUser}
                  onOrderConfirmed={handleOrderConfirmed}
                />
              ) : currentPage === "wishlist" ? (
                <WishlistPage
                  wishlist={wishlist}
                  removeFromWishlist={removeFromWishlist}
                  clearWishlist={clearWishlist}
                  addToCart={addToCart}
                  navigate={setCurrentPage}
                />
              ) : (
                <div className="container mt-4 home-page">
                  {/* HERO SECTION */}
                  {!hasActiveFilters && (
                    <MotionSection
                      className="hero-section premium-hero"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="hero-glow hero-glow-one" aria-hidden="true"></div>
                      <div className="hero-glow hero-glow-two" aria-hidden="true"></div>
                      <div className="hero-floating-shape shape-one" aria-hidden="true"></div>
                      <div className="hero-floating-shape shape-two" aria-hidden="true"></div>
                      <div className="hero-copy">
                        <span className="hero-kicker">{t("app.hero_kicker")}</span>
                        <h1 className="hero-title fw-bold">{t("app.hero_title")}</h1>
                        <p className="hero-slogan">{t("app.hero_slogan")}</p>
                        <p className="hero-desc">{t("app.hero_desc")}</p>
                        <div className="hero-actions">
                          <button
                            type="button"
                            className="btn hero-cta-primary"
                            onClick={() =>
                              document.getElementById("shop-products")?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              })
                            }
                          >
                            {t("app.shop_now")}
                            <i className="bi bi-arrow-down ms-1"></i>
                          </button>
                          <button
                            type="button"
                            className="btn hero-cta-secondary"
                            onClick={() => setCurrentPage("orders")}
                          >
                            {t("app.track_order")}
                          </button>
                        </div>
                        <div className="hero-stats-strip">
                          <span><i className="bi bi-shield-check me-1"></i>{t("app.hero_stat_authentic")}</span>
                          <span><i className="bi bi-lightning-charge me-1"></i>{t("app.hero_stat_delivery")}</span>
                          <span><i className="bi bi-cash-coin me-1"></i>{t("app.hero_stat_support")}</span>
                        </div>
                      </div>
                      {featuredProduct && (
                        <MotionDiv
                          className="hero-product"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                          onClick={() => routerNavigate(`/product/${featuredProduct.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              routerNavigate(`/product/${featuredProduct.id}`);
                            }
                          }}
                          role="link"
                          tabIndex={0}
                        >
                          <span className="hero-product-label">{t("app.featured_product")}</span>
                          <img
                            src={featuredProduct.image}
                            alt={getLocalizedField(featuredProduct, "name") || featuredProduct.name}
                          />
                          <div className="hero-product-meta">
                            <strong>{getLocalizedField(featuredProduct, "name") || featuredProduct.name}</strong>
                            <span>
                              {t("navbar.currency")}{" "}
                              {formatPrice(getEffectivePrice(featuredProduct), i18n.language)}
                            </span>
                          </div>
                        </MotionDiv>
                      )}
                    </MotionSection>
                  )}

                  {/* QUICK CATEGORY PILLS STRIP */}
                  {categories.length > 0 && (
                    <section className="category-strip-section" aria-label={t("app.browse_categories")}>
                      <div className="category-pills-scroll">
                        <button
                          type="button"
                          className={`category-quick-pill ${filters.categories.length === 0 ? "active" : ""}`}
                          onClick={() => handleSelectSingleCategory("")}
                        >
                          <i className="bi bi-grid-fill me-1"></i>
                          {t("app.all_categories")}
                          <span className="pill-count">{products.length}</span>
                        </button>
                        {categories.map((cat) => {
                          const isSelected = filters.categories.includes(cat);
                          return (
                            <button
                              type="button"
                              key={cat}
                              className={`category-quick-pill ${isSelected ? "active" : ""}`}
                              onClick={() => handleCategoryToggle(cat)}
                            >
                              {categoryLabels[cat] || cat}
                              <span className="pill-count">{productCounts[cat] || 0}</span>
                            </button>
                          );
                        })}
                        {dealProducts.length > 0 && (
                          <button
                            type="button"
                            className={`category-quick-pill promo-pill ${filters.onSaleOnly ? "active" : ""}`}
                            onClick={() => handleToggleOnSale(!filters.onSaleOnly)}
                          >
                            <i className="bi bi-fire me-1"></i>
                            {t("filters.on_sale_only")}
                          </button>
                        )}
                      </div>
                    </section>
                  )}

                  {/* FLASH DEALS SPOTLIGHT */}
                  {!hasActiveFilters && dealProducts.length > 0 && (
                    <section className="flash-deals-section mb-4">
                      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div>
                          <h4 className="fw-bold mb-0 d-flex align-items-center gap-2">
                            <span className="flash-deals-icon"><i className="bi bi-lightning-fill"></i></span>
                            {t("app.flash_deals")}
                          </h4>
                          <small className="text-muted-custom">{t("app.flash_deals_sub")}</small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary-custom rounded-pill px-3"
                          onClick={() => updateFilters({ onSaleOnly: true, sort: "discount" })}
                        >
                          {t("app.view_details")}
                          <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                      <div className="deals-strip-grid">
                        {dealProducts.map((deal) => (
                          <div
                            key={deal.id}
                            className="deal-mini-card"
                            onClick={() => routerNavigate(`/product/${deal.id}`)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                routerNavigate(`/product/${deal.id}`);
                              }
                            }}
                            role="link"
                            tabIndex={0}
                          >
                            <span className="product-sale-badge">-{getDiscountPercent(deal)}%</span>
                            <img src={deal.image} alt={getLocalizedField(deal, "name")} className="deal-mini-img" />
                            <div className="deal-mini-info">
                              <h6 className="text-truncate fw-bold mb-1">
                                {toTitleCase(getLocalizedField(deal, "name"))}
                              </h6>
                              <div className="d-flex align-items-baseline gap-2">
                                <span className="fw-bold text-success">
                                  {t("navbar.currency")} {formatPrice(getEffectivePrice(deal), i18n.language)}
                                </span>
                                <small className="text-muted-custom text-decoration-line-through">
                                  {formatPrice(getOriginalPrice(deal), i18n.language)}
                                </small>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* SHOP LAYOUT */}
                  <div className="shop-layout" id="shop-products">
                    {!isMobile && (
                      <FilterSidebar
                        categories={categories}
                        categoryLabels={categoryLabels}
                        productCounts={productCounts}
                        selectedCategories={filters.categories}
                        minPrice={filters.minPrice}
                        maxPrice={filters.maxPrice}
                        priceRange={priceRange}
                        sort={filters.sort}
                        inStockOnly={filters.inStockOnly}
                        onSaleOnly={filters.onSaleOnly}
                        onCategoryToggle={handleCategoryToggle}
                        onPriceChange={handlePriceChange}
                        onSortChange={handleSortChange}
                        onToggleInStock={handleToggleInStock}
                        onToggleOnSale={handleToggleOnSale}
                        onClearFilters={clearFilters}
                      />
                    )}

                    <div className="shop-main">
                      <ActiveFilters
                        totalResults={filteredProducts.length}
                        currentPageResults={paginatedProducts.length}
                        selectedCategories={filters.categories}
                        categoryLabels={categoryLabels}
                        minPrice={filters.minPrice}
                        maxPrice={filters.maxPrice}
                        priceRange={priceRange}
                        search={filters.search}
                        sort={filters.sort}
                        inStockOnly={filters.inStockOnly}
                        onSaleOnly={filters.onSaleOnly}
                        onRemoveCategory={handleRemoveCategory}
                        onClearPrice={handleClearPrice}
                        onClearSearch={handleClearSearch}
                        onClearSort={handleClearSort}
                        onClearInStock={() => handleToggleInStock(false)}
                        onClearOnSale={() => handleToggleOnSale(false)}
                        onClearAll={clearFilters}
                      />

                      {loading ? (
                        <div className="row">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="col-12 col-sm-6 col-md-4 col-lg-4 mb-4">
                              <div className="skeleton skeleton-card"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          {paginatedProducts.length === 0 ? (
                            <div className="text-center py-5">
                              <i className="bi bi-search text-muted-custom" style={{ fontSize: "3rem" }}></i>
                              <h4 className="mt-3 text-muted-custom">{t("app.no_products")}</h4>
                              <p className="text-muted-custom opacity-75">{t("app.try_adjusting")}</p>
                              {hasActiveFilters && (
                                <button type="button" className="btn btn-outline-custom mt-2" onClick={clearFilters}>
                                  {t("app.clear_filters")}
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
                                  addToWishlist={addToWishlist}
                                  isInWishlist={wishlist.some((w) => w.id === p.id)}
                                  onQuickView={setQuickViewProduct}
                                  onToggleCompare={toggleCompare}
                                  isInCompare={isInCompare(p.id)}
                                />
                              ))}
                            </div>
                          )}

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
                    </div>
                  </div>

                  {/* RECENTLY VIEWED ON HOME PAGE */}
                  {!hasActiveFilters && recentlyViewedHome.length > 0 && (
                    <section className="mt-5 mb-2">
                      <h4 className="fw-bold mb-3">{t("app.recently_viewed")}</h4>
                      <div className="row product-grid-animated">
                        {recentlyViewedHome.map((item) => (
                          <ProductCard
                            key={`recent-${item.id}`}
                            product={item}
                            addToCart={addToCart}
                            addToWishlist={addToWishlist}
                            isInWishlist={wishlist.some((w) => w.id === item.id)}
                            onQuickView={setQuickViewProduct}
                            onToggleCompare={toggleCompare}
                            isInCompare={isInCompare(item.id)}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )
            }
          />
        </Routes>
      </main>

      {/* TRUST BADGES & FOOTER */}
      <TrustBadges />
      <Footer
        categories={categories}
        categoryLabels={categoryLabels}
        navigate={setCurrentPage}
        onSelectCategory={handleSelectSingleCategory}
        onFilterDeals={() => updateFilters({ onSaleOnly: true, sort: "discount" })}
      />

      {/* COMPARE FLOATING TRAY */}
      {compareItems.length > 0 && (
        <div className="compare-floating-bar" role="region" aria-label={t("compare.title")}>
          <div className="container compare-floating-inner">
            <div className="d-flex align-items-center gap-2 overflow-auto">
              <span className="fw-semibold small text-nowrap">
                {t("compare.bar_label", { count: compareItems.length })}
              </span>
              <div className="d-flex gap-2">
                {compareItems.map((item) => (
                  <div key={item.id} className="compare-tray-thumb">
                    <img src={item.image} alt="" />
                    <button
                      type="button"
                      onClick={() => toggleCompare(item)}
                      aria-label={t("cart.remove")}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3"
                onClick={() => setCompareItems([])}
              >
                {t("compare.clear")}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary-custom rounded-pill px-3 fw-semibold"
                onClick={() => setShowCompareModal(true)}
              >
                <i className="bi bi-arrow-left-right me-1"></i>
                {t("compare.compare_now")} ({compareItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS & FLOATING CONTROLS */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        addToCart={addToCart}
        addToWishlist={addToWishlist}
        isInWishlist={(id) => wishlist.some((item) => item.id === id)}
        onToggleCompare={toggleCompare}
        isInCompare={isInCompare}
      />

      <CompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        items={compareItems}
        onRemove={(id) => setCompareItems((prev) => prev.filter((item) => item.id !== id))}
        addToCart={addToCart}
      />

      <BackToTop hasCompareBar={compareItems.length > 0} />
    </div>
  );
}

export default App;
