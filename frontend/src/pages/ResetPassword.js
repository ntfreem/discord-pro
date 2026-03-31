import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Bot, ArrowLeft } from "lucide-react";

const S = {
  page: { minHeight: "100vh", backgroundColor: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "IBM Plex Sans, sans-serif" },
  card: { width: "100%", maxWidth: "400px", backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "8px", padding: "40px 36px" },
  logo: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", justifyContent: "center" },
  logoIcon: { width: "36px", height: "36px", backgroundColor: "#0055FF", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" },
  heading: { fontFamily: "Chivo, sans-serif", fontSize: "24px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px", textAlign: "center", marginBottom: "8px" },
  sub: { fontSize: "13px", color: "#A1A1AA", textAlign: "center", marginBottom: "28px" },
  label: { display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 14px", backgroundColor: "#0A0A0A", border: "1px solid #262626", borderRadius: "4px", color: "#FFFFFF", fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "16px" },
  codeInput: { width: "100%", padding: "12px 14px", backgroundColor: "#0A0A0A", border: "1px solid #262626", borderRadius: "4px", color: "#FFFFFF", fontFamily: "JetBrains Mono, monospace", fontSize: "22px", letterSpacing: "0.35em", textAlign: "center", outline: "none", boxSizing: "border-box", marginBottom: "16px" },
  btn: { width: "100%", padding: "12px", backgroundColor: "#0055FF", border: "none", borderRadius: "4px", color: "#FFFFFF", cursor: "pointer", fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px", fontWeight: "600", marginTop: "8px", transition: "background 0.15s" },
  err: { backgroundColor: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)", borderRadius: "4px", padding: "10px 14px", color: "#FF6B6B", fontSize: "13px", marginBottom: "16px" },
  success: { backgroundColor: "rgba(0,255,102,0.08)", border: "1px solid rgba(0,255,102,0.2)", borderRadius: "4px", padding: "10px 14px", color: "#00FF66", fontSize: "13px", marginBottom: "16px" },
};

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`/api/auth/reset-password`, { email, code, new_password: newPassword });
      setSuccess(res.data.message || "Password reset successful.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Reset failed. Check your code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}><Bot size={20} color="#FFFFFF" /></div>
          <span style={{ fontFamily: "Chivo, sans-serif", fontSize: "20px", fontWeight: "900", color: "#FFFFFF" }}>
            Bridge<span style={{ color: "#0055FF" }}>Bot</span>
          </span>
        </div>

        <h1 style={S.heading}>Reset password</h1>
        <p style={S.sub}>Enter the code from your email and choose a new password.</p>

        {error && <div style={S.err} data-testid="reset-error">{error}</div>}
        {success && <div style={S.success} data-testid="reset-success">{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            {!location.state?.email && (
              <>
                <label style={S.label}>Email</label>
                <input
                  data-testid="reset-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={S.input}
                  required
                />
              </>
            )}
            <label style={S.label}>Reset Code</label>
            <input
              data-testid="reset-code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={S.codeInput}
              required
            />
            <label style={S.label}>New Password</label>
            <input
              data-testid="reset-new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={S.input}
              required
            />
            <label style={S.label}>Confirm Password</label>
            <input
              data-testid="reset-confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              style={S.input}
              required
            />
            <button
              data-testid="reset-submit"
              type="submit"
              style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#A1A1AA" }}>
          <Link to="/forgot-password" style={{ color: "#0055FF", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ArrowLeft size={12} /> Didn't get a code? Resend
          </Link>
        </p>
      </div>
    </div>
  );
}
