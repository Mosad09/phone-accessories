import axios from "axios";

// Default backend URL
const API_URL = "https://script.google.com/macros/s/XXXX/exec";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
