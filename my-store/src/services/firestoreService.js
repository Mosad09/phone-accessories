import { db, storage } from "../utils/firebase";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, setDoc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";

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

export const addProduct = async (productData) => {
  const docRef = await addDoc(productsCol, {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateProduct = async (productId, data) => {
  const docRef = doc(db, "products", productId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (productId) => {
  const docRef = doc(db, "products", productId);
  await deleteDoc(docRef);
};

// ===================== PRODUCT IMAGES =====================

export const uploadProductImage = async (file, productId) => {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `products/${productId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path: snapshot.ref.fullPath };
};

export const deleteProductImage = async (imagePath) => {
  try {
    const storageRef = ref(storage, imagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.error("Failed to delete image:", err);
  }
};

// ===================== ORDERS =====================

const ordersCol = collection(db, "orders");

export const saveOrderToFirestore = async (orderData) => {
  const docRef = await addDoc(ordersCol, {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const subscribeToOrders = (callback) => {
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });
    callback(orders);
  });
};

export const subscribeToUserOrders = (email, callback) => {
  const q = query(ordersCol, where("email", "==", email), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });
    callback(orders);
  });
};

export const getUserOrdersFromFirestore = async (email) => {
  if (!email) return [];
  const q = query(ordersCol, where("email", "==", email), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    };
  });
};

export const updateOrderStatus = async (orderId, status) => {
  const docRef = doc(db, "orders", orderId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
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
