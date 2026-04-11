import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bot, Send, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { colors, fonts } from "../theme";

const API = `/api`;

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [botConfig, setBotConfig] = useState({ name: "Assistant" });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const instanceId = searchParams.get("instance");

  useEffect(() => {
    axios.get(`${API}/admin/bot-config`).then(r => { if (r.data?.name) setBotConfig(r.data); }).catch(() => {});
    const saved = sessionStorage.getItem(`widget_session_${instanceId || "default"}`);
    if (saved) {
      setSessionId(saved);
      axios.get(`${API}/chat/history/${saved}`).then(r => setMessages(r.data.messages || [])).catch(() => {});
    }
  }, [instanceId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text, timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/chat/send`, { message: text, session_id: sessionId, instance_id: instanceId });
      if (!sessionId) {
        setSessionId(res.data.session_id);
        sessionStorage.setItem(`widget_session_${instanceId || "default"}`, res.data.session_id);
      }
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response, timestamp: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, an error occurred. Please try again.", timestamp: new Date().toISOString(), isError: true }]);
    } finally { setIsLoading(false); }
  };

  const reset = () => { sessionStorage.removeItem("widget_session"); setSessionId(null); setMessages([]); };
  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={{ width: "100%", height: "100vh", backgroundColor: colors.bg.base, display: "flex", flexDirection: "column", fontFamily: fonts.body, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ backgroundColor: colors.bg.surface, borderBottom: `1px solid ${colors.border.default}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <div style={{
          width: "30px", height: "30px", backgroundColor: colors.brand.blue,
          borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 10px rgba(0, 136, 255, 0.4)`,
        }}>
          <Bot size={16} color="#FFFFFF" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: fonts.heading, fontSize: "14px", fontWeight: "700", color: colors.text.primary, margin: 0, letterSpacing: "-0.3px" }}>
            {botConfig.name || "Assistant"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: colors.brand.success, boxShadow: `0 0 6px ${colors.brand.success}` }} />
            <span style={{ fontFamily: fonts.mono, fontSize: "9px", color: colors.brand.success, textTransform: "uppercase", letterSpacing: "0.1em" }}>Online</span>
          </div>
        </div>
        <button onClick={reset} data-testid="widget-reset-btn"
          style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary, padding: "4px", display: "flex", alignItems: "center" }}>
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: "center", paddingTop: "40px" }}>
            <div style={{
              width: "44px", height: "44px", backgroundColor: colors.brand.blue,
              borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px", boxShadow: `0 0 20px rgba(0, 136, 255, 0.3)`,
            }}>
              <Bot size={22} color="#FFFFFF" />
            </div>
            <p style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: "700", color: colors.text.primary, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Hi! How can I help?</p>
            <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.text.secondary, margin: 0 }}>Ask me anything.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={`${msg.role}-${msg.timestamp || i}`} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "10px" }}>
            {msg.role === "assistant" && (
              <div style={{
                width: "22px", height: "22px", backgroundColor: colors.brand.blue,
                borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
                marginRight: "7px", flexShrink: 0, marginTop: "3px",
              }}>
                <Bot size={11} color="#FFFFFF" />
              </div>
            )}
            <div style={{
              maxWidth: "80%", padding: "9px 12px", borderRadius: "4px",
              backgroundColor: msg.role === "user" ? colors.brand.blue : (msg.isError ? "rgba(255,0,60,0.08)" : colors.bg.panel),
              border: msg.role === "user" ? `1px solid rgba(0,245,255,0.2)` : `1px solid ${msg.isError ? "rgba(255,0,60,0.2)" : colors.border.default}`,
              color: msg.isError ? colors.brand.error : colors.text.primary,
              fontSize: "13px", lineHeight: "1.6",
            }}>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "10px" }}>
            <div style={{ width: "22px", height: "22px", backgroundColor: colors.brand.blue, borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "7px", flexShrink: 0 }}>
              <Bot size={11} color="#FFFFFF" />
            </div>
            <div style={{ padding: "10px 14px", backgroundColor: colors.bg.panel, border: `1px solid ${colors.border.default}`, borderRadius: "4px", display: "flex", gap: "4px" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: colors.brand.cyan, animation: "typing-dot 1.4s infinite ease-in-out", animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${colors.border.default}`, padding: "10px 12px", backgroundColor: colors.bg.base, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Type a message..." data-testid="widget-input"
            style={{
              flex: 1, backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`,
              borderRadius: "2px", padding: "9px 12px", color: colors.text.primary,
              fontFamily: fonts.body, fontSize: "13px", outline: "none",
              transition: "border-color 0.3s ease, box-shadow 0.3s ease",
            }}
            onFocus={e => { e.target.style.borderColor = colors.brand.cyan; e.target.style.boxShadow = `0 0 6px rgba(0,245,255,0.15)`; }}
            onBlur={e => { e.target.style.borderColor = "rgba(0,136,255,0.3)"; e.target.style.boxShadow = "none"; }}
          />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()} data-testid="widget-send-btn"
            style={{
              width: "36px", height: "36px",
              backgroundColor: !isLoading && input.trim() ? colors.brand.blue : colors.bg.panel,
              border: !isLoading && input.trim() ? `1px solid rgba(0,245,255,0.5)` : `1px solid ${colors.border.default}`,
              borderRadius: "2px", cursor: !isLoading && input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              transition: "all 0.2s ease",
            }}>
            <Send size={13} color={!isLoading && input.trim() ? "#FFFFFF" : colors.text.muted} />
          </button>
        </div>
        <p style={{ fontFamily: fonts.mono, fontSize: "9px", color: colors.text.muted, margin: "6px 0 0", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>
          Powered by BridgeBot
        </p>
      </div>
    </div>
  );
}
