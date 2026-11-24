import { useEffect, useState } from "react";
import {
  DEFAULT_STORE_SETTINGS,
  THEME_PRESETS,
  mergeStoreSettings,
} from "../../services/storeSettings";
import {
  getCachedStoreSettings,
  saveStoreSettings,
  subscribeToStoreSettings,
  uploadProductImage,
} from "../../services/firestoreService";
import BrandLogo from "../BrandLogo";

const SECTION_LABELS = {
  hero: { title: "Hero Showcase Banner", icon: "bi-window-desktop" },
  categories: { title: "Quick Category Pills Strip", icon: "bi-grid" },
  deals: { title: "Hot Deals & Offers Section", icon: "bi-lightning-fill" },
  catalog: { title: "Main Product Catalog & Filters", icon: "bi-bag-check" },
  recent: { title: "Recently Viewed Products", icon: "bi-clock-history" },
  trust: { title: "Trust & Guarantee Badges", icon: "bi-shield-check" },
};

function AdminStorefront() {
  const [draft, setDraft] = useState(() => getCachedStoreSettings());
  const [subTab, setSubTab] = useState("offers");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [newPromo, setNewPromo] = useState({
    code: "",
    type: "percent",
    value: 15,
    minSubtotal: 0,
    labelEn: "",
    labelAr: "",
  });

  useEffect(() => {
    const unsub = subscribeToStoreSettings((live) => {
      setDraft(mergeStoreSettings(live));
    });
    return unsub;
  }, []);

  const updateSection = (group, patch) => {
    setDraft((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        ...patch,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const saved = await saveStoreSettings(draft);
      setDraft(saved);
      setFeedback({
        type: "success",
        message: "All storefront changes published live!",
      });
    } catch (err) {
      console.error("Failed to save store settings:", err);
      setFeedback({
        type: "error",
        message: "Saved locally, but Firestore rejected the write (check Firestore rules for settings/storefront).",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all Storefront texts, sections, colors, and offers back to defaults?")) {
      return;
    }
    setDraft(DEFAULT_STORE_SETTINGS);
    setSaving(true);
    try {
      await saveStoreSettings(DEFAULT_STORE_SETTINGS);
      setFeedback({ type: "success", message: "Restored default settings live!" });
    } catch {
      setFeedback({ type: "error", message: "Defaults loaded locally (Firestore permission needed to publish)." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPromo = (e) => {
    e.preventDefault();
    const cleanCode = newPromo.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanCode) return;

    const item = {
      id: `promo_${cleanCode.toLowerCase()}_${Math.random().toString(36).slice(2, 6)}`,
      code: cleanCode,
      type: newPromo.type,
      value: newPromo.type === "shipping" ? 0 : Math.max(0, Number(newPromo.value) || 0),
      minSubtotal: Math.max(0, Number(newPromo.minSubtotal) || 0),
      active: true,
      labelEn:
        newPromo.labelEn.trim() ||
        (newPromo.type === "percent"
          ? `${newPromo.value}% Off`
          : newPromo.type === "fixed"
          ? `${newPromo.value} EGP Off`
          : "Free Shipping"),
      labelAr:
        newPromo.labelAr.trim() ||
        (newPromo.type === "percent"
          ? `خصم ${newPromo.value}%`
          : newPromo.type === "fixed"
          ? `خصم ${newPromo.value} ج.م`
          : "شحن مجاني"),
    };

    const existing = draft.shippingAndOffers.promoCodes || [];
    updateSection("shippingAndOffers", {
      promoCodes: [...existing.filter((p) => p.code !== cleanCode), item],
    });
    setNewPromo({ code: "", type: "percent", value: 15, minSubtotal: 0, labelEn: "", labelAr: "" });
  };

  const handleTogglePromo = (id) => {
    const next = (draft.shippingAndOffers.promoCodes || []).map((p) =>
      p.id === id ? { ...p, active: !p.active } : p
    );
    updateSection("shippingAndOffers", { promoCodes: next });
  };

  const handleDeletePromo = (id) => {
    const next = (draft.shippingAndOffers.promoCodes || []).filter((p) => p.id !== id);
    updateSection("shippingAndOffers", { promoCodes: next });
  };

  const handleMoveSection = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.sections.length) return;
    const copy = [...draft.sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setDraft((prev) => ({ ...prev, sections: copy }));
  };

  const handleToggleSectionVisible = (index) => {
    const copy = draft.sections.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s));
    setDraft((prev) => ({ ...prev, sections: copy }));
  };

  const handleTrustItemChange = (index, field, val) => {
    const next = draft.trustBadges.items.map((item, i) =>
      i === index ? { ...item, [field]: val } : item
    );
    updateSection("trustBadges", { items: next });
  };

  const handleAddTrustItem = () => {
    const next = [
      ...(draft.trustBadges.items || []),
      {
        id: `trust_${Math.random().toString(36).slice(2, 7)}`,
        icon: "bi-star-fill",
        titleEn: "New Guarantee",
        titleAr: "ضمان جديد",
        descEn: "Customer benefit description",
        descAr: "وصف الميزة للعملاء",
      },
    ];
    updateSection("trustBadges", { items: next });
  };

  const handleDeleteTrustItem = (index) => {
    const next = draft.trustBadges.items.filter((_, i) => i !== index);
    updateSection("trustBadges", { items: next });
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadProductImage(file, "brand");
      if (res?.url) {
        updateSection("brand", { logoType: "custom", logoUrl: res.url });
      }
    } catch (err) {
      console.error("Logo upload failed:", err);
      alert("Unable to upload logo image. You can also paste an image URL directly.");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="admin-storefront-cms">
      {/* Top Action Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <h5 className="fw-bold mb-1">Storefront, Offers & Theme Controller</h5>
          <p className="text-muted small mb-0">
            Edit, hide, delete, or reorder every storefront banner, promo code, shipping rule, color, and footer link.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3"
            onClick={handleResetDefaults}
            disabled={saving}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>
            Reset Defaults
          </button>
          <button
            type="button"
            className="btn btn-primary-custom rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm"></span>
                Publishing...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-check"></i>
                Publish Changes Live
              </>
            )}
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert ${feedback.type === "error" ? "alert-warning" : "alert-success"} py-2 mb-4`}>
          {feedback.message}
        </div>
      )}

      {/* Sub-navigation Pills */}
      <div className="d-flex flex-wrap gap-2 mb-4 admin-cms-tabs">
        {[
          { id: "offers", label: "Offers & Shipping", icon: "bi-tag" },
          { id: "brand", label: "Brand, Logo & Colors", icon: "bi-palette" },
          { id: "layout", label: "Move / Hide Sections", icon: "bi-arrows-move" },
          { id: "hero", label: "Hero & Trust Badges", icon: "bi-stars" },
          { id: "footer", label: "Footer & Payments", icon: "bi-layout-text-window-reverse" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${
              subTab === tab.id ? "btn-primary-custom" : "btn-outline-secondary"
            }`}
            onClick={() => setSubTab(tab.id)}
          >
            <i className={`bi ${tab.icon} me-1`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OFFERS, SHIPPING & ANNOUNCEMENT */}
      {subTab === "offers" && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="p-3 p-md-4 rounded-4 border bg-light h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">
                  <i className="bi bi-truck me-2 text-primary-custom"></i>
                  Free Shipping Offer
                </h6>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="toggleFreeShipping"
                    checked={draft.shippingAndOffers.freeShippingEnabled !== false}
                    onChange={(e) => updateSection("shippingAndOffers", { freeShippingEnabled: e.target.checked })}
                  />
                  <label className="form-check-label small" htmlFor="toggleFreeShipping">Enabled</label>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Free Shipping Threshold (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={draft.shippingAndOffers.freeShippingThreshold}
                    onChange={(e) =>
                      updateSection("shippingAndOffers", { freeShippingThreshold: Number(e.target.value) || 0 })
                    }
                    disabled={!draft.shippingAndOffers.freeShippingEnabled}
                  />
                  <small className="text-muted">Set 0 or switch off above to remove the &ldquo;Add X EGP for FREE shipping&rdquo; bar.</small>
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Standard Shipping Fee (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={draft.shippingAndOffers.standardShippingFee}
                    onChange={(e) =>
                      updateSection("shippingAndOffers", { standardShippingFee: Number(e.target.value) || 0 })
                    }
                  />
                  <small className="text-muted">Set 0 for free delivery on all orders.</small>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="p-3 p-md-4 rounded-4 border bg-light h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">
                  <i className="bi bi-megaphone me-2 text-primary-custom"></i>
                  Top Announcement Banner
                </h6>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="toggleAnnouncement"
                    checked={draft.announcement.enabled !== false}
                    onChange={(e) => updateSection("announcement", { enabled: e.target.checked })}
                  />
                  <label className="form-check-label small" htmlFor="toggleAnnouncement">Show Bar</label>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small fw-semibold">English Message</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={draft.announcement.textEn}
                    onChange={(e) => updateSection("announcement", { textEn: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Arabic Message</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="form-control form-control-sm"
                    value={draft.announcement.textAr}
                    onChange={(e) => updateSection("announcement", { textAr: e.target.value })}
                  />
                </div>
                <div className="col-sm-4">
                  <label className="form-label small fw-semibold">Highlight Code</label>
                  <input
                    type="text"
                    className="form-control form-control-sm text-uppercase"
                    placeholder="Optional"
                    value={draft.announcement.highlightCode}
                    onChange={(e) => updateSection("announcement", { highlightCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-sm-4">
                  <label className="form-label small fw-semibold">Suffix (EN)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={draft.announcement.suffixEn}
                    onChange={(e) => updateSection("announcement", { suffixEn: e.target.value })}
                  />
                </div>
                <div className="col-sm-4">
                  <label className="form-label small fw-semibold">Suffix (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="form-control form-control-sm"
                    value={draft.announcement.suffixAr}
                    onChange={(e) => updateSection("announcement", { suffixAr: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Promo Codes CRUD */}
          <div className="col-12">
            <div className="p-3 p-md-4 rounded-4 border bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold mb-0">
                    <i className="bi bi-ticket-perforated me-2 text-primary-custom"></i>
                    Promo Codes & Coupons
                  </h6>
                  <small className="text-muted">Delete all or toggle off to remove the Promo Code box from Cart completely.</small>
                </div>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="togglePromoSystem"
                    checked={draft.shippingAndOffers.promoCodesEnabled !== false}
                    onChange={(e) => updateSection("shippingAndOffers", { promoCodesEnabled: e.target.checked })}
                  />
                  <label className="form-check-label small fw-semibold" htmlFor="togglePromoSystem">Enable Coupons</label>
                </div>
              </div>

              {/* Active List */}
              <div className="table-responsive mb-4">
                <table className="table table-hover align-middle admin-table mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Discount</th>
                      <th>Min Order</th>
                      <th>Labels (EN / AR)</th>
                      <th>Status</th>
                      <th className="text-end">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.shippingAndOffers.promoCodes || []).map((promo) => (
                      <tr key={promo.id}>
                        <td className="fw-bold">{promo.code}</td>
                        <td className="small text-capitalize">{promo.type}</td>
                        <td className="fw-semibold">
                          {promo.type === "percent"
                            ? `${promo.value}%`
                            : promo.type === "fixed"
                            ? `${promo.value} EGP`
                            : "Free Shipping"}
                        </td>
                        <td>{promo.minSubtotal || 0} EGP</td>
                        <td className="small">
                          <div>{promo.labelEn}</div>
                          <div className="text-muted">{promo.labelAr}</div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 ${promo.active ? "btn-success" : "btn-outline-secondary"}`}
                            onClick={() => handleTogglePromo(promo.id)}
                          >
                            {promo.active ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeletePromo(promo.id)}
                            title="Delete Promo Code"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!draft.shippingAndOffers.promoCodes || draft.shippingAndOffers.promoCodes.length === 0) && (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          No promo codes configured. Add one below or publish to hide coupons from cart.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add New Promo Code */}
              <form className="row g-2 align-items-end p-3 bg-white rounded-3 border" onSubmit={handleAddPromo}>
                <div className="col-sm-6 col-md-2">
                  <label className="form-label small fw-semibold">Code *</label>
                  <input
                    type="text"
                    required
                    className="form-control form-control-sm text-uppercase"
                    placeholder="e.g. SAVE20"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                  />
                </div>
                <div className="col-sm-6 col-md-2">
                  <label className="form-label small fw-semibold">Type</label>
                  <select
                    className="form-select form-select-sm"
                    value={newPromo.type}
                    onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                  >
                    <option value="percent">% Percentage Off</option>
                    <option value="fixed">EGP Fixed Off</option>
                    <option value="shipping">Free Shipping</option>
                  </select>
                </div>
                <div className="col-sm-6 col-md-2">
                  <label className="form-label small fw-semibold">Value</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    disabled={newPromo.type === "shipping"}
                    value={newPromo.value}
                    onChange={(e) => setNewPromo({ ...newPromo, value: e.target.value })}
                  />
                </div>
                <div className="col-sm-6 col-md-2">
                  <label className="form-label small fw-semibold">Min Order (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    value={newPromo.minSubtotal}
                    onChange={(e) => setNewPromo({ ...newPromo, minSubtotal: e.target.value })}
                  />
                </div>
                <div className="col-sm-6 col-md-2">
                  <label className="form-label small fw-semibold">Label (EN)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Optional"
                    value={newPromo.labelEn}
                    onChange={(e) => setNewPromo({ ...newPromo, labelEn: e.target.value })}
                  />
                </div>
                <div className="col-sm-6 col-md-2">
                  <button type="submit" className="btn btn-sm btn-primary-custom w-100 fw-semibold">
                    <i className="bi bi-plus-lg me-1"></i>
                    Add Code
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. BRAND, LOGO & COMFORTABLE COLOR THEME */}
      {subTab === "brand" && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="p-3 p-md-4 rounded-4 border bg-light h-100">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-shop me-2 text-primary-custom"></i>
                Brand Identity & E-Commerce Logo
              </h6>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Brand Name Part 1 (EN)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={draft.brand.namePrimary}
                    onChange={(e) => updateSection("brand", { namePrimary: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Accent Part 2 (EN)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={draft.brand.nameAccent}
                    onChange={(e) => updateSection("brand", { nameAccent: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Brand Part 1 (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="form-control"
                    value={draft.brand.nameArPrimary}
                    onChange={(e) => updateSection("brand", { nameArPrimary: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Accent Part 2 (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="form-control"
                    value={draft.brand.nameArAccent}
                    onChange={(e) => updateSection("brand", { nameArAccent: e.target.value })}
                  />
                </div>
                <div className="col-sm-8">
                  <label className="form-label small fw-semibold">Website Public Link</label>
                  <input
                    type="url"
                    className="form-control"
                    value={draft.brand.siteUrl}
                    onChange={(e) => updateSection("brand", { siteUrl: e.target.value })}
                  />
                </div>
                <div className="col-sm-4">
                  <label className="form-label small fw-semibold">Tracking Prefix</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control text-uppercase"
                    value={draft.brand.trackingPrefix}
                    onChange={(e) => updateSection("brand", { trackingPrefix: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">E-Commerce Logo Emblem</label>
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    {[
                      { id: "bag-spark", label: "Bag + Spark" },
                      { id: "tech-cart", label: "Smart Cart" },
                      { id: "shop-crown", label: "Flagship Crown" },
                      { id: "custom", label: "Custom Image" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 ${
                          draft.brand.logoType === opt.id ? "btn-primary-custom" : "btn-outline-secondary"
                        }`}
                        onClick={() => updateSection("brand", { logoType: opt.id })}
                      >
                        <BrandLogo type={opt.id} customUrl={draft.brand.logoUrl} size={22} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="d-flex gap-2 align-items-center mt-2">
                    <input
                      type="url"
                      className="form-control form-control-sm"
                      placeholder="Custom Logo URL (https://...)"
                      value={draft.brand.logoUrl}
                      onChange={(e) => updateSection("brand", { logoUrl: e.target.value, logoType: "custom" })}
                    />
                    <label className="btn btn-sm btn-outline-primary-custom text-nowrap mb-0">
                      {uploadingLogo ? "Uploading..." : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="p-3 p-md-4 rounded-4 border bg-light h-100">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-palette2 me-2 text-primary-custom"></i>
                Comfortable Eye-Friendly Theme
              </h6>
              <div className="row g-2 mb-3">
                {Object.values(THEME_PRESETS).map((preset) => (
                  <div key={preset.id} className="col-sm-6">
                    <button
                      type="button"
                      className={`w-100 p-2 rounded-3 border text-start d-flex align-items-center gap-2 ${
                        draft.theme.preset === preset.id ? "border-primary bg-white shadow-sm" : "bg-white"
                      }`}
                      onClick={() => updateSection("theme", { ...preset, preset: preset.id })}
                    >
                      <span
                        className="rounded-circle d-inline-block flex-shrink-0"
                        style={{
                          width: 24,
                          height: 24,
                          background: preset.primaryColor,
                          border: `4px solid ${preset.bgColor}`,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
                        }}
                      ></span>
                      <span className="small fw-semibold">{preset.label}</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="row g-3">
                <div className="col-4">
                  <label className="form-label small fw-semibold">Accent Color</label>
                  <input
                    type="color"
                    className="form-control form-control-color w-100"
                    value={draft.theme.primaryColor}
                    onChange={(e) => updateSection("theme", { preset: "custom", primaryColor: e.target.value })}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Hover Color</label>
                  <input
                    type="color"
                    className="form-control form-control-color w-100"
                    value={draft.theme.primaryHover}
                    onChange={(e) => updateSection("theme", { preset: "custom", primaryHover: e.target.value })}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Page Surface</label>
                  <input
                    type="color"
                    className="form-control form-control-color w-100"
                    value={draft.theme.bgColor}
                    onChange={(e) => updateSection("theme", { preset: "custom", bgColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. LAYOUT: MOVE OR HIDE SECTIONS */}
      {subTab === "layout" && (
        <div className="p-3 p-md-4 rounded-4 border bg-light">
          <h6 className="fw-bold mb-1">Homepage Section Order & Visibility</h6>
          <p className="text-muted small mb-3">
            Move sections up/down to reorder how your storefront displays, or hide any section you don&apos;t want right now.
          </p>
          <div className="d-flex flex-column gap-2">
            {draft.sections.map((section, idx) => {
              const meta = SECTION_LABELS[section.id] || { title: section.id, icon: "bi-square" };
              return (
                <div
                  key={section.id}
                  className="bg-white border rounded-3 p-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
                >
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-light text-dark border rounded-pill px-2 py-1">{idx + 1}</span>
                    <i className={`bi ${meta.icon} text-primary-custom fs-5`}></i>
                    <span className="fw-semibold">{meta.title}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, -1)}
                      title="Move Up"
                    >
                      <i className="bi bi-arrow-up"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={idx === draft.sections.length - 1}
                      onClick={() => handleMoveSection(idx, 1)}
                      title="Move Down"
                    >
                      <i className="bi bi-arrow-down"></i>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 ${
                        section.visible ? "btn-success" : "btn-outline-secondary"
                      }`}
                      onClick={() => handleToggleSectionVisible(idx)}
                    >
                      <i className={`bi ${section.visible ? "bi-eye" : "bi-eye-slash"} me-1`}></i>
                      {section.visible ? "Visible" : "Hidden"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. HERO & TRUST BADGES */}
      {subTab === "hero" && (
        <div className="row g-4">
          <div className="col-12">
            <div className="p-3 p-md-4 rounded-4 border bg-light">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h6 className="fw-bold mb-0">Hero Banner Content</h6>
                <div className="d-flex gap-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="heroFeaturedSwitch"
                      checked={draft.hero.showFeaturedCard !== false}
                      onChange={(e) => updateSection("hero", { showFeaturedCard: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="heroFeaturedSwitch">Featured Product Card</label>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="heroStatsSwitch"
                      checked={draft.hero.showStatsStrip !== false}
                      onChange={(e) => updateSection("hero", { showStatsStrip: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="heroStatsSwitch">Highlights Strip</label>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Kicker (EN)</label>
                  <input type="text" className="form-control form-control-sm" value={draft.hero.kickerEn} onChange={(e) => updateSection("hero", { kickerEn: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Kicker (AR)</label>
                  <input type="text" dir="rtl" className="form-control form-control-sm" value={draft.hero.kickerAr} onChange={(e) => updateSection("hero", { kickerAr: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Headline (EN)</label>
                  <input type="text" className="form-control form-control-sm" value={draft.hero.titleEn} onChange={(e) => updateSection("hero", { titleEn: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Headline (AR)</label>
                  <input type="text" dir="rtl" className="form-control form-control-sm" value={draft.hero.titleAr} onChange={(e) => updateSection("hero", { titleAr: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Slogan (EN)</label>
                  <input type="text" className="form-control form-control-sm" value={draft.hero.sloganEn} onChange={(e) => updateSection("hero", { sloganEn: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Slogan (AR)</label>
                  <input type="text" dir="rtl" className="form-control form-control-sm" value={draft.hero.sloganAr} onChange={(e) => updateSection("hero", { sloganAr: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Description (EN)</label>
                  <textarea rows="2" className="form-control form-control-sm" value={draft.hero.descEn} onChange={(e) => updateSection("hero", { descEn: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hero Description (AR)</label>
                  <textarea rows="2" dir="rtl" className="form-control form-control-sm" value={draft.hero.descAr} onChange={(e) => updateSection("hero", { descAr: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="p-3 p-md-4 rounded-4 border bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h6 className="fw-bold mb-0">Trust & Guarantee Badges</h6>
                <button type="button" className="btn btn-sm btn-outline-primary-custom rounded-pill px-3" onClick={handleAddTrustItem}>
                  <i className="bi bi-plus-lg me-1"></i> Add Badge
                </button>
              </div>
              <div className="row g-3">
                {draft.trustBadges.items.map((item, idx) => (
                  <div key={item.id} className="col-md-6">
                    <div className="bg-white p-3 rounded-3 border h-100">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold text-primary-custom">
                          <i className={`bi ${item.icon} me-1`}></i> Badge #{idx + 1}
                        </span>
                        <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteTrustItem(idx)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                      <div className="row g-2">
                        <div className="col-12">
                          <input type="text" className="form-control form-control-sm" placeholder="Bootstrap Icon (e.g. bi-truck)" value={item.icon} onChange={(e) => handleTrustItemChange(idx, "icon", e.target.value)} />
                        </div>
                        <div className="col-6">
                          <input type="text" className="form-control form-control-sm" placeholder="Title (EN)" value={item.titleEn} onChange={(e) => handleTrustItemChange(idx, "titleEn", e.target.value)} />
                        </div>
                        <div className="col-6">
                          <input type="text" dir="rtl" className="form-control form-control-sm" placeholder="Title (AR)" value={item.titleAr} onChange={(e) => handleTrustItemChange(idx, "titleAr", e.target.value)} />
                        </div>
                        <div className="col-6">
                          <input type="text" className="form-control form-control-sm" placeholder="Description (EN)" value={item.descEn} onChange={(e) => handleTrustItemChange(idx, "descEn", e.target.value)} />
                        </div>
                        <div className="col-6">
                          <input type="text" dir="rtl" className="form-control form-control-sm" placeholder="Description (AR)" value={item.descAr} onChange={(e) => handleTrustItemChange(idx, "descAr", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. FOOTER, CONTACT & PAYMENTS */}
      {subTab === "footer" && (
        <div className="p-3 p-md-4 rounded-4 border bg-light">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h6 className="fw-bold mb-0">Footer Information, Contact & Payment Options</h6>
            <div className="form-check form-switch m-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="footerEnabledSwitch"
                checked={draft.footer.enabled !== false}
                onChange={(e) => updateSection("footer", { enabled: e.target.checked })}
              />
              <label className="form-check-label small" htmlFor="footerEnabledSwitch">Show Footer</label>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Store Tagline (EN)</label>
              <textarea rows="2" className="form-control form-control-sm" value={draft.footer.taglineEn} onChange={(e) => updateSection("footer", { taglineEn: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Store Tagline (AR)</label>
              <textarea rows="2" dir="rtl" className="form-control form-control-sm" value={draft.footer.taglineAr} onChange={(e) => updateSection("footer", { taglineAr: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Location Text (EN)</label>
              <input type="text" className="form-control form-control-sm" value={draft.footer.locationEn} onChange={(e) => updateSection("footer", { locationEn: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Location Text (AR)</label>
              <input type="text" dir="rtl" className="form-control form-control-sm" value={draft.footer.locationAr} onChange={(e) => updateSection("footer", { locationAr: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">WhatsApp Order Number (with country code)</label>
              <input type="text" className="form-control form-control-sm" value={draft.footer.whatsappNumber} onChange={(e) => updateSection("footer", { whatsappNumber: e.target.value.replace(/[^\d]/g, "") })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Support Phone Display</label>
              <input type="text" className="form-control form-control-sm" value={draft.footer.phoneDisplay} onChange={(e) => updateSection("footer", { phoneDisplay: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Support Email (Optional)</label>
              <input type="email" className="form-control form-control-sm" value={draft.footer.supportEmail} onChange={(e) => updateSection("footer", { supportEmail: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Facebook URL</label>
              <input type="url" className="form-control form-control-sm" value={draft.footer.facebookUrl} onChange={(e) => updateSection("footer", { facebookUrl: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Instagram URL</label>
              <input type="url" className="form-control form-control-sm" value={draft.footer.instagramUrl} onChange={(e) => updateSection("footer", { instagramUrl: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">TikTok URL</label>
              <input type="url" className="form-control form-control-sm" value={draft.footer.tiktokUrl} onChange={(e) => updateSection("footer", { tiktokUrl: e.target.value })} />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Accepted Payment Methods (comma-separated — used in Footer & Checkout)</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={(draft.footer.paymentMethods || []).join(", ")}
                onChange={(e) =>
                  updateSection("footer", {
                    paymentMethods: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Copyright Text (EN)</label>
              <input type="text" className="form-control form-control-sm" value={draft.footer.copyrightEn} onChange={(e) => updateSection("footer", { copyrightEn: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Copyright Text (AR)</label>
              <input type="text" dir="rtl" className="form-control form-control-sm" value={draft.footer.copyrightAr} onChange={(e) => updateSection("footer", { copyrightAr: e.target.value })} />
            </div>
            <div className="col-12 d-flex flex-wrap gap-4 pt-2">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="fShop" checked={draft.footer.showShopLinks !== false} onChange={(e) => updateSection("footer", { showShopLinks: e.target.checked })} />
                <label className="form-check-label small" htmlFor="fShop">Show Shop Links</label>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="fAcc" checked={draft.footer.showAccountLinks !== false} onChange={(e) => updateSection("footer", { showAccountLinks: e.target.checked })} />
                <label className="form-check-label small" htmlFor="fAcc">Show Account Links</label>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="fNews" checked={draft.footer.showNewsletter !== false} onChange={(e) => updateSection("footer", { showNewsletter: e.target.checked })} />
                <label className="form-check-label small" htmlFor="fNews">Show Newsletter</label>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="fPay" checked={draft.footer.showPaymentPills !== false} onChange={(e) => updateSection("footer", { showPaymentPills: e.target.checked })} />
                <label className="form-check-label small" htmlFor="fPay">Show Payment Pills</label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStorefront;
