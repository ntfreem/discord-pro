import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bot, ChevronRight } from "lucide-react";
import { colors, fonts, radius } from "../theme";

export default function InstanceSelect() {
  const { user, instances, selectInstance } = useAuth();
  const navigate = useNavigate();
  const handleSelect = (inst) => { selectInstance(inst); navigate("/admin"); };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.bg.base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: fonts.body }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px" }}>
        <div style={{ width: "40px", height: "40px", background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(59,130,246,0.35)" }}><Bot size={22} color="#FFFFFF" /></div>
        <span style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary }}>Discord<span style={{ color: colors.brand.light }}>-Pro</span></span>
      </div>
      <div style={{ width: "100%", maxWidth: "520px" }}>
        <p style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.brand.light, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "6px" }}>{user?.email}</p>
        <h1 style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: "700", color: colors.text.primary, margin: "0 0 8px" }}>Select workspace</h1>
        <p style={{ color: colors.text.secondary, fontSize: "14px", marginBottom: "24px" }}>You have access to {instances.length} instance{instances.length !== 1 ? "s" : ""}.</p>
        {instances.length === 0 ? (
          <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, padding: "32px", textAlign: "center" }}>
            <p style={{ color: colors.text.secondary, fontSize: "14px", margin: "0 0 8px" }}>No instances assigned yet.</p>
            <p style={{ color: colors.text.muted, fontSize: "13px", margin: 0 }}>Contact your admin to get access.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {instances.map((inst) => (
              <button key={inst.id} data-testid={`instance-option-${inst.id}`} onClick={() => handleSelect(inst)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.25s ease", boxShadow: colors.shadow.card }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.brand.light; e.currentTarget.style.boxShadow = colors.shadow.cardHover; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.15)"; e.currentTarget.style.boxShadow = colors.shadow.card; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "38px", height: "38px", background: `linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.08))`, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bot size={18} color={colors.brand.light} /></div>
                  <div><p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>{inst.name}</p><p style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.muted, margin: "2px 0 0" }}>{inst.id.slice(0, 8)}...</p></div>
                </div>
                <ChevronRight size={16} color={colors.text.muted} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
