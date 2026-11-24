import { db } from "../utils/firebase";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, setDoc, serverTimestamp, writeBatch
} from "@firebase/firestore";
import { uploadImageToCloudinary, deleteCloudinaryImages } from "./cloudinaryService";
import { buildProductsById, calculateOrderProfit } from "../utils/profitAnalytics";
import {
  advanceTimeline,
  appendStatusHistory,
  buildInitialTimeline,
  buildTransactionalEmail,
  createOrderNotification,
  createTrackingNumber,
  normalizeStatus,
} from "./orderLifecycle";
import { DEFAULT_STORE_SETTINGS, mergeStoreSettings } from "./storeSettings";

// ===================== STOREFRONT SETTINGS CMS =====================

const STORE_SETTINGS_CACHE_KEY = "veltrix_store_settings_cache";
const storeSettingsDocRef = doc(db, "settings", "storefront");

export const getCachedStoreSettings = () => {
  try {
    const raw = localStorage.getItem(STORE_SETTINGS_CACHE_KEY);
    return raw ? mergeStoreSettings(JSON.parse(raw)) : DEFAULT_STORE_SETTINGS;
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
};

export const subscribeToStoreSettings = (callback) => {
  return onSnapshot(
    storeSettingsDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const merged = mergeStoreSettings(snapshot.data());
        try {
          localStorage.setItem(STORE_SETTINGS_CACHE_KEY, JSON.stringify(merged));
        } catch {
          // Ignore storage quota errors
        }
        callback(merged);
      } else {
        callback(getCachedStoreSettings());
      }
    },
    (error) => {
      console.warn("Store settings subscription fallback to cached/default:", error);
      callback(getCachedStoreSettings());
    }
  );
};

