import { useState } from "react";
import { useTranslation } from "react-i18next";
import { subscribeToNewsletter } from "../services/firestoreService";
import BrandLogo from "./BrandLogo";
import { usePwaInstall } from "../hooks/usePwaInstall";

function Footer({
  config,
  brand,
  categories = [],
  categoryLabels = {},
  navigate,
  onSelectCategory,
  onFilterDeals,
  onShowInstallGuide,
}) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const { canPrompt, isIos, isInstalled, promptInstall } = usePwaInstall();

  if (!config || config.enabled === false) return null;

  const isArabic = i18n.language === "ar";
  const brandFirst = isArabic ? (brand?.nameArPrimary || "فيل") : (brand?.namePrimary || "Vel");
  const brandSecond = isArabic ? (brand?.nameArAccent || "تريكس") : (brand?.nameAccent || "trix");
  const tagline = isArabic ? (config.taglineAr || config.taglineEn) : config.taglineEn;
  const location = isArabic ? (config.locationAr || config.locationEn) : config.locationEn;
  const newsletterTitle = isArabic
    ? (config.newsletterTitleAr || config.newsletterTitleEn)
    : config.newsletterTitleEn;
  const newsletterDesc = isArabic
    ? (config.newsletterDescAr || config.newsletterDescEn)
    : config.newsletterDescEn;
  const copyrightText = isArabic ? (config.copyrightAr || config.copyrightEn) : config.copyrightEn;
  const whatsappClean = String(config.whatsappNumber || "201125522130").replace(/[^\d]/g, "");

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
              href="/"
              className="footer-brand-link"
              onClick={(e) => {
                e.preventDefault();
                navigate("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <BrandLogo type={brand?.logoType} customUrl={brand?.logoUrl} size={36} />
              <span className="fw-bold fs-4">
                {brandFirst}
                <span className="text-primary-custom">{brandSecond}</span>
              </span>
            </a>
            {tagline && <p className="footer-tagline">{tagline}</p>}
            {location && (
              <p className="footer-location">
                <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>
                {location}
              </p>
            )}
            {config.phoneDisplay && (
              <p className="footer-location mb-2">
                <i className="bi bi-telephone me-1" aria-hidden="true"></i>
                <span dir="ltr">{config.phoneDisplay}</span>
              </p>
            )}
            {config.supportEmail && (
              <p className="footer-location mb-3">
                <i className="bi bi-envelope me-1" aria-hidden="true"></i>
                {config.supportEmail}
              </p>
            )}
            <div className="footer-actions-row d-flex flex-wrap gap-2 align-items-center">
              {whatsappClean && (
                <a
                  href={`https://wa.me/${whatsappClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-whatsapp-btn"
                >
                  <i className="bi bi-whatsapp" aria-hidden="true"></i>
                  {t("footer.whatsapp_us")}
                </a>
              )}
              {!isInstalled && (canPrompt || isIos) && (
                <button
                  type="button"
                  className="footer-install-btn"
                  onClick={async () => {
                    if (canPrompt) {
                      await promptInstall();
                    } else if (onShowInstallGuide) {
                      onShowInstallGuide();
                    }
                  }}
                >
                  <i className="bi bi-phone me-1" aria-hidden="true"></i>
                  {t("footer.install_app")}
                </button>
              )}
            </div>
            {(config.facebookUrl || config.instagramUrl || config.tiktokUrl) && (
              <div className="d-flex gap-2 mt-3">
                {config.facebookUrl && (
                  <a href={config.facebookUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Facebook">
                    <i className="bi bi-facebook"></i>
                  </a>
                )}
                {config.instagramUrl && (
                  <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Instagram">
                    <i className="bi bi-instagram"></i>
                  </a>
                )}
                {config.tiktokUrl && (
                  <a href={config.tiktokUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="TikTok">
                    <i className="bi bi-tiktok"></i>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Shop Links */}
          {config.showShopLinks !== false && (
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
          )}

          {/* Account Links */}
          {config.showAccountLinks !== false && (
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
          )}

          {/* Newsletter & Payments */}
          <div className="footer-newsletter-col">
            {config.showNewsletter !== false && (
              <>
                <h6 className="footer-heading">{newsletterTitle}</h6>
                <p className="footer-newsletter-desc">{newsletterDesc}</p>
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
              </>
            )}

            {config.showPaymentPills !== false && Array.isArray(config.paymentMethods) && config.paymentMethods.length > 0 && (
              <div className="footer-payment-pills">
                {config.paymentMethods.map((method) => (
                  <span key={method} className="footer-pay-pill">
                    <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>
                    {method}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {copyrightText}</span>
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
