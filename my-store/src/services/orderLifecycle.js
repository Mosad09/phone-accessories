export const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUSES = [
  ...ORDER_STATUS_FLOW,
  "cancelled",
  "returned",
];

export const ORDER_STATUS_META = {
  pending: {
    icon: "bi-hourglass-split",
    color: "warning",
    label: { en: "Pending", ar: "قيد الانتظار" },
    subject: { en: "We received your order", ar: "استلمنا طلبك" },
  },
  confirmed: {
    icon: "bi-check2-circle",
    color: "info",
    label: { en: "Confirmed", ar: "تم التأكيد" },
    subject: { en: "Your order is confirmed", ar: "تم تأكيد طلبك" },
  },
  preparing: {
    icon: "bi-tools",
    color: "primary",
    label: { en: "Preparing", ar: "جاري التجهيز" },
    subject: { en: "Your order is being prepared", ar: "طلبك قيد التجهيز" },
  },
  shipped: {
    icon: "bi-truck",
    color: "primary",
    label: { en: "Shipped", ar: "تم الشحن" },
    subject: { en: "Your order has shipped", ar: "تم شحن طلبك" },
  },
  out_for_delivery: {
    icon: "bi-geo-alt",
    color: "primary",
    label: { en: "Out for Delivery", ar: "خرج للتوصيل" },
    subject: { en: "Your order is out for delivery", ar: "طلبك خرج للتوصيل" },
  },
  delivered: {
    icon: "bi-bag-check",
    color: "success",
    label: { en: "Delivered", ar: "تم التسليم" },
    subject: { en: "Your order was delivered", ar: "تم تسليم طلبك" },
  },
  cancelled: {
    icon: "bi-x-circle",
    color: "danger",
    label: { en: "Cancelled", ar: "تم الإلغاء" },
    subject: { en: "Your order was cancelled", ar: "تم إلغاء طلبك" },
  },
  returned: {
    icon: "bi-arrow-return-left",
    color: "secondary",
    label: { en: "Returned", ar: "تم الإرجاع" },
    subject: { en: "Your order return was recorded", ar: "تم تسجيل إرجاع طلبك" },
  },
};

export function getStatusLabel(status, language = "en") {
  const key = normalizeStatus(status);
  return ORDER_STATUS_META[key]?.label?.[language] || ORDER_STATUS_META[key]?.label?.en || key;
}

export function normalizeStatus(status) {
  const normalized = String(status || "pending").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized === "processing") return "preparing";
  return ORDER_STATUSES.includes(normalized) ? normalized : "pending";
}

export function createTrackingNumber(date = new Date()) {
  const year = date.getFullYear();
  const sequence = `${date.getTime()}`.slice(-6).padStart(6, "0");
  return `FLX-${year}-${sequence}`;
}

export function buildInitialTimeline(status = "pending", date = new Date()) {
  const currentStatus = normalizeStatus(status);
  const now = date.toISOString();
  return ORDER_STATUS_FLOW.map((step) => ({
    status: step,
    completed: step === "pending" || step === currentStatus,
    completedAt: step === "pending" || step === currentStatus ? now : null,
  }));
}

export function advanceTimeline(existingTimeline = [], nextStatus, date = new Date()) {
  const status = normalizeStatus(nextStatus);
  const now = date.toISOString();
  const completedIndex = ORDER_STATUS_FLOW.indexOf(status);
  const timeline = ORDER_STATUS_FLOW.map((step, index) => {
    const existing = existingTimeline.find((item) => normalizeStatus(item.status) === step) || {};
    const completed = completedIndex >= 0 && index <= completedIndex;
    return {
      status: step,
      completed,
      completedAt: completed ? existing.completedAt || now : null,
    };
  });

  if (status === "cancelled" || status === "returned") {
    timeline.push({ status, completed: true, completedAt: now });
  }

  return timeline;
}

export function appendStatusHistory(existingHistory = [], nextStatus, actor = "admin", date = new Date()) {
  const status = normalizeStatus(nextStatus);
  return [
    ...existingHistory,
    {
      status,
      actor,
      createdAt: date.toISOString(),
    },
  ];
}

