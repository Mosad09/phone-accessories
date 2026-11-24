import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getLocalizedField } from "../utils/localization";
import { toTitleCase } from "../utils/textUtils";
import { formatPrice, getEffectivePrice, getOriginalPrice, hasDiscount } from "../utils/pricing";

function CompareModal({ isOpen, onClose, items = [], onRemove, addToCart }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || items.length === 0) return null;

  const formatList = (val) => {
    if (Array.isArray(val) && val.length > 0) return val.join(", ");
    if (typeof val === "string" && val.trim()) return val;
    return t("compare.no_variants");
  };

  return createPortal(
    <div className="checkout-modal-overlay" onClick={onClose}>
      <div
        className="compare-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="checkout-modal-header">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-arrow-left-right fs-5 text-primary-custom"></i>
            <h5 id="compare-modal-title" className="fw-bold mb-0">{t("compare.title")}</h5>
          </div>
          <button
            type="button"
            className="checkout-modal-close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="compare-modal-body">
          <div className="table-responsive">
            <table className="table align-middle compare-table mb-0">
              <thead>
                <tr>
                  <th className="compare-label-col">{t("compare.product")}</th>
                  {items.map((item) => {
                    const name = toTitleCase(getLocalizedField(item, "name"));
                    return (
                      <th key={item.id} className="compare-item-col">
                        <div className="compare-item-head">
                          <button
                            type="button"
                            className="compare-remove-btn"
                            onClick={() => onRemove(item.id)}
                            aria-label={t("cart.remove")}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                          <img
                            src={item.image}
                            alt={name}
                            className="compare-item-img"
                            onClick={() => {
                              onClose();
                              navigate(`/product/${item.id}`);
                            }}
                          />
                          <div className="compare-item-name">{name}</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="fw-semibold text-muted-custom">{t("compare.price")}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-price`}>
                      <span className="fw-bold text-success fs-6">
                        {t("navbar.currency")} {formatPrice(getEffectivePrice(item), i18n.language)}
                      </span>
                      {hasDiscount(item) && (
                        <small className="d-block text-muted-custom text-decoration-line-through">
                          {t("navbar.currency")} {formatPrice(getOriginalPrice(item), i18n.language)}
                        </small>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="fw-semibold text-muted-custom">{t("compare.category")}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-cat`}>
                      <span className="category-badge mb-0">{getLocalizedField(item, "category") || "—"}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="fw-semibold text-muted-custom">{t("compare.availability")}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-stock`}>
                      <span className={`badge rounded-pill ${Number(item.stock) > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                        {Number(item.stock) > 0
                          ? t("compare.in_stock", { count: item.stock })
                          : t("compare.out_of_stock")}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="fw-semibold text-muted-custom">{t("compare.colors")}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-colors`} className="small">{formatList(item.colors)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="fw-semibold text-muted-custom">{t("compare.sizes")}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-sizes`} className="small">{formatList(item.sizes)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="fw-semibold text-muted-custom">{t("compare.description")}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-desc`} className="small text-muted-custom">
                      {(getLocalizedField(item, "description") || getLocalizedField(item, "details") || "—").slice(0, 120)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="fw-semibold text-muted-custom">{t("compare.action")}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-act`}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary-custom rounded-pill px-3"
                        disabled={Number(item.stock) <= 0}
                        onClick={() => addToCart(item, 1)}
                      >
                        <i className="bi bi-cart-plus me-1"></i>
                        {Number(item.stock) > 0 ? t("product.add_to_cart") : t("product.out_of_stock")}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CompareModal;
