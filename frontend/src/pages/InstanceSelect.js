import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bot, ChevronRight } from "lucide-react";

export default function InstanceSelect() {
  const { user, instances, selectInstance } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (instance) => {
    selectInstance(instance);
    navigate("/admin");
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#0A0A0A",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px", fontFamily: "IBM Plex Sans, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "48px" }}>
        <div style={{
          width: "36px", height: "36px", backgroundColor: "#0055FF",
          borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Bot size={20} color="#FFFFFF" />
        </div>
        <span style={{ fontFamily: "Chivo, sans-serif", fontSize: "20px", fontWeight: "900", color: "#FFFFFF" }}>
          Bridge<span style={{ color: "#0055FF" }}>Bot</span>
        </span>
      </div>

      <div style={{ width: "100%", maxWidth: "520px" }}>
        <p style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: "11px",
          color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em",
          marginBottom: "8px",
        }}>
          {user?.email}
        </p>
        <h1 style={{
          fontFamily: "Chivo, sans-serif", fontSize: "30px",
          fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px",
          margin: "0 0 8px",
        }}>
          Select workspace
        </h1>
        <p style={{ color: "#A1A1AA", fontSize: "14px", marginBottom: "28px" }}>
          You have access to {instances.length} instance{instances.length !== 1 ? "s" : ""}. Choose one to continue.
        </p>

        {instances.length === 0 ? (
          <div style={{
            backgroundColor: "#121212", border: "1px solid #262626",
            borderRadius: "6px", padding: "32px", textAlign: "center",
          }}>
            <p style={{ color: "#A1A1AA", fontSize: "14px", margin: "0 0 8px" }}>
              No instances assigned yet.
            </p>
            <p style={{ color: "#404040", fontSize: "13px", margin: 0 }}>
              Contact your admin to get access to a workspace.
            </p>
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
                  backgroundColor: "#121212", border: "1px solid #262626",
                  borderRadius: "6px", cursor: "pointer",
                  textAlign: "left", width: "100%",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#0055FF";
                  e.currentTarget.style.backgroundColor = "#141414";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#262626";
                  e.currentTarget.style.backgroundColor = "#121212";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    width: "36px", height: "36px",
                    backgroundColor: "rgba(0,85,255,0.15)", border: "1px solid rgba(0,85,255,0.3)",
                    borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Bot size={18} color="#0055FF" />
                  </div>
                  <div>
                    <p style={{
                      fontFamily: "Chivo, sans-serif", fontSize: "15px",
                      fontWeight: "700", color: "#FFFFFF", margin: 0,
                    }}>
                      {inst.name}
                    </p>
                    <p style={{
                      fontFamily: "JetBrains Mono, monospace", fontSize: "10px",
                      color: "#404040", margin: "2px 0 0",
                      textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>
                      {inst.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} color="#404040" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
