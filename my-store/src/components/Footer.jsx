import { useState } from "react";
import { useTranslation } from "react-i18next";
import { subscribeToNewsletter } from "../services/firestoreService";

function Footer({ categories = [], categoryLabels = {}, navigate, onSelectCategory, onFilterDeals }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus({ type: "error", message: t("footer.invalid_email") });
      return;
    }

    setSubmitting(true);
    try {
      await subscribeToNewsletter(trimmed);
      setStatus({ type: "success", message: t("footer.subscribed_success") });
      setEmail("");
    } catch {
      setStatus({ type: "error", message: t("footer.invalid_email") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryClick = (cat) => {
    if (typeof onSelectCategory === "function") {
      onSelectCategory(cat);
    }
    navigate("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <a
              href="#"
              className="footer-brand-link"
              onClick={(e) => {
                e.preventDefault();
                navigate("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="brand-logo-mark" aria-hidden="true">
                <i className="bi bi-layers-fill"></i>
              </span>
              <span className="fw-bold fs-4">
                {t("navbar.brand_vel")}
                <span className="text-primary-custom">{t("navbar.brand_trix")}</span>
              </span>
            </a>
            <p className="footer-tagline">{t("footer.tagline")}</p>
            <p className="footer-location">
              <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>
              {t("footer.location_egypt")}
            </p>
            <div className="footer-actions-row">
              <a
                href="https://wa.me/201125522130"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-whatsapp-btn"
              >
                <i className="bi bi-whatsapp" aria-hidden="true"></i>
                {t("footer.whatsapp_us")}
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div className="footer-links-col">
            <h6 className="footer-heading">{t("footer.shop")}</h6>
            <ul className="footer-links-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => {
                    navigate("home");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {t("footer.all_products")}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => {
                    if (typeof onFilterDeals === "function") onFilterDeals();
                    navigate("home");
                    setTimeout(() => {
                      document.getElementById("shop-products")?.scrollIntoView({ behavior: "smooth" });
                    }, 80);
                  }}
                >
                  {t("footer.featured_deals")}
                </button>
              </li>
              {categories.slice(0, 5).map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    className="footer-link-btn"
                    onClick={() => handleCategoryClick(cat)}
                  >
                    {categoryLabels[cat] || cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Account Links */}
          <div className="footer-links-col">
            <h6 className="footer-heading">{t("footer.account")}</h6>
            <ul className="footer-links-list">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => navigate("cart")}>
                  {t("footer.my_cart")}
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => navigate("wishlist")}>
                  {t("footer.wishlist")}
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => navigate("orders")}>
                  {t("footer.my_orders")}
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => navigate("profile")}>
                  {t("footer.my_profile")}
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-newsletter-col">
            <h6 className="footer-heading">{t("footer.newsletter_title")}</h6>
            <p className="footer-newsletter-desc">{t("footer.newsletter_desc")}</p>
            <form className="footer-newsletter-form" onSubmit={handleSubscribe} noValidate>
              <input
                type="email"
                className="footer-newsletter-input"
                placeholder={t("footer.newsletter_placeholder")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status.message) setStatus({ type: "", message: "" });
                }}
                aria-label={t("footer.newsletter_placeholder")}
              />
              <button type="submit" className="btn btn-primary-custom footer-newsletter-btn" disabled={submitting}>
                {submitting ? "..." : t("footer.subscribe")}
              </button>
            </form>
            {status.message && (
              <div className={`footer-newsletter-status ${status.type === "error" ? "is-error" : "is-success"}`}>
                <i className={`bi ${status.type === "error" ? "bi-exclamation-circle" : "bi-check-circle-fill"} me-1`} aria-hidden="true"></i>
                {status.message}
              </div>
            )}
            <div className="footer-payment-pills">
              <span className="footer-pay-pill">
                <i className="bi bi-cash-coin me-1" aria-hidden="true"></i>
                {t("footer.payment_cod")}
              </span>
              <span className="footer-pay-pill">
                <i className="bi bi-phone me-1" aria-hidden="true"></i>
                {t("footer.payment_vodafone")}
              </span>
              <span className="footer-pay-pill">
                <i className="bi bi-bank me-1" aria-hidden="true"></i>
                {t("footer.payment_instapay")}
              </span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {t("footer.rights")}</span>
          <span className="footer-secure-note">
            <i className="bi bi-shield-lock me-1" aria-hidden="true"></i>
            {t("cart.secure_checkout")}
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
