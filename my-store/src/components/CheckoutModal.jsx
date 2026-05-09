import { useState, useEffect, useRef } from "react";

function formatPrice(price) {
  if (!price && price !== 0) return "0";
  return Number(price).toLocaleString("en-EG");
}

const WHATSAPP_NUMBER = "201125522130";

function CheckoutModal({ isOpen, onClose, cart, totalPrice, user, dbUser, onOrderConfirmed }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form"); // "form" | "confirm"
  const modalRef = useRef(null);

  // Auto-fill when modal opens (signed-in user)
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setErrors({});
      if (user) {
        setFullName(dbUser?.name || user.displayName || "");
        setPhone(dbUser?.phone || "");
        if (dbUser?.address && typeof dbUser.address === "object") {
          const parts = [dbUser.address.governorate, dbUser.address.city, dbUser.address.detail].filter(Boolean);
          setAddress(parts.join(", "));
        } else {
          setAddress(dbUser?.address || "");
        }
      } else {
        setFullName("");
        setPhone("");
        setAddress("");
      }
    }
  }, [isOpen, user, dbUser]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (step === "form") onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && step === "form") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, step, onClose]);

  // Prevent body scroll when modal is open
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
    if (!address.trim()) newErrors.address = "Address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildWhatsAppMessage = () => {
    let msg = "🛒 *New Order — Veltrix*\n\n";
    msg += `👤 *Customer:* ${fullName.trim()}\n`;
    msg += `📞 *Phone:* ${phone.trim()}\n`;
    msg += `📍 *Address:* ${address.trim()}\n\n`;
    msg += "📦 *Order Details:*\n";
    cart.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.name} × ${item.qty} — ${formatPrice(item.price * item.qty)} EGP\n`;
    });
    msg += `\n💰 *Total: ${formatPrice(totalPrice)} EGP*`;
    return msg;
  };

  const handleSendToWhatsApp = () => {
    if (!validate()) return;

    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    // Show confirmation step
    setStep("confirm");
  };

  const handleConfirmYes = () => {
    const orderData = {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      customerName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: cart,
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
      <div className="checkout-modal" ref={modalRef}>
        {step === "form" && (
          <>
            {/* Header */}
            <div className="checkout-modal-header">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-bag-check fs-5 text-primary-custom"></i>
                <h5 className="fw-bold mb-0">Checkout</h5>
              </div>
              <button className="checkout-modal-close" onClick={onClose} aria-label="Close">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Body */}
            <div className="checkout-modal-body">
              {/* Order summary mini */}
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
                      title={`${item.name} × ${item.qty}`}
                    />
                  ))}
                  {cart.length > 3 && (
                    <span className="checkout-more-items">+{cart.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Guest / signed-in indicator */}
              {user ? (
                <div className="checkout-user-badge">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" width="20" height="20" className="rounded-circle" />
                  )}
                  <span>{user.email}</span>
                </div>
              ) : (
                <div className="checkout-guest-badge">
                  <i className="bi bi-person"></i>
                  <span>Checking out as guest</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="checkout-form-group">
                <label className="checkout-label">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`checkout-input ${errors.fullName ? "checkout-input-error" : ""}`}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors(prev => ({...prev, fullName: ""})); }}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <span className="checkout-error">{errors.fullName}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label">
                  Phone Number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  className={`checkout-input ${errors.phone ? "checkout-input-error" : ""}`}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors(prev => ({...prev, phone: ""})); }}
                  placeholder="e.g. 01012345678"
                />
                {errors.phone && <span className="checkout-error">{errors.phone}</span>}
              </div>

              <div className="checkout-form-group">
                <label className="checkout-label">
                  Address <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`checkout-input checkout-textarea ${errors.address ? "checkout-input-error" : ""}`}
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setErrors(prev => ({...prev, address: ""})); }}
                  placeholder="Street, building, city, governorate..."
                  rows={3}
                />
                {errors.address && <span className="checkout-error">{errors.address}</span>}
              </div>
            </div>

            {/* Footer */}
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
            <div className="d-flex gap-3 w-100">
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
