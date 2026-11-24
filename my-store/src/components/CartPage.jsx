import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import CheckoutModal from "./CheckoutModal";
import { toTitleCase } from "../utils/textUtils";
import { getLocalizedField } from "../utils/localization";
import {
  calculateCartTotals,
  formatPrice,
  getActivePromoCodes,
  getCartItemKey,
  getEffectivePrice,
  getOriginalPrice,
  hasDiscount,
  validatePromoCode,
} from "../utils/pricing";

function CartPage({
  cart,
  updateQuantity,
  removeFromCart,
  clearCart,
  couponCode,
  onApplyCoupon,
  onClearCoupon,
  storeSettings,
  navigate,
  user,
  dbUser,
  onOrderConfirmed,
}) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [promoInput, setPromoInput] = useState(couponCode || "");
  const [promoFeedback, setPromoFeedback] = useState({ type: "", message: "" });
  const { t, i18n } = useTranslation();
  const routerNavigate = useNavigate();

  const isArabic = i18n.language === "ar";
  const offerConfig = storeSettings?.shippingAndOffers;
  const activePromoCodes = getActivePromoCodes(offerConfig);
  const hasPromoSystem = activePromoCodes.length > 0;

  const getItemName = (item) => toTitleCase(getLocalizedField(item, "name") || item.name || "");
  const totals = calculateCartTotals(cart, couponCode, offerConfig);
  const totalCount = cart.reduce((acc, curr) => acc + Math.max(1, Number(curr.qty) || 1), 0);

  const handlePromoSubmit = (e) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    const check = validatePromoCode(code, totals.subtotal, offerConfig);
    if (!check.valid) {
      if (check.reason === "min_not_met") {
        setPromoFeedback({
          type: "error",
          message: t("cart.promo_min_not_met", { min: check.minSubtotal }),
        });
      } else {
        setPromoFeedback({ type: "error", message: t("cart.promo_invalid") });
      }
      return;
    }
    onApplyCoupon?.(check.promo.code);
    setPromoInput(check.promo.code);
    setPromoFeedback({
      type: "success",
      message: t("cart.promo_applied", { code: check.promo.code }),
    });
  };

  const getPromoLabel = (promo) => {
    if (!promo) return "";
    if (isArabic) return promo.labelAr || promo.labelEn || promo.code;
    return promo.labelEn || promo.labelAr || promo.code;
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
          <h2 className="fw-bold mb-0">{t("cart.shopping_cart")}</h2>
        </div>

        {cart.length > 0 && clearCart && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger rounded-pill px-3"
            onClick={clearCart}
          >
            <i className="bi bi-trash me-1"></i>
            {t("cart.clear_cart")}
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-cart-x fs-1 text-muted-custom mb-3 d-block opacity-50"></i>
          <h4 className="text-muted-custom">{t("cart.empty")}</h4>
          <p className="text-muted-custom opacity-75">{t("cart.empty_subtitle")}</p>
          <button
            type="button"
            className="btn btn-primary-custom mt-3 px-4 py-2 rounded-pill fw-semibold"
            onClick={() => navigate("home")}
          >
            {t("cart.continue_shopping")}
          </button>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            {/* Free Shipping Progress Bar — shown only when enabled by Admin */}
            {totals.freeShippingEnabled && (
              <div className="cart-shipping-banner mb-3">
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                  <span className="fw-semibold small d-flex align-items-center gap-2">
                    <i className={`bi ${totals.isFreeShipping ? "bi-check-circle-fill text-success" : "bi-truck text-primary-custom"}`}></i>
                    {totals.isFreeShipping
                      ? t("cart.free_shipping_unlocked")
                      : t("cart.free_shipping_remaining", {
                          amount: formatPrice(totals.amountToFreeShipping, i18n.language),
                          currency: t("navbar.currency"),
                        })}
                  </span>
                  <span className="small fw-bold text-primary-custom">{totals.freeShippingProgress}%</span>
                </div>
                <div className="progress cart-shipping-progress" role="progressbar" aria-valuenow={totals.freeShippingProgress} aria-valuemin="0" aria-valuemax="100">
                  <div
                    className={`progress-bar ${totals.isFreeShipping ? "bg-success" : "bg-primary-custom"}`}
                    style={{ width: `${totals.freeShippingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {cart.map((item) => {
                    const itemKey = getCartItemKey(item);
                    const unitPrice = getEffectivePrice(item);
                    const origPrice = getOriginalPrice(item);
                    const onSale = hasDiscount(item);
                    const maxStock = Number(item.stock) > 0 ? Number(item.stock) : Infinity;

                    return (
                      <li key={itemKey} className="list-group-item cart-page-item p-3 p-md-4">
                        <div className="row align-items-center">
                          <div className="col-auto">
                            <img
                              src={item.image}
                              alt={getItemName(item)}
                              className="rounded cart-product-image"
                              style={{ width: "80px", height: "80px", objectFit: "cover", cursor: "pointer" }}
                              onClick={() => routerNavigate(`/product/${item.id}`)}
                            />
                          </div>
                          <div className="col cart-product-copy">
                            <h6
                              className="mb-1 text-truncate"
                              title={getItemName(item)}
                              style={{ cursor: "pointer" }}
                              onClick={() => routerNavigate(`/product/${item.id}`)}
                            >
                              {getItemName(item)}
                            </h6>

                            {(item.selectedColor || item.selectedSize) && (
                              <div className="d-flex flex-wrap gap-1 mb-1">
                                {item.selectedColor && (
                                  <span className="badge bg-light text-dark border small">{item.selectedColor}</span>
                                )}
                                {item.selectedSize && (
                                  <span className="badge bg-light text-dark border small">{item.selectedSize}</span>
                                )}
                              </div>
                            )}

                            <div className="d-flex align-items-baseline gap-2 flex-wrap">
                              <span className="text-primary-custom fw-bold">
                                {formatPrice(unitPrice, i18n.language)} {t("navbar.currency")}
                              </span>
                              {onSale && (
                                <small className="text-muted-custom text-decoration-line-through">
                                  {formatPrice(origPrice, i18n.language)} {t("navbar.currency")}
                                </small>
                              )}
                            </div>
                          </div>

                          <div className="col-12 col-md-auto mt-3 mt-md-0 d-flex align-items-center justify-content-between gap-3 cart-page-actions">
                            <div className="qty-controls d-flex align-items-center border rounded px-2 py-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                                onClick={() => updateQuantity(itemKey, item.qty - 1)}
                                disabled={item.qty <= 1}
                                aria-label={`Decrease quantity of ${getItemName(item)}`}
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <span className="mx-3 fw-semibold">{item.qty}</span>
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                                onClick={() => updateQuantity(itemKey, Math.min(maxStock, item.qty + 1))}
                                disabled={item.qty >= maxStock}
                                aria-label={`Increase quantity of ${getItemName(item)}`}
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>

                            <div className="text-end" style={{ minWidth: "90px" }}>
                              <small className="text-muted-custom d-block" style={{ fontSize: "0.72rem" }}>
                                {t("cart.item_subtotal")}
                              </small>
                              <span className="fw-bold">
                                {formatPrice(unitPrice * item.qty, i18n.language)} {t("navbar.currency")}
                              </span>
                            </div>

                            <button
                              type="button"
                              className="btn btn-link text-danger p-2"
                              onClick={() => removeFromCart(itemKey)}
                              title={t("cart.remove")}
                              aria-label={`${t("cart.remove")} ${getItemName(item)}`}
                            >
                              <i className="bi bi-trash fs-5"></i>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm border-0 sticky-top" style={{ top: "5.5rem" }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">{t("cart.order_summary")}</h5>

                {/* Promo Code Input — shown only when active promo codes exist */}
                {hasPromoSystem && (
                  <form className="mb-3" onSubmit={handlePromoSubmit}>
                    <label className="form-label small fw-semibold mb-1" htmlFor="cart-promo-input">
                      {t("cart.promo_label")}
                    </label>
                    <div className="input-group">
                      <input
                        id="cart-promo-input"
                        type="text"
                        className="form-control text-uppercase"
                        placeholder={t("cart.promo_input_placeholder")}
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value);
                          if (promoFeedback.message) setPromoFeedback({ type: "", message: "" });
                        }}
                      />
                      <button type="submit" className="btn btn-outline-primary-custom fw-semibold">
                        {t("cart.apply")}
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      {activePromoCodes.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="badge bg-light text-dark border text-decoration-none"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setPromoInput(p.code);
                            const check = validatePromoCode(p.code, totals.subtotal, offerConfig);
                            if (check.valid) {
                              onApplyCoupon?.(p.code);
                              setPromoFeedback({
                                type: "success",
                                message: t("cart.promo_applied", { code: p.code }),
                              });
                            } else if (check.reason === "min_not_met") {
                              setPromoFeedback({
                                type: "error",
                                message: t("cart.promo_min_not_met", { min: check.minSubtotal }),
                              });
                            }
                          }}
                        >
                          {p.code}
                        </button>
                      ))}
                    </div>
                    {promoFeedback.message && (
                      <div className={`small mt-1 fw-medium ${promoFeedback.type === "error" ? "text-danger" : "text-success"}`}>
                        {promoFeedback.message}
                      </div>
                    )}
                    {totals.coupon && (
                      <div className="promo-applied-pill mt-2">
                        <span>
                          <i className="bi bi-tag-fill me-1"></i>
                          <strong>{totals.coupon.code}</strong> — {getPromoLabel(totals.coupon)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                          onClick={() => {
                            onClearCoupon?.();
                            setPromoInput("");
                            setPromoFeedback({ type: "", message: "" });
                          }}
                        >
                          {t("cart.remove_promo")}
                        </button>
                      </div>
                    )}
                  </form>
                )}

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted-custom">
                    {t("cart.subtotal")} ({totalCount === 1
                      ? t("cart.items_count_one", { count: totalCount })
                      : t("cart.items_count_other", { count: totalCount })})
                  </span>
                  <span className="fw-semibold">
                    {formatPrice(totals.subtotal, i18n.language)} {t("navbar.currency")}
                  </span>
                </div>

                {totals.itemDiscountSavings > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-success small fw-semibold">
                    <span>{t("cart.discount_savings")}</span>
                    <span>-{formatPrice(totals.itemDiscountSavings, i18n.language)} {t("navbar.currency")}</span>
                  </div>
                )}

                {totals.coupon && totals.couponDiscount > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-success small fw-semibold">
                    <span>{t("cart.promo_discount", { code: totals.coupon.code })}</span>
                    <span>-{formatPrice(totals.couponDiscount, i18n.language)} {t("navbar.currency")}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted-custom">{t("cart.shipping")}</span>
                  <span className={`fw-semibold ${totals.isFreeShipping ? "text-success" : ""}`}>
                    {totals.isFreeShipping
                      ? t("cart.free_shipping")
                      : `${formatPrice(totals.shipping, i18n.language)} ${t("navbar.currency")}`}
                  </span>
                </div>

                <hr className="my-3 opacity-25" />

                <div className="d-flex justify-content-between mb-2 fs-5">
                  <span className="fw-bold">{t("cart.total")}</span>
                  <span className="fw-bold text-primary-custom">
                    {formatPrice(totals.total, i18n.language)} {t("navbar.currency")}
                  </span>
                </div>

                <p className="text-muted-custom small mb-4">
                  <i className="bi bi-shield-check text-success me-1"></i>
                  {t("cart.cod_available")}
                </p>

                <button
                  type="button"
                  className="btn btn-primary-custom w-100 py-3 rounded-3 fw-bold shadow-sm"
                  onClick={() => setShowCheckout(true)}
                >
                  <i className="bi bi-bag-check me-2"></i>
                  {t("cart.checkout")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        couponCode={couponCode}
        storeSettings={storeSettings}
        user={user}
        dbUser={dbUser}
        onOrderConfirmed={(orderData) => {
          onOrderConfirmed(orderData);
          setShowCheckout(false);
        }}
      />
    </div>
  );
}

export default CartPage;
