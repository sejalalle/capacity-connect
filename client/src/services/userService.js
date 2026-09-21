import api from "./api";
export const userService = {
  list: (params) => api.get("/users", { params }).then((r) => r.data.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data.data.user),
  update: (id, body) =>
    api.patch(`/users/${id}`, body).then((r) => r.data.data.user),
  status: (id, accountStatus) =>
    api
      .patch(`/users/${id}/status`, { accountStatus })
      .then((r) => r.data.data.user),
};
