import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("bf_token");
    const storedUser = localStorage.getItem("bf_user");
    const storedInstance = localStorage.getItem("bf_instance");
    const storedInstances = localStorage.getItem("bf_instances");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedInstances) setInstances(JSON.parse(storedInstances));
        if (storedInstance) setSelectedInstance(JSON.parse(storedInstance));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = (tokenVal, userVal, instancesVal) => {
    const inst = instancesVal || [];
    setToken(tokenVal);
    setUser(userVal);
    setInstances(inst);
    localStorage.setItem("bf_token", tokenVal);
    localStorage.setItem("bf_user", JSON.stringify(userVal));
    localStorage.setItem("bf_instances", JSON.stringify(inst));

    // Auto-select if exactly one instance
    if (inst.length === 1) {
      setSelectedInstance(inst[0]);
      localStorage.setItem("bf_instance", JSON.stringify(inst[0]));
      localStorage.setItem("bf_instance_id", inst[0].id);
    }
  };

  const selectInstance = (instance) => {
    setSelectedInstance(instance);
    localStorage.setItem("bf_instance", JSON.stringify(instance));
    localStorage.setItem("bf_instance_id", instance.id);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setInstances([]);
    setSelectedInstance(null);
    ["bf_token", "bf_user", "bf_instance", "bf_instance_id", "bf_instances"].forEach(k =>
      localStorage.removeItem(k)
    );
  };

  return (
    <AuthContext.Provider value={{ user, token, instances, selectedInstance, login, selectInstance, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
