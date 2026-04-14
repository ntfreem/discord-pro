import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Bot, ArrowLeft, ArrowRight, Mail, KeyRound } from "lucide-react";
import { colors, fonts, radius, T, onFocus, onBlur } from "../theme";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email | code
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await axios.post(`/api/auth/forgot-password`, { email });
      setSuccess(res.data.message || "Reset code sent if email is registered.");
      setStep("code");
    } catch (err) { setError(err.response?.data?.detail || "Something went wrong."); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault(); setError("");
    if (newPassword !== confirm) { setError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`/api/auth/reset-password`, { email, code, new_password: newPassword });
      setSuccess(res.data.message || "Password reset!");
      setStep("done");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) { setError(err.response?.data?.detail || "Reset failed."); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(""); setLoading(true);
    try {
      await axios.post(`/api/auth/forgot-password`, { email });
      setSuccess("New reset code sent!");
      setCode("");
    } catch (err) { setError(err.response?.data?.detail || "Failed to resend."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.bg.base, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.body, padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "420px", backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, padding: "40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", justifyContent: "center" }}>
          <div style={{ width: "40px", height: "40px", background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(59,130,246,0.35)" }}><Bot size={22} color="#FFFFFF" /></div>
          <span style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary }}>Bridge<span style={{ color: colors.brand.light }}>Bot</span></span>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", backgroundColor: step === "email" ? colors.brand.primary : "rgba(52,211,153,0.15)", color: step === "email" ? "#fff" : colors.brand.success }}>
              {step !== "email" ? "✓" : "1"}
            </div>
            <span style={{ fontSize: "12px", color: step === "email" ? colors.text.primary : colors.text.secondary }}>Email</span>
          </div>
          <div style={{ width: "30px", height: "1px", backgroundColor: colors.border.default }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", backgroundColor: step === "code" ? colors.brand.primary : step === "done" ? "rgba(52,211,153,0.15)" : colors.bg.panel, color: step === "code" ? "#fff" : step === "done" ? colors.brand.success : colors.text.muted }}>
              {step === "done" ? "✓" : "2"}
            </div>
            <span style={{ fontSize: "12px", color: step === "code" || step === "done" ? colors.text.primary : colors.text.muted }}>Reset</span>
          </div>
        </div>

        {error && <div style={T.err} data-testid="forgot-error">{error}</div>}
        {success && step !== "code" && <div style={T.success} data-testid="forgot-success">{success}</div>}

        {/* Step 1: Enter email */}
        {step === "email" && (
          <>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary, textAlign: "center", margin: "0 0 8px" }}>Forgot password?</h1>
            <p style={{ fontSize: "13px", color: colors.text.secondary, textAlign: "center", marginBottom: "24px", lineHeight: "1.5" }}>Enter your email and we'll send you a 6-digit reset code.</p>
            <form onSubmit={handleSendCode}>
              <label style={T.label}>Email</label>
              <input data-testid="forgot-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />
              <button data-testid="forgot-submit" type="submit" style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"} {!loading && <ArrowRight size={14} />}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Enter code + new password */}
        {step === "code" && (
          <>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary, textAlign: "center", margin: "0 0 8px" }}>Reset password</h1>
            <p style={{ fontSize: "13px", color: colors.text.secondary, textAlign: "center", marginBottom: "6px", lineHeight: "1.5" }}>
              Enter the 6-digit code sent to
            </p>
            <p style={{ fontSize: "13px", color: colors.brand.light, textAlign: "center", marginBottom: "24px", fontWeight: "500" }}>{email}</p>
            <form onSubmit={handleReset}>
              <label style={T.label}>Reset Code</label>
              <input data-testid="reset-code" type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
                style={{ ...T.input, fontFamily: fonts.mono, fontSize: "22px", letterSpacing: "0.3em", textAlign: "center", marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
              <label style={T.label}>New Password</label>
              <input data-testid="reset-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters"
                style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required />
              <label style={T.label}>Confirm Password</label>
              <input data-testid="reset-confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password"
                style={{ ...T.input, marginBottom: "20px" }} onFocus={onFocus} onBlur={onBlur} required />
              <button data-testid="reset-submit" type="submit" style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: colors.text.secondary }}>
              Didn't receive the code?{" "}
              <button onClick={handleResend} disabled={loading} data-testid="resend-code-btn"
                style={{ background: "none", border: "none", color: colors.brand.light, cursor: "pointer", fontFamily: fonts.body, fontSize: "12px", textDecoration: "underline", padding: 0 }}>
                Resend
              </button>
            </p>
          </>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontSize: "14px", color: colors.brand.success, fontWeight: "500", marginBottom: "8px" }}>Password reset successful!</p>
            <p style={{ fontSize: "13px", color: colors.text.secondary }}>Redirecting to login...</p>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: colors.text.secondary }}>
          <Link to="/login" style={{ color: colors.brand.light, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}><ArrowLeft size={12} /> Back to login</Link>
        </p>
      </div>
    </div>
  );
}
