export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function parseOrderItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function isDeliveredOrder(order) {
  return String(order?.status || "").toLowerCase() === "delivered";
}

export function getOrderDate(order) {
  const value = order?.deliveredAt || order?.updatedAt || order?.createdAt;
  const date = value?.toDate?.() || new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function calculateOrderProfit(order, productsById = new Map()) {
  const items = parseOrderItems(order?.items);
  const orderDate = getOrderDate(order);
  const orderId = order?.displayOrderId || order?.orderId || order?.id || "";

  const itemProfits = items.map((item) => {
    const productId = item.productId || item.id || item.product?.id || "";
    const product = productsById.get(productId) || {};
    const quantity = Math.max(0, toNumber(item.qty || item.quantity || 1));
    const sellPrice = toNumber(item.sellPrice ?? item.price ?? product.sellPrice ?? product.price);
    const costPrice = toNumber(item.costPrice ?? product.costPrice);
    const revenue = sellPrice * quantity;
    const cost = costPrice * quantity;
    const profit = revenue - cost;

    return {
      productId,
      productName: item.name || product.name || "Unknown Product",
      quantity,
      sellPrice,
      costPrice,
      revenue,
      cost,
      profit,
      date: orderDate,
      dateKey: formatDateKey(orderDate),
      monthKey: formatMonthKey(orderDate),
      orderId,
    };
  });

  const totals = itemProfits.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      cost: acc.cost + item.cost,
      profit: acc.profit + item.profit,
      quantity: acc.quantity + item.quantity,
    }),
    { revenue: 0, cost: 0, profit: 0, quantity: 0 }
  );

  return {
    ...totals,
    items: itemProfits,
  };
}

export function buildProductsById(products) {
  return new Map((products || []).map((product) => [product.id, product]));
}
