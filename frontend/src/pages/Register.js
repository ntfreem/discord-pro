import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Bot } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

const BASE = `/api`;
const AUTH_BG = "https://static.prod-images.emergentagent.com/jobs/6e59f39d-6021-4769-892a-e2326113d04a/images/893205511a91b267422b1500fd60870ae2321d4445e726851716a4e0fda83379.png";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await axios.post(`${BASE}/auth/register`, { email, password });
      setSuccess("Account created! Check your email for the verification code.");
      setTimeout(() => navigate(`/verify?email=${encodeURIComponent(email)}`), 1800);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try again.");
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
            Create account
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.text.secondary, marginBottom: "32px" }}>
            Join BridgeBot and start building
          </p>

          {error && <div style={T.err} data-testid="register-error">{error}</div>}
          {success && <div style={T.success} data-testid="register-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Email</label>
            <input data-testid="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />

            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Password</label>
            <input data-testid="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters" style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />

            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Confirm Password</label>
            <input data-testid="register-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" style={{ ...T.input, marginBottom: "20px" }} onFocus={onFocus} onBlur={onBlur} required />

            <button data-testid="register-submit" type="submit"
              style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: colors.text.secondary }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: colors.brand.cyan, textDecoration: "none", fontWeight: "600" }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* Right: Background */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <img src={AUTH_BG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${colors.bg.base} 0%, transparent 40%)` }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${colors.bg.base} 0%, transparent 30%)` }} />
      </div>
    </div>
  );
}
