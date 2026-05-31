import { useState, useEffect, Fragment } from "react";
import { subscribeToOrders, updateOrderStatus, subscribeToProducts, updateProductPriceFromOrder } from "../../services/firestoreService";
import { buildProductsById, calculateOrderProfit } from "../../utils/profitAnalytics";

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // { orderId, productId, tempPrice }
  const [savingItem, setSavingItem] = useState(null); // { orderId, productId }
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const unsubOrders = subscribeToOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    const unsubProducts = subscribeToProducts((data) => {
      setProducts(data);
    });
    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  const productsById = buildProductsById(products);

  const handleStatusChange = async (firestoreDocId, newStatus) => {
    setUpdatingId(firestoreDocId);
    try {
      await updateOrderStatus(firestoreDocId, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSavePrice = async (productId, orderId, newPrice) => {
    const numericPrice = Number(newPrice);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setValidationError("Please enter a valid positive price.");
      return;
    }

    setSavingItem({ orderId, productId });
    setValidationError("");
    try {
      await updateProductPriceFromOrder(productId, orderId, numericPrice);
      setEditingItem(null);
    } catch (err) {
      console.error("Failed to save price:", err);
      alert(err.message || "Failed to update price. Please try again.");
    } finally {
      setSavingItem(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      filterStatus === "all" ||
      order.status === filterStatus ||
      (filterStatus === "processing" &&
        (order.status === "processing" || order.status === "confirmed"));

    const searchLower = searchTerm.toLowerCase();
    const disp = (order.displayOrderId || order.orderId || "").toLowerCase();
    const matchSearch =
      (order.id && order.id.toLowerCase().includes(searchLower)) ||
      disp.includes(searchLower) ||
      (order.orderId && String(order.orderId).toLowerCase().includes(searchLower)) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
      (order.phone && order.phone.includes(searchLower));

    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary-custom"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search by Order #, Name, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="col-md-3 text-end">
          <span className="badge bg-light text-dark border p-2 w-100 fs-6">Total Orders: {filteredOrders.length}</span>
        </div>
      </div>

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
                <th>Financials (Rev / Cost / Profit)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const items =
                  typeof order.items === "string" ? JSON.parse(order.items || "[]") : order.items || [];
                const orderProfit = calculateOrderProfit(order, productsById);

                const st = (order.status || "pending").toLowerCase();
                let badgeClass = "bg-secondary";
                if (st === "pending") badgeClass = "bg-warning text-dark";
                if (st === "processing" || st === "confirmed") badgeClass = "bg-info text-dark";
                if (st === "shipped") badgeClass = "bg-primary";
                if (st === "delivered") badgeClass = "bg-success";
                if (st === "cancelled") badgeClass = "bg-danger";

                const statusSelectValue = st === "confirmed" ? "processing" : st || "pending";

                return (
                  <Fragment key={order.id}>
                    <tr>
                      <td className="fw-medium">{order.displayOrderId || order.orderId || order.id}</td>
                      <td>
                        {new Date(order.createdAt).toLocaleDateString()}
                        <small className="d-block text-muted">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </small>
                      </td>
                      <td>
                        <div className="fw-medium">{order.customerName}</div>
                        <small className="text-muted d-block">{order.phone}</small>
                      </td>
                      <td>
                        <div className="fw-bold">{Number(order.totalPrice).toLocaleString()} EGP</div>
                        <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                          Cost: {Number(orderProfit.cost).toLocaleString()} EGP
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <span
                            className={`fw-semibold ${
                              orderProfit.profit < 0
                                ? "text-danger"
                                : orderProfit.profit === 0
                                ? "text-warning"
                                : "text-success"
                            }`}
                            style={{ fontSize: "0.8rem" }}
                          >
                            Profit: {Number(orderProfit.profit).toLocaleString()} EGP
                          </span>
                          {orderProfit.profit < 0 && (
                            <span className="badge bg-danger p-1" style={{ fontSize: "0.65rem" }}>
                              Negative Margin
                            </span>
                          )}
                          {orderProfit.profit === 0 && (
                            <span className="badge bg-warning text-dark p-1" style={{ fontSize: "0.65rem" }}>
                              Zero Profit
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <select
                          className={`form-select form-select-sm shadow-none border-0 ${badgeClass}`}
                          style={{ width: "130px", fontWeight: "500" }}
                          value={statusSelectValue}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={updatingId === order.id}
                        >
                          <option value="pending" className="bg-white text-dark">
                            Pending
                          </option>
                          <option value="processing" className="bg-white text-dark">
                            Processing
                          </option>
                          <option value="shipped" className="bg-white text-dark">
                            Shipped
                          </option>
                          <option value="delivered" className="bg-white text-dark">
                            Delivered
                          </option>
                          <option value="cancelled" className="bg-white text-dark">
                            Cancelled
                          </option>
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

                    {isExpanded && (
                      <tr>
                        <td colSpan="6" className="p-0 border-0">
                          <div className="bg-light p-4 rounded-3 m-3 mt-0 shadow-sm border border-white">
                            <div className="row">
                              <div className="col-md-6 mb-3 mb-md-0 border-end">
                                <h6 className="fw-bold mb-3 text-primary-custom">Customer Information</h6>
                                <p className="mb-1">
                                  <strong>Name:</strong> {order.customerName}
                                </p>
                                <p className="mb-1">
                                  <strong>Phone:</strong> {order.phone}
                                </p>
                                <p className="mb-1">
                                  <strong>Email:</strong> {order.email || "N/A"}
                                </p>
                                <p className="mb-0">
                                  <strong>Address:</strong> {order.address}
                                </p>
                              </div>
                              <div className="col-md-6">
                                <h6 className="fw-bold mb-3 text-primary-custom">Order Items</h6>
                                <ul className="list-group list-group-flush bg-transparent">
                                  {items.map((item, i) => {
                                    const itemProductId = item.productId || item.id || (item.product && item.product.id);
                                    const dbProduct = productsById.get(itemProductId) || {};
                                    const qty = Number(item.qty || 1);
                                    const sellPrice = Number(item.price || item.sellPrice || dbProduct.sellPrice || dbProduct.price || 0);
                                    const costPrice = Number(item.costPrice ?? dbProduct.costPrice ?? 0);
                                    const itemRevenue = sellPrice * qty;
                                    const itemCost = costPrice * qty;
                                    const itemProfit = itemRevenue - itemCost;
                                    
                                    const isEditing = editingItem && editingItem.orderId === order.id && editingItem.productId === itemProductId;
                                    const isSavingItem = savingItem && savingItem.orderId === order.id && savingItem.productId === itemProductId;

                                    return (
                                      <li
                                        key={i}
                                        className="list-group-item bg-transparent px-0 border-light d-flex align-items-center"
                                      >
                                        <img
                                          src={item.image}
                                          alt=""
                                          width="40"
                                          height="40"
                                          className="rounded object-fit-cover me-3 border"
                                        />
                                        <div className="flex-grow-1">
                                          <div className="fw-medium" style={{ fontSize: "0.9rem" }}>
                                            {item.name}
                                          </div>
                                          <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                                            Qty: {qty}
                                          </div>
                                        </div>
                                        <div className="text-end" style={{ minWidth: "180px" }}>
                                          {isEditing ? (
                                            <div className="d-flex flex-column align-items-end gap-1">
                                              <div className="d-flex align-items-center gap-1">
                                                <input
                                                  type="number"
                                                  className="form-control form-control-sm text-end"
                                                  style={{ width: "80px", fontSize: "0.85rem" }}
                                                  min="0"
                                                  value={editingItem.tempPrice}
                                                  onChange={(e) => setEditingItem({ ...editingItem, tempPrice: e.target.value })}
                                                  disabled={isSavingItem}
                                                  autoFocus
                                                />
                                                <button
                                                  className="btn btn-sm btn-success p-1 d-flex align-items-center justify-content-center"
                                                  style={{ width: "26px", height: "26px" }}
                                                  onClick={() => handleSavePrice(itemProductId, order.id, editingItem.tempPrice)}
                                                  disabled={isSavingItem}
                                                  title="Save Price"
                                                >
                                                  {isSavingItem ? (
                                                    <span className="spinner-border spinner-border-sm" style={{ width: "12px", height: "12px" }}></span>
                                                  ) : (
                                                    <i className="bi bi-check-lg" style={{ fontSize: "0.85rem" }}></i>
                                                  )}
                                                </button>
                                                <button
                                                  className="btn btn-sm btn-danger p-1 d-flex align-items-center justify-content-center"
                                                  style={{ width: "26px", height: "26px" }}
                                                  onClick={() => { setEditingItem(null); setValidationError(""); }}
                                                  disabled={isSavingItem}
                                                  title="Cancel"
                                                >
                                                  <i className="bi bi-x-lg" style={{ fontSize: "0.85rem" }}></i>
                                                </button>
                                              </div>
                                              {validationError && editingItem.productId === itemProductId && (
                                                <small className="text-danger" style={{ fontSize: "0.7rem" }}>{validationError}</small>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="d-flex align-items-center justify-content-end gap-1">
                                              <span className="fw-bold" style={{ fontSize: "0.9rem" }}>
                                                {itemRevenue.toLocaleString()} EGP
                                              </span>
                                              <button
                                                className="btn btn-link btn-sm p-0 text-muted shadow-none border-0 ms-1"
                                                onClick={() => setEditingItem({ orderId: order.id, productId: itemProductId, tempPrice: sellPrice })}
                                                title="Edit Sell Price"
                                                style={{ cursor: "pointer" }}
                                              >
                                                <i className="bi bi-pencil" style={{ fontSize: "0.8rem" }}></i>
                                              </button>
                                            </div>
                                          )}
                                          
                                          {/* Cost, Profit per item details */}
                                          <div className="text-muted small" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                                            Unit Price: {sellPrice.toLocaleString()} EGP | Cost: {costPrice.toLocaleString()} EGP
                                          </div>
                                          <div className={`small fw-semibold ${itemProfit < 0 ? "text-danger" : itemProfit === 0 ? "text-warning" : "text-success"}`} style={{ fontSize: "0.75rem" }}>
                                            Profit: {itemProfit.toLocaleString()} EGP
                                            {itemProfit < 0 && <span className="ms-1 fw-bold" style={{ fontSize: "0.7rem" }}>(Loss)</span>}
                                            {itemProfit === 0 && <span className="ms-1 fw-bold" style={{ fontSize: "0.7rem" }}>(No margin)</span>}
                                          </div>

                                          {/* Display priceLastUpdated and prior value if available */}
                                          {dbProduct.priceLastUpdated && (
                                            <div className="text-muted opacity-75 mt-1" style={{ fontSize: "0.65rem" }}>
                                              Updated: {new Date(dbProduct.priceLastUpdated).toLocaleDateString()}
                                              {dbProduct.previousPrice !== undefined && ` (was ${dbProduct.previousPrice} EGP)`}
                                            </div>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