export function createOrderNotification(order, status, language = "en", date = new Date()) {
  const normalized = normalizeStatus(status);
  const label = getStatusLabel(normalized, language);
  const orderLabel = order.trackingNumber || order.displayOrderId || order.orderId || order.id;
  return {
    type: normalized === "pending" ? "new_order" : "status_changed",
    status: normalized,
    orderId: order.id || "",
    orderLabel,
    trackingNumber: order.trackingNumber || orderLabel,
    title: language === "ar" ? `تحديث الطلب ${orderLabel}` : `Order ${orderLabel} update`,
    message: language === "ar" ? `الحالة الحالية: ${label}` : `Current status: ${label}`,
    read: false,
    createdAt: date.toISOString(),
  };
}

export function buildTransactionalEmail(order, status, language = "en") {
  const normalized = normalizeStatus(status);
  const isArabic = language === "ar";
  const currency = isArabic ? "ج.م" : "EGP";
  const items = Array.isArray(order.items) ? order.items : [];
  const orderLabel = order.trackingNumber || order.displayOrderId || order.orderId || order.id;
  const subject = ORDER_STATUS_META[normalized]?.subject?.[language] || ORDER_STATUS_META[normalized]?.subject?.en;
  const statusLabel = getStatusLabel(normalized, language);
  const dir = isArabic ? "rtl" : "ltr";

  const rows = items.map((item) => {
    const name = isArabic ? item.nameAr || item.name : item.name;
    const qty = Number(item.qty || item.quantity || 1);
    const price = Number(item.price || item.sellPrice || 0) * qty;
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          ${item.image ? `<img src="${item.image}" alt="" width="48" height="48" style="object-fit:cover;border-radius:10px;margin-inline-end:12px;vertical-align:middle;">` : ""}
          <strong>${name || ""}</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${qty}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:end;">${price.toLocaleString(isArabic ? "ar-EG" : "en-EG")} ${currency}</td>
      </tr>
    `;
  }).join("");

  const timeline = (order.timeline || buildInitialTimeline(normalized)).map((step) => {
    const completed = step.completed;
    return `
      <li style="margin:0 0 10px;color:${completed ? "#111827" : "#9ca3af"};">
        <strong>${getStatusLabel(step.status, language)}</strong>
        ${step.completedAt ? `<span style="display:block;font-size:12px;color:#6b7280;">${new Date(step.completedAt).toLocaleString(isArabic ? "ar-EG" : "en-EG")}</span>` : ""}
      </li>
    `;
  }).join("");

  const intro = isArabic
    ? `مرحباً ${order.customerName || ""}، هذه آخر حالة لطلبك.`
    : `Hi ${order.customerName || "there"}, here is the latest update for your order.`;

  return {
    to: order.email,
    message: {
      subject: `Veltrix | ${subject} | ${orderLabel}`,
      html: `
        <div dir="${dir}" style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;color:#111827;">
          <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="padding:28px;background:linear-gradient(135deg,#0f172a,#312e81);color:#ffffff;">
              <div style="font-size:22px;font-weight:800;letter-spacing:.3px;">Veltrix</div>
              <p style="margin:14px 0 0;color:#e0e7ff;">${intro}</p>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 8px;color:#6b7280;">${isArabic ? "رقم التتبع" : "Tracking number"}</p>
              <h2 style="margin:0 0 16px;font-size:28px;">${orderLabel}</h2>
              <div style="display:inline-block;border-radius:999px;padding:8px 14px;background:#eef2ff;color:#4338ca;font-weight:700;">${statusLabel}</div>
              <h3 style="margin:28px 0 12px;">${isArabic ? "ملخص الطلب" : "Order summary"}</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tbody>${rows}</tbody>
              </table>
              <p style="text-align:end;font-size:20px;font-weight:800;margin:18px 0;">${Number(order.totalPrice || 0).toLocaleString(isArabic ? "ar-EG" : "en-EG")} ${currency}</p>
              <h3 style="margin:28px 0 12px;">${isArabic ? "مسار الطلب" : "Order timeline"}</h3>
              <ol style="padding-inline-start:22px;margin:0;">${timeline}</ol>
              <div style="margin-top:28px;padding:16px;background:#f8fafc;border-radius:14px;color:#475569;">
                <strong>${isArabic ? "عنوان الشحن" : "Shipping address"}</strong>
                <div>${order.address || ""}</div>
                <div>${isArabic ? "طريقة الدفع: الدفع عند الاستلام" : "Payment method: Cash on delivery"}</div>
              </div>
            </div>
            <div style="padding:20px 28px;background:#f1f5f9;color:#64748b;font-size:13px;">
              ${isArabic ? "شكراً لتسوقك مع Veltrix." : "Thanks for shopping with Veltrix."}
            </div>
          </div>
        </div>
      `,
    },
  };
}
