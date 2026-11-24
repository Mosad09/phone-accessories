import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { subscribeToUserOrders, cancelCustomerOrder } from "../services/firestoreService";
import { getLocalOrders } from "../services/db";
import { getLocalizedField } from "../utils/localization";
import { formatPrice, getEffectivePrice } from "../utils/pricing";
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  buildInitialTimeline,
  getStatusLabel,
  normalizeStatus,
} from "../services/orderLifecycle";

function Orders({ user, navigate, addToCart }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const { t, i18n } = useTranslation();

  const getItemName = (item) => getLocalizedField(item, "name") || item.name || "";

  useEffect(() => {
    if (user?.email) {
      const unsub = subscribeToUserOrders(user.email, (firestoreOrders) => {
        const localOrders = getLocalOrders();
        const allIds = new Set(firestoreOrders.map((o) => o.id));
        const uniqueLocal = localOrders.filter((o) => !allIds.has(o.id));
        const merged = [...firestoreOrders, ...uniqueLocal].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(merged);
        setLoading(false);
      });
      return unsub;
    }
    const localOrders = getLocalOrders().sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    setOrders(localOrders);
    setLoading(false);
    return undefined;
  }, [user]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = setTimeout(() => setToast({ show: false, message: "" }), 2200);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const st = normalizeStatus(order.status);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!q) return true;
      const orderLabel = (order.trackingNumber || order.displayOrderId || order.orderId || order.id || "").toLowerCase();
      const items = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []);
      const itemMatch = items.some((it) => getItemName(it).toLowerCase().includes(q));
      return orderLabel.includes(q) || itemMatch;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleReorder = (items) => {
    if (!addToCart) return;
    items.forEach((item) => {
      addToCart(
        {
          ...item,
          id: item.productId || item.id,
        },
        Number(item.qty || 1),
        { selectedColor: item.selectedColor, selectedSize: item.selectedSize }
      );
    });
    setToast({ show: true, message: t("orders.reordered_toast") });
  };

  const handleCancelOrder = async (orderId) => {
    if (!orderId || !window.confirm(t("orders.cancel_confirm"))) return;
    setCancellingId(orderId);
    try {
      await cancelCustomerOrder(orderId);
    } catch (err) {
      console.error("Failed to cancel order:", err);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary-custom" role="status">
          <span className="visually-hidden">{t("app.loading")}</span>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-box-seam text-muted-custom" style={{ fontSize: "4rem" }}></i>
        <h3 className="mt-3 text-muted-custom">{t("orders.empty")}</h3>
        <p className="opacity-75 mb-4">{t("orders.empty_subtitle")}</p>
        <button type="button" className="btn btn-primary-custom px-4 py-2 rounded-pill" onClick={() => navigate("home")}>
          {t("orders.browse")}
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h2 className="mb-0 fw-bold">{t("orders.title")}</h2>
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ minWidth: "220px" }}
            placeholder={t("orders.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t("orders.all_statuses")}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s, i18n.language)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-5 text-muted-custom">{t("orders.no_matching")}</div>
      ) : (
        <div className="row">
          {filteredOrders.map((order, idx) => {
            const items = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []);
            const status = normalizeStatus(order.status);
            const statusMeta = ORDER_STATUS_META[status] || ORDER_STATUS_META.pending;
            const timeline = order.timeline?.length
              ? order.timeline
              : buildInitialTimeline(status, order.createdAt ? new Date(order.createdAt) : new Date());

            let badgeClass = "bg-secondary";
            if (statusMeta.color === "warning") badgeClass = "bg-warning text-dark";
            if (statusMeta.color === "info") badgeClass = "bg-info text-dark";
            if (statusMeta.color === "primary") badgeClass = "bg-primary";
            if (statusMeta.color === "success") badgeClass = "bg-success";
            if (statusMeta.color === "danger") badgeClass = "bg-danger";

            const orderLabel =
              order.trackingNumber ||
              order.displayOrderId ||
              order.orderId ||
              (typeof order.id === "string" && order.id.startsWith("ORD") ? order.id : null) ||
              (order.createdAt ? `ORD-${new Date(order.createdAt).getTime().toString().slice(-6)}` : "—");

            return (
              <div key={order.id || order.createdAt || idx} className="col-12 mb-4">
                <div className="card shadow-sm border-0">
                  <div className="card-header order-card-header bg-light d-flex justify-content-between align-items-center py-3 border-0">
                    <div>
                      <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>
                        {t("orders.tracking_number")}
                      </span>
                      <span className="fw-semibold">{orderLabel}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className={`badge ${badgeClass} px-3 py-2 rounded-pill`}>
                        <i className={`bi ${statusMeta.icon} me-1`}></i>
                        {getStatusLabel(status, i18n.language)}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    {order.customerName && (
                      <div className="mb-3 pb-3 border-bottom border-light">
                        <div className="d-flex flex-wrap gap-3 order-contact-row" style={{ fontSize: "0.85rem" }}>
                          <span className="text-muted-custom"><i className="bi bi-person me-1"></i>{order.customerName}</span>
                          {order.phone && <span className="text-muted-custom"><i className="bi bi-telephone me-1"></i>{order.phone}</span>}
                          {order.address && <span className="text-muted-custom"><i className="bi bi-geo-alt me-1"></i>{order.address}</span>}
                          {order.paymentMethod && (
                            <span className="text-muted-custom">
                              <i className="bi bi-wallet2 me-1"></i>
                              {t("orders.payment_method")}: {order.paymentMethod}
                            </span>
                          )}
                        </div>
                        {order.notes && (
                          <div className="text-muted-custom small mt-2">
                            <i className="bi bi-chat-left-text me-1"></i>
                            {t("orders.notes")}: {order.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {items.map((item, itemIdx) => {
                      const unitPrice = getEffectivePrice(item);
                      return (
                        <div key={itemIdx} className="d-flex align-items-center order-item-row mb-3 pb-3 border-bottom border-light">
                          <img src={item.image} alt={getItemName(item)} width="50" height="50" className="rounded object-fit-cover me-3" />
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{getItemName(item)}</h6>
                            <small className="text-muted-custom">
                              {t("orders.qty")}: {item.qty}
                              {item.selectedColor ? ` · ${item.selectedColor}` : ""}
                              {item.selectedSize ? ` · ${item.selectedSize}` : ""}
                            </small>
                          </div>
                          <div className="fw-semibold">
                            {formatPrice(unitPrice * item.qty, i18n.language)} {t("navbar.currency")}
                          </div>
                        </div>
                      );
                    })}

                    <div className="order-timeline mt-4" aria-label={t("orders.timeline")}>
                      {timeline.map((step) => (
                        <div key={`${order.id}-${step.status}`} className={`order-timeline-step ${step.completed ? "completed" : ""}`}>
                          <span className="order-timeline-dot">
                            <i className={`bi ${ORDER_STATUS_META[normalizeStatus(step.status)]?.icon || "bi-circle"}`} aria-hidden="true"></i>
                          </span>
                          <div>
                            <span className="fw-semibold">{getStatusLabel(step.status, i18n.language)}</span>
                            {step.completedAt && (
                              <small className="text-muted-custom d-block">
                                {new Date(step.completedAt).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-EG")}
                              </small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="d-flex justify-content-between align-items-center order-card-footer mt-4 flex-wrap gap-3">
                      <div>
                        <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>
                          {t("orders.date_placed")}
                        </span>
                        <span className="fw-medium">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-EG")
                            : t("orders.just_now")}
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {addToCart && items.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary-custom rounded-pill px-3"
                            onClick={() => handleReorder(items)}
                          >
                            <i className="bi bi-arrow-repeat me-1"></i>
                            {t("orders.reorder")}
                          </button>
                        )}
                        {status === "pending" && order.id && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-pill px-3"
                            disabled={cancellingId === order.id}
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            {t("orders.cancel_order")}
                          </button>
                        )}
                      </div>

                      <div className="text-end">
                        <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>
                          {t("orders.total_amount")}
                        </span>
                        <span className="fs-5 fw-bold text-main">
                          {formatPrice(order.totalPrice || 0, i18n.language)} {t("navbar.currency")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`cart-toast ${toast.show ? "show" : ""}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default Orders;
