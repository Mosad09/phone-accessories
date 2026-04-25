import { db } from "../utils/firebase";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";

export const syncUser = async (user) => {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    const newUser = {
      name: user.displayName || "Unknown User",
      email: user.email || "",
      address: "",
      phone: "",
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
  return snap.data();
};

export const getUserProfile = async (uid) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
};

export const createOrder = async (orderData) => {
  const ordersRef = collection(db, "orders");
  const newOrder = {
    ...orderData,
    status: "pending",
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(ordersRef, newOrder);
  return docRef.id;
};

export const getUserOrders = async (uid) => {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("userId", "==", uid));
  const snap = await getDocs(q);
  const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Sort on client side to avoid composite index error
  return orders.sort((a, b) => {
    const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
};
