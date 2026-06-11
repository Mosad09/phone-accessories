import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getSuggestions } from "../utils/searchEngine";
import { loginWithGoogle, logout } from "../utils/firebase";
import { useTranslation } from "react-i18next";
import { getLocalizedField } from "../utils/localization";

function Navbar({
  cartCount,
  wishlistCount,
  search,
  onSearchChange,
  cartPulse,
  products,
  onToggleFilters,
  isMobile,
  user,
  dbUser,
  navigate,
  isAdmin,
  pathname,
  theme,
  toggleTheme,
}) {
  const { t, i18n } = useTranslation();
  const [inputValue, setInputValue] = useState(search || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const userDropdownRef = useRef(null);
  const userMenuButtonRef = useRef(null);
  const userMenuRef = useRef(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuPosition, setUserMenuPosition] = useState({ top: 0, left: 12 });

  // Active route detection
  const activeRoute = (() => {
    const normalizedPath = (pathname || "/").split(/[?#]/)[0].replace(/\/+$/g, "") || "/";
    if (normalizedPath === "/" || normalizedPath === "/home") return "home";
    if (normalizedPath === "/orders") return "orders";
    if (normalizedPath === "/profile") return "profile";
    if (normalizedPath === "/admin" || normalizedPath.startsWith("/admin/")) return "admin";
    return "";
  })();

  const getMenuItemClassName = (route, extraClass = "") => {
    const classes = ["dropdown-item"];
    if (extraClass) classes.push(extraClass);
    if (activeRoute === route) classes.push("active-route");
    return classes.join(" ");
  };

  const updateUserMenuPosition = useCallback(() => {
    const button = userMenuButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = userMenuRef.current?.offsetWidth || 200;
    const menuHeight = userMenuRef.current?.offsetHeight || 260;
    const visualViewport = window.visualViewport;
    const viewportPadding = 12;
    const viewportLeft = visualViewport?.offsetLeft || 0;
    const viewportTop = visualViewport?.offsetTop || 0;
    const viewportRight = viewportLeft + (visualViewport?.width || window.innerWidth);
    const viewportBottom = viewportTop + (visualViewport?.height || window.innerHeight);
    const maxLeft = viewportRight - menuWidth - viewportPadding;
    const maxTop = viewportBottom - menuHeight - viewportPadding;
    const preferredLeft = rect.right - menuWidth;
    const spaceBelow = viewportBottom - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportTop - viewportPadding;
    const shouldOpenAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow;
    const preferredTop = shouldOpenAbove
      ? rect.top - menuHeight - 8
      : rect.bottom + 8;
    const minLeft = viewportLeft + viewportPadding;
    const minTop = viewportTop + viewportPadding;
    const safeLeft = Math.min(Math.max(minLeft, preferredLeft), Math.max(minLeft, maxLeft));
    const safeTop = Math.min(Math.max(minTop, preferredTop), Math.max(minTop, maxTop));

    const nextPosition = {
      top: Math.round(safeTop),
      left: Math.round(safeLeft),
    };

    setUserMenuPosition((prev) => (
      prev.top === nextPosition.top && prev.left === nextPosition.left ? prev : nextPosition
    ));
  }, []);

  const setUserMenuNode = useCallback((node) => {
    userMenuRef.current = node;
    if (node) requestAnimationFrame(updateUserMenuPosition);
  }, [updateUserMenuPosition]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      const clickedToggle = userDropdownRef.current?.contains(e.target);
      const clickedMenu = userMenuRef.current?.contains(e.target);
      if (!clickedToggle && !clickedMenu) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!showUserMenu) return undefined;

    updateUserMenuPosition();
    window.addEventListener("resize", updateUserMenuPosition);
    window.addEventListener("scroll", updateUserMenuPosition, true);
    window.visualViewport?.addEventListener("resize", updateUserMenuPosition);
    window.visualViewport?.addEventListener("scroll", updateUserMenuPosition);
    return () => {
      window.removeEventListener("resize", updateUserMenuPosition);
      window.removeEventListener("scroll", updateUserMenuPosition, true);
      window.visualViewport?.removeEventListener("resize", updateUserMenuPosition);
      window.visualViewport?.removeEventListener("scroll", updateUserMenuPosition);
    };
  }, [showUserMenu, updateUserMenuPosition]);

  useEffect(() => {
    if (!showUserMenu) return undefined;

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      setShowUserMenu(false);
      userMenuButtonRef.current?.focus();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showUserMenu]);

  // Sync external search → input
  useEffect(() => {
    // Keep the debounced local field aligned with URL-driven search changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue(search || "");
  }, [search]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search + suggestions
  const handleInput = useCallback(
    (value) => {
      setInputValue(value);
      setActiveIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        onSearchChange(value);

        if (value.trim().length >= 1 && products.length > 0) {
          const results = getSuggestions(products, value, 8);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 250);
    },
    [onSearchChange, products]
  );

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      if (e.key === "Enter") {
        onSearchChange(inputValue);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectSuggestion(suggestions[activeIndex]);
        } else {
          onSearchChange(inputValue);
          setShowSuggestions(false);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  const selectSuggestion = (suggestion) => {
    const name = getLocalizedField(suggestion.product, "name") || suggestion.product.name || "";
    setInputValue(name);
    onSearchChange(name);
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setInputValue("");
    onSearchChange("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close menu, blur button, then navigate — prevents sticky focus highlight
  const handleMenuNav = (e, page) => {
    e.currentTarget.blur();
    setShowUserMenu(false);
    navigate(page);
  };

  return (
    <nav className="navbar navbar-custom py-3" aria-label="Primary navigation">
      <div className="container navbar-shell">
        {/* Brand */}
        <a className="navbar-brand d-flex align-items-center fw-bold fs-4" href="#" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
          <i className="bi bi-layers-fill text-primary-custom me-2"></i>
          <span className="navbar-brand-name">{t('navbar.brand_vel')}<span className="text-primary-custom">{t('navbar.brand_trix')}</span></span>
        </a>

        {/* Search */}
        <div className="search-wrapper navbar-search" ref={wrapperRef}>
          <i className="bi bi-search search-icon" aria-hidden="true"></i>
          <input
            ref={inputRef}
            type="search"
            className="search-input search-input-enhanced"
            placeholder={t('navbar.search_placeholder')}
            aria-label="Search products and categories"
            aria-expanded={showSuggestions}
            aria-controls="product-search-suggestions"
            autoComplete="off"
            value={inputValue}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
          />
          {inputValue && (
            <button type="button" className="search-clear-btn" onClick={clearSearch} aria-label="Clear search">
              <i className="bi bi-x" aria-hidden="true"></i>
            </button>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div id="product-search-suggestions" className="search-suggestions" role="listbox">
              {suggestions.map((item, idx) => (
                <button
                  type="button"
                  key={item.product.id}
                  className={`suggestion-item ${idx === activeIndex ? "active" : ""}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  onClick={() => selectSuggestion(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  {item.product.image && (
                    <img
                      src={item.product.image}
                      alt=""
                      className="suggestion-img"
                    />
                  )}
                  <div className="suggestion-info">
                    <span className="suggestion-name">
                      {item.highlightedName.before}
                      <strong className="suggestion-match">
                        {item.highlightedName.match}
                      </strong>
                      {item.highlightedName.after}
                    </span>
                    {getLocalizedField(item.product, "category") && (
                      <span className="suggestion-category">
                        {getLocalizedField(item.product, "category")}
                      </span>
                    )}
                  </div>
                  <span className="suggestion-price">
                    {t('navbar.currency')} {Number(item.product.price).toLocaleString(i18n.language === 'ar' ? "ar-EG" : "en-EG")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Header actions */}
        <div className="navbar-actions">
          {/* Mobile Filter Toggle */}
          {isMobile && activeRoute === "home" && (
            <button
              type="button"
              className="filter-toggle-btn"
              onClick={onToggleFilters}
              aria-label="Open filters"
            >
              <i className="bi bi-funnel" aria-hidden="true"></i>
            </button>
          )}

          {/* Language Toggle */}
          <button
            type="button"
            className="cart-btn-nav border-0 shadow-none px-2"
            onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
            aria-label="Switch Language"
          >
            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{i18n.language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="cart-btn-nav theme-toggle-btn border-0 shadow-none"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
            style={{ transition: "transform 0.3s ease" }}
          >
            <i className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon"} fs-5`} aria-hidden="true"></i>
          </button>

          {/* Wishlist */}
          <button type="button" className="cart-btn-nav" onClick={() => navigate("wishlist")} aria-label={`Wishlist with ${wishlistCount} items`}>
            <i className="bi bi-heart fs-5" aria-hidden="true"></i>
            {wishlistCount > 0 && (
              <span className="cart-badge bg-danger">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart */}
          <button type="button" className="cart-btn-nav" onClick={() => navigate("cart")} aria-label={`Cart with ${cartCount} items`}>
            <i className="bi bi-bag fs-5" aria-hidden="true"></i>
            {cartCount > 0 && (
              <span className={`cart-badge ${cartPulse ? "pulse-anim" : ""}`}>
                {cartCount}
              </span>
            )}
          </button>

          {/* Auth */}
          {user ? (
            <div className="position-relative" ref={userDropdownRef}>
              <button
                type="button"
                ref={userMenuButtonRef}
                className="btn btn-outline-primary-custom auth-button d-flex align-items-center gap-2 rounded-pill px-3"
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                onClick={() => {
                  updateUserMenuPosition();
                  setShowUserMenu(!showUserMenu);
                }}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" width="24" height="24" className="rounded-circle" />
                ) : (
                  <i className="bi bi-person-circle fs-5"></i>
                )}
                <span className="d-none d-md-inline">{dbUser?.name || user.displayName || "User"}</span>
              </button>

              {showUserMenu && createPortal(
                <div className="navbar-user-menu-layer">
                  <div
                    ref={setUserMenuNode}
                    className="navbar-user-menu"
                    role="menu"
                    aria-label="Account menu"
                    style={{
                      top: `${userMenuPosition.top}px`,
                      left: `${userMenuPosition.left}px`,
                    }}
                  >
                    {/* Home */}
                    <button
                      type="button"
                      className={getMenuItemClassName("home")}
                      role="menuitem"
                      aria-current={activeRoute === "home" ? "page" : undefined}
                      onClick={(e) => handleMenuNav(e, "home")}
                    >
                      <i className="bi bi-house"></i>
                      {t('navbar.home')}
                    </button>

                    {/* My Orders */}
                    <button
                      type="button"
                      className={getMenuItemClassName("orders")}
                      role="menuitem"
                      aria-current={activeRoute === "orders" ? "page" : undefined}
                      onClick={(e) => handleMenuNav(e, "orders")}
                    >
                      <i className="bi bi-box-seam"></i>
                      {t('navbar.my_orders')}
                    </button>

                    {/* Profile */}
                    <button
                      type="button"
                      className={getMenuItemClassName("profile")}
                      role="menuitem"
                      aria-current={activeRoute === "profile" ? "page" : undefined}
                      onClick={(e) => handleMenuNav(e, "profile")}
                    >
                      <i className="bi bi-person"></i>
                      {t('navbar.profile')}
                    </button>

                    {/* Admin Panel */}
                    {isAdmin && (
                      <>
                        <hr className="dropdown-divider" />
                        <button
                          type="button"
                          className={getMenuItemClassName("admin", "admin-item")}
                          role="menuitem"
                          aria-current={activeRoute === "admin" ? "page" : undefined}
                          onClick={(e) => handleMenuNav(e, "admin")}
                        >
                          <i className="bi bi-speedometer2"></i>
                          {t('navbar.admin_panel')}
                        </button>
                      </>
                    )}
                    <hr className="dropdown-divider" />
                    <button
                      type="button"
                      className="dropdown-item logout-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setShowUserMenu(false);
                        logout();
                        navigate("home");
                      }}
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      {t('navbar.logout')}
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary-custom auth-button rounded-pill px-4 d-flex align-items-center gap-2"
              onClick={loginWithGoogle}
              aria-label="Sign in with Google"
            >
              <i className="bi bi-google" aria-hidden="true"></i>
              <span className="d-none d-md-inline">{t('navbar.sign_in')}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
