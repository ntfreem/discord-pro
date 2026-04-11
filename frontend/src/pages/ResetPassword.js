import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Bot, ArrowLeft } from "lucide-react";
import { colors, fonts, radius, T, onFocus, onBlur } from "../theme";

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
    e.preventDefault(); setError("");
    if (newPassword !== confirm) { setError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try { const res = await axios.post(`/api/auth/reset-password`, { email, code, new_password: newPassword }); setSuccess(res.data.message || "Password reset!"); setTimeout(() => navigate("/login"), 2000); }
    catch (err) { setError(err.response?.data?.detail || "Reset failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.bg.base, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.body, padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, padding: "40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", justifyContent: "center" }}>
          <div style={{ width: "40px", height: "40px", background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(59,130,246,0.35)" }}><Bot size={22} color="#FFFFFF" /></div>
          <span style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary }}>Discord<span style={{ color: colors.brand.light }}>-Pro</span></span>
        </div>
        <h1 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary, textAlign: "center", margin: "0 0 8px" }}>Reset password</h1>
        <p style={{ fontSize: "13px", color: colors.text.secondary, textAlign: "center", marginBottom: "24px" }}>Enter the code from your email and choose a new password.</p>
        {error && <div style={T.err} data-testid="reset-error">{error}</div>}
        {success && <div style={T.success} data-testid="reset-success">{success}</div>}
        {!success && (<form onSubmit={handleSubmit}>
          {!location.state?.email && (<><label style={T.label}>Email</label><input data-testid="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required /></>)}
          <label style={T.label}>Reset Code</label>
          <input data-testid="reset-code" type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} style={{ ...T.input, fontFamily: fonts.mono, fontSize: "22px", letterSpacing: "0.3em", textAlign: "center", marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
          <label style={T.label}>New Password</label>
          <input data-testid="reset-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
          <label style={T.label}>Confirm Password</label>
          <input data-testid="reset-confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" style={{ ...T.input, marginBottom: "20px" }} onFocus={onFocus} onBlur={onBlur} required />
          <button data-testid="reset-submit" type="submit" style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }} disabled={loading}>{loading ? "Resetting..." : "Reset Password"}</button>
        </form>)}
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: colors.text.secondary }}><Link to="/forgot-password" style={{ color: colors.brand.light, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}><ArrowLeft size={12} /> Resend code</Link></p>
      </div>
    </div>
  );
}
