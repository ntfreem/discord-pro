import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { MessageSquare, BookOpen, CheckCircle, Zap, Activity, AlertTriangle, RefreshCw, ExternalLink, EyeOff, Plus, X } from "lucide-react";
import { colors, fonts, T, rowEnter, rowLeave, onFocus, onBlur } from "../theme";

const tooltipStyle = {
  contentStyle: { backgroundColor: colors.bg.panel, border: `1px solid ${colors.border.default}`, borderRadius: "10px", color: colors.text.primary, fontFamily: fonts.body },
  labelStyle: { color: colors.text.primary, fontFamily: fonts.body, fontSize: "13px" },
  itemStyle: { color: colors.text.secondary, fontFamily: fonts.body, fontSize: "12px" },
};

const CHART_MARGIN = { top: 0, right: 10, left: -20, bottom: 0 };
const AXIS_TICK = { fill: colors.text.secondary, fontFamily: fonts.mono, fontSize: 11 };
const DOT_BLUE = { fill: colors.brand.blue, r: 3 };
const DOT_GREEN = { fill: colors.brand.success, r: 3 };
const ACTIVE_DOT = { r: 5 };
const LEGEND_STYLE = { fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, paddingTop: "16px" };
const PLATFORM_COLORS = [colors.brand.blue, colors.brand.discord];

function StatCard({ title, value, icon: Icon, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      ...T.card,
      transition: "border-color 0.3s, box-shadow 0.3s",
      borderColor: hovered ? colors.brand.cyan : "rgba(59, 130, 246, 0.3)",
      boxShadow: hovered ? `0 4px 20px rgba(59, 130, 246, 0.15)` : "none",
    }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <p style={T.monoLabel}>{title}</p>
        <Icon size={16} color={color} />
      </div>
      <p style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: "700", color: colors.text.primary, margin: 0, letterSpacing: "-1px" }}>{value ?? "\u2014"}</p>
    </div>
  );
}

