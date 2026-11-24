import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toTitleCase } from "../utils/textUtils";
import { useTranslation } from "react-i18next";
import { getLocalizedField } from "../utils/localization";
import {
  formatPrice,
  getDiscountPercent,
  getEffectivePrice,
  getOriginalPrice,
  hasDiscount,
} from "../utils/pricing";

function ProductCard({
  product,
  addToCart,
  addToWishlist,
  isInWishlist,
  onQuickView,
  onToggleCompare,
  isInCompare,
}) {
  const { t, i18n } = useTranslation();
  const [toast, setToast] = useState({ show: false, message: "" });
  const cardRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: "" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const inStock = Number(product.stock) > 0;
  const lowStock = inStock && Number(product.stock) <= 5;
  const effectivePrice = getEffectivePrice(product);
  const originalPrice = getOriginalPrice(product);
  const onSale = hasDiscount(product);
  const discountPercent = getDiscountPercent(product);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!inStock) return;
    addToCart(product);
    setToast({ show: true, message: t("product.added_to_cart_toast") });
  };

  const handleAddToWishlist = (e) => {
    e.stopPropagation();
    addToWishlist(product);
    setToast({ show: true, message: t("product.added_to_wishlist_toast") });
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    if (onQuickView) onQuickView(product);
  };

  const handleCompare = (e) => {
    e.stopPropagation();
    if (onToggleCompare) {
      onToggleCompare(product);
      setToast({
        show: true,
        message: isInCompare ? t("product.removed_from_compare") : t("product.added_to_compare"),
      });
    }
  };

  const openProductDetails = () => {
    navigate(`/product/${product.id}`);
  };

  const handleCardKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openProductDetails();
    }
  };

  const localizedName = toTitleCase(getLocalizedField(product, "name"));
  const localizedCategory = getLocalizedField(product, "category");
  const localizedDetails = getLocalizedField(product, "description") || getLocalizedField(product, "details");

  return (
    <div className="col-6 col-sm-6 col-md-4 col-lg-3 mb-3 mb-md-4">
      <div
        className={`product-card ${!inStock ? "is-out-of-stock" : ""}`}
        ref={cardRef}
        role="link"
        tabIndex={0}
        onClick={openProductDetails}
        onKeyDown={handleCardKeyDown}
        style={{ cursor: "pointer" }}
      >
        <div className="product-img-wrapper">
          {/* Top-left Status Badges */}
          <div className="product-card-badges">
            {onSale && (
              <span className="product-sale-badge">-{discountPercent}%</span>
            )}
            {product.featured && (
              <span className="product-featured-badge">
                <i className="bi bi-star-fill me-1" aria-hidden="true"></i>
                {t("product.featured")}
              </span>
            )}
            {!inStock && (
              <span className="product-stock-badge out">{t("product.out_of_stock")}</span>
            )}
            {lowStock && (
              <span className="product-stock-badge low">{t("product.only_left", { count: product.stock })}</span>
            )}
          </div>

          {/* Quick Actions Floating Column */}
          <div className="product-card-float-actions">
            {onQuickView && (
              <button
                type="button"
                className="product-float-btn"
                onClick={handleQuickView}
                title={t("product.quick_view")}
                aria-label={t("product.quick_view")}
              >
                <i className="bi bi-eye" aria-hidden="true"></i>
              </button>
            )}
            {onToggleCompare && (
              <button
                type="button"
                className={`product-float-btn ${isInCompare ? "active" : ""}`}
                onClick={handleCompare}
                title={t("product.compare")}
                aria-label={t("product.compare")}
              >
                <i className="bi bi-arrow-left-right" aria-hidden="true"></i>
              </button>
            )}
          </div>

          <img
            src={product.image}
            alt={localizedName}
            loading="lazy"
            className="product-img img-fluid"
          />

          <div className="product-details-overlay">
            <div className="overlay-content">
              <h6 className="overlay-title">{localizedName}</h6>
              {localizedCategory && (
                <span className="overlay-category">{localizedCategory}</span>
              )}
              {localizedDetails && (
                <p className="overlay-description">{localizedDetails}</p>
              )}
              <span className="overlay-price">
                {t("navbar.currency")} {formatPrice(effectivePrice, i18n.language)}
              </span>
            </div>
          </div>
        </div>

        <div className="product-info p-3">
          <h5 className="product-title fw-bold" title={localizedName}>
            {localizedName}
          </h5>

          {localizedCategory && (
            <span className="category-badge">
              {localizedCategory}
            </span>
          )}

          {localizedDetails && (
            <div className="text-muted small mb-2 details-text" title={localizedDetails}>
              {localizedDetails}
            </div>
          )}

          <div className="mt-auto d-flex align-items-center justify-content-between pt-3 price-row">
            <div className="product-price-stack">
              <span className="product-price mb-0">
                {t("navbar.currency")} {formatPrice(effectivePrice, i18n.language)}
              </span>
              {onSale && (
                <span className="product-price-original">
                  {t("navbar.currency")} {formatPrice(originalPrice, i18n.language)}
                </span>
              )}
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn ${isInWishlist ? "btn-danger" : "btn-outline-danger"} add-btn-sm border-0`}
                onClick={handleAddToWishlist}
                title={isInWishlist ? t("product.already_in_wishlist") : t("product.add_to_wishlist")}
                aria-label={isInWishlist ? t("product.already_in_wishlist") : t("product.add_to_wishlist")}
                disabled={isInWishlist}
              >
                <i className={`bi ${isInWishlist ? "bi-heart-fill" : "bi-heart"}`}></i>
              </button>
              <button
                type="button"
                className="btn btn-primary-custom add-btn-sm"
                onClick={handleAddToCart}
                disabled={!inStock}
                title={inStock ? t("product.add_to_cart") : t("product.out_of_stock")}
                aria-label={inStock ? t("product.add_to_cart") : t("product.out_of_stock")}
              >
                <i className={`bi ${inStock ? "bi-cart-plus" : "bi-slash-circle"}`}></i>
              </button>
            </div>
          </div>
        </div>

        <div className={`cart-toast ${toast.show ? "show" : ""}`}>
          {toast.message}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
