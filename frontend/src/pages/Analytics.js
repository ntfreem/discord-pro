import { useState, useEffect } from "react";
import api from "../utils/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";
import { MessageSquare, BookOpen, CheckCircle, Zap } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/analytics/overview`),
      api.get(`/analytics/daily`)
    ]).then(([ov, dl]) => {
      setOverview(ov.data);
      setDaily(dl.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const platformData = overview ? [
    { name: "Web", value: overview.platform_breakdown?.web ?? 0 },
    { name: "Discord", value: overview.platform_breakdown?.discord ?? 0 },
  ] : [];

  const PLATFORM_COLORS = ["#0055FF", "#7289DA"];

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
            <LineChart data={daily} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
              <XAxis dataKey="date" stroke="#404040" tick={{ fill: "#A1A1AA", fontFamily: "JetBrains Mono", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#404040" tick={{ fill: "#A1A1AA", fontFamily: "JetBrains Mono", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", paddingTop: "16px" }} />
              <Line type="monotone" dataKey="conversations" stroke="#0055FF" strokeWidth={2} dot={{ fill: "#0055FF", r: 3 }} activeDot={{ r: 5 }} name="Conversations" />
              <Line type="monotone" dataKey="messages" stroke="#00FF66" strokeWidth={2} dot={{ fill: "#00FF66", r: 3 }} activeDot={{ r: 5 }} name="Messages" />
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
                  <Cell key={index} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} stroke="none" />
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
      <div style={{ backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", overflow: "hidden" }}>
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
    </div>
  );
}
