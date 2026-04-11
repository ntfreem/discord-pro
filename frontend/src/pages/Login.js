import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Bot, ArrowRight } from "lucide-react";
import { colors, fonts, radius, T, onFocus, onBlur } from "../theme";

const BASE = `/api`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await axios.post(`${BASE}/auth/login`, { email, password });
      const { token, user, instances } = res.data;
      login(token, user, instances);
      navigate(instances.length > 1 ? "/select-instance" : "/admin");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: colors.bg.base,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: fonts.body,
    }}>
      {/* Soft gradient background orbs */}
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-15%", left: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{
        width: "100%", maxWidth: "420px",
        backgroundColor: colors.bg.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.xl, padding: "40px 36px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", justifyContent: "center" }}>
          <div style={{
            width: "40px", height: "40px",
            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`,
            borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 15px rgba(59, 130, 246, 0.35)",
          }}>
            <Bot size={22} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary }}>
            Discord<span style={{ color: colors.brand.light }}>-Pro</span>
          </span>
        </div>

        <h1 style={{ fontFamily: fonts.heading, fontSize: "24px", fontWeight: "700", color: colors.text.primary, textAlign: "center", margin: "0 0 6px" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: "14px", color: colors.text.secondary, textAlign: "center", marginBottom: "28px" }}>
          Sign in to your workspace
        </p>

        {error && <div style={T.err} data-testid="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={T.label}>Email</label>
          <input data-testid="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
          <label style={T.label}>Password</label>
          <input data-testid="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password" style={{ ...T.input, marginBottom: "6px" }} onFocus={onFocus} onBlur={onBlur} required />
          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <Link to="/forgot-password" data-testid="forgot-password-link"
              style={{ fontSize: "12px", color: colors.text.muted, textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>
          <button data-testid="login-submit" type="submit"
            style={{
              ...T.btnPrimary, width: "100%", justifyContent: "center",
              padding: "12px", borderRadius: radius.md,
              opacity: loading ? 0.7 : 1,
            }} disabled={loading}>
            {loading ? "Signing in..." : <>Sign In <ArrowRight size={15} /></>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: colors.text.secondary }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: colors.brand.light, textDecoration: "none", fontWeight: "600" }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
