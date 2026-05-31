import { db } from "../utils/firebase";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, setDoc, serverTimestamp
} from "firebase/firestore";
import { uploadImageToCloudinary, deleteCloudinaryImages } from "./cloudinaryService";
import { buildProductsById, calculateOrderProfit } from "../utils/profitAnalytics";

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

// ===================== ORDERS =====================

const ordersCol = collection(db, "orders");

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
  const payload = {
    ...rest,
    ...(legacyStoredId &&
    typeof legacyStoredId === "string" &&
    legacyStoredId.startsWith("ORD") &&
    !rest.orderId
      ? { orderId: legacyStoredId }
      : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(ordersCol, payload);
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
  });
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
  const payload = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (String(status).toLowerCase() === "delivered") {
    const [orderSnapshot, productsSnapshot] = await Promise.all([
      getDoc(docRef),
      getDocs(productsCol),
    ]);
    const order = orderSnapshot.exists()
      ? normalizeOrderFromSnapshot({ id: orderSnapshot.id, data: () => orderSnapshot.data() })
      : { items: [] };
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
};

// ===================== ADMIN =====================

export const isUserAdmin = async (uid, email) => {
  if (!uid && !email) return false;
  try {
    // First try by uid if available
    if (uid) {
      const docRef = doc(db, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().role === "admin") {
        return true;
      }
    }
    
    // Fallback: query users collection by email
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
    
    // Update the item price in the order items list
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

    // Recalculate totalPrice
    const newTotalPrice = updatedItems.reduce(
      (sum, item) => sum + (Number(item.price || item.sellPrice || 0) * Number(item.qty || item.quantity || 1)),
      0
    );

    const payload = {
      items: updatedItems,
      totalPrice: newTotalPrice,
      updatedAt: serverTimestamp(),
    };

    // If order status is delivered, recalculate profit metrics
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
