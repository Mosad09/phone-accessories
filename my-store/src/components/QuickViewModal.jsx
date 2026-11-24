import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toTitleCase } from "../utils/textUtils";
import { getLocalizedField } from "../utils/localization";
import {
  formatPrice,
  getDiscountPercent,
  getEffectivePrice,
  getOriginalPrice,
  hasDiscount,
} from "../utils/pricing";

function toVariantArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function QuickViewContent({
  product,
  onClose,
  addToCart,
  addToWishlist,
  isInWishlist,
  onToggleCompare,
  isInCompare,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const gallery = useMemo(
    () => [...new Set([product.image, ...(product.images || [])].filter(Boolean))],
    [product]
  );
  const colors = useMemo(() => toVariantArray(product.colors), [product.colors]);
  const sizes = useMemo(() => toVariantArray(product.sizes), [product.sizes]);

  const [activeImage, setActiveImage] = useState(() => gallery[0] || product.image || "");
  const [selectedColor, setSelectedColor] = useState(() => colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(() => sizes[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const localizedName = toTitleCase(getLocalizedField(product, "name"));
  const localizedCategory = getLocalizedField(product, "category");
  const localizedDesc = getLocalizedField(product, "description") || getLocalizedField(product, "details");
  const inStock = Number(product.stock) > 0;
  const effectivePrice = getEffectivePrice(product);
  const originalPrice = getOriginalPrice(product);
  const onSale = hasDiscount(product);
  const discountPercent = getDiscountPercent(product);
  const wishlisted = isInWishlist(product.id);
  const compared = isInCompare?.(product.id);

  const handleAdd = () => {
    addToCart(product, quantity, { selectedColor, selectedSize });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <div className="checkout-modal-overlay quickview-overlay" onClick={onClose}>
      <div
        className="quickview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="quickview-close"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <i className="bi bi-x-lg" aria-hidden="true"></i>
        </button>

        <div className="row g-4 align-items-stretch">
          <div className="col-md-6">
            <div className="quickview-media-box">
              {onSale && (
                <span className="product-sale-badge">-{discountPercent}%</span>
              )}
              {activeImage ? (
                <img src={activeImage} alt={localizedName} className="quickview-main-img" />
              ) : (
                <i className="bi bi-image text-muted-custom fs-1"></i>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="d-flex gap-2 flex-wrap mt-3">
                {gallery.map((img) => (
                  <button
                    key={img}
                    type="button"
                    className={`quickview-thumb-btn ${activeImage === img ? "active" : ""}`}
                    onClick={() => setActiveImage(img)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="col-md-6 d-flex flex-column">
            <div className="d-flex flex-wrap gap-2 mb-2">
              {localizedCategory && <span className="category-badge mb-0">{localizedCategory}</span>}
              {product.featured && (
                <span className="badge bg-warning text-dark rounded-pill px-3 py-1">
                  {t("product.featured")}
                </span>
              )}
            </div>

            <h3 id="quickview-title" className="fw-bold mb-2">{localizedName}</h3>

            <div className="d-flex align-items-baseline gap-2 mb-3 flex-wrap">
              <span className="product-price fs-3">
                {t("navbar.currency")} {formatPrice(effectivePrice, i18n.language)}
              </span>
              {onSale && (
                <span className="text-muted-custom text-decoration-line-through">
                  {t("navbar.currency")} {formatPrice(originalPrice, i18n.language)}
                </span>
              )}
            </div>

            <span
              className={`badge rounded-pill align-self-start mb-3 ${
                inStock
                  ? "bg-success-subtle text-success border border-success-subtle"
                  : "bg-danger-subtle text-danger border border-danger-subtle"
              }`}
            >
              {inStock
                ? t("product.in_stock_count", { count: product.stock })
                : t("product.out_of_stock")}
            </span>

            {localizedDesc && (
              <p className="text-muted-custom small mb-3 quickview-desc">{localizedDesc}</p>
            )}

            {colors.length > 0 && (
              <div className="mb-3">
                <div className="small fw-semibold mb-2">{t("product.select_color")}</div>
                <div className="d-flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`variant-chip ${selectedColor === color ? "active" : ""}`}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mb-3">
                <div className="small fw-semibold mb-2">{t("product.select_size")}</div>
                <div className="d-flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`variant-chip ${selectedSize === size ? "active" : ""}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-3 border-top d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="qty-controls d-flex align-items-center px-2 py-1">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <i className="bi bi-dash"></i>
                  </button>
                  <span className="qty-val">{quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.min(product.stock || q + 1, q + 1))}
                    disabled={!inStock || quantity >= product.stock}
                    aria-label="Increase quantity"
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary-custom flex-grow-1 py-2 px-4 fw-bold d-flex align-items-center justify-content-center gap-2"
                  disabled={!inStock}
                  onClick={handleAdd}
                >
                  <i className={`bi ${addedFeedback ? "bi-check2-circle" : "bi-cart-plus"}`}></i>
                  {addedFeedback
                    ? t("product.added_to_cart_toast")
                    : inStock
                    ? t("product.add_to_cart")
                    : t("product.out_of_stock")}
                </button>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className={`btn btn-sm ${wishlisted ? "btn-danger" : "btn-outline-custom"}`}
                  onClick={() => addToWishlist(product)}
                  disabled={wishlisted}
                >
                  <i className={`bi ${wishlisted ? "bi-heart-fill" : "bi-heart"} me-1`}></i>
                  {wishlisted ? t("product.already_in_wishlist") : t("product.add_to_wishlist")}
                </button>

                {onToggleCompare && (
                  <button
                    type="button"
                    className={`btn btn-sm ${compared ? "btn-primary-custom" : "btn-outline-custom"}`}
                    onClick={() => onToggleCompare(product)}
                  >
                    <i className="bi bi-arrow-left-right me-1"></i>
                    {t("product.compare")}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary-custom ms-auto rounded-pill px-3"
                  onClick={() => {
                    onClose();
                    navigate(`/product/${product.id}`);
                  }}
                >
                  {t("product.view_full_details")}
                  <i className="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickViewModal(props) {
  if (!props.product) return null;
  return createPortal(
    <QuickViewContent key={props.product.id} {...props} />,
    document.body
  );
}

export default QuickViewModal;
