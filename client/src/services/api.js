import axios from "axios";
const key = "samarthya.token";
export const tokenStore = {
  get: () => sessionStorage.getItem(key) || localStorage.getItem(key),
  set: (token, remember) => {
    tokenStore.clear();
    (remember ? localStorage : sessionStorage).setItem(key, token);
  },
  clear: () => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.startsWith("/auth/login")
    ) {
      tokenStore.clear();
      window.dispatchEvent(new Event("session-expired"));
    }
    if (
      error.response?.status === 403 &&
      /Your account/.test(error.response.data.message)
    ) {
      tokenStore.clear();
      window.dispatchEvent(new Event("session-expired"));
    }
    return Promise.reject(error);
  },
);
export const errorMessage = (error) =>
  error.response?.data?.message ||
  "Unable to connect. Check your connection and try again.";
export const fieldErrors = (error) =>
  Object.fromEntries(
    (error.response?.data?.errors || []).map((e) => [e.field, e.message]),
  );
export default api;