export default function Analytics() {
  const { selectedInstance } = useAuth();
  const instanceId = selectedInstance?.id;
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [llmUsage, setLlmUsage] = useState(null);
  const [passiveSkips, setPassiveSkips] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainOpen, setTrainOpen] = useState(false);
  const [trainTitle, setTrainTitle] = useState("");
  const [trainContent, setTrainContent] = useState("");
  const [trainPriority, setTrainPriority] = useState(0);
  const [trainSaving, setTrainSaving] = useState(false);

  const reloadSkips = () => {
    api.get(`/analytics/passive-skips`).then(r => setPassiveSkips(r.data)).catch(() => {});
  };

  const openTrain = (msg) => {
    setTrainTitle(msg || "");
    setTrainContent("");
    setTrainPriority(0);
    setTrainOpen(true);
  };

  const submitTrain = async () => {
    if (!trainTitle.trim() || !trainContent.trim()) {
      toast.error("Question and answer are both required");
      return;
    }
    setTrainSaving(true);
    try {
      await api.post(`/knowledge/sources/faq`, {
        title: trainTitle.trim(),
        content: trainContent.trim(),
        priority: trainPriority,
      });
      toast.success("FAQ added to knowledge base");
      setTrainOpen(false);
      reloadSkips();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add FAQ");
    } finally {
      setTrainSaving(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/overview`),
      api.get(`/analytics/daily`),
      api.get(`/analytics/llm-usage`),
      api.get(`/analytics/passive-skips`).catch(() => ({ data: null })),
    ]).then(([ov, dl, llm, ps]) => {
      setOverview(ov.data);
      setDaily(dl.data);
      setLlmUsage(llm.data);
      setPassiveSkips(ps.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [instanceId]);

  const platformData = overview ? [
    { name: "Web", value: overview.platform_breakdown?.web ?? 0 },
    { name: "Discord", value: overview.platform_breakdown?.discord ?? 0 },
  ] : [];

  if (loading) {
    return (
      <div style={{ ...T.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: fonts.mono, color: colors.text.secondary, fontSize: "13px" }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={T.page}>
      <p style={T.overline}>Metrics</p>
      <h1 style={T.h1}>Analytics</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatCard title="Conversations" value={overview?.total_conversations ?? 0} icon={MessageSquare} color={colors.brand.blue} />
        <StatCard title="Total Messages" value={overview?.total_messages ?? 0} icon={Zap} color={colors.brand.success} />
        <StatCard title="Knowledge Sources" value={overview?.knowledge_sources ?? 0} icon={BookOpen} color={colors.text.secondary} />
        <StatCard title="Training Examples" value={overview?.approved_for_training ?? 0} icon={CheckCircle} color={colors.brand.success} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div style={T.card}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 24px" }}>Activity — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.1)" vertical={false} />
              <XAxis dataKey="date" stroke={colors.text.muted} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis stroke={colors.text.muted} tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line type="monotone" dataKey="conversations" stroke={colors.brand.blue} strokeWidth={2} dot={DOT_BLUE} activeDot={ACTIVE_DOT} name="Conversations" />
              <Line type="monotone" dataKey="messages" stroke={colors.brand.success} strokeWidth={2} dot={DOT_GREEN} activeDot={ACTIVE_DOT} name="Messages" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={T.card}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 24px" }}>Platform Split</p>
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
                <div style={{ width: "10px", height: "10px", borderRadius: "10px", backgroundColor: PLATFORM_COLORS[i] }} />
                <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.text.secondary }}>{item.name}</span>
                <span style={{ fontFamily: fonts.heading, fontWeight: "700", fontSize: "15px", color: colors.text.primary }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Table */}
      <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", overflow: "hidden", marginBottom: "32px" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.default}` }}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>Daily Breakdown</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
              {["Date", "Conversations", "Messages"].map(h => (<th key={h} style={T.th}>{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {daily.map(row => (
              <tr key={row.date} style={{ borderBottom: `1px solid ${colors.border.faint}` }}
                onMouseEnter={rowEnter} onMouseLeave={rowLeave} data-testid="analytics-daily-row">
                <td style={{ padding: "12px 20px", fontFamily: fonts.mono, fontSize: "12px", color: colors.text.secondary }}>{row.date}</td>
                <td style={{ padding: "12px 20px", fontFamily: fonts.heading, fontSize: "20px", fontWeight: "700", color: colors.text.primary }}>{row.conversations}</td>
                <td style={{ padding: "12px 20px", fontFamily: fonts.heading, fontSize: "20px", fontWeight: "700", color: colors.brand.success }}>{row.messages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Usage Section */}
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ ...T.overline, marginBottom: "4px" }}>Claude API</p>
          <h2 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: "700", color: colors.text.primary, margin: 0 }}>AI Usage & Reliability</h2>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", color: colors.text.secondary, fontSize: "12px", fontFamily: fonts.body }}
          data-testid="balance-link">
          <ExternalLink size={12} /> AI Usage
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total API Calls" value={llmUsage?.total_calls ?? 0} icon={Activity} color={colors.brand.blue} />
        <StatCard title="Success Rate" value={llmUsage ? `${llmUsage.success_rate}%` : "\u2014"} icon={CheckCircle}
          color={llmUsage?.success_rate >= 95 ? colors.brand.success : llmUsage?.success_rate >= 80 ? colors.brand.warning : colors.brand.error} />
        <StatCard title="Retry Attempts" value={llmUsage?.retry_attempts ?? 0} icon={RefreshCw} color={colors.brand.warning} />
        <StatCard title="Fallbacks (Sonnet)" value={llmUsage?.fallback_used ?? 0} icon={AlertTriangle} color={colors.text.secondary} />
      </div>

      {/* Passive Mode Skips */}
      {(passiveSkips?.total ?? 0) > 0 && (
        <div style={{ ...T.card, marginBottom: "24px" }} data-testid="passive-skips-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "rgba(96,165,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <EyeOff size={16} color={colors.brand.light} />
              </div>
              <div>
                <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>Passive Mode Skips</p>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, margin: "2px 0 0" }}>Messages the bot intentionally stayed silent on</p>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" }}>
            <div style={{ padding: "14px 16px", backgroundColor: colors.bg.base, borderRadius: "10px", border: `1px solid ${colors.border.subtle}` }}>
              <p style={{ ...T.overline, marginBottom: "6px", fontSize: "10px" }}>Today</p>
              <p style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: "700", color: colors.text.primary, margin: 0 }}>{passiveSkips?.today ?? 0}</p>
            </div>
            <div style={{ padding: "14px 16px", backgroundColor: colors.bg.base, borderRadius: "10px", border: `1px solid ${colors.border.subtle}` }}>
              <p style={{ ...T.overline, marginBottom: "6px", fontSize: "10px" }}>Last 7 days</p>
              <p style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: "700", color: colors.text.primary, margin: 0 }}>{passiveSkips?.last_7_days ?? 0}</p>
            </div>
            <div style={{ padding: "14px 16px", backgroundColor: colors.bg.base, borderRadius: "10px", border: `1px solid ${colors.border.subtle}` }}>
              <p style={{ ...T.overline, marginBottom: "6px", fontSize: "10px" }}>All time</p>
              <p style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: "700", color: colors.text.primary, margin: 0 }}>{passiveSkips?.total ?? 0}</p>
            </div>
          </div>
          {passiveSkips?.recent?.length > 0 && (
            <>
              <p style={{ ...T.overline, marginBottom: "10px", fontSize: "10px" }}>Recent skipped messages</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "260px", overflowY: "auto" }}>
                {passiveSkips.recent.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: colors.bg.base, border: `1px solid ${colors.border.subtle}`, borderRadius: "8px", gap: "10px" }}>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.primary, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <span style={{ color: colors.text.muted, marginRight: "8px" }}>@{s.username || "unknown"}</span>
                        {s.message_preview}
                      </p>
                    </div>
                    <span style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.muted, flexShrink: 0 }}>
                      {s.timestamp ? new Date(s.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                    <button
                      onClick={() => openTrain(s.message_preview)}
                      data-testid={`train-skip-btn-${i}`}
                      title="Add this as an FAQ to the knowledge base"
                      style={{
                        flexShrink: 0,
                        display: "flex", alignItems: "center", gap: "4px",
                        padding: "5px 10px",
                        backgroundColor: "rgba(96,165,250,0.08)",
                        border: `1px solid rgba(96,165,250,0.25)`,
                        borderRadius: "6px",
                        color: colors.brand.light,
                        fontFamily: fonts.body, fontSize: "11px", fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <Plus size={11} /> Train
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div style={T.card}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 24px" }}>API Calls — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={llmUsage?.daily ?? []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.1)" vertical={false} />
              <XAxis dataKey="date" stroke={colors.text.muted} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis stroke={colors.text.muted} tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="calls" name="API Calls" fill={colors.brand.blue} radius={[2, 2, 0, 0]} />
              <Bar dataKey="errors" name="Errors" fill={colors.brand.error} radius={[2, 2, 0, 0]} />
              <Bar dataKey="retries" name="Retries" fill={colors.brand.warning} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={T.card}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 20px" }}>Error Breakdown</p>
          {llmUsage?.failed_calls === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "160px", gap: "8px" }}>
              <CheckCircle size={28} color={colors.brand.success} />
              <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.text.secondary, margin: 0 }}>No errors recorded</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(llmUsage?.error_breakdown ?? {}).map(([type, count]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>{type}</span>
                  <span style={{ fontFamily: fonts.heading, fontWeight: "700", fontSize: "18px", color: colors.brand.error }}>{count}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary, textTransform: "uppercase" }}>Total failed</span>
                <span style={{ fontFamily: fonts.heading, fontWeight: "700", fontSize: "18px", color: colors.brand.error }}>{llmUsage?.failed_calls ?? 0}</span>
              </div>
            </div>
          )}
          <div style={{ marginTop: "20px", padding: "10px 12px", backgroundColor: colors.bg.base, borderRadius: "10px", border: `1px solid ${colors.border.subtle}` }}>
            <p style={{ margin: 0, fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, lineHeight: "1.5" }}>
              On failure: retries up to 2x on Claude Opus, then falls back to Claude Sonnet automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Train-on-this modal */}
      {trainOpen && (
        <div
          onClick={() => !trainSaving && setTrainOpen(false)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            data-testid="train-modal"
            style={{
              backgroundColor: colors.bg.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "560px", width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "rgba(96,165,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={16} color={colors.brand.light} />
                </div>
                <div>
                  <p style={{ fontFamily: fonts.heading, fontSize: "16px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>Train on this question</p>
                  <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, margin: "2px 0 0" }}>Add as an FAQ so the bot can answer next time</p>
                </div>
              </div>
              <button
                onClick={() => !trainSaving && setTrainOpen(false)}
                data-testid="train-close-btn"
                style={{ background: "none", border: "none", color: colors.text.muted, cursor: "pointer", padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, display: "block", marginBottom: "6px" }}>Question</label>
              <input
                type="text"
                value={trainTitle}
                onChange={(e) => setTrainTitle(e.target.value)}
                placeholder="What the user asked..."
                data-testid="train-title-input"
                onFocus={onFocus}
                onBlur={onBlur}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: colors.bg.base,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: "8px",
                  color: colors.text.primary,
                  fontFamily: fonts.body, fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, display: "block", marginBottom: "6px" }}>Answer</label>
              <textarea
                value={trainContent}
                onChange={(e) => setTrainContent(e.target.value)}
                placeholder="The answer the bot should give..."
                data-testid="train-content-input"
                onFocus={onFocus}
                onBlur={onBlur}
                rows={5}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: colors.bg.base,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: "8px",
                  color: colors.text.primary,
                  fontFamily: fonts.body, fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, display: "block", marginBottom: "6px" }}>Priority</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { v: 0, l: "Normal" },
                  { v: 1, l: "Medium" },
                  { v: 2, l: "High" },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => setTrainPriority(v)}
                    data-testid={`train-priority-${v}`}
                    style={{
                      flex: 1, padding: "8px 12px",
                      backgroundColor: trainPriority === v ? "rgba(96,165,250,0.08)" : colors.bg.base,
                      border: `1px solid ${trainPriority === v ? colors.brand.light : colors.border.default}`,
                      borderRadius: "8px",
                      color: trainPriority === v ? colors.text.primary : colors.text.secondary,
                      fontFamily: fonts.body, fontSize: "12px", fontWeight: trainPriority === v ? "600" : "400",
                      cursor: "pointer",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setTrainOpen(false)}
                disabled={trainSaving}
                data-testid="train-cancel-btn"
                style={{
                  padding: "10px 18px",
                  backgroundColor: "transparent",
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: "10px",
                  fontFamily: fonts.body, fontSize: "12px", fontWeight: "600",
                  cursor: trainSaving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitTrain}
                disabled={trainSaving}
                data-testid="train-submit-btn"
                style={{
                  padding: "10px 18px",
                  backgroundColor: colors.brand.light,
                  color: "#0B1120",
                  border: "none",
                  borderRadius: "10px",
                  fontFamily: fonts.body, fontSize: "12px", fontWeight: "600",
                  cursor: trainSaving ? "not-allowed" : "pointer",
                  opacity: trainSaving ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <Plus size={13} /> {trainSaving ? "Adding…" : "Add to Knowledge Base"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
