import { useState } from "react";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminAnalytics from "./AdminAnalytics";

function AdminPanel({ navigate }) {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3 admin-page-header">
        <h2 className="fw-bold mb-0 d-flex align-items-center gap-2">
          <i className="bi bi-speedometer2 text-primary-custom"></i>
          Admin Panel
        </h2>
        <button 
          className="btn btn-outline-secondary btn-sm rounded-pill"
          onClick={() => navigate("home")}
        >
          <i className="bi bi-arrow-left me-1"></i> Back to Store
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2 admin-tabs">
        <li className="nav-item">
          <button
            className={`nav-link rounded-pill px-4 fw-medium ${activeTab === "products" ? "active bg-primary-custom text-white" : "bg-light text-dark"}`}
            onClick={() => setActiveTab("products")}
          >
            <i className="bi bi-box-seam me-2"></i>
            Products
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link rounded-pill px-4 fw-medium ${activeTab === "orders" ? "active bg-primary-custom text-white" : "bg-light text-dark"}`}
            onClick={() => setActiveTab("orders")}
          >
            <i className="bi bi-receipt me-2"></i>
            Orders
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link rounded-pill px-4 fw-medium ${activeTab === "analytics" ? "active bg-primary-custom text-white" : "bg-light text-dark"}`}
            onClick={() => setActiveTab("analytics")}
          >
            <i className="bi bi-graph-up-arrow me-2"></i>
            Analytics
          </button>
        </li>
      </ul>

      {/* Content */}
      <div className="admin-content-card bg-white p-4 rounded-4 shadow-sm border border-light">
        {activeTab === "products" && <AdminProducts />}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "analytics" && <AdminAnalytics />}
      </div>
    </div>
  );
}

export default AdminPanel;
