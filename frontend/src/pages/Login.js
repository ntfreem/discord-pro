import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Bot } from "lucide-react";

const BASE = `/api`;

const S = {
  page: {
    minHeight: "100vh", backgroundColor: "#0A0A0A",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "IBM Plex Sans, sans-serif",
  },
  card: {
    width: "100%", maxWidth: "400px",
    backgroundColor: "#121212", border: "1px solid #262626",
    borderRadius: "8px", padding: "40px 36px",
  },
  logo: {
    display: "flex", alignItems: "center", gap: "10px",
    marginBottom: "32px", justifyContent: "center",
  },
  logoIcon: {
    width: "36px", height: "36px", backgroundColor: "#0055FF",
    borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
  },
  heading: {
    fontFamily: "Chivo, sans-serif", fontSize: "24px",
    fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px",
    textAlign: "center", marginBottom: "8px",
  },
  sub: {
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px",
    color: "#A1A1AA", textAlign: "center", marginBottom: "28px",
  },
  label: {
    display: "block", fontFamily: "JetBrains Mono, monospace",
    fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase",
    letterSpacing: "0.1em", marginBottom: "6px",
  },
  input: {
    width: "100%", padding: "10px 14px",
    backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", color: "#FFFFFF",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px",
    outline: "none", boxSizing: "border-box", marginBottom: "16px",
  },
  btn: {
    width: "100%", padding: "12px",
    backgroundColor: "#0055FF", border: "none",
    borderRadius: "4px", color: "#FFFFFF", cursor: "pointer",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px",
    fontWeight: "600", marginTop: "8px", transition: "background 0.15s",
  },
  err: {
    backgroundColor: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: "4px", padding: "10px 14px",
    color: "#FF6B6B", fontSize: "13px", marginBottom: "16px",
  },
  link: {
    textAlign: "center", marginTop: "20px",
    fontSize: "13px", color: "#A1A1AA",
  },
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${BASE}/auth/login`, { email, password });
      const { token, user, instances } = res.data;
      login(token, user, instances);

      if (instances.length > 1) {
        navigate("/select-instance");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}>
            <Bot size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: "Chivo, sans-serif", fontSize: "20px", fontWeight: "900", color: "#FFFFFF" }}>
            Bridge<span style={{ color: "#0055FF" }}>Bot</span>
          </span>
        </div>

        <h1 style={S.heading}>Welcome back</h1>
        <p style={S.sub}>Sign in to your workspace</p>

        {error && <div style={S.err} data-testid="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={S.label}>Email</label>
          <input
            data-testid="login-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={S.input}
            required
          />
          <label style={S.label}>Password</label>
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={S.input}
            required
          />
          <button
            data-testid="login-submit"
            type="submit"
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={S.link}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#0055FF", textDecoration: "none", fontWeight: "600" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
