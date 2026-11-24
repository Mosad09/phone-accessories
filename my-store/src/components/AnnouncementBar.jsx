import { useState } from "react";
import { useTranslation } from "react-i18next";

function AnnouncementBar({ onApplyCoupon }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("veltrix_promo_dismissed") === "1");
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("VELTRIX10");
    } catch {
      // Clipboard may be unavailable on non-HTTPS previews
    }
    if (typeof onApplyCoupon === "function") {
      onApplyCoupon("VELTRIX10");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("veltrix_promo_dismissed", "1");
  };

  return (
    <div className="announcement-bar" role="region" aria-label={t("app.promo_bar")}>
      <div className="container announcement-bar-inner">
        <div className="announcement-bar-content">
          <i className="bi bi-stars" aria-hidden="true"></i>
          <span>
            {t("app.promo_bar")}{" "}
            <strong className="announcement-code">VELTRIX10</strong>{" "}
            {t("app.promo_extra")}
          </span>
          <button
            type="button"
            className="announcement-copy-btn"
            onClick={handleCopy}
          >
            <i className={`bi ${copied ? "bi-check2" : "bi-clipboard"}`} aria-hidden="true"></i>
            {copied ? t("app.promo_copied") : t("app.promo_copy")}
          </button>
        </div>
        <button
          type="button"
          className="announcement-close-btn"
          onClick={handleDismiss}
          aria-label={t("common.close")}
        >
          <i className="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}

export default AnnouncementBar;
