import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CheckCircle, Trash2, X, ChevronRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
};

function PlatformBadge({ platform }) {
  const colors = { discord: { bg: "rgba(88,101,242,0.15)", text: "#7289DA" }, web: { bg: "rgba(0,85,255,0.15)", text: "#0055FF" } };
  const c = colors[platform] || colors.web;
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: c.bg, color: c.text }}>{platform}</span>;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: "10px" }}>
      <div style={{ fontSize: "10px", color: "#A1A1AA", fontFamily: "JetBrains Mono", marginBottom: "4px", textTransform: "uppercase" }}>
        {isUser ? "USER" : "BOT"}
      </div>
      <div style={{
        maxWidth: "80%", padding: "10px 14px", borderRadius: "6px",
        backgroundColor: isUser ? "#0055FF22" : "#1A1A1A",
        border: isUser ? "1px solid #0055FF44" : "1px solid #262626",
        color: "#FFFFFF", fontFamily: "IBM Plex Sans", fontSize: "13px", lineHeight: "1.6",
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

  const loadConversations = () => {
    const params = new URLSearchParams({ limit: 50 });
    if (filter.platform) params.set("platform", filter.platform);
    if (filter.approved !== "") params.set("approved", filter.approved === "true");
    setLoading(true);
    axios.get(`${API}/conversations?${params}`).then(r => {
      setConversations(r.data.conversations || []);
      setTotal(r.data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadConversations(); }, [filter]);

  const approve = async (sessionId, approved) => {
    try {
      await axios.patch(`${API}/conversations/${sessionId}/approve`, { approved });
      toast.success(approved ? "Approved for training" : "Removed from training");
      setConversations(prev => prev.map(c => c.session_id === sessionId ? { ...c, is_approved_for_training: approved } : c));
      if (selected?.session_id === sessionId) setSelected(prev => ({ ...prev, is_approved_for_training: approved }));
    } catch { toast.error("Failed to update"); }
  };

  const deleteConv = async (sessionId) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await axios.delete(`${API}/conversations/${sessionId}`);
      toast.success("Conversation deleted");
      setConversations(prev => prev.filter(c => c.session_id !== sessionId));
      if (selected?.session_id === sessionId) setSelected(null);
    } catch { toast.error("Failed to delete"); }
  };

  const selectConv = (conv) => {
    setSelected(conv.session_id === selected?.session_id ? null : conv);
  };

  const selectStyle = (color, active) => ({
    padding: "6px 14px", borderRadius: "4px", border: `1px solid ${active ? color : "#262626"}`,
    backgroundColor: active ? `${color}18` : "transparent", color: active ? color : "#A1A1AA",
    fontSize: "12px", fontFamily: "IBM Plex Sans", cursor: "pointer",
    transition: "all 0.15s ease",
  });

  return (
    <div style={S.page}>
      <p style={S.overline}>Review & Training</p>
      <h1 style={S.h1}>Conversations</h1>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", alignItems: "center" }}>
        <span style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</span>
        <button data-testid="filter-all" onClick={() => setFilter({ platform: "", approved: "" })} style={selectStyle("#A1A1AA", !filter.platform && filter.approved === "")}>All</button>
        <button data-testid="filter-web" onClick={() => setFilter(p => ({ ...p, platform: p.platform === "web" ? "" : "web" }))} style={selectStyle("#0055FF", filter.platform === "web")}>Web</button>
        <button data-testid="filter-discord" onClick={() => setFilter(p => ({ ...p, platform: p.platform === "discord" ? "" : "discord" }))} style={selectStyle("#7289DA", filter.platform === "discord")}>Discord</button>
        <button data-testid="filter-approved" onClick={() => setFilter(p => ({ ...p, approved: p.approved === "true" ? "" : "true" }))} style={selectStyle("#00FF66", filter.approved === "true")}>Approved</button>
        <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA" }}>
          {total} total
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: "20px" }}>
        {/* List */}
        <div style={{ backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#A1A1AA", fontFamily: "IBM Plex Sans" }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#A1A1AA", fontFamily: "IBM Plex Sans", fontSize: "14px" }}>
              No conversations found.
            </div>
          ) : conversations.map(conv => (
            <div key={conv.session_id}
              data-testid="conversation-item"
              onClick={() => selectConv(conv)}
              style={{
                padding: "14px 20px", borderBottom: "1px solid #1A1A1A", cursor: "pointer",
                backgroundColor: selected?.session_id === conv.session_id ? "#1A1A1A" : "transparent",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={e => { if (selected?.session_id !== conv.session_id) e.currentTarget.style.backgroundColor = "#161616"; }}
              onMouseLeave={e => { if (selected?.session_id !== conv.session_id) e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <PlatformBadge platform={conv.platform} />
                    {conv.is_approved_for_training && (
                      <span style={{ fontSize: "10px", color: "#00FF66", fontFamily: "JetBrains Mono" }}>TRAINING</span>
                    )}
                  </div>
                  <p style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", margin: "0 0 4px" }}>
                    {conv.session_id?.slice(0, 20)}...
                  </p>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: 0 }}>
                    {conv.messages?.length ?? 0} messages
                    {conv.metadata?.username && ` · @${conv.metadata.username}`}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span style={{ fontFamily: "IBM Plex Sans", fontSize: "11px", color: "#A1A1AA" }}>
                    {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : ""}
                  </span>
                  <ChevronRight size={14} color="#404040" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", display: "flex", flexDirection: "column", maxHeight: "700px" }}>
            {/* Panel Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #262626", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <PlatformBadge platform={selected.platform} />
                  {selected.is_approved_for_training && (
                    <span style={{ fontSize: "10px", color: "#00FF66", fontFamily: "JetBrains Mono" }}>APPROVED FOR TRAINING</span>
                  )}
                </div>
                <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", margin: "4px 0 0" }}>
                  {selected.session_id?.slice(0, 24)}...
                </p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A1A1AA" }}>
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {(selected.messages || []).map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
            </div>

            {/* Actions */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #262626", display: "flex", gap: "10px", flexShrink: 0 }}>
              <button
                data-testid="approve-training-btn"
                onClick={() => approve(selected.session_id, !selected.is_approved_for_training)}
                style={{
                  flex: 1, padding: "9px 14px", borderRadius: "4px", border: "none", cursor: "pointer",
                  fontSize: "13px", fontFamily: "IBM Plex Sans", fontWeight: "500",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                  backgroundColor: selected.is_approved_for_training ? "#1A1A1A" : "#00FF6618",
                  color: selected.is_approved_for_training ? "#A1A1AA" : "#00FF66",
                  border: `1px solid ${selected.is_approved_for_training ? "#262626" : "#00FF6644"}`,
                }}>
                <CheckCircle size={13} />
                {selected.is_approved_for_training ? "Remove from Training" : "Approve for Training"}
              </button>
              <button
                data-testid="delete-conversation-btn"
                onClick={() => deleteConv(selected.session_id)}
                style={{
                  padding: "9px 14px", borderRadius: "4px", border: "1px solid #FF3B3030",
                  backgroundColor: "#FF3B3010", color: "#FF3B30", cursor: "pointer",
                  fontSize: "13px", fontFamily: "IBM Plex Sans", fontWeight: "500",
                  display: "flex", alignItems: "center", gap: "7px",
                }}>
                <Trash2 size={13} />Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
