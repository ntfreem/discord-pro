import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, BookOpen, CheckCircle, Zap } from "lucide-react";
import { colors, fonts, radius, T, rowEnter, rowLeave } from "../theme";

function StatCard({ title, value, icon: Icon, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        ...T.card,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? colors.shadow.cardHover : colors.shadow.card,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={T.monoLabel}>{title}</p>
        <div style={{ width: "32px", height: "32px", borderRadius: radius.md, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <p style={{ fontFamily: fonts.heading, fontSize: "38px", fontWeight: "700", color: colors.text.primary, margin: "6px 0 0", letterSpacing: "-1px" }}>
        {value ?? "\u2014"}
      </p>
    </div>
  );
}

function PlatformBadge({ platform }) {
  const c = platform === "discord"
    ? { bg: "rgba(88,101,242,0.12)", text: colors.brand.discord }
    : { bg: "rgba(59,130,246,0.12)", text: colors.brand.primary };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: radius.sm,
      fontSize: "11px", fontFamily: fonts.mono,
      textTransform: "uppercase", letterSpacing: "0.05em",
      backgroundColor: c.bg, color: c.text
    }}>{platform}</span>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedInstance, user } = useAuth();

  useEffect(() => {
    if (!selectedInstance) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get(`/analytics/overview`),
      api.get(`/conversations?limit=6`)
    ]).then(([ov, convs]) => {
      setOverview(ov.data);
      setConversations(convs.data.conversations || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedInstance]);

  if (loading) {
    return (
      <div style={{ ...T.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: fonts.mono, color: colors.text.secondary, fontSize: "13px" }}>Loading...</p>
      </div>
    );
  }

  if (!selectedInstance) {
    return (
      <div style={{ ...T.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary, margin: "0 0 8px" }}>
          No workspace selected
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.text.secondary }}>
          {user?.role === "superadmin"
            ? "Create an instance from the Instances page, then select it from the sidebar."
            : "Contact your admin to get access to a workspace."}
        </p>
      </div>
    );
  }

  return (
    <div style={T.page}>
      <p style={T.overline}>Overview</p>
      <h1 style={T.h1}>Dashboard</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatCard title="Conversations" value={overview?.total_conversations ?? 0} icon={MessageSquare} color={colors.brand.blue} />
        <StatCard title="Total Messages" value={overview?.total_messages ?? 0} icon={Zap} color={colors.brand.success} />
        <StatCard title="Knowledge Sources" value={overview?.knowledge_sources ?? 0} icon={BookOpen} color={colors.text.secondary} />
        <StatCard title="Training Examples" value={overview?.approved_for_training ?? 0} icon={CheckCircle} color={colors.brand.success} />
      </div>

      {/* Platform + Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
        <div style={T.card}>
          <p style={{ ...T.monoLabel, marginBottom: "20px" }}>Platform Breakdown</p>
          <div style={{ display: "flex", gap: "32px" }}>
            {[
              { label: "Web", value: overview?.platform_breakdown?.web ?? 0, color: colors.brand.blue },
              { label: "Discord", value: overview?.platform_breakdown?.discord ?? 0, color: colors.brand.discord }
            ].map(({ label, value, color }) => (
              <div key={label} data-testid={`platform-${label.toLowerCase()}`}>
                <p style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: "700", color: colors.text.primary, margin: 0 }}>{value}</p>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color, margin: "4px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={T.card}>
          <p style={{ ...T.monoLabel, marginBottom: "16px" }}>Quick Actions</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <a href="/admin/knowledge" data-testid="quick-add-knowledge" style={{
              display: "block", padding: "10px 16px", backgroundColor: colors.brand.blue,
              color: colors.text.primary, borderRadius: "10px", fontSize: "13px",
              fontFamily: fonts.body, fontWeight: "500", textDecoration: "none",
              border: `1px solid rgba(96, 165, 250, 0.3)`, transition: "box-shadow 0.3s",
            }}>Add Knowledge Source</a>
            <a href="/chat" target="_blank" rel="noopener noreferrer" data-testid="quick-test-chat" style={{
              display: "block", padding: "10px 16px", backgroundColor: colors.bg.panel,
              border: `1px solid ${colors.border.default}`, color: colors.text.primary, borderRadius: "6px",
              fontSize: "13px", fontFamily: fonts.body, fontWeight: "500", textDecoration: "none",
              transition: "border-color 0.3s",
            }}>Test Chat Demo</a>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${colors.border.default}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>Recent Conversations</p>
          <a href="/admin/conversations" style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.brand.cyan, textDecoration: "none" }}>View all</a>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
              {["Session ID", "Platform", "Messages", "Date", "Status"].map(h => (
                <th key={h} style={T.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conversations.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "48px 20px", textAlign: "center", color: colors.text.secondary, fontFamily: fonts.body, fontSize: "14px" }}>
                  No conversations yet — <a href="/chat" target="_blank" rel="noopener noreferrer" style={{ color: colors.brand.cyan }}>start a chat demo</a>
                </td>
              </tr>
            ) : conversations.map((conv) => (
              <tr key={conv.session_id}
                style={{ borderBottom: `1px solid ${colors.border.faint}`, transition: "background-color 0.2s ease", cursor: "pointer" }}
                onMouseEnter={rowEnter}
                onMouseLeave={rowLeave}
                onClick={() => window.location.href = "/admin/conversations"}
                data-testid="dashboard-conversation-row"
              >
                <td style={{ ...T.td, fontFamily: fonts.mono, fontSize: "12px", color: colors.text.secondary }}>
                  {conv.session_id?.slice(0, 14)}...
                </td>
                <td style={T.td}><PlatformBadge platform={conv.platform} /></td>
                <td style={T.td}>{conv.messages?.length ?? 0}</td>
                <td style={{ ...T.td, color: colors.text.secondary, fontSize: "12px" }}>
                  {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : "\u2014"}
                </td>
                <td style={T.td}>
                  {conv.is_approved_for_training
                    ? <span style={{ color: colors.brand.success, fontFamily: fonts.mono, fontSize: "11px" }}>APPROVED</span>
                    : <span style={{ color: colors.text.muted, fontFamily: fonts.mono, fontSize: "11px" }}>PENDING</span>
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
