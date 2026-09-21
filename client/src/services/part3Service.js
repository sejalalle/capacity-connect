import api from "./api";
const unwrap = (request) => request.then((response) => response.data.data);
export const part3 = {
  get: (path, params) => unwrap(api.get(`/part3${path}`, { params })),
  post: (path, body) => unwrap(api.post(`/part3${path}`, body)),
  put: (path, body) => unwrap(api.put(`/part3${path}`, body)),
  patch: (path, body) => unwrap(api.patch(`/part3${path}`, body)),
  uploadCourseFile: (courseId, file) =>
    unwrap(
      api.post(`/part3/course-files/${courseId}`, file, {
        headers: {
          "Content-Type": file.type,
          "X-File-Name": file.name,
          "X-File-Purpose": "LEARNING",
        },
      }),
    ),
};
