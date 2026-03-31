import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true, // Send httpOnly cookie when same-origin
});

// Request interceptor: inject Authorization header (primary) + instance ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bf_token");
  const instanceId = localStorage.getItem("bf_instance_id");

  // Bearer header works with CORS allow_origins=* in all deployment scenarios
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
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
      ["bf_token", "bf_user", "bf_instance", "bf_instance_id", "bf_instances"].forEach(k =>
        localStorage.removeItem(k)
      );
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
