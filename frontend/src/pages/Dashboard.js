import { useState, useEffect } from "react";
import axios from "axios";
import { MessageSquare, BookOpen, CheckCircle, Zap } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "24px" },
  label: { fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 },
  value: { fontFamily: "Chivo, sans-serif", fontSize: "40px", fontWeight: "900", color: "#FFFFFF", margin: "8px 0 0", letterSpacing: "-1px" },
  th: { padding: "10px 20px", textAlign: "left", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: "400" },
  td: { padding: "12px 20px", fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#FFFFFF" },
};

function StatCard({ title, value, icon: Icon, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        ...S.card,
        transition: "transform 0.2s ease, border-color 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        borderColor: hovered ? "rgba(255,255,255,0.2)" : "#262626",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={S.label}>{title}</p>
        <Icon size={16} color={color} />
      </div>
      <p style={S.value}>{value ?? "—"}</p>
    </div>
  );
}

function PlatformBadge({ platform }) {
  const colors = { discord: { bg: "rgba(88,101,242,0.15)", text: "#7289DA" }, web: { bg: "rgba(0,85,255,0.15)", text: "#0055FF" } };
  const c = colors[platform] || colors.web;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "3px",
      fontSize: "11px", fontFamily: "JetBrains Mono, monospace",
      textTransform: "uppercase", letterSpacing: "0.05em",
      backgroundColor: c.bg, color: c.text
    }}>{platform}</span>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/analytics/overview`),
      axios.get(`${API}/conversations?limit=6`)
    ]).then(([ov, convs]) => {
      setOverview(ov.data);
      setConversations(convs.data.conversations || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "JetBrains Mono", color: "#A1A1AA", fontSize: "13px" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <p style={S.overline}>Overview</p>
      <h1 style={S.h1}>Dashboard</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatCard title="Conversations" value={overview?.total_conversations ?? 0} icon={MessageSquare} color="#0055FF" />
        <StatCard title="Total Messages" value={overview?.total_messages ?? 0} icon={Zap} color="#00FF66" />
        <StatCard title="Knowledge Sources" value={overview?.knowledge_sources ?? 0} icon={BookOpen} color="#A1A1AA" />
        <StatCard title="Training Examples" value={overview?.approved_for_training ?? 0} icon={CheckCircle} color="#00FF66" />
      </div>

      {/* Platform + Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: "20px" }}>Platform Breakdown</p>
          <div style={{ display: "flex", gap: "32px" }}>
            {[
              { label: "Web", value: overview?.platform_breakdown?.web ?? 0, color: "#0055FF" },
              { label: "Discord", value: overview?.platform_breakdown?.discord ?? 0, color: "#7289DA" }
            ].map(({ label, value, color }) => (
              <div key={label} data-testid={`platform-${label.toLowerCase()}`}>
                <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "36px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>{value}</p>
                <p style={{ fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color, margin: "4px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: "16px" }}>Quick Actions</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <a href="/admin/knowledge" data-testid="quick-add-knowledge" style={{
              display: "block", padding: "10px 16px", backgroundColor: "#0055FF",
              color: "#FFFFFF", borderRadius: "4px", fontSize: "13px",
              fontFamily: "IBM Plex Sans, sans-serif", fontWeight: "500", textDecoration: "none"
            }}>Add Knowledge Source</a>
            <a href="/chat" target="_blank" rel="noopener noreferrer" data-testid="quick-test-chat" style={{
              display: "block", padding: "10px 16px", backgroundColor: "#1A1A1A",
              border: "1px solid #262626", color: "#FFFFFF", borderRadius: "4px",
              fontSize: "13px", fontFamily: "IBM Plex Sans, sans-serif",
              fontWeight: "500", textDecoration: "none"
            }}>Test Chat Demo</a>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div style={{ backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #262626", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>Recent Conversations</p>
          <a href="/admin/conversations" style={{ fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px", color: "#0055FF", textDecoration: "none" }}>View all</a>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
              {["Session ID", "Platform", "Messages", "Date", "Status"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conversations.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "48px 20px", textAlign: "center", color: "#A1A1AA", fontFamily: "IBM Plex Sans", fontSize: "14px" }}>
                  No conversations yet — <a href="/chat" target="_blank" rel="noopener noreferrer" style={{ color: "#0055FF" }}>start a chat demo</a>
                </td>
              </tr>
            ) : conversations.map((conv) => (
              <tr key={conv.session_id}
                style={{ borderBottom: "1px solid #161616", transition: "background-color 0.15s ease", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1A1A1A"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => window.location.href = "/admin/conversations"}
                data-testid="dashboard-conversation-row"
              >
                <td style={{ ...S.td, fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "#A1A1AA" }}>
                  {conv.session_id?.slice(0, 14)}...
                </td>
                <td style={S.td}><PlatformBadge platform={conv.platform} /></td>
                <td style={S.td}>{conv.messages?.length ?? 0}</td>
                <td style={{ ...S.td, color: "#A1A1AA", fontSize: "12px" }}>
                  {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : "—"}
                </td>
                <td style={S.td}>
                  {conv.is_approved_for_training
                    ? <span style={{ color: "#00FF66", fontFamily: "JetBrains Mono", fontSize: "11px" }}>APPROVED</span>
                    : <span style={{ color: "#404040", fontFamily: "JetBrains Mono", fontSize: "11px" }}>PENDING</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