export const saveStoreSettings = async (settings) => {
  const normalized = mergeStoreSettings(settings);
  try {
    localStorage.setItem(STORE_SETTINGS_CACHE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage quota errors
  }
  await setDoc(
    storeSettingsDocRef,
    {
      ...normalized,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return normalized;
};

// ===================== PRODUCTS =====================

const productsCol = collection(db, "products");

export const subscribeToProducts = (callback) => {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(products);
  }, (error) => {
    console.error("Products subscription error:", error);
  });
};

export const getProducts = async () => {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getProductById = async (productId) => {
  const docRef = doc(db, "products", productId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const addProduct = async (productData) => {
  const docRef = await addDoc(productsCol, {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const createProductWithId = async (productId, productData) => {
  const docRef = doc(db, "products", productId);
  await setDoc(docRef, {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return productId;
};

export const updateProduct = async (productId, data) => {
  const docRef = doc(db, "products", productId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (productOrId) => {
  const productId = typeof productOrId === "string" ? productOrId : productOrId?.id;
  const publicIds = [
    ...(productOrId?.imagePublicIds || []),
    ...(productOrId?.imagesMeta || []).map((item) => item?.publicId).filter(Boolean),
  ];
  await deleteCloudinaryImages(publicIds);
  const docRef = doc(db, "products", productId);
  await deleteDoc(docRef);
};

// ===================== PRODUCT IMAGES =====================

export const uploadProductImage = async (file, productId, onProgress) => {
  return uploadImageToCloudinary(file, {
    folder: `products/${productId}`,
    onProgress,
  });
};

export const deleteProductImage = async (publicId) => {
  await deleteCloudinaryImages(publicId ? [publicId] : []);
};

// ===================== ORDERS & NOTIFICATIONS =====================

const ordersCol = collection(db, "orders");
const notificationsCol = collection(db, "notifications");
const mailCol = collection(db, "mail");
const reviewsCol = collection(db, "reviews");
const subscribersCol = collection(db, "subscribers");

const createCustomerNotification = async (order, status) => {
  if (!order.email) return null;
  return addDoc(notificationsCol, {
    ...createOrderNotification(order, status, order.language || "en"),
    email: order.email,
    userId: order.userId || null,
    createdAt: serverTimestamp(),
  });
};

const queueOrderEmail = async (order, status) => {
  if (!order.email) return null;
  return addDoc(mailCol, {
    ...buildTransactionalEmail(order, status, order.language || "en"),
    orderId: order.id || "",
    trackingNumber: order.trackingNumber || "",
    status: normalizeStatus(status),
    createdAt: serverTimestamp(),
  });
};

/** Real Firestore doc id must stay in `id` for updateDoc/delete. Stored `data.id` (e.g. ORD-…) is surfaced as displayOrderId only. */
export const normalizeOrderFromSnapshot = (d) => {
  const data = d.data();
  const legacyCustomId =
    typeof data.id === "string" && data.id.startsWith("ORD") ? data.id : null;
  const displayOrderId =
    data.orderNumber ||
    data.orderId ||
    legacyCustomId ||
    `ORD-${String(d.id).replace(/[^a-zA-Z0-9]/g, "").slice(-6)}`;
  return {
    ...data,
    id: d.id,
    displayOrderId,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  };
};

export const saveOrderToFirestore = async (orderData) => {
  const { id: legacyStoredId, ...rest } = orderData;
  const createdAt = new Date();
  const status = normalizeStatus(rest.status || "pending");
  const cachedSettings = getCachedStoreSettings();
  const trackingNumber =
    rest.trackingNumber ||
    createTrackingNumber(createdAt, cachedSettings.brand?.trackingPrefix || "VTX");
  const payload = {
    ...rest,
    status,
    trackingNumber,
    ...(legacyStoredId &&
    typeof legacyStoredId === "string" &&
    legacyStoredId.startsWith("ORD") &&
    !rest.orderId
      ? { orderId: legacyStoredId }
      : {}),
    paymentMethod: rest.paymentMethod || "Cash on Delivery",
    timeline: rest.timeline || buildInitialTimeline(status, createdAt),
    statusHistory: rest.statusHistory || appendStatusHistory([], status, "customer", createdAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(ordersCol, payload);
  const queuedOrder = { ...payload, id: docRef.id, createdAt: createdAt.toISOString() };
  await Promise.allSettled([
    queueOrderEmail(queuedOrder, status),
    createCustomerNotification(queuedOrder, status),
  ]);
  return docRef.id;
};

export const subscribeToOrders = (callback) => {
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => normalizeOrderFromSnapshot(d));
    callback(orders);
  });
};

export const subscribeToUserOrders = (email, callback) => {
  const q = query(ordersCol, where("email", "==", email), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => normalizeOrderFromSnapshot(d));
    callback(orders);
  }, (error) => {
    console.error("User orders subscription error:", error);
    callback([]);
  });
};

export const subscribeToUserNotifications = (email, callback) => {
  if (!email) return () => {};
  const q = query(notificationsCol, where("email", "==", email), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt || "",
    })));
  }, (error) => {
    console.error("Notifications subscription error:", error);
    callback([]);
  });
};

export const markNotificationAsRead = async (notificationId) => {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (err) {
    console.error("Failed to mark notification read:", err);
  }
};

export const markAllNotificationsAsRead = async (notifications = []) => {
  const unread = notifications.filter((n) => !n.read && n.id);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.forEach((item) => {
      batch.update(doc(db, "notifications", item.id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("Failed to mark all notifications read:", err);
  }
};

export const getUserOrdersFromFirestore = async (email) => {
  if (!email) return [];
  const q = query(ordersCol, where("email", "==", email), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => normalizeOrderFromSnapshot(d));
};

export const updateOrderStatus = async (firestoreDocId, status) => {
  if (!firestoreDocId || typeof firestoreDocId !== "string") {
    throw new Error("Invalid Firestore document id for order update.");
  }
  const docRef = doc(db, "orders", firestoreDocId);
  const orderSnapshot = await getDoc(docRef);
  const existingOrder = orderSnapshot.exists()
    ? normalizeOrderFromSnapshot({ id: orderSnapshot.id, data: () => orderSnapshot.data() })
    : null;
  const normalizedStatus = normalizeStatus(status);
  const statusChangedAt = new Date();
  const payload = {
    status: normalizedStatus,
    timeline: advanceTimeline(existingOrder?.timeline || [], normalizedStatus, statusChangedAt),
    statusHistory: appendStatusHistory(existingOrder?.statusHistory || [], normalizedStatus, "admin", statusChangedAt),
    updatedAt: serverTimestamp(),
  };

  if (normalizedStatus === "delivered") {
    const productsSnapshot = await getDocs(productsCol);
    const order = existingOrder || { items: [] };
    const products = productsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const profitSummary = calculateOrderProfit(order, buildProductsById(products));

    payload.deliveredAt = serverTimestamp();
    payload.revenue = profitSummary.revenue;
    payload.cost = profitSummary.cost;
    payload.profit = profitSummary.profit;
    payload.profitItems = profitSummary.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      sellPrice: item.sellPrice,
      costPrice: item.costPrice,
      revenue: item.revenue,
      cost: item.cost,
      profit: item.profit,
    }));
  }

  await updateDoc(docRef, payload);
  if (existingOrder) {
    const updatedOrder = { ...existingOrder, ...payload, id: firestoreDocId, updatedAt: statusChangedAt.toISOString() };
    await Promise.allSettled([
      queueOrderEmail(updatedOrder, normalizedStatus),
      createCustomerNotification(updatedOrder, normalizedStatus),
    ]);
  }
};

export const cancelCustomerOrder = async (firestoreDocId) => {
  return updateOrderStatus(firestoreDocId, "cancelled");
};

// ===================== PRODUCT REVIEWS =====================

const LOCAL_REVIEWS_KEY = "veltrix_product_reviews";

const getLocalReviews = (productId) => {
  try {
    const map = JSON.parse(localStorage.getItem(LOCAL_REVIEWS_KEY) || "{}");
    return Array.isArray(map[productId]) ? map[productId] : [];
  } catch {
    return [];
  }
};

const saveLocalReview = (productId, review) => {
  try {
    const map = JSON.parse(localStorage.getItem(LOCAL_REVIEWS_KEY) || "{}");
    const existing = Array.isArray(map[productId]) ? map[productId] : [];
    map[productId] = [review, ...existing];
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
};

export const subscribeToProductReviews = (productId, callback) => {
  if (!productId) {
    callback([]);
    return () => {};
  }
  const q = query(reviewsCol, where("productId", "==", productId));
  return onSnapshot(q, (snapshot) => {
    const firestoreReviews = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt || new Date().toISOString(),
    }));
    const localReviews = getLocalReviews(productId);
    const seenIds = new Set(firestoreReviews.map((r) => r.id));
    const merged = [...firestoreReviews, ...localReviews.filter((r) => !seenIds.has(r.id))].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    callback(merged);
  }, () => {
    callback(getLocalReviews(productId));
  });
};

export const addProductReview = async (productId, reviewData) => {
  const newReview = {
    productId,
    userId: reviewData.userId || null,
    userName: reviewData.userName || "Customer",
    userPhoto: reviewData.userPhoto || "",
    rating: Math.min(5, Math.max(1, Number(reviewData.rating) || 5)),
    comment: String(reviewData.comment || "").trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(reviewsCol, {
      ...newReview,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...newReview };
  } catch {
    const localReview = { id: `local_${Date.now()}`, ...newReview };
    saveLocalReview(productId, localReview);
    return localReview;
  }
};

// ===================== NEWSLETTER =====================

const LOCAL_SUBSCRIBERS_KEY = "veltrix_newsletter_subscribers";

export const subscribeToNewsletter = async (email) => {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) throw new Error("Email required");

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_SUBSCRIBERS_KEY) || "[]");
    if (!existing.includes(cleanEmail)) {
      localStorage.setItem(LOCAL_SUBSCRIBERS_KEY, JSON.stringify([...existing, cleanEmail]));
    }
  } catch {
    // Ignore storage quota errors
  }

  try {
    await setDoc(doc(subscribersCol, cleanEmail.replace(/[^a-z0-9@._-]/g, "_")), {
      email: cleanEmail,
      subscribedAt: serverTimestamp(),
      source: "footer",
    }, { merge: true });
  } catch {
    // Gracefully rely on localStorage fallback if security rules block public subscriber writes
  }
  return true;
};

