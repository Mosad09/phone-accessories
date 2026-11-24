import { useTranslation } from "react-i18next";

function TrustBadges({ config }) {
  const { t, i18n } = useTranslation();

  if (!config || config.enabled === false || !Array.isArray(config.items) || config.items.length === 0) {
    return null;
  }

  const isArabic = i18n.language === "ar";

  return (
    <section className="trust-badges-section" aria-label={t("trust.section_title")}>
      <div className="container">
        <div className="trust-badges-grid">
          {config.items.map((item) => (
            <div key={item.id} className="trust-badge-card">
              <div className="trust-badge-icon" aria-hidden="true">
                <i className={`bi ${item.icon || "bi-patch-check"}`}></i>
              </div>
              <div className="trust-badge-copy">
                <h6 className="trust-badge-title">
                  {isArabic ? (item.titleAr || item.titleEn) : item.titleEn}
                </h6>
                <p className="trust-badge-desc">
                  {isArabic ? (item.descAr || item.descEn) : item.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustBadges;
