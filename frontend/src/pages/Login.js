import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Bot, ArrowRight } from "lucide-react";
import { colors, fonts, radius, T, onFocus, onBlur } from "../theme";

const BASE = `/api`;
const LOGIN_ART = "https://static.prod-images.emergentagent.com/jobs/6e59f39d-6021-4769-892a-e2326113d04a/images/ed512d51ac1409ffabe308576d0f1f8f165e8f123bb9437c753f4da525879c01.png";

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
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: colors.bg.base }}>
      {/* Left: Form */}
      <div style={{
        flex: "0 0 50%", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px", fontFamily: fonts.body, position: "relative", zIndex: 2,
      }}>
        {/* Soft ambient glow */}
        <div style={{ position: "absolute", top: "10%", left: "10%", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "48px" }}>
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

          <h1 style={{ fontFamily: fonts.heading, fontSize: "30px", fontWeight: "700", color: colors.text.primary, margin: "0 0 8px", letterSpacing: "-0.3px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "15px", color: colors.text.secondary, marginBottom: "32px", lineHeight: "1.5" }}>
            Sign in to your AI workspace
          </p>

          {error && <div style={T.err} data-testid="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label style={T.label}>Email</label>
            <input data-testid="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />

            <label style={T.label}>Password</label>
            <input data-testid="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password" style={{ ...T.input, marginBottom: "6px" }} onFocus={onFocus} onBlur={onBlur} required />

            <div style={{ textAlign: "right", marginBottom: "24px" }}>
              <Link to="/forgot-password" data-testid="forgot-password-link"
                style={{ fontSize: "13px", color: colors.text.muted, textDecoration: "none", transition: "color 0.2s" }}>
                Forgot password?
              </Link>
            </div>

            <button data-testid="login-submit" type="submit"
              style={{
                ...T.btnPrimary, width: "100%", justifyContent: "center",
                padding: "13px", fontSize: "14px",
                opacity: loading ? 0.7 : 1,
              }} disabled={loading}>
              {loading ? "Signing in..." : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "28px", fontSize: "14px", color: colors.text.secondary }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: colors.brand.light, textDecoration: "none", fontWeight: "600" }}>Create one</Link>
          </p>
        </div>
      </div>

      {/* Right: Graphic */}
      <div style={{
        flex: "0 0 50%", position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Background gradient that blends with base */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at center, rgba(59, 130, 246, 0.08) 0%, transparent 65%)`,
        }} />

        {/* The AI graphic */}
        <img
          src={LOGIN_ART}
          alt="AI Assistant"
          style={{
            width: "80%", maxWidth: "480px",
            objectFit: "contain",
            filter: "drop-shadow(0 0 60px rgba(59, 130, 246, 0.2))",
            animation: "float 5s ease-in-out infinite",
            position: "relative", zIndex: 1,
          }}
        />

        {/* Edge blend gradients */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to right, ${colors.bg.base} 0%, transparent 20%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to top, ${colors.bg.base} 0%, transparent 25%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to bottom, ${colors.bg.base} 0%, transparent 25%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to left, ${colors.bg.base} 0%, transparent 15%)`,
          pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}
