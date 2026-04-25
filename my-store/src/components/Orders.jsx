import { useState, useEffect } from "react";
import { getUserOrders } from "../services/db";

function Orders({ user, navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getUserOrders(user.uid);
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load orders.");
    }
    setLoading(false);
  };

  if (!user) {
    return <div className="text-center py-5">Please sign in to view your orders.</div>;
  }

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
        <p className="opacity-75 mb-4">Looks like you haven't made your first order.</p>
        <button className="btn btn-primary-custom px-4 py-2" onClick={() => navigate("home")}>
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 fw-bold">My Orders</h2>
      <div className="row">
        {orders.map((order) => (
          <div key={order.id} className="col-12 mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light d-flex justify-content-between align-items-center py-3 border-0">
                <div>
                  <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>Order ID</span>
                  <span className="fw-semibold">{order.id}</span>
                </div>
                <div className="text-end">
                  <span className={`badge ${order.status === 'pending' ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2 rounded-pill`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="card-body">
                {order.items.map((item, idx) => (
                  <div key={idx} className="d-flex align-items-center mb-3 pb-3 border-bottom border-light">
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
                
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div>
                    <span className="text-muted-custom d-block" style={{ fontSize: "0.85rem" }}>Date Placed</span>
                    <span className="fw-medium">
                      {order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleDateString() : "Just now"}
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
        ))}
      </div>
    </div>
  );
}

export default Orders;
