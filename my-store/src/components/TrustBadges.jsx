import { useTranslation } from "react-i18next";

const TRUST_ITEMS = [
  { icon: "bi-truck", titleKey: "trust.shipping_title", descKey: "trust.shipping_desc" },
  { icon: "bi-patch-check", titleKey: "trust.warranty_title", descKey: "trust.warranty_desc" },
  { icon: "bi-wallet2", titleKey: "trust.payment_title", descKey: "trust.payment_desc" },
  { icon: "bi-headset", titleKey: "trust.support_title", descKey: "trust.support_desc" },
];

function TrustBadges() {
  const { t } = useTranslation();

  return (
    <section className="trust-badges-section" aria-label={t("trust.section_title")}>
      <div className="container">
        <div className="trust-badges-grid">
          {TRUST_ITEMS.map((item) => (
            <div key={item.titleKey} className="trust-badge-card">
              <div className="trust-badge-icon" aria-hidden="true">
                <i className={`bi ${item.icon}`}></i>
              </div>
              <div className="trust-badge-copy">
                <h6 className="trust-badge-title">{t(item.titleKey)}</h6>
                <p className="trust-badge-desc">{t(item.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustBadges;
