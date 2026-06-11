import { useState, useEffect } from "react";

import { subscribeToUserOrders } from "../services/firestoreService";
import { getLocalOrders } from "../services/db";

function Orders({ user, navigate }) {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);

  useEffect(() => {
    // A user change starts a fresh subscription/loading cycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    if (user?.email) {
      // Real-time Firestore subscription for signed-in users
      const unsub = subscribeToUserOrders(user.email, (firestoreOrders) => {
        // Merge with local orders for backward compatibility
        const localOrders = getLocalOrders();
        const allIds = new Set(firestoreOrders.map(o => o.id));
        const uniqueLocal = localOrders.filter(o => !allIds.has(o.id));
        const merged = [...firestoreOrders, ...uniqueLocal].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(merged);
        setLoading(false);
      });
      return unsub;
    } else {
      // Guest: show local orders only
      const localOrders = getLocalOrders().sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setOrders(localOrders);
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary-custom" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container py-5 text-center text-danger">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-box-seam text-muted-custom" style={{ fontSize: "4rem" }}></i>
        <h3 className="mt-3 text-muted-custom">No orders yet</h3>
        <p className="opacity-75 mb-4">You haven't placed any orders yet. Start exploring our products.</p>
        <button className="btn btn-primary-custom px-4 py-2" onClick={() => navigate("home")}>
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 fw-bold">My Orders</h2>
      <div className="row">
        {orders.map((order, idx) => {
          const items = typeof order.items === 'string' ? JSON.parse(order.items || "[]") : (order.items || []);
          const status = (order.status || "pending").toLowerCase();
          
          let badgeClass = "bg-secondary";
          if (status === "pending") badgeClass = "bg-warning text-dark";
          if (status === "processing" || status === "confirmed") badgeClass = "bg-info text-dark";
          if (status === "shipped") badgeClass = "bg-primary";
          if (status === "delivered") badgeClass = "bg-success";
          if (status === "cancelled") badgeClass = "bg-danger";

          const orderLabel =
            order.displayOrderId ||
            order.orderId ||
            (typeof order.id === "string" && order.id.startsWith("ORD") ? order.id : null) ||
            (order.createdAt ? `ORD-${new Date(order.createdAt).getTime().toString().slice(-6)}` : "—");

          return (
          <div key={order.id || order.createdAt || idx} className="col-12 mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-header order-card-header bg-light d-flex justify-content-between align-items-center py-3 border-0">
                <div>
                  <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>Order ID</span>
                  <span className="fw-semibold">{orderLabel}</span>
                </div>
                <div className="text-end">
                  <span className={`badge ${badgeClass} px-3 py-2 rounded-pill`}>
                    {(status === "confirmed" ? "processing" : status).toUpperCase()}
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
                    </div>
                  </div>
                )}

                {items.map((item, itemIdx) => (
                  <div key={itemIdx} className="d-flex align-items-center order-item-row mb-3 pb-3 border-bottom border-light">
                    <img src={item.image} alt={item.name} width="50" height="50" className="rounded object-fit-cover me-3" />
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{item.name}</h6>
                      <small className="text-muted-custom">Qty: {item.qty}</small>
                    </div>
                    <div className="fw-semibold">
                      {item.price * item.qty} EGP
                    </div>
                  </div>
                ))}

                <div className="d-flex justify-content-between align-items-center order-card-footer mt-4">
                  <div>
                    <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>Date Placed</span>
                    <span className="fw-medium">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Just now"}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>Total Amount</span>
                    <span className="fs-5 fw-bold text-main">{order.totalPrice} EGP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default Orders;
