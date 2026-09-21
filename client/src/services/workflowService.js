import api from "./api";
export const workflowService = {
  get: () => api.get("/workflow").then((r) => r.data.data),
  act: (action, data) =>
    api
      .post(`/workflow/actions/${action}`, data)
      .then((r) => r.data.data.record),
  matching: (batch, session) =>
    api
      .get(`/workflow/batches/${batch}/matching/${session}`)
      .then((r) => r.data.data.recommendations),
  upload: (batch, file, purpose) =>
    api
      .post(`/workflow/files/${batch}`, file, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Type": file.type || "text/plain",
          "X-File-Name": file.name,
          "X-File-Purpose": purpose,
        },
      })
      .then((r) => r.data.data.resource),
  download: async (resource) => {
    const r = await api.get(`/workflow/files/${resource._id}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = resource.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
