import api from "./api";
const data = (request) => request.then((response) => response.data.data);
export const part2 = {
  get: (path, params) => data(api.get(path, { params })),
  post: (path, body) => data(api.post(path, body)),
  patch: (path, body) => data(api.patch(path, body)),
};
