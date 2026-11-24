import { useState, useEffect } from "react";
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

function WishlistPage({ wishlist, removeFromWishlist, clearWishlist, addToCart, navigate }) {
  const [toast, setToast] = useState({ show: false, message: "" });
  const { t, i18n } = useTranslation();
  const routerNavigate = useNavigate();

  const getItemName = (item) => toTitleCase(getLocalizedField(item, "name") || item.name || "");
  const getItemCategory = (item) => getLocalizedField(item, "category") || item.category || "";

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: "" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleAddToCart = (item) => {
    if (Number(item.stock) <= 0) return;
    addToCart(item);
    removeFromWishlist(item.id);
    setToast({ show: true, message: t("product.added_to_cart_toast") });
  };

  const handleMoveAllToCart = () => {
    const inStockItems = wishlist.filter((item) => Number(item.stock) > 0);
    if (inStockItems.length === 0) return;
    inStockItems.forEach((item) => {
      addToCart(item);
      removeFromWishlist(item.id);
    });
    setToast({ show: true, message: t("wishlist.moved_all_toast") });
  };

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center">
          <button
            type="button"
            className="btn btn-link text-decoration-none text-muted-custom p-0 me-3"
            onClick={() => navigate("home")}
            aria-label={t("common.back")}
          >
            <i className="bi bi-arrow-left fs-4"></i>
          </button>
          <h2 className="fw-bold mb-0">{t("wishlist.title")}</h2>
        </div>

        {wishlist.length > 0 && (
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-primary-custom rounded-pill px-3"
              onClick={handleMoveAllToCart}
            >
              <i className="bi bi-cart-plus me-1"></i>
              {t("wishlist.move_all")}
            </button>
            {clearWishlist && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                onClick={clearWishlist}
              >
                <i className="bi bi-trash me-1"></i>
                {t("wishlist.clear_all")}
              </button>
            )}
          </div>
        )}
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-heart fs-1 text-muted-custom mb-3 d-block opacity-50"></i>
          <h4 className="text-muted-custom">{t("wishlist.empty")}</h4>
          <p className="text-muted-custom opacity-75">{t("wishlist.empty_subtitle")}</p>
          <button
            type="button"
            className="btn btn-outline-custom mt-3 px-4 py-2"
            onClick={() => navigate("home")}
          >
            {t("wishlist.discover")}
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {wishlist.map((item) => {
            const inStock = Number(item.stock) > 0;
            const onSale = hasDiscount(item);
            const effectivePrice = getEffectivePrice(item);
            const originalPrice = getOriginalPrice(item);
            const percent = getDiscountPercent(item);

            return (
              <div key={item.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card shadow-sm border-0 h-100 product-card">
                  <div
                    className="product-img-wrapper"
                    onClick={() => routerNavigate(`/product/${item.id}`)}
                  >
                    {onSale && (
                      <div className="product-card-badges">
                        <span className="product-sale-badge">-{percent}%</span>
                      </div>
                    )}
                    <img
                      src={item.image}
                      alt={getItemName(item)}
                      className="card-img-top product-img img-fluid"
                    />
                    <button
                      type="button"
                      className="btn btn-light position-absolute top-0 end-0 m-2 rounded-circle shadow-sm"
                      style={{
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(item.id);
                      }}
                      title={t("wishlist.remove")}
                      aria-label={t("wishlist.remove")}
                    >
                      <i className="bi bi-trash text-danger"></i>
                    </button>
                  </div>
                  <div className="card-body d-flex flex-column p-3">
                    <h5
                      className="card-title fw-bold fs-6 mb-1 text-truncate"
                      title={getItemName(item)}
                      style={{ cursor: "pointer" }}
                      onClick={() => routerNavigate(`/product/${item.id}`)}
                    >
                      {getItemName(item)}
                    </h5>
                    {getItemCategory(item) && (
                      <span className="category-badge mb-2">{getItemCategory(item)}</span>
                    )}
                    <div className="mt-auto pt-3 d-flex align-items-center justify-content-between border-top">
                      <div>
                        <span className="fw-bold text-primary-custom d-block">
                          {t("navbar.currency")} {formatPrice(effectivePrice, i18n.language)}
                        </span>
                        {onSale && (
                          <small className="text-muted-custom text-decoration-line-through">
                            {t("navbar.currency")} {formatPrice(originalPrice, i18n.language)}
                          </small>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary-custom px-3 py-1 rounded-pill shadow-sm"
                        disabled={!inStock}
                        onClick={() => handleAddToCart(item)}
                      >
                        <i className="bi bi-cart-plus me-1"></i>
                        {inStock ? t("wishlist.add") : t("product.out_of_stock")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`cart-toast ${toast.show ? "show" : ""}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default WishlistPage;
