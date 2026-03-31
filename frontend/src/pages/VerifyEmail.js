import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Bot, MailCheck } from "lucide-react";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const S = {
  page: {
    minHeight: "100vh", backgroundColor: "#0A0A0A",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "IBM Plex Sans, sans-serif",
  },
  card: {
    width: "100%", maxWidth: "420px",
    backgroundColor: "#121212", border: "1px solid #262626",
    borderRadius: "8px", padding: "40px 36px",
  },
  logo: {
    display: "flex", alignItems: "center", gap: "10px",
    marginBottom: "32px", justifyContent: "center",
  },
  logoIcon: {
    width: "36px", height: "36px", backgroundColor: "#0055FF",
    borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
  },
  iconArea: {
    display: "flex", flexDirection: "column", alignItems: "center",
    marginBottom: "24px",
  },
  heading: {
    fontFamily: "Chivo, sans-serif", fontSize: "24px",
    fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px",
    textAlign: "center", marginBottom: "8px",
  },
  sub: {
    fontSize: "13px", color: "#A1A1AA",
    textAlign: "center", marginBottom: "28px", lineHeight: "1.5",
  },
  label: {
    display: "block", fontFamily: "JetBrains Mono, monospace",
    fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase",
    letterSpacing: "0.1em", marginBottom: "6px",
  },
  input: {
    width: "100%", padding: "12px 14px",
    backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", color: "#FFFFFF",
    fontFamily: "JetBrains Mono, monospace", fontSize: "18px",
    letterSpacing: "0.3em", textAlign: "center",
    outline: "none", boxSizing: "border-box", marginBottom: "16px",
  },
  btn: {
    width: "100%", padding: "12px",
    backgroundColor: "#0055FF", border: "none",
    borderRadius: "4px", color: "#FFFFFF", cursor: "pointer",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px",
    fontWeight: "600", marginTop: "4px", transition: "background 0.15s",
  },
  err: {
    backgroundColor: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: "4px", padding: "10px 14px",
    color: "#FF6B6B", fontSize: "13px", marginBottom: "16px",
  },
  success: {
    backgroundColor: "rgba(0,255,102,0.08)", border: "1px solid rgba(0,255,102,0.2)",
    borderRadius: "4px", padding: "10px 14px",
    color: "#00FF66", fontSize: "13px", marginBottom: "16px",
  },
};

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
      setSuccess("New code sent. Check server logs.");
    } catch {
      setError("Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}>
            <Bot size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: "Chivo, sans-serif", fontSize: "20px", fontWeight: "900", color: "#FFFFFF" }}>
            Bot<span style={{ color: "#0055FF" }}>Forge</span>
          </span>
        </div>

        <div style={S.iconArea}>
          <div style={{
            width: "56px", height: "56px",
            backgroundColor: "rgba(0,85,255,0.1)", border: "1px solid rgba(0,85,255,0.3)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "16px",
          }}>
            <MailCheck size={24} color="#0055FF" />
          </div>
          <h1 style={S.heading}>Check your email</h1>
          <p style={S.sub}>
            We sent a 6-digit verification code to<br />
            <strong style={{ color: "#FFFFFF" }}>{email || "your email"}</strong>
            <br /><span style={{ fontSize: "11px", fontFamily: "JetBrains Mono", color: "#404040" }}>
              (Check server logs for the mock code)
            </span>
          </p>
        </div>

        {error && <div style={S.err} data-testid="verify-error">{error}</div>}
        {success && <div style={S.success} data-testid="verify-success">{success}</div>}

        <form onSubmit={handleVerify}>
          {!email && (
            <>
              <label style={S.label}>Email</label>
              <input
                data-testid="verify-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...S.input, letterSpacing: "normal", fontSize: "14px", textAlign: "left" }}
                required
              />
            </>
          )}
          <label style={S.label}>Verification Code</label>
          <input
            data-testid="verify-code"
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            style={S.input}
            required
          />
          <button
            data-testid="verify-submit"
            type="submit"
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            data-testid="resend-code"
            onClick={handleResend}
            disabled={resending}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#A1A1AA", fontSize: "13px",
              fontFamily: "IBM Plex Sans, sans-serif",
            }}
          >
            {resending ? "Sending..." : "Didn't receive a code? Resend"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: "#A1A1AA" }}>
          <Link to="/login" style={{ color: "#0055FF", textDecoration: "none" }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
