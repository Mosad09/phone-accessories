import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getLocalizedField } from "../utils/localization";
import {
  calculateCartTotals,
  formatPrice,
  getCartItemKey,
  getEffectivePrice,
} from "../utils/pricing";

const WHATSAPP_NUMBER = "201125522130";

function addressToString(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address === "object") {
    return [address.governorate, address.city, address.detail].filter(Boolean).join(", ");
  }
  return "";
}

function createOrderPayload({
  fullName,
  phone,
  email,
  address,
  notes,
  totals,
  paymentMethod,
  cart,
}) {
  return {
    orderId: `ORD-${Date.now().toString().slice(-6)}`,
    customerName: fullName.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: address.trim(),
    notes: notes.trim(),
    couponCode: totals.coupon?.code || "",
    couponDiscount: totals.couponDiscount,
    shippingFee: totals.shipping,
    items: cart.map((item) => {
      const unitPrice = getEffectivePrice(item);
      return {
        ...item,
        productId: item.productId || item.id,
        costPrice: Number(item.costPrice) || 0,
        sellPrice: unitPrice,
        price: unitPrice,
      };
    }),
    totalPrice: totals.total,
    status: "pending",
    paymentMethod,
    createdAt: new Date().toISOString(),
  };
}

function CheckoutModalContent({ onClose, cart, couponCode, user, dbUser, onOrderConfirmed }) {
  const { t, i18n } = useTranslation();
  const [fullName, setFullName] = useState(() => (user ? dbUser?.name || user.displayName || "" : ""));
  const [phone, setPhone] = useState(() => (user ? dbUser?.phone || user.phoneNumber || "" : ""));
  const [email, setEmail] = useState(() => (user ? dbUser?.email || user.email || "" : ""));
  const [address, setAddress] = useState(() => (user ? addressToString(dbUser?.address) : ""));
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form"); // "form" | "confirm"
  const modalRef = useRef(null);

  const totals = calculateCartTotals(cart, couponCode);
  const totalCount = cart.reduce((sum, item) => sum + Math.max(1, Number(item.qty) || 1), 0);
  const getItemName = (item) => getLocalizedField(item, "name") || item.name || "";

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (step === "form") onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && step === "form") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [step, onClose]);

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = t("checkout.err_name");
    if (!phone.trim()) newErrors.phone = t("checkout.err_phone_req");
    else if (!/^[\d\s+()-]{8,}$/.test(phone.trim())) newErrors.phone = t("checkout.err_phone_valid");
    if (!email.trim()) newErrors.email = t("checkout.err_email_req");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = t("checkout.err_email_valid");
    if (!address.trim()) newErrors.address = t("checkout.err_address");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildWhatsAppMessage = () => {
    let msg = "*New Order - Veltrix*\n\n";
    msg += `*Customer:* ${fullName.trim()}\n`;
    msg += `*Phone:* ${phone.trim()}\n`;
    msg += `*Email:* ${email.trim()}\n`;
    msg += `*Address:* ${address.trim()}\n`;
    msg += `*Payment:* ${paymentMethod}\n`;
    if (notes.trim()) msg += `*Notes:* ${notes.trim()}\n`;
    msg += "\n*Order Details:*\n";
    cart.forEach((item, idx) => {
      const unitPrice = getEffectivePrice(item);
      const variant = [item.selectedColor, item.selectedSize].filter(Boolean).join(" / ");
      msg += `${idx + 1}. ${getItemName(item)}${variant ? ` (${variant})` : ""} x ${item.qty} - ${formatPrice(unitPrice * item.qty)} EGP\n`;
    });
    if (totals.coupon) {
      msg += `\n*Promo Code (${totals.coupon.code}):* -${formatPrice(totals.couponDiscount)} EGP`;
    }
    msg += `\n*Shipping:* ${totals.isFreeShipping ? "FREE" : `${formatPrice(totals.shipping)} EGP`}`;
    msg += `\n*Total: ${formatPrice(totals.total)} EGP*`;
    return msg;
  };

  const handleSendToWhatsApp = () => {
    if (!validate()) return;
    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setStep("confirm");
  };

  const handleDirectOrder = () => {
    if (!validate()) return;
    onOrderConfirmed(
      createOrderPayload({
        fullName,
        phone,
        email,
        address,
        notes,
        totals,
        paymentMethod,
        cart,
      })
    );
    onClose();
  };

  const handleConfirmYes = () => {
    onOrderConfirmed(
      createOrderPayload({
        fullName,
        phone,
        email,
        address,
        notes,
        totals,
        paymentMethod,
        cart,
      })
    );
    onClose();
  };

  return (
    <div className="checkout-modal-overlay" onClick={handleBackdropClick}>
      <div
        className="checkout-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        {step === "form" && (
          <>
            <div className="checkout-modal-header">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-bag-check fs-5 text-primary-custom"></i>
                <h5 id="checkout-title" className="fw-bold mb-0">{t("checkout.title")}</h5>
              </div>
              <button type="button" className="checkout-modal-close" onClick={onClose} aria-label={t("common.close")}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="checkout-modal-body">
              <div className="checkout-order-summary">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted-custom" style={{ fontSize: "0.85rem" }}>
                    {totalCount === 1
                      ? t("checkout.items_count_one", { count: totalCount })
                      : t("checkout.items_count_other", { count: totalCount })}
                  </span>
                  <span className="fw-bold text-primary-custom">
                    {formatPrice(totals.total, i18n.language)} {t("navbar.currency")}
                  </span>
                </div>
                {(totals.couponDiscount > 0 || !totals.isFreeShipping || totals.coupon) && (
                  <div className="d-flex flex-wrap gap-3 small text-muted-custom mb-2">
                    {totals.couponDiscount > 0 && (
                      <span className="text-success fw-medium">
                        {t("checkout.discount")}: -{formatPrice(totals.couponDiscount, i18n.language)} {t("navbar.currency")}
                      </span>
                    )}
                    <span>
                      {t("checkout.shipping")}: {totals.isFreeShipping
                        ? t("checkout.free")
                        : `${formatPrice(totals.shipping, i18n.language)} ${t("navbar.currency")}`}
                    </span>
                  </div>
                )}
                <div className="checkout-items-preview">
                  {cart.slice(0, 3).map((item) => (
                    <img
                      key={getCartItemKey(item)}
                      src={item.image}
                      alt={getItemName(item)}
                      className="checkout-item-thumb"
                      title={`${getItemName(item)} x ${item.qty}`}
                    />
                  ))}
                  {cart.length > 3 && (
                    <span className="checkout-more-items">+{cart.length - 3}</span>
                  )}
                </div>
              </div>

              {user ? (
                <div className="checkout-user-badge">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" width="20" height="20" className="rounded-circle" />
                  )}
                  <span>{email || user.email}</span>
                </div>
              ) : (
                <div className="checkout-guest-badge">
                  <i className="bi bi-person"></i>
                  <span>{t("checkout.guest_badge")}</span>
                </div>
              )}

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-full-name">
                  {t("checkout.name")} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="checkout-full-name"
                  autoComplete="name"
                  className={`checkout-input ${errors.fullName ? "checkout-input-error" : ""}`}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, fullName: "" })); }}
                  placeholder={t("checkout.name_placeholder")}
                />
                {errors.fullName && <span className="checkout-error">{errors.fullName}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-phone">
                  {t("checkout.phone")} <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  id="checkout-phone"
                  autoComplete="tel"
                  className={`checkout-input ${errors.phone ? "checkout-input-error" : ""}`}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: "" })); }}
                  placeholder={t("checkout.phone_placeholder")}
                />
                {errors.phone && <span className="checkout-error">{errors.phone}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-email">
                  {t("checkout.email")} <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  id="checkout-email"
                  autoComplete="email"
                  className={`checkout-input ${errors.email ? "checkout-input-error" : ""}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: "" })); }}
                  placeholder={t("checkout.email_placeholder")}
                />
                {errors.email && <span className="checkout-error">{errors.email}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-address">
                  {t("checkout.address")} <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`checkout-input checkout-textarea ${errors.address ? "checkout-input-error" : ""}`}
                  id="checkout-address"
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setErrors((prev) => ({ ...prev, address: "" })); }}
                  placeholder={t("checkout.address_placeholder")}
                  rows={2}
                />
                {errors.address && <span className="checkout-error">{errors.address}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-payment">
                  {t("checkout.payment_method")}
                </label>
                <select
                  id="checkout-payment"
                  className="checkout-input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash on Delivery">{t("checkout.payment_cod")}</option>
                  <option value="Vodafone Cash">{t("checkout.payment_vodafone")}</option>
                  <option value="InstaPay">{t("checkout.payment_instapay")}</option>
                </select>
              </div>

              <div className="checkout-form-group mb-0">
                <label className="checkout-label" htmlFor="checkout-notes">
                  {t("checkout.notes")}
                </label>
                <input
                  type="text"
                  id="checkout-notes"
                  className="checkout-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("checkout.notes_placeholder")}
                />
              </div>
            </div>

            <div className="checkout-modal-footer d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-primary-custom w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                onClick={handleSendToWhatsApp}
              >
                <i className="bi bi-whatsapp fs-5"></i>
                {t("checkout.send_whatsapp")}
              </button>
              <button
                type="button"
                className="btn btn-outline-custom w-100 py-2 fw-semibold"
                onClick={handleDirectOrder}
              >
                <i className="bi bi-bag-check me-2"></i>
                {t("checkout.place_direct")}
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <div className="checkout-confirm-step">
            <div className="checkout-confirm-icon">
              <i className="bi bi-question-circle"></i>
            </div>
            <h5 className="fw-bold mb-2">{t("checkout.confirm_title")}</h5>
            <p className="text-muted-custom mb-4" style={{ fontSize: "0.92rem" }}>
              {t("checkout.confirm_desc")}
            </p>
            <div className="d-flex gap-3 w-100 checkout-confirm-actions">
              <button type="button" className="btn flex-1 py-2 fw-semibold checkout-confirm-no" onClick={() => setStep("form")}>
                {t("checkout.confirm_no")}
              </button>
              <button type="button" className="btn btn-primary-custom flex-1 py-2 fw-semibold checkout-confirm-yes" onClick={handleConfirmYes}>
                <i className="bi bi-check-lg me-1"></i>
                {t("checkout.confirm_yes")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ isOpen, ...props }) {
  if (!isOpen) return null;
  return <CheckoutModalContent key="checkout-open" {...props} />;
}

export default CheckoutModal;
