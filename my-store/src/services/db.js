const API_URL = "https://script.google.com/macros/s/AKfycbzDedo7ei48ZCJgxP23Ne4JIOAs6wz95kql_ki5XLUWJMWBV0GGy3CE9Hum4kV_cWTXgw/exec";

export const syncUser = async (user) => {
  if (!user) return null;
  const storedProfile = localStorage.getItem(`profile_${user.uid}`);
  if (storedProfile) {
    return JSON.parse(storedProfile);
  }
  const newUser = {
    name: user.displayName || "Unknown User",
    email: user.email || "",
    address: "",
    phone: "",
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newUser));
  return newUser;
};

export const getUserProfile = async (uid) => {
  const storedProfile = localStorage.getItem(`profile_${uid}`);
  return storedProfile ? JSON.parse(storedProfile) : null;
};

export const updateUserProfile = async (uid, data) => {
  const storedProfile = localStorage.getItem(`profile_${uid}`) ? JSON.parse(localStorage.getItem(`profile_${uid}`)) : {};
  const updated = { ...storedProfile, ...data };
  localStorage.setItem(`profile_${uid}`, JSON.stringify(updated));
};

export const createOrder = async (orderData) => {
  const payload = {
    ...orderData,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    throw new Error("Failed to place order.");
  }
  
  return "order_placed";
};

export const getUserOrders = async (email) => {
  if (!email) return [];
  const res = await fetch(`${API_URL}?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error("Failed to load orders from server.");
  const data = await res.json();
  
  return (data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
