import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bot, Send, RotateCcw, X, MessageCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [botConfig, setBotConfig] = useState({ name: "Assistant" });
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const instanceId = searchParams.get("instance");

  useEffect(() => {
    axios.get(`${API}/admin/bot-config`).then(r => { if (r.data?.name) setBotConfig(r.data); }).catch(() => {});
    const saved = sessionStorage.getItem(`widget_session_${instanceId || "default"}`);
    if (saved) {
      setSessionId(saved);
      axios.get(`${API}/chat/history/${saved}`).then(r => {
        setMessages(r.data.messages || []);
      }).catch(() => {});
    }
  }, [instanceId]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

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
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    sessionStorage.removeItem("widget_session");
    setSessionId(null);
    setMessages([]);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ width: "100%", height: "100vh", backgroundColor: "#0A0A0A", display: "flex", flexDirection: "column", fontFamily: "IBM Plex Sans, sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#121212", borderBottom: "1px solid #262626", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <div style={{ width: "30px", height: "30px", backgroundColor: "#0055FF", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bot size={16} color="#FFFFFF" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "14px", fontWeight: "900", color: "#FFFFFF", margin: 0, letterSpacing: "-0.3px" }}>
            {botConfig.name || "Assistant"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#00FF66" }} />
            <span style={{ fontFamily: "JetBrains Mono", fontSize: "9px", color: "#00FF66", textTransform: "uppercase", letterSpacing: "0.1em" }}>Online</span>
          </div>
        </div>
        <button onClick={reset} data-testid="widget-reset-btn"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#A1A1AA", padding: "4px", display: "flex", alignItems: "center" }}>
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: "center", paddingTop: "40px" }}>
            <div style={{ width: "44px", height: "44px", backgroundColor: "#0055FF", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Bot size={22} color="#FFFFFF" />
            </div>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "18px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 6px", letterSpacing: "-0.3px" }}>Hi! How can I help?</p>
            <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", color: "#A1A1AA", margin: 0 }}>Ask me anything.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "10px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "22px", height: "22px", backgroundColor: "#0055FF", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "7px", flexShrink: 0, marginTop: "3px" }}>
                <Bot size={11} color="#FFFFFF" />
              </div>
            )}
            <div style={{
              maxWidth: "80%", padding: "9px 12px", borderRadius: "8px",
              backgroundColor: msg.role === "user" ? "#0055FF" : (msg.isError ? "rgba(255,59,48,0.08)" : "#1A1A1A"),
              border: msg.role === "user" ? "none" : `1px solid ${msg.isError ? "rgba(255,59,48,0.2)" : "#262626"}`,
              color: msg.isError ? "#FF3B30" : "#FFFFFF",
              fontSize: "13px", lineHeight: "1.6",
            }}>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "10px" }}>
            <div style={{ width: "22px", height: "22px", backgroundColor: "#0055FF", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "7px", flexShrink: 0 }}>
              <Bot size={11} color="#FFFFFF" />
            </div>
            <div style={{ padding: "10px 14px", backgroundColor: "#1A1A1A", border: "1px solid #262626", borderRadius: "8px", display: "flex", gap: "4px" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#0055FF", animation: "typing-dot 1.4s infinite ease-in-out", animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #262626", padding: "10px 12px", backgroundColor: "#0A0A0A", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            data-testid="widget-input"
            style={{
              flex: 1, backgroundColor: "#121212", border: "1px solid #262626",
              borderRadius: "6px", padding: "9px 12px", color: "#FFFFFF",
              fontFamily: "IBM Plex Sans", fontSize: "13px", outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={e => e.target.style.borderColor = "#0055FF"}
            onBlur={e => e.target.style.borderColor = "#262626"}
          />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()} data-testid="widget-send-btn"
            style={{
              width: "36px", height: "36px", backgroundColor: !isLoading && input.trim() ? "#0055FF" : "#1A1A1A",
              border: "none", borderRadius: "6px", cursor: !isLoading && input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
            <Send size={13} color={!isLoading && input.trim() ? "#FFFFFF" : "#404040"} />
          </button>
        </div>
        <p style={{ fontFamily: "JetBrains Mono", fontSize: "9px", color: "#2A2A2A", margin: "6px 0 0", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>
          Powered by BridgeBot
        </p>
      </div>
    </div>
  );
}