// ===================== ADMIN =====================

export const isUserAdmin = async (uid, email) => {
  if (!uid && !email) return false;
  try {
    if (uid) {
      const docRef = doc(db, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().role === "admin") {
        return true;
      }
    }

    if (email) {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email), where("role", "==", "admin"));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    }

    return false;
  } catch (err) {
    console.error("Admin check error:", err);
    return false;
  }
};

export const updateProductPriceFromOrder = async (productId, orderId, newPrice) => {
  if (!productId || !orderId) {
    throw new Error("Missing required product or order ID.");
  }
  const numericPrice = Number(newPrice);
  if (isNaN(numericPrice) || numericPrice < 0) {
    throw new Error("Invalid price value.");
  }

  // 1. Update the product database
  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const prodData = productSnap.data();
      const previousPrice = prodData.price ?? prodData.sellPrice ?? null;
      await updateDoc(productRef, {
        price: numericPrice,
        sellPrice: numericPrice,
        previousPrice: previousPrice,
        priceLastUpdated: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Failed to update product pricing:", err);
  }

  // 2. Update the order document
  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);
  if (orderSnap.exists()) {
    const orderData = orderSnap.data();
    const items = typeof orderData.items === "string" ? JSON.parse(orderData.items) : orderData.items || [];

    const updatedItems = items.map((item) => {
      const itemProductId = item.productId || item.id || (item.product && item.product.id);
      if (itemProductId === productId) {
        return {
          ...item,
          price: numericPrice,
          sellPrice: numericPrice,
        };
      }
      return item;
    });

    const newTotalPrice = updatedItems.reduce(
      (sum, item) => sum + (Number(item.price || item.sellPrice || 0) * Number(item.qty || item.quantity || 1)),
      0
    );

    const payload = {
      items: updatedItems,
      totalPrice: newTotalPrice,
      updatedAt: serverTimestamp(),
    };

    if (String(orderData.status || "").toLowerCase() === "delivered") {
      const productsSnapshot = await getDocs(productsCol);
      const products = productsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const normalizedOrder = normalizeOrderFromSnapshot({
        id: orderSnap.id,
        data: () => ({ ...orderData, items: updatedItems, totalPrice: newTotalPrice }),
      });
      const profitSummary = calculateOrderProfit(normalizedOrder, buildProductsById(products));

      payload.deliveredAt = serverTimestamp();
      payload.revenue = profitSummary.revenue;
      payload.cost = profitSummary.cost;
      payload.profit = profitSummary.profit;
      payload.profitItems = profitSummary.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        sellPrice: item.sellPrice,
        costPrice: item.costPrice,
        revenue: item.revenue,
        cost: item.cost,
        profit: item.profit,
      }));
    }

    await updateDoc(orderRef, payload);
  } else {
    throw new Error("Order not found.");
  }
};
