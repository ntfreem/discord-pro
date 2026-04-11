import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Bot, MailCheck } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

const BASE = `/api`;

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post(`${BASE}/auth/verify`, { email, code });
      setSuccess("Email verified! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Verification failed. Check your code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await axios.post(`${BASE}/auth/resend-code`, { email });
      setSuccess("New code sent. Check your inbox.");
    } catch {
      setError("Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: colors.bg.base,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: fonts.body, padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: "420px",
        backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`,
        borderRadius: "2px", padding: "40px 36px",
      }}>
        {/* Logo */}
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

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <div style={{
            width: "56px", height: "56px",
            backgroundColor: "rgba(0,136,255,0.1)", border: `1px solid ${colors.border.default}`,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "16px", boxShadow: `0 0 20px rgba(0, 136, 255, 0.2)`,
          }}>
            <MailCheck size={24} color={colors.brand.cyan} />
          </div>
          <h1 style={{ fontFamily: fonts.heading, fontSize: "24px", fontWeight: "700", color: colors.text.primary, textAlign: "center", marginBottom: "8px" }}>
            Check your email
          </h1>
          <p style={{ fontSize: "13px", color: colors.text.secondary, textAlign: "center", lineHeight: "1.5" }}>
            We sent a 6-digit verification code to<br />
            <strong style={{ color: colors.text.primary }}>{email || "your email"}</strong>
            <br /><span style={{ fontSize: "11px", fontFamily: fonts.mono, color: colors.text.muted }}>
              (Check your inbox or spam folder)
            </span>
          </p>
        </div>

        {error && <div style={T.err} data-testid="verify-error">{error}</div>}
        {success && <div style={T.success} data-testid="verify-success">{success}</div>}

        <form onSubmit={handleVerify}>
          {!email && (
            <>
              <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Email</label>
              <input data-testid="verify-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" style={{ ...T.input, marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />
            </>
          )}
          <label style={{ ...T.monoLabel, display: "block", marginBottom: "6px", fontSize: "10px" }}>Verification Code</label>
          <input
            data-testid="verify-code"
            type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000" maxLength={6}
            style={{
              ...T.input, fontFamily: fonts.mono, fontSize: "22px",
              letterSpacing: "0.35em", textAlign: "center", marginBottom: "16px",
            }}
            onFocus={onFocus} onBlur={onBlur} required
          />
          <button data-testid="verify-submit" type="submit"
            style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }}
            disabled={loading}>
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button data-testid="resend-code" onClick={handleResend} disabled={resending}
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary, fontSize: "13px", fontFamily: fonts.body }}>
            {resending ? "Sending..." : "Didn't receive a code? Resend"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: colors.text.secondary }}>
          <Link to="/login" style={{ color: colors.brand.cyan, textDecoration: "none" }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
