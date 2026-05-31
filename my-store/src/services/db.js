import { doc, getDoc, serverTimestamp, setDoc } from "@firebase/firestore";
import { db } from "../utils/firebase";

const API_URL = "/api/orders";

const buildAuthProfile = (user) => ({
  name: user.displayName || "",
  email: user.email || "",
  address: "",
  phone: "",
  createdAt: new Date().toISOString(),
});

export const syncUser = async (user) => {
  if (!user) return null;
  const localKey = `profile_${user.uid}`;
  const authProfile = buildAuthProfile(user);
  const storedProfile = localStorage.getItem(localKey);
  const localProfile = storedProfile ? JSON.parse(storedProfile) : {};

  let firestoreProfile = {};
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    firestoreProfile = userSnap.exists() ? userSnap.data() : {};
    await setDoc(userRef, {
      ...authProfile,
      ...firestoreProfile,
      ...localProfile,
      name: localProfile.name || firestoreProfile.name || authProfile.name || "Unknown User",
      email: localProfile.email || firestoreProfile.email || authProfile.email,
      updatedAt: serverTimestamp(),
      ...(!firestoreProfile.createdAt ? { createdAt: serverTimestamp() } : {}),
    }, { merge: true });
  } catch (error) {
    console.warn("Unable to sync user profile with Firestore:", error);
  }

  const syncedProfile = {
    ...authProfile,
    ...firestoreProfile,
    ...localProfile,
    name: localProfile.name || firestoreProfile.name || authProfile.name || "Unknown User",
    email: localProfile.email || firestoreProfile.email || authProfile.email,
  };
  localStorage.setItem(localKey, JSON.stringify(syncedProfile));
  return syncedProfile;
};

export const getUserProfile = async (uid) => {
  const storedProfile = localStorage.getItem(`profile_${uid}`);
  return storedProfile ? JSON.parse(storedProfile) : null;
};

export const updateUserProfile = async (uid, data) => {
  const localKey = `profile_${uid}`;
  const storedProfile = localStorage.getItem(localKey) ? JSON.parse(localStorage.getItem(localKey)) : {};
  const updated = { ...storedProfile, ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(localKey, JSON.stringify(updated));
  try {
    await setDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn("Unable to update user profile in Firestore:", error);
  }
  return updated;
};

export const createOrder = async (orderData) => {
  const payload = {
    ...orderData,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    throw new Error("Failed to place order.");
  }
  
  return "order_placed";
};

export const getUserOrders = async (email) => {
  if (!email) return [];
  try {
    const res = await fetch(`${API_URL}?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error("Failed to load orders from server.");
    const data = await res.json();
    const serverOrders = (data || []);
    // Merge with local WhatsApp orders
    const localOrders = getLocalOrders();
    return [...serverOrders, ...localOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    // If server is unreachable, return local orders only
    return getLocalOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};

// ================= LOCAL WHATSAPP ORDERS =================
const LOCAL_ORDERS_KEY = "whatsapp_orders";

export const saveLocalOrder = (orderData) => {
  const existing = getLocalOrders();
  existing.push(orderData);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(existing));
};

export const getLocalOrders = () => {
  try {
    const data = localStorage.getItem(LOCAL_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
