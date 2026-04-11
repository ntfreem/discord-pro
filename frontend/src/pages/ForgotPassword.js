import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Bot, ArrowLeft } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const res = await axios.post(`/api/auth/forgot-password`, { email });
      setSuccess(res.data.message || "If that email is registered, a reset code has been sent.");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
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
          Forgot password?
        </h1>
        <p style={{ fontSize: "13px", color: colors.text.secondary, textAlign: "center", marginBottom: "28px", lineHeight: "1.5" }}>
          Enter your email and we'll send you a reset code.
        </p>

        {error && <div style={T.err} data-testid="forgot-error">{error}</div>}
        {success && <div style={T.success} data-testid="forgot-success">{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Email</label>
            <input data-testid="forgot-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />
            <button data-testid="forgot-submit" type="submit"
              style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {success && (
          <Link to="/reset-password" state={{ email }} data-testid="go-to-reset"
            style={{
              display: "block", textAlign: "center", marginTop: "16px", padding: "12px",
              backgroundColor: colors.brand.blue, color: colors.text.primary, borderRadius: "2px",
              fontFamily: fonts.body, fontSize: "14px", fontWeight: "600", textDecoration: "none",
              border: `1px solid rgba(0, 245, 255, 0.5)`,
            }}>
            Enter Reset Code
          </Link>
        )}

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: colors.text.secondary }}>
          <Link to="/login" style={{ color: colors.brand.cyan, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ArrowLeft size={12} /> Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
