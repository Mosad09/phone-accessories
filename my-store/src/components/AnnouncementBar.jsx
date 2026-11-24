import { useState } from "react";
import { useTranslation } from "react-i18next";

function AnnouncementBar({ config, onApplyCoupon }) {
  const { t, i18n } = useTranslation();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("veltrix_promo_dismissed") === "1"
  );
  const [copied, setCopied] = useState(false);

  if (dismissed || !config || config.enabled === false) return null;

  const isArabic = i18n.language === "ar";
  const messageText = isArabic ? (config.textAr || config.textEn) : config.textEn;
  const suffixText = isArabic ? (config.suffixAr || config.suffixEn) : config.suffixEn;
  const code = String(config.highlightCode || "").trim().toUpperCase();

  if (!messageText && !code) return null;

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard may be unavailable on non-HTTPS previews
    }
    if (typeof onApplyCoupon === "function") {
      onApplyCoupon(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("veltrix_promo_dismissed", "1");
  };

  return (
    <div className="announcement-bar" role="region" aria-label={messageText}>
      <div className="container announcement-bar-inner">
        <div className="announcement-bar-content">
          <i className="bi bi-stars" aria-hidden="true"></i>
          <span>
            {messageText}
            {code && (
              <>
                {" "}
                <strong className="announcement-code">{code}</strong>
              </>
            )}
            {suffixText && <> {suffixText}</>}
          </span>
          {code && config.showCopyButton !== false && (
            <button
              type="button"
              className="announcement-copy-btn"
              onClick={handleCopy}
            >
              <i className={`bi ${copied ? "bi-check2" : "bi-clipboard"}`} aria-hidden="true"></i>
              {copied ? t("app.promo_copied") : t("app.promo_copy")}
            </button>
          )}
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
