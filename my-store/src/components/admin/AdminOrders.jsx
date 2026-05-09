import { useState, useEffect } from "react";
import { subscribeToOrders, updateOrderStatus } from "../../services/firestoreService";

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsub = subscribeToOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchStatus = filterStatus === "all" || order.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (order.id && order.id.toLowerCase().includes(searchLower)) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
      (order.phone && order.phone.includes(searchLower));
    return matchStatus && matchSearch;
  });

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary-custom"></div></div>;
  }

  return (
    <div>
      {/* Controls */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0" 
              placeholder="Search by ID, Name, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select 
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="col-md-3 text-end">
          <span className="badge bg-light text-dark border p-2 w-100 fs-6">
            Total Orders: {filteredOrders.length}
          </span>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1 d-block mb-3"></i>
          No orders found.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle admin-table">
            <thead className="table-light">
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const isExpanded = expandedOrderId === order.id;
                const items = typeof order.items === 'string' ? JSON.parse(order.items || "[]") : (order.items || []);
                
                let badgeClass = "bg-secondary";
                if (order.status === "pending") badgeClass = "bg-warning text-dark";
                if (order.status === "confirmed") badgeClass = "bg-info text-dark";
                if (order.status === "shipped") badgeClass = "bg-primary";
                if (order.status === "delivered") badgeClass = "bg-success";
                if (order.status === "cancelled") badgeClass = "bg-danger";

                return (
                  <React.Fragment key={order.id}>
                    <tr>
                      <td className="fw-medium">{order.id}</td>
                      <td>
                        {new Date(order.createdAt).toLocaleDateString()}
                        <small className="d-block text-muted">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                      </td>
                      <td>
                        <div className="fw-medium">{order.customerName}</div>
                        <small className="text-muted d-block">{order.phone}</small>
                      </td>
                      <td className="fw-bold">{Number(order.totalPrice).toLocaleString()} EGP</td>
                      <td>
                        <select 
                          className={`form-select form-select-sm shadow-none border-0 ${badgeClass}`}
                          style={{ width: "130px", fontWeight: "500" }}
                          value={order.status || "pending"}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={updatingId === order.id}
                        >
                          <option value="pending" className="bg-white text-dark">Pending</option>
                          <option value="confirmed" className="bg-white text-dark">Confirmed</option>
                          <option value="shipped" className="bg-white text-dark">Shipped</option>
                          <option value="delivered" className="bg-white text-dark">Delivered</option>
                          <option value="cancelled" className="bg-white text-dark">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-light rounded-pill px-3"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          {isExpanded ? "Hide Details" : "View Details"}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="6" className="p-0 border-0">
                          <div className="bg-light p-4 rounded-3 m-3 mt-0 shadow-sm border border-white">
                            <div className="row">
                              <div className="col-md-6 mb-3 mb-md-0 border-end">
                                <h6 className="fw-bold mb-3 text-primary-custom">Customer Information</h6>
                                <p className="mb-1"><strong>Name:</strong> {order.customerName}</p>
                                <p className="mb-1"><strong>Phone:</strong> {order.phone}</p>
                                <p className="mb-1"><strong>Email:</strong> {order.email || "N/A"}</p>
                                <p className="mb-0"><strong>Address:</strong> {order.address}</p>
                              </div>
                              <div className="col-md-6">
                                <h6 className="fw-bold mb-3 text-primary-custom">Order Items</h6>
                                <ul className="list-group list-group-flush bg-transparent">
                                  {items.map((item, i) => (
                                    <li key={i} className="list-group-item bg-transparent px-0 border-light d-flex align-items-center">
                                      <img src={item.image} alt="" width="40" height="40" className="rounded object-fit-cover me-3 border" />
                                      <div className="flex-grow-1">
                                        <div className="fw-medium" style={{fontSize: "0.9rem"}}>{item.name}</div>
                                        <div className="text-muted" style={{fontSize: "0.8rem"}}>Qty: {item.qty}</div>
                                      </div>
                                      <div className="fw-bold" style={{fontSize: "0.9rem"}}>
                                        {(item.price * item.qty).toLocaleString()} EGP
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
