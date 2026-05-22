import { useEffect, useMemo, useState } from "react";
import { subscribeToOrders, subscribeToProducts } from "../../services/firestoreService";
import {
  buildProductsById,
  calculateOrderProfit,
  formatDateKey,
  isDeliveredOrder,
} from "../../utils/profitAnalytics";

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("en-EG")} EGP`;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseSearchRange(searchTerm) {
  const search = searchTerm.toLowerCase();
  const now = new Date();

  if (search.includes("today")) {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (search.includes("last 7")) {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(now) };
  }

  if (search.includes("last 30")) {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    return { start, end: endOfDay(now) };
  }

  const betweenMatch = searchTerm.match(/between\s+([a-z]+\s+\d{1,2})\s+and\s+([a-z]+\s+\d{1,2})/i);
  if (betweenMatch) {
    const year = now.getFullYear();
    const start = new Date(`${betweenMatch[1]}, ${year}`);
    const end = new Date(`${betweenMatch[2]}, ${year}`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start: startOfDay(start), end: endOfDay(end) };
    }
  }

  return null;
}

function getSearchProductTerms(searchTerm) {
  return searchTerm
    .toLowerCase()
    .replace(/between\s+[a-z]+\s+\d{1,2}\s+and\s+[a-z]+\s+\d{1,2}/gi, "")
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .filter((term) => ![
      "how",
      "much",
      "profit",
      "for",
      "product",
      "products",
      "today",
      "last",
      "days",
      "day",
      "top",
      "earning",
      "earnings",
      "between",
      "and",
    ].includes(term))
    .filter((term) => !/^\d+$/.test(term));
}

function getRange(dateRange, customStart, customEnd, searchTerm) {
  const searchRange = parseSearchRange(searchTerm);
  if (searchRange) return searchRange;

  const now = new Date();
  if (dateRange === "today") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (dateRange === "7") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(now) };
  }

  if (dateRange === "30") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    return { start, end: endOfDay(now) };
  }

  if (dateRange === "custom" && customStart && customEnd) {
    return {
      start: startOfDay(new Date(customStart)),
      end: endOfDay(new Date(customEnd)),
    };
  }

  return { start: null, end: null };
}

function aggregateBy(items, key) {
  const grouped = new Map();

  items.forEach((item) => {
    const groupKey = key(item);
    const current = grouped.get(groupKey) || {
      key: groupKey,
      revenue: 0,
      cost: 0,
      profit: 0,
      quantity: 0,
      orders: new Set(),
    };

    current.revenue += item.revenue;
    current.cost += item.cost;
    current.profit += item.profit;
    current.quantity += item.quantity;
    if (item.orderId) current.orders.add(item.orderId);
    grouped.set(groupKey, current);
  });

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    orders: item.orders.size,
  }));
}

function MetricCard({ label, value, icon, tone = "text-primary-custom" }) {
  return (
    <div className="col-md-6 col-xl-3">
      <div className="bg-light rounded-4 p-3 h-100 border">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div>
            <div className="text-muted small fw-medium">{label}</div>
            <div className="fw-bold fs-5 mt-1">{value}</div>
          </div>
          <i className={`bi ${icon} ${tone} fs-3`}></i>
        </div>
      </div>
    </div>
  );
}

function AdminAnalytics() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubOrders = subscribeToOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    const unsubProducts = subscribeToProducts(setProducts);

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  const analytics = useMemo(() => {
    const productsById = buildProductsById(products);
    const deliveredOrders = orders.filter(isDeliveredOrder);
    const deliveredItems = deliveredOrders.flatMap((order) =>
      calculateOrderProfit(order, productsById).items
    );
    const todayKey = formatDateKey(new Date());
    const todayItems = deliveredItems.filter((item) => item.dateKey === todayKey);
    const range = getRange(dateRange, customStart, customEnd, searchTerm);
    const searchProductTerms = getSearchProductTerms(searchTerm);
    const filteredItems = deliveredItems.filter((item) => {
      const inRange =
        (!range.start || item.date >= range.start) &&
        (!range.end || item.date <= range.end);
      const productName = item.productName.toLowerCase();
      const matchesSearch =
        searchProductTerms.length === 0 ||
        searchProductTerms.every((term) => productName.includes(term));

      return inRange && matchesSearch;
    });

    const sumItems = (items) => items.reduce(
      (acc, item) => ({
        revenue: acc.revenue + item.revenue,
        cost: acc.cost + item.cost,
        profit: acc.profit + item.profit,
        quantity: acc.quantity + item.quantity,
      }),
      { revenue: 0, cost: 0, profit: 0, quantity: 0 }
    );

    const totals = sumItems(filteredItems);
    const totalProfit = sumItems(deliveredItems).profit;
    const todayProfit = sumItems(todayItems).profit;
    const deliveredOrderIds = new Set(filteredItems.map((item) => item.orderId).filter(Boolean));

    const byProduct = aggregateBy(filteredItems, (item) => item.productName)
      .sort((a, b) => b.profit - a.profit);
    const byDay = aggregateBy(filteredItems, (item) => item.dateKey)
      .sort((a, b) => a.key.localeCompare(b.key));
    const byMonth = aggregateBy(filteredItems, (item) => item.monthKey)
      .sort((a, b) => a.key.localeCompare(b.key));

    return {
      totals,
      totalProfit,
      todayProfit,
      deliveredOrdersCount: deliveredOrderIds.size,
      byProduct,
      byDay,
      byMonth,
      topProducts: byProduct.slice(0, 5),
    };
  }, [orders, products, dateRange, customStart, customEnd, searchTerm]);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary-custom"></div></div>;
  }

  return (
    <div>
      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search analytics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-lg-3">
          <select className="form-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        {dateRange === "custom" && (
          <>
            <div className="col-lg-2">
              <input type="date" className="form-control" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="col-lg-2">
              <input type="date" className="form-control" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="row g-3 mb-4">
        <MetricCard label="Total Profit" value={formatMoney(analytics.totalProfit)} icon="bi-graph-up-arrow" />
        <MetricCard label="Today's Profit" value={formatMoney(analytics.todayProfit)} icon="bi-calendar-check" tone="text-success" />
        <MetricCard label="Revenue" value={formatMoney(analytics.totals.revenue)} icon="bi-cash-stack" />
        <MetricCard label="Net Profit" value={formatMoney(analytics.totals.profit)} icon="bi-piggy-bank" tone="text-success" />
        <MetricCard label="Cost" value={formatMoney(analytics.totals.cost)} icon="bi-receipt-cutoff" tone="text-danger" />
        <MetricCard label="Delivered Orders" value={analytics.deliveredOrdersCount.toLocaleString("en-EG")} icon="bi-bag-check" />
        <MetricCard label="Items Sold" value={analytics.totals.quantity.toLocaleString("en-EG")} icon="bi-box-seam" />
        <MetricCard label="Top Product Profit" value={formatMoney(analytics.topProducts[0]?.profit || 0)} icon="bi-trophy" tone="text-warning" />
      </div>

      <div className="row g-4">
        <div className="col-xl-7">
          <h6 className="fw-bold mb-3">Profit by Product</h6>
          <div className="table-responsive">
            <table className="table table-hover align-middle admin-table">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byProduct.map((item) => (
                  <tr key={item.key}>
                    <td className="fw-medium">{item.key}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.revenue)}</td>
                    <td>{formatMoney(item.cost)}</td>
                    <td className="fw-bold text-success">{formatMoney(item.profit)}</td>
                  </tr>
                ))}
                {analytics.byProduct.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">No delivered profit data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-xl-5">
          <h6 className="fw-bold mb-3">Top Profitable Products</h6>
          <div className="list-group mb-4">
            {analytics.topProducts.map((item, index) => (
              <div key={item.key} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <span className="badge bg-primary-custom rounded-pill me-2">{index + 1}</span>
                  <span className="fw-medium">{item.key}</span>
                </div>
                <span className="fw-bold text-success">{formatMoney(item.profit)}</span>
              </div>
            ))}
            {analytics.topProducts.length === 0 && (
              <div className="list-group-item text-muted">No delivered profit data found.</div>
            )}
          </div>

          <h6 className="fw-bold mb-3">Profit by Month</h6>
          <div className="table-responsive">
            <table className="table table-hover align-middle admin-table">
              <thead className="table-light">
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byMonth.map((item) => (
                  <tr key={item.key}>
                    <td>{item.key}</td>
                    <td>{formatMoney(item.revenue)}</td>
                    <td className="fw-bold text-success">{formatMoney(item.profit)}</td>
                  </tr>
                ))}
                {analytics.byMonth.length === 0 && (
                  <tr><td colSpan="3" className="text-center py-4 text-muted">No monthly data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-12">
          <h6 className="fw-bold mb-3">Profit by Day</h6>
          <div className="table-responsive">
            <table className="table table-hover align-middle admin-table">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Delivered Orders</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byDay.map((item) => (
                  <tr key={item.key}>
                    <td>{item.key}</td>
                    <td>{item.orders}</td>
                    <td>{formatMoney(item.revenue)}</td>
                    <td>{formatMoney(item.cost)}</td>
                    <td className="fw-bold text-success">{formatMoney(item.profit)}</td>
                  </tr>
                ))}
                {analytics.byDay.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">No daily data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
