import { useState } from "react";
import { createPortal } from "react-dom";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminAnalytics from "./AdminAnalytics";
import AdminStorefront from "./AdminStorefront";
import { usePwaInstall } from "../../hooks/usePwaInstall";

function AdminPanel({ navigate, standalone = false }) {
  const [activeTab, setActiveTab] = useState("products");
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const { canPrompt, isInstalled, promptInstall } = usePwaInstall();

  const handleInstallAdminApp = async () => {
    if (!standalone) {
      window.location.href = "/admin/";
      return;
    }
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setShowInstallHelp(true);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3 admin-page-header flex-wrap gap-2">
        <h2 className="fw-bold mb-0 d-flex align-items-center gap-2">
          <i className="bi bi-speedometer2 text-primary-custom"></i>
          Veltrix Admin Panel
        </h2>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {!isInstalled && (
            <button
              type="button"
              className="btn btn-outline-primary-custom btn-sm rounded-pill px-3"
              onClick={handleInstallAdminApp}
            >
              <i className="bi bi-phone me-1"></i>
              {standalone ? "Add Admin App to Home Screen" : "Open / Install Admin App"}
            </button>
          )}
          {standalone ? (
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3"
            >
              <i className="bi bi-box-arrow-up-right me-1"></i>
              Open Storefront
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              onClick={() => navigate("home")}
            >
              <i className="bi bi-arrow-left me-1"></i> Back to Store
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2 admin-tabs">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded-pill px-4 fw-medium ${activeTab === "products" ? "active bg-primary-custom text-white" : "bg-light text-dark"}`}
            onClick={() => setActiveTab("products")}
          >
            <i className="bi bi-box-seam me-2"></i>
            Products
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded-pill px-4 fw-medium ${activeTab === "orders" ? "active bg-primary-custom text-white" : "bg-light text-dark"}`}
            onClick={() => setActiveTab("orders")}
          >
            <i className="bi bi-receipt me-2"></i>
            Orders
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded-pill px-4 fw-medium ${activeTab === "analytics" ? "active bg-primary-custom text-white" : "bg-light text-dark"}`}
            onClick={() => setActiveTab("analytics")}
          >
            <i className="bi bi-graph-up-arrow me-2"></i>
            Analytics
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded-pill px-4 fw-medium ${activeTab === "storefront" ? "active bg-primary-custom text-white" : "bg-light text-dark"}`}
            onClick={() => setActiveTab("storefront")}
          >
            <i className="bi bi-sliders me-2"></i>
            Storefront & Offers
          </button>
        </li>
      </ul>

      {/* Content */}
      <div className="admin-content-card bg-white p-3 p-md-4 rounded-4 shadow-sm border border-light">
        {activeTab === "products" && <AdminProducts />}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "analytics" && <AdminAnalytics />}
        {activeTab === "storefront" && <AdminStorefront />}
      </div>

      {showInstallHelp && createPortal(
        <div className="checkout-modal-overlay" onClick={() => setShowInstallHelp(false)}>
          <div className="checkout-modal p-4" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-phone text-primary-custom me-2"></i>
                Install Separate Admin App
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowInstallHelp(false)}></button>
            </div>
            <p className="small text-muted-custom mb-3">
              Because you opened <code>/admin/</code>, this page installs as a completely separate <strong>Veltrix Admin</strong> app icon on your phone:
            </p>
            <div className="p-3 rounded-3 border bg-light mb-3 small">
              <div className="fw-bold mb-1"><i className="bi bi-apple me-1"></i> iPhone (Safari):</div>
              <ol className="mb-0 ps-3">
                <li>Tap the <strong>Share</strong> icon (<i className="bi bi-box-arrow-up"></i>) at the bottom bar.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Confirm <strong>Veltrix Admin</strong> and tap <strong>Add</strong>.</li>
              </ol>
            </div>
            <div className="p-3 rounded-3 border bg-light small">
              <div className="fw-bold mb-1"><i className="bi bi-android2 me-1"></i> Android (Chrome):</div>
              <ol className="mb-0 ps-3">
                <li>Tap the <strong>⋮ Menu</strong> in the top-right corner.</li>
                <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              </ol>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AdminPanel;
