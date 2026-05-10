import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getSuggestions } from "../utils/searchEngine";
import { loginWithGoogle, logout } from "../utils/firebase";

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
  isAdmin
}) {
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

  const updateUserMenuPosition = useCallback(() => {
    const button = userMenuButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = userMenuRef.current?.offsetWidth || 240;
    const menuHeight = userMenuRef.current?.offsetHeight || 260;
    const viewportPadding = 12;
    const maxLeft = window.innerWidth - menuWidth - viewportPadding;
    const maxTop = window.innerHeight - menuHeight - viewportPadding;
    const preferredLeft = rect.right - menuWidth;
    const preferredTop = rect.bottom + 8;
    const safeLeft = Math.min(Math.max(viewportPadding, preferredLeft), Math.max(viewportPadding, maxLeft));
    const safeTop = Math.min(Math.max(viewportPadding, preferredTop), Math.max(viewportPadding, maxTop));

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
    return () => {
      window.removeEventListener("resize", updateUserMenuPosition);
      window.removeEventListener("scroll", updateUserMenuPosition, true);
    };
  }, [showUserMenu, updateUserMenuPosition]);

  // Sync external search → input
  useEffect(() => {
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
    const name = suggestion.product.name || "";
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

  return (
    <nav className="navbar navbar-expand-lg navbar-custom py-3">
      <div className="container flex-wrap">
        {/* Brand */}
        <a className="navbar-brand d-flex align-items-center fw-bold fs-4" href="#" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
          <i className="bi bi-layers-fill text-primary-custom me-2"></i>
          Vel<span className="text-primary-custom">trix</span>
        </a>

        {/* Search & Cart */}
        <div className="d-flex align-items-center ms-auto gap-3">
          {/* Mobile Filter Toggle */}
          {isMobile && (
            <button
              className="filter-toggle-btn" onClick={onToggleFilters}
              aria-label="Open filters"
            >
              <i className="bi bi-funnel"></i>
            </button>
          )}

          {/* Search */}
          <div className="search-wrapper" ref={wrapperRef}>
            <i className="bi bi-search search-icon"></i>
            <input
              ref={inputRef}
              type="text"
              className="search-input search-input-enhanced"
              placeholder="Search products, categories..."
              value={inputValue}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
            />
            {inputValue && (
              <button className="search-clear-btn" onClick={clearSearch} aria-label="Clear search">
                <i className="bi bi-x"></i>
              </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((item, idx) => (
                  <button
                    key={item.product.id}
                    className={`suggestion-item ${idx === activeIndex ? "active" : ""}`}
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
                      {item.product.category && (
                        <span className="suggestion-category">
                          {item.product.category}
                        </span>
                      )}
                    </div>
                    <span className="suggestion-price">
                      EGP {Number(item.product.price).toLocaleString("en-EG")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Wishlist */}
          <button className="cart-btn-nav" onClick={() => navigate("wishlist")} aria-label="Wishlist">
            <i className="bi bi-heart fs-5"></i>
            {wishlistCount > 0 && (
              <span className="cart-badge bg-danger">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart */}
          <button className="cart-btn-nav" onClick={() => navigate("cart")} aria-label="Cart">
            <i className="bi bi-bag fs-5"></i>
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
                ref={userMenuButtonRef}
                className="btn btn-outline-primary-custom d-flex align-items-center gap-2 rounded-pill px-3" 
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
                    style={{
                      top: `${userMenuPosition.top}px`,
                      left: `${userMenuPosition.left}px`,
                    }}
                  >
                    <button className="dropdown-item py-2" onClick={() => { navigate("orders"); setShowUserMenu(false); }}>
                      <i className="bi bi-box-seam me-2"></i>My Orders
                    </button>
                    <button className="dropdown-item py-2" onClick={() => { navigate("profile"); setShowUserMenu(false); }}>
                      <i className="bi bi-person me-2"></i>Profile
                    </button>
                    {isAdmin && (
                      <>
                        <hr className="dropdown-divider" />
                        <button className="dropdown-item py-2" onClick={() => { navigate("admin"); setShowUserMenu(false); }}>
                          <i className="bi bi-speedometer2 me-2"></i>Admin Panel
                        </button>
                      </>
                    )}
                    <hr className="dropdown-divider" />
                    <button className="dropdown-item py-2 text-danger" onClick={() => { logout(); setShowUserMenu(false); navigate("home"); }}>
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          ) : (
            <button className="btn btn-primary-custom rounded-pill px-4 d-flex align-items-center gap-2" onClick={loginWithGoogle}>
              <i className="bi bi-google"></i>
              <span className="d-none d-md-inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
