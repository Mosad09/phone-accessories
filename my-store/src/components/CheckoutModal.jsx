import { useState, useEffect, useRef } from "react";


function formatPrice(price) {
  if (!price && price !== 0) return "0";
  return Number(price).toLocaleString("en-EG");
}

const WHATSAPP_NUMBER = "201125522130";

function addressToString(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address === "object") {
    return [address.governorate, address.city, address.detail].filter(Boolean).join(", ");
  }
  return "";
}

function CheckoutModal({ isOpen, onClose, cart, totalPrice, user, dbUser, onOrderConfirmed }) {

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form"); // "form" | "confirm"
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Opening the modal intentionally resets the checkout draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("form");
    setErrors({});
    if (user) {
      setFullName(dbUser?.name || user.displayName || "");
      setPhone(dbUser?.phone || user.phoneNumber || "");
      setEmail(dbUser?.email || user.email || "");
      setAddress(addressToString(dbUser?.address));
      return;
    }

    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");
  }, [isOpen, user, dbUser]);

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (step === "form") onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && step === "form") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, step, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^[\d\s+()-]{8,}$/.test(phone.trim())) newErrors.phone = "Enter a valid phone number";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Enter a valid email address";
    if (!address.trim()) newErrors.address = "Address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildWhatsAppMessage = () => {
    let msg = "*New Order - Veltrix*\n\n";
    msg += `*Customer:* ${fullName.trim()}\n`;
    msg += `*Phone:* ${phone.trim()}\n`;
    msg += `*Email:* ${email.trim()}\n`;
    msg += `*Address:* ${address.trim()}\n\n`;
    msg += "*Order Details:*\n";
    cart.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.name} x ${item.qty} - ${formatPrice(item.price * item.qty)} EGP\n`;
    });
    msg += `\n*Total: ${formatPrice(totalPrice)} EGP*`;
    return msg;
  };

  const handleSendToWhatsApp = () => {
    if (!validate()) return;

    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setStep("confirm");
  };

  const handleConfirmYes = () => {
    const orderData = {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      customerName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      items: cart.map((item) => ({
        ...item,
        productId: item.productId || item.id,
        costPrice: Number(item.costPrice) || 0,
        sellPrice: Number(item.sellPrice ?? item.price) || 0,
        price: Number(item.sellPrice ?? item.price) || 0,
      })),
      totalPrice,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    onOrderConfirmed(orderData);
    setStep("form");
    onClose();
  };

  const handleConfirmNo = () => {
    setStep("form");
    onClose();
  };

  if (!isOpen) return null;

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
                <h5 id="checkout-title" className="fw-bold mb-0">Checkout</h5>
              </div>
              <button className="checkout-modal-close" onClick={onClose} aria-label="Close">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="checkout-modal-body">
              <div className="checkout-order-summary">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted-custom" style={{ fontSize: "0.85rem" }}>
                    {cart.reduce((sum, item) => sum + item.qty, 0)} item(s)
                  </span>
                  <span className="fw-bold text-primary-custom">
                    {formatPrice(totalPrice)} EGP
                  </span>
                </div>
                <div className="checkout-items-preview">
                  {cart.slice(0, 3).map((item) => (
                    <img
                      key={item.id}
                      src={item.image}
                      alt={item.name}
                      className="checkout-item-thumb"
                      title={`${item.name} x ${item.qty}`}
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
                  <span>Checking out as guest</span>
                </div>
              )}

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-full-name">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="checkout-full-name"
                  autoComplete="name"
                  className={`checkout-input ${errors.fullName ? "checkout-input-error" : ""}`}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors(prev => ({ ...prev, fullName: "" })); }}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <span className="checkout-error">{errors.fullName}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-phone">
                  Phone Number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  id="checkout-phone"
                  autoComplete="tel"
                  className={`checkout-input ${errors.phone ? "checkout-input-error" : ""}`}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: "" })); }}
                  placeholder="e.g. 01012345678"
                />
                {errors.phone && <span className="checkout-error">{errors.phone}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-email">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  id="checkout-email"
                  autoComplete="email"
                  className={`checkout-input ${errors.email ? "checkout-input-error" : ""}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }}
                  placeholder="you@example.com"
                />
                {errors.email && <span className="checkout-error">{errors.email}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label" htmlFor="checkout-address">
                  Address <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`checkout-input checkout-textarea ${errors.address ? "checkout-input-error" : ""}`}
                  id="checkout-address"
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setErrors(prev => ({ ...prev, address: "" })); }}
                  placeholder="Street, building, city, governorate..."
                  rows={3}
                />
                {errors.address && <span className="checkout-error">{errors.address}</span>}
              </div>
            </div>

            <div className="checkout-modal-footer">
              <button className="btn btn-primary-custom w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={handleSendToWhatsApp}>
                <i className="bi bi-whatsapp fs-5"></i>
                Send Order via WhatsApp
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <div className="checkout-confirm-step">
            <div className="checkout-confirm-icon">
              <i className="bi bi-question-circle"></i>
            </div>
            <h5 className="fw-bold mb-2">Order Sent?</h5>
            <p className="text-muted-custom mb-4" style={{ fontSize: "0.92rem" }}>
              Was the order successfully sent via WhatsApp?
            </p>
            <div className="d-flex gap-3 w-100 checkout-confirm-actions">
              <button className="btn flex-1 py-2 fw-semibold checkout-confirm-no" onClick={handleConfirmNo}>
                No, Go Back
              </button>
              <button className="btn btn-primary-custom flex-1 py-2 fw-semibold checkout-confirm-yes" onClick={handleConfirmYes}>
                <i className="bi bi-check-lg me-1"></i>
                Yes, It's Sent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckoutModal;
