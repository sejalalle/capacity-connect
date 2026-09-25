import api, { tokenStore } from "./api";
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
  media: {
    list: () => unwrap(api.get("/part3/media")),
    uploadableCourses: () => unwrap(api.get("/part3/media/courses")),
    upload: (courseId, file, meta, onUploadProgress) =>
      unwrap(
        api.post(`/part3/media/courses/${courseId}`, file, {
          timeout: 0,
          headers: {
            "Content-Type": file.type,
            "X-File-Name": file.name,
            "X-Media-Title": meta.title || file.name,
            ...(meta.batch ? { "X-Media-Batch": meta.batch } : {}),
          },
          onUploadProgress,
        }),
      ),
    remove: (id) => unwrap(api.delete(`/part3/media/${id}`)),
    moderate: (id, body) =>
      unwrap(api.post(`/part3/media/${id}/moderate`, body)),
    saveProgress: (id, body) =>
      unwrap(api.post(`/part3/media/${id}/progress`, body)),
    streamUrl: (id) =>
      `${api.defaults.baseURL}/part3/media/${id}/content?token=${encodeURIComponent(
        tokenStore.get() || "",
      )}`,
  },
};
