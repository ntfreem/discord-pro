import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bot, ChevronRight } from "lucide-react";
import { colors, fonts } from "../theme";

export default function InstanceSelect() {
  const { user, instances, selectInstance } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (instance) => {
    selectInstance(instance);
    navigate("/admin");
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: colors.bg.base,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px", fontFamily: fonts.body,
    }}>
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

      <div style={{ width: "100%", maxWidth: "520px" }}>
        <p style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.brand.cyan, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" }}>
          {user?.email}
        </p>
        <h1 style={{ fontFamily: fonts.heading, fontSize: "30px", fontWeight: "700", color: colors.text.primary, letterSpacing: "-0.5px", margin: "0 0 8px" }}>
          Select workspace
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: "14px", marginBottom: "28px" }}>
          You have access to {instances.length} instance{instances.length !== 1 ? "s" : ""}. Choose one to continue.
        </p>

        {instances.length === 0 ? (
          <div style={{
            backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`,
            borderRadius: "2px", padding: "32px", textAlign: "center",
          }}>
            <p style={{ color: colors.text.secondary, fontSize: "14px", margin: "0 0 8px" }}>No instances assigned yet.</p>
            <p style={{ color: colors.text.muted, fontSize: "13px", margin: 0 }}>Contact your admin to get access to a workspace.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {instances.map((inst) => (
              <button
                key={inst.id}
                data-testid={`instance-option-${inst.id}`}
                onClick={() => handleSelect(inst)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "18px 20px",
                  backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`,
                  borderRadius: "2px", cursor: "pointer",
                  textAlign: "left", width: "100%",
                  transition: "border-color 0.3s, box-shadow 0.3s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = colors.brand.cyan;
                  e.currentTarget.style.boxShadow = `0 0 15px rgba(0, 245, 255, 0.15)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(0, 136, 255, 0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    width: "36px", height: "36px",
                    backgroundColor: "rgba(0,136,255,0.1)", border: `1px solid ${colors.border.default}`,
                    borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Bot size={18} color={colors.brand.blue} />
                  </div>
                  <div>
                    <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
                      {inst.name}
                    </p>
                    <p style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.muted, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {inst.id.slice(0, 8)}...
                    </p>
                  </div>
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
