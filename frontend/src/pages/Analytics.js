import { useState, useEffect } from "react";
import api from "../utils/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { MessageSquare, BookOpen, CheckCircle, Zap, Activity, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "24px" },
};

const tooltipStyle = {
  contentStyle: { backgroundColor: "#1A1A1A", border: "1px solid #262626", borderRadius: "4px", color: "#FFFFFF", fontFamily: "IBM Plex Sans" },
  labelStyle: { color: "#FFFFFF", fontFamily: "IBM Plex Sans", fontSize: "13px" },
  itemStyle: { color: "#A1A1AA", fontFamily: "IBM Plex Sans", fontSize: "12px" },
};

// Extracted to avoid inline object re-creation on every render
const CHART_MARGIN = { top: 0, right: 10, left: -20, bottom: 0 };
const AXIS_TICK = { fill: "#A1A1AA", fontFamily: "JetBrains Mono", fontSize: 11 };
const DOT_BLUE = { fill: "#0055FF", r: 3 };
const DOT_GREEN = { fill: "#00FF66", r: 3 };
const ACTIVE_DOT = { r: 5 };
const LEGEND_STYLE = { fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", paddingTop: "16px" };
const PLATFORM_COLORS = ["#0055FF", "#7289DA"];

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div style={{ ...S.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>{title}</p>
        <Icon size={16} color={color} />
      </div>
      <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "36px", fontWeight: "900", color: "#FFFFFF", margin: 0, letterSpacing: "-1px" }}>{value ?? "—"}</p>
    </div>
  );
}

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [llmUsage, setLlmUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/analytics/overview`),
      api.get(`/analytics/daily`),
      api.get(`/analytics/llm-usage`),
    ]).then(([ov, dl, llm]) => {
      setOverview(ov.data);
      setDaily(dl.data);
      setLlmUsage(llm.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const platformData = overview ? [
    { name: "Web", value: overview.platform_breakdown?.web ?? 0 },
    { name: "Discord", value: overview.platform_breakdown?.discord ?? 0 },
  ] : [];

  if (loading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "JetBrains Mono", color: "#A1A1AA", fontSize: "13px" }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <p style={S.overline}>Metrics</p>
      <h1 style={S.h1}>Analytics</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatCard title="Conversations" value={overview?.total_conversations ?? 0} icon={MessageSquare} color="#0055FF" />
        <StatCard title="Total Messages" value={overview?.total_messages ?? 0} icon={Zap} color="#00FF66" />
        <StatCard title="Knowledge Sources" value={overview?.knowledge_sources ?? 0} icon={BookOpen} color="#A1A1AA" />
        <StatCard title="Training Examples" value={overview?.approved_for_training ?? 0} icon={CheckCircle} color="#00FF66" />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Line Chart */}
        <div style={S.card}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>
            Activity — Last 7 Days
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
              <XAxis dataKey="date" stroke="#404040" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis stroke="#404040" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line type="monotone" dataKey="conversations" stroke="#0055FF" strokeWidth={2} dot={DOT_BLUE} activeDot={ACTIVE_DOT} name="Conversations" />
              <Line type="monotone" dataKey="messages" stroke="#00FF66" strokeWidth={2} dot={DOT_GREEN} activeDot={ACTIVE_DOT} name="Messages" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={S.card}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>
            Platform Split
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={platformData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" startAngle={90} endAngle={450}>
                {platformData.map((entry, index) => (
                  <Cell key={entry.name} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "12px" }}>
            {platformData.map((item, i) => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: PLATFORM_COLORS[i] }} />
                <span style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", color: "#A1A1AA" }}>{item.name}</span>
                <span style={{ fontFamily: "Chivo", fontWeight: "900", fontSize: "15px", color: "#FFFFFF" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Table */}
      <div style={{ backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", overflow: "hidden", marginBottom: "32px" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>Daily Breakdown</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
              {["Date", "Conversations", "Messages"].map(h => (
                <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: "400" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daily.map(row => (
              <tr key={row.date} style={{ borderBottom: "1px solid #161616" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1A1A1A"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                data-testid="analytics-daily-row">
                <td style={{ padding: "12px 20px", fontFamily: "JetBrains Mono", fontSize: "12px", color: "#A1A1AA" }}>{row.date}</td>
                <td style={{ padding: "12px 20px", fontFamily: "Chivo", fontSize: "20px", fontWeight: "900", color: "#FFFFFF" }}>{row.conversations}</td>
                <td style={{ padding: "12px 20px", fontFamily: "Chivo", fontSize: "20px", fontWeight: "900", color: "#00FF66" }}>{row.messages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── AI Usage Section ── */}
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ ...S.overline, marginBottom: "4px" }}>Claude API</p>
          <h2 style={{ fontFamily: "Chivo, sans-serif", fontSize: "22px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>AI Usage & Reliability</h2>
        </div>
        <a
          href="https://app.emergent.sh/profile/universal-key"
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", backgroundColor: "#111", border: "1px solid #262626", borderRadius: "4px", color: "#A1A1AA", fontSize: "12px", fontFamily: "IBM Plex Sans, sans-serif", textDecoration: "none", transition: "border-color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#0055FF"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#262626"}
          data-testid="balance-link"
        >
          <ExternalLink size={12} /> Check Balance
        </a>
      </div>

      {/* AI stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total API Calls" value={llmUsage?.total_calls ?? 0} icon={Activity} color="#0055FF" />
        <StatCard
          title="Success Rate"
          value={llmUsage ? `${llmUsage.success_rate}%` : "—"}
          icon={CheckCircle}
          color={llmUsage?.success_rate >= 95 ? "#00FF66" : llmUsage?.success_rate >= 80 ? "#F59E0B" : "#FF6B6B"}
        />
        <StatCard title="Retry Attempts" value={llmUsage?.retry_attempts ?? 0} icon={RefreshCw} color="#F59E0B" />
        <StatCard title="Fallbacks (Sonnet)" value={llmUsage?.fallback_used ?? 0} icon={AlertTriangle} color="#A1A1AA" />
      </div>

      {/* AI Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Daily API calls bar chart */}
        <div style={S.card}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>
            API Calls — Last 7 Days
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={llmUsage?.daily ?? []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
              <XAxis dataKey="date" stroke="#404040" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis stroke="#404040" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="calls" name="API Calls" fill="#0055FF" radius={[2, 2, 0, 0]} />
              <Bar dataKey="errors" name="Errors" fill="#FF6B6B" radius={[2, 2, 0, 0]} />
              <Bar dataKey="retries" name="Retries" fill="#F59E0B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Error breakdown */}
        <div style={S.card}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 20px" }}>
            Error Breakdown
          </p>
          {llmUsage?.failed_calls === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "160px", gap: "8px" }}>
              <CheckCircle size={28} color="#00FF66" />
              <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", color: "#A1A1AA", margin: 0 }}>No errors recorded</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(llmUsage?.error_breakdown ?? {}).map(([type, count]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.08em" }}>{type}</span>
                  <span style={{ fontFamily: "Chivo", fontWeight: "900", fontSize: "18px", color: "#FF6B6B" }}>{count}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase" }}>Total failed</span>
                <span style={{ fontFamily: "Chivo", fontWeight: "900", fontSize: "18px", color: "#FF6B6B" }}>{llmUsage?.failed_calls ?? 0}</span>
              </div>
            </div>
          )}
          <div style={{ marginTop: "20px", padding: "10px 12px", backgroundColor: "#0A0A0A", borderRadius: "4px", border: "1px solid #1E1E1E" }}>
            <p style={{ margin: 0, fontFamily: "IBM Plex Sans", fontSize: "11px", color: "#A1A1AA", lineHeight: "1.5" }}>
              On failure: retries up to 2× on Claude Opus, then falls back to Claude Sonnet automatically.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
