import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const storedUser = localStorage.getItem("bf_user");
    const storedInstance = localStorage.getItem("bf_instance");
    const storedInstances = localStorage.getItem("bf_instances");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        if (storedInstances) setInstances(JSON.parse(storedInstances));
        if (storedInstance) setSelectedInstance(JSON.parse(storedInstance));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // tokenVal kept in signature — stored in localStorage for CORS-compatible Bearer auth
  // httpOnly cookie is set by the backend as an additional XSS protection layer
  const login = useCallback((tokenVal, userVal, instancesVal) => {
    const inst = instancesVal || [];
    setUser(userVal);
    setInstances(inst);
    if (tokenVal) localStorage.setItem("bf_token", tokenVal);
    localStorage.setItem("bf_user", JSON.stringify(userVal));
    localStorage.setItem("bf_instances", JSON.stringify(inst));

    if (inst.length === 1) {
      setSelectedInstance(inst[0]);
      localStorage.setItem("bf_instance", JSON.stringify(inst[0]));
      localStorage.setItem("bf_instance_id", inst[0].id);
    }
  }, []);

  const selectInstance = useCallback((instance) => {
    setSelectedInstance(instance);
    localStorage.setItem("bf_instance", JSON.stringify(instance));
    localStorage.setItem("bf_instance_id", instance.id);
  }, []);

  const logout = useCallback(() => {
    // Clear httpOnly cookie on backend (fire-and-forget)
    axios.post(`${BASE}/auth/logout`, {}, { withCredentials: true }).catch(() => {});
    setUser(null);
    setInstances([]);
    setSelectedInstance(null);
    ["bf_token", "bf_user", "bf_instance", "bf_instance_id", "bf_instances"].forEach(k =>
      localStorage.removeItem(k)
    );
  }, []);

  // Re-fetch instances from /auth/me and update state + localStorage
  const refreshInstances = useCallback(async () => {
    const token = localStorage.getItem("bf_token");
    if (!token) return;
    try {
      const res = await axios.get(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const newInstances = res.data.instances || [];
      setInstances(newInstances);
      localStorage.setItem("bf_instances", JSON.stringify(newInstances));
      // Auto-select if exactly one instance and nothing is selected yet
      if (newInstances.length === 1) {
        setSelectedInstance(newInstances[0]);
        localStorage.setItem("bf_instance", JSON.stringify(newInstances[0]));
        localStorage.setItem("bf_instance_id", newInstances[0].id);
      }
    } catch {
      // silently fail — instances state unchanged
    }
  }, []);

  const value = useMemo(() => ({
    user, instances, selectedInstance, login, selectInstance, logout, loading, refreshInstances
  }), [user, instances, selectedInstance, login, selectInstance, logout, loading, refreshInstances]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
