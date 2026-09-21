import api from "./api";
export const authService = {
  login: (body) => api.post("/auth/login", body).then((r) => r.data.data),
  register: (body) => api.post("/auth/register", body).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data.data.user),
};
