import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Bot } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

const BASE = `/api`;
const AUTH_BG = "https://static.prod-images.emergentagent.com/jobs/6e59f39d-6021-4769-892a-e2326113d04a/images/893205511a91b267422b1500fd60870ae2321d4445e726851716a4e0fda83379.png";

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
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: colors.bg.base }}>
      {/* Left: Form */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px", fontFamily: fonts.body,
      }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "48px" }}>
            <div style={{
              width: "36px", height: "36px", backgroundColor: colors.brand.blue,
              borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 15px rgba(0, 136, 255, 0.4)`,
            }}>
              <Bot size={20} color="#FFFFFF" />
            </div>
            <span style={{ fontFamily: fonts.heading, fontSize: "20px", fontWeight: "700", color: colors.text.primary }}>
              Bridge<span style={{ color: colors.brand.cyan }}>Bot</span>
            </span>
          </div>

          <h1 style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: "700", color: colors.text.primary, margin: "0 0 8px" }}>
            Welcome back
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.text.secondary, marginBottom: "32px" }}>
            Sign in to your workspace
          </p>

          {error && <div style={T.err} data-testid="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px", letterSpacing: "0.15em" }}>Email</label>
            <input
              data-testid="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ ...T.input, marginBottom: "16px" }}
              onFocus={onFocus} onBlur={onBlur}
              required
            />
            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px", letterSpacing: "0.15em" }}>Password</label>
            <input
              data-testid="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ ...T.input, marginBottom: "6px" }}
              onFocus={onFocus} onBlur={onBlur}
              required
            />
            <div style={{ textAlign: "right", marginBottom: "20px" }}>
              <Link to="/forgot-password" style={{ fontSize: "12px", color: colors.text.muted, textDecoration: "none", transition: "color 0.2s" }}
                data-testid="forgot-password-link">
                Forgot password?
              </Link>
            </div>
            <button
              data-testid="login-submit"
              type="submit"
              style={{
                ...T.btnPrimary, width: "100%", justifyContent: "center",
                padding: "12px", opacity: loading ? 0.7 : 1,
              }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: colors.text.secondary }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: colors.brand.cyan, textDecoration: "none", fontWeight: "600" }}>
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Background Image */}
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img src={AUTH_BG} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.6,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to right, ${colors.bg.base} 0%, transparent 40%, transparent 100%)`,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to top, ${colors.bg.base} 0%, transparent 30%)`,
        }} />
      </div>
    </div>
  );
}
