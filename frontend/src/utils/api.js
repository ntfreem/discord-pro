import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true, // Send httpOnly cookie on every request
});

// Request interceptor: inject instance ID header only (token lives in httpOnly cookie)
api.interceptors.request.use((config) => {
  const instanceId = localStorage.getItem("bf_instance_id");
  if (instanceId && !config.headers["X-Instance-ID"]) {
    config.headers["X-Instance-ID"] = instanceId;
  }
  return config;
});

// Response interceptor: redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      ["bf_user", "bf_instance", "bf_instance_id", "bf_instances"].forEach(k =>
        localStorage.removeItem(k)
      );
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
