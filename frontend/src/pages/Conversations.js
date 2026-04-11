import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { CheckCircle, Trash2, X, ChevronRight, Lightbulb } from "lucide-react";
import { colors, fonts, T, rowEnter, rowLeave } from "../theme";

function PlatformBadge({ platform }) {
  const c = platform === "discord"
    ? { bg: "rgba(88,101,242,0.12)", text: colors.brand.discord }
    : { bg: "rgba(0,136,255,0.12)", text: colors.brand.blue };
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "2px", fontSize: "11px", fontFamily: fonts.mono, textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: c.bg, color: c.text }}>{platform}</span>;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: "10px" }}>
      <div style={{ fontSize: "10px", color: colors.text.secondary, fontFamily: fonts.mono, marginBottom: "4px", textTransform: "uppercase" }}>
        {isUser ? "USER" : "BOT"}
      </div>
      <div style={{
        maxWidth: "80%", padding: "10px 14px", borderRadius: "4px",
        backgroundColor: isUser ? "rgba(0,136,255,0.12)" : colors.bg.panel,
        border: isUser ? `1px solid rgba(0,136,255,0.3)` : `1px solid ${colors.border.default}`,
        color: colors.text.primary, fontFamily: fonts.body, fontSize: "13px", lineHeight: "1.6",
        whiteSpace: "pre-wrap", wordBreak: "break-word"
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ platform: "", approved: "" });
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(() => {
    const params = new URLSearchParams({ limit: 50 });
    if (filter.platform) params.set("platform", filter.platform);
    if (filter.approved !== "") params.set("approved", filter.approved === "true");
    setLoading(true);
    api.get(`/conversations?${params}`).then(r => {
      setConversations(r.data.conversations || []);
      setTotal(r.data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const approve = async (sessionId, approved) => {
    try {
      await api.patch(`/conversations/${sessionId}/approve`, { approved });
      toast.success(approved ? "Approved for training" : "Removed from training");
      setConversations(prev => prev.map(c => c.session_id === sessionId ? { ...c, is_approved_for_training: approved } : c));
      if (selected?.session_id === sessionId) setSelected(prev => ({ ...prev, is_approved_for_training: approved }));
    } catch { toast.error("Failed to update"); }
  };

  const deleteConv = async (sessionId) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/conversations/${sessionId}`);
      toast.success("Conversation deleted");
      setConversations(prev => prev.filter(c => c.session_id !== sessionId));
      if (selected?.session_id === sessionId) setSelected(null);
    } catch { toast.error("Failed to delete"); }
  };

  const selectConv = (conv) => setSelected(conv.session_id === selected?.session_id ? null : conv);

  const filterBtn = (color, active) => ({
    padding: "6px 14px", borderRadius: "2px", border: `1px solid ${active ? color : colors.border.default}`,
    backgroundColor: active ? `${color}15` : "transparent", color: active ? color : colors.text.secondary,
    fontSize: "12px", fontFamily: fonts.body, cursor: "pointer", transition: "all 0.2s ease",
  });

  return (
    <div style={T.page}>
      <p style={T.overline}>Review & Training</p>
      <h1 style={T.h1}>Conversations</h1>

      {/* Training Guide */}
      <div style={{ backgroundColor: "rgba(0,136,255,0.05)", border: `1px solid rgba(0,136,255,0.15)`, borderRadius: "2px", padding: "14px 18px", marginBottom: "24px", display: "flex", gap: "12px" }}>
        <Lightbulb size={16} color={colors.brand.blue} style={{ flexShrink: 0, marginTop: "1px" }} />
        <div>
          <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: "500", color: colors.text.primary, margin: "0 0 4px" }}>How Tone Training Works</p>
          <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: 0, lineHeight: "1.6" }}>
            Review conversations below. When you find one where the bot responded in the voice and style you want, click <strong style={{ color: colors.brand.success }}>Approve for Training</strong>.
            That conversation becomes a live example shown to Claude on every future message. Aim for 3-5 diverse, high-quality examples.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", alignItems: "center" }}>
        <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</span>
        <button data-testid="filter-all" onClick={() => setFilter({ platform: "", approved: "" })} style={filterBtn(colors.text.secondary, !filter.platform && filter.approved === "")}>All</button>
        <button data-testid="filter-web" onClick={() => setFilter(p => ({ ...p, platform: p.platform === "web" ? "" : "web" }))} style={filterBtn(colors.brand.blue, filter.platform === "web")}>Web</button>
        <button data-testid="filter-discord" onClick={() => setFilter(p => ({ ...p, platform: p.platform === "discord" ? "" : "discord" }))} style={filterBtn(colors.brand.discord, filter.platform === "discord")}>Discord</button>
        <button data-testid="filter-approved" onClick={() => setFilter(p => ({ ...p, approved: p.approved === "true" ? "" : "true" }))} style={filterBtn(colors.brand.success, filter.approved === "true")}>Approved</button>
        <span style={{ marginLeft: "auto", fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary }}>{total} total</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: "20px" }}>
        {/* List */}
        <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "2px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: colors.text.secondary, fontFamily: fonts.body }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: colors.text.secondary, fontFamily: fonts.body, fontSize: "14px" }}>No conversations found.</div>
          ) : conversations.map(conv => {
            const firstUserMsg = conv.messages?.find(m => m.role === "user");
            const firstBotMsg = conv.messages?.find(m => m.role === "assistant");
            return (
              <div key={conv.session_id} data-testid="conversation-item" onClick={() => selectConv(conv)}
                style={{
                  padding: "14px 20px", borderBottom: `1px solid ${colors.border.faint}`, cursor: "pointer",
                  backgroundColor: selected?.session_id === conv.session_id ? "rgba(0,245,255,0.04)" : "transparent",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={e => { if (selected?.session_id !== conv.session_id) e.currentTarget.style.backgroundColor = "rgba(0,136,255,0.04)"; }}
                onMouseLeave={e => { if (selected?.session_id !== conv.session_id) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <PlatformBadge platform={conv.platform} />
                      {conv.is_approved_for_training && (
                        <span style={{ fontSize: "10px", color: colors.brand.success, fontFamily: fonts.mono, display: "flex", alignItems: "center", gap: "3px" }}>
                          <CheckCircle size={9} /> TRAINING
                        </span>
                      )}
                      <span style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary }}>
                        {conv.messages?.length ?? 0} msgs
                        {conv.metadata?.username && ` \u00B7 @${conv.metadata.username}`}
                      </span>
                    </div>
                    {firstUserMsg && (
                      <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.primary, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "340px" }}>
                        <span style={{ color: colors.brand.blue, fontWeight: "500" }}>U:</span> {firstUserMsg.content}
                      </p>
                    )}
                    {firstBotMsg && (
                      <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "340px" }}>
                        <span style={{ color: colors.brand.success, fontWeight: "500" }}>A:</span> {firstBotMsg.content}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0, marginLeft: "12px" }}>
                    <span style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary }}>
                      {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : ""}
                    </span>
                    <ChevronRight size={13} color={colors.text.muted} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "2px", display: "flex", flexDirection: "column", maxHeight: "700px" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${colors.border.default}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <PlatformBadge platform={selected.platform} />
                  {selected.is_approved_for_training && <span style={{ fontSize: "10px", color: colors.brand.success, fontFamily: fonts.mono }}>APPROVED FOR TRAINING</span>}
                </div>
                <p style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.secondary, margin: "4px 0 0" }}>{selected.session_id?.slice(0, 24)}...</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {(selected.messages || []).map((msg, i) => (
                <MessageBubble key={`${msg.role}-${msg.timestamp || i}`} msg={msg} />
              ))}
            </div>

            <div style={{ padding: "14px 20px", borderTop: `1px solid ${colors.border.default}`, flexShrink: 0 }}>
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.muted, margin: "0 0 10px" }}>
                {selected.is_approved_for_training
                  ? "This conversation is actively shaping the bot's tone on every message."
                  : "Approve this conversation to use it as a live tone example for the bot."}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button data-testid="approve-training-btn" onClick={() => approve(selected.session_id, !selected.is_approved_for_training)}
                  style={{
                    flex: 1, padding: "9px 14px", borderRadius: "2px", cursor: "pointer",
                    fontSize: "13px", fontFamily: fonts.body, fontWeight: "500",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                    backgroundColor: selected.is_approved_for_training ? colors.bg.panel : "rgba(0,255,102,0.08)",
                    color: selected.is_approved_for_training ? colors.text.secondary : colors.brand.success,
                    border: `1px solid ${selected.is_approved_for_training ? colors.border.default : "rgba(0,255,102,0.3)"}`,
                    transition: "all 0.2s ease",
                  }}>
                  <CheckCircle size={13} />
                  {selected.is_approved_for_training ? "Remove from Training" : "Approve for Training"}
                </button>
                <button data-testid="delete-conversation-btn" onClick={() => deleteConv(selected.session_id)}
                  style={{
                    padding: "9px 14px", borderRadius: "2px",
                    border: `1px solid rgba(255,0,60,0.2)`, backgroundColor: "rgba(255,0,60,0.06)",
                    color: colors.brand.error, cursor: "pointer",
                    fontSize: "13px", fontFamily: fonts.body, fontWeight: "500",
                    display: "flex", alignItems: "center", gap: "7px",
                  }}>
                  <Trash2 size={13} />Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
