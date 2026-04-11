import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Bot, ArrowLeft } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

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
    <div style={{
      minHeight: "100vh", backgroundColor: colors.bg.base,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: fonts.body, padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px",
        backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`,
        borderRadius: "2px", padding: "40px 36px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", justifyContent: "center" }}>
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

        <h1 style={{ fontFamily: fonts.heading, fontSize: "24px", fontWeight: "700", color: colors.text.primary, textAlign: "center", marginBottom: "8px" }}>
          Reset password
        </h1>
        <p style={{ fontSize: "13px", color: colors.text.secondary, textAlign: "center", marginBottom: "28px" }}>
          Enter the code from your email and choose a new password.
        </p>

        {error && <div style={T.err} data-testid="reset-error">{error}</div>}
        {success && <div style={T.success} data-testid="reset-success">{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            {!location.state?.email && (
              <>
                <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Email</label>
                <input data-testid="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />
              </>
            )}
            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Reset Code</label>
            <input data-testid="reset-code" type="text" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" maxLength={6}
              style={{
                ...T.input, fontFamily: fonts.mono, fontSize: "22px",
                letterSpacing: "0.35em", textAlign: "center", marginBottom: "16px",
              }}
              onFocus={onFocus} onBlur={onBlur} required />

            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>New Password</label>
            <input data-testid="reset-new-password" type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters"
              style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />

            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Confirm Password</label>
            <input data-testid="reset-confirm-password" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password"
              style={{ ...T.input, marginBottom: "20px" }} onFocus={onFocus} onBlur={onBlur} required />

            <button data-testid="reset-submit" type="submit"
              style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: colors.text.secondary }}>
          <Link to="/forgot-password" style={{ color: colors.brand.cyan, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ArrowLeft size={12} /> Didn't get a code? Resend
          </Link>
        </p>
      </div>
    </div>
  );
}
