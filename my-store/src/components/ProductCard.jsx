import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toTitleCase } from "../utils/textUtils";
import { useTranslation } from "react-i18next";

/** Format price with commas */
function formatPrice(price) {
  if (!price && price !== 0) return "0";
  return Number(price).toLocaleString("en-EG");
}

function ProductCard({ product, addToCart, addToWishlist, isInWishlist }) {
  const { t, i18n } = useTranslation();
  const [toast, setToast] = useState({ show: false, message: "" });
  const cardRef = useRef(null);
  const navigate = useNavigate();

  // Auto-hide toast after 2s
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: "" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product);
    setToast({ show: true, message: t("product.added_to_cart_toast") });
  };

  const handleAddToWishlist = (e) => {
    e.stopPropagation();
    addToWishlist(product);
    setToast({ show: true, message: t("product.added_to_wishlist_toast") });
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

  const properName = toTitleCase(product.name);

  return (
    <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
      <div
        className="product-card"
        ref={cardRef}
        role="link"
        tabIndex={0}
        onClick={openProductDetails}
        onKeyDown={handleCardKeyDown}
        style={{ cursor: "pointer" }}
      >
        {/* Product Image */}
        <div className="product-img-wrapper">
          <img
            src={product.image}
            alt={properName}
            className="product-img img-fluid"
          />

          {/* Hover/Active Details Overlay */}
          <div className="product-details-overlay">
            <div className="overlay-content">
              <h6 className="overlay-title">{properName}</h6>
              {product.category && (
                <span className="overlay-category">{product.category}</span>
              )}
              {product.details && (
                <p className="overlay-description">{product.details}</p>
              )}
              <span className="overlay-price">{t("navbar.currency")} {formatPrice(product.price)}</span>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="product-info p-3">
          <h5 className="product-title fw-bold" title={product.name}>
            {properName}
          </h5>

          {product.category && (
            <span className="category-badge">
              {product.category}
            </span>
          )}

          {product.details && (
            <div className="text-muted small mb-2 details-text" title={product.details}>
              {product.details}
            </div>
          )}


          <div className="mt-auto d-flex align-items-center justify-content-between pt-3 price-row">
            <span className="product-price mb-0">{t("navbar.currency")} {formatPrice(product.price)}</span>
            <div className="d-flex gap-2">
              <button
                className={`btn ${isInWishlist ? "btn-danger" : "btn-outline-danger"} add-btn-sm border-0`}
                onClick={handleAddToWishlist}
                title={isInWishlist ? t("product.already_in_wishlist") : t("product.add_to_wishlist")}
                disabled={isInWishlist}
              >
                <i className={`bi ${isInWishlist ? "bi-heart-fill" : "bi-heart"}`}></i>
              </button>
              <button
                className="btn btn-primary-custom add-btn-sm"
                onClick={handleAddToCart}
                title={t("product.add_to_cart")}
              >
                <i className="bi bi-cart-plus"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <div className={`cart-toast ${toast.show ? "show" : ""}`}>
          {toast.message}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
