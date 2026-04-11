import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Bot, MailCheck } from "lucide-react";
import { colors, fonts, radius, T, onFocus, onBlur } from "../theme";

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

  useEffect(() => { const e = searchParams.get("email"); if (e) setEmail(e); }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await axios.post(`${BASE}/auth/verify`, { email, code }); setSuccess("Email verified! Redirecting..."); setTimeout(() => navigate("/login"), 1500); }
    catch (err) { setError(err.response?.data?.detail || "Verification failed."); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setError("");
    try { await axios.post(`${BASE}/auth/resend-code`, { email }); setSuccess("New code sent!"); }
    catch { setError("Failed to resend."); }
    finally { setResending(false); }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.bg.base, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.body, padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "420px", backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, padding: "40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", justifyContent: "center" }}>
          <div style={{ width: "40px", height: "40px", background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(59,130,246,0.35)" }}>
            <Bot size={22} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary }}>Discord<span style={{ color: colors.brand.light }}>-Pro</span></span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ width: "56px", height: "56px", background: `linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.08))`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <MailCheck size={24} color={colors.brand.light} />
          </div>
          <h1 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary, textAlign: "center", marginBottom: "8px" }}>Check your email</h1>
          <p style={{ fontSize: "13px", color: colors.text.secondary, textAlign: "center", lineHeight: "1.5" }}>
            We sent a 6-digit code to <strong style={{ color: colors.text.primary }}>{email || "your email"}</strong>
          </p>
        </div>

        {error && <div style={T.err} data-testid="verify-error">{error}</div>}
        {success && <div style={T.success} data-testid="verify-success">{success}</div>}

        <form onSubmit={handleVerify}>
          {!searchParams.get("email") && (<><label style={T.label}>Email</label><input data-testid="verify-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...T.input, marginBottom: "14px" }} onFocus={onFocus} onBlur={onBlur} required /></>)}
          <label style={T.label}>Verification Code</label>
          <input data-testid="verify-code" type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
            style={{ ...T.input, fontFamily: fonts.mono, fontSize: "22px", letterSpacing: "0.3em", textAlign: "center", marginBottom: "16px" }} onFocus={onFocus} onBlur={onBlur} required />
          <button data-testid="verify-submit" type="submit" style={{ ...T.btnPrimary, width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }} disabled={loading}>{loading ? "Verifying..." : "Verify Email"}</button>
        </form>

        <div style={{ textAlign: "center", marginTop: "18px" }}>
          <button data-testid="resend-code" onClick={handleResend} disabled={resending} style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary, fontSize: "13px", fontFamily: fonts.body }}>{resending ? "Sending..." : "Didn't get a code? Resend"}</button>
        </div>
        <p style={{ textAlign: "center", marginTop: "10px", fontSize: "13px", color: colors.text.secondary }}><Link to="/login" style={{ color: colors.brand.light, textDecoration: "none" }}>Back to login</Link></p>
      </div>
    </div>
  );
}
