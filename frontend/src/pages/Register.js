import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Bot, ArrowRight } from "lucide-react";
import { colors, fonts, radius, T, onFocus, onBlur } from "../theme";

const BASE = `/api`;

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (!username.trim()) { setError("Username is required"); return; }
    setLoading(true);
    try {
      await axios.post(`${BASE}/auth/register`, { email, password, username: username.trim() });
      setSuccess("Account created! Check your email for the verification code.");
      setTimeout(() => navigate(`/verify?email=${encodeURIComponent(email)}`), 1800);
    } catch (err) { setError(err.response?.data?.detail || "Registration failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: colors.bg.base,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: fonts.body,
    }}>
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{
        width: "100%", maxWidth: "420px", backgroundColor: colors.bg.surface,
        border: `1px solid ${colors.border.default}`, borderRadius: radius.xl,
        padding: "40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", justifyContent: "center" }}>
          <div style={{ width: "40px", height: "40px", background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(59,130,246,0.35)" }}>
            <Bot size={22} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary }}>
            Bridge<span style={{ color: colors.brand.light }}>Bot</span>
          </span>
        </div>

        <h1 style={{ fontFamily: fonts.heading, fontSize: "24px", fontWeight: "700", color: colors.text.primary, textAlign: "center", margin: "0 0 6px" }}>Create account</h1>
        <p style={{ fontSize: "14px", color: colors.text.secondary, textAlign: "center", marginBottom: "28px" }}>Join BridgeBot and start building</p>

        {error && <div style={T.err} data-testid="register-error">{error}</div>}
        {success && <div style={T.success} data-testid="register-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <label style={T.label}>Email</label>
          <input data-testid="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
          <label style={T.label}>Username</label>
          <input data-testid="register-username" type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Choose a unique username" style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
          <label style={T.label}>Password</label>
          <input data-testid="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters" style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
          <label style={T.label}>Confirm Password</label>
          <input data-testid="register-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat password" style={{ ...T.input, marginBottom: "20px" }} onFocus={onFocus} onBlur={onBlur} required />
          <button data-testid="register-submit" type="submit" style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Creating account..." : <>Create Account <ArrowRight size={15} /></>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: colors.text.secondary }}>
          Already have an account? <Link to="/login" style={{ color: colors.brand.light, textDecoration: "none", fontWeight: "600" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
