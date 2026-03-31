import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bot, Send, Plus, ExternalLink } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [botConfig, setBotConfig] = useState({ name: "BotForge Assistant" });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const instanceId = searchParams.get("instance");

  useEffect(() => {
    // Get bot config for this instance
    const cfgParams = instanceId ? `?instance_id=${instanceId}` : "";
    axios.get(`${API}/admin/bot-config${cfgParams}`).then(r => { if (r.data?.name) setBotConfig(r.data); }).catch(() => {});

    const savedSession = localStorage.getItem(`bf_chat_${instanceId || "default"}`);
    if (savedSession) {
      setSessionId(savedSession);
      axios.get(`${API}/chat/history/${savedSession}`).then(r => {
        setMessages(r.data.messages || []);
      }).catch(() => {});
    }
  }, [instanceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await axios.post(`${API}/chat/send`, { message: text, session_id: sessionId, instance_id: instanceId });
      if (!sessionId) {
        setSessionId(res.data.session_id);
        localStorage.setItem(`bf_chat_${instanceId || "default"}`, res.data.session_id);
      }
      setMessages(prev => [...prev, {
        role: "assistant", content: res.data.response, timestamp: new Date().toISOString()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant", content: "I encountered an error. Please try again.", timestamp: new Date().toISOString(), isError: true
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const startNewChat = () => {
    localStorage.removeItem(`bf_chat_${instanceId || "default"}`);
    setSessionId(null);
    setMessages([]);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0A", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "rgba(10,10,10,0.8)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #262626", padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "34px", height: "34px", backgroundColor: "#0055FF", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={18} color="#FFFFFF" />
          </div>
          <div>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "16px", fontWeight: "900", color: "#FFFFFF", margin: 0, letterSpacing: "-0.3px" }}>
              {botConfig.name || "BotForge Assistant"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#00FF66" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#00FF66", textTransform: "uppercase", letterSpacing: "0.1em" }}>Online</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a href="/admin" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", backgroundColor: "transparent", border: "1px solid #262626", color: "#A1A1AA", borderRadius: "4px", fontSize: "12px", fontFamily: "IBM Plex Sans", textDecoration: "none" }}>
            <ExternalLink size={12} /> Admin
          </a>
          <button onClick={startNewChat} data-testid="new-chat-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", backgroundColor: "#1A1A1A", border: "1px solid #262626", color: "#FFFFFF", borderRadius: "4px", fontSize: "12px", fontFamily: "IBM Plex Sans", cursor: "pointer" }}>
            <Plus size={12} /> New Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", maxWidth: "760px", margin: "0 auto", width: "100%" }}>
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: "center", paddingTop: "100px", animation: "fade-in 0.4s ease" }}>
            <div style={{ width: "60px", height: "60px", backgroundColor: "#0055FF", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Bot size={28} color="#FFFFFF" />
            </div>
            <h2 style={{ fontFamily: "Chivo, sans-serif", fontSize: "28px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
              How can I help you?
            </h2>
            <p style={{ fontFamily: "IBM Plex Sans, sans-serif", fontSize: "15px", color: "#A1A1AA", margin: 0, lineHeight: "1.6" }}>
              Ask me anything — I'm powered by your knowledge base and always learning.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="message-enter"
            style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "16px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "28px", height: "28px", backgroundColor: "#0055FF", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "10px", flexShrink: 0, marginTop: "4px" }}>
                <Bot size={14} color="#FFFFFF" />
              </div>
            )}
            <div style={{
              maxWidth: "72%", padding: "12px 16px", borderRadius: "8px",
              backgroundColor: msg.role === "user" ? "#0055FF" : (msg.isError ? "rgba(255,59,48,0.08)" : "#1A1A1A"),
              border: msg.role === "user" ? "none" : `1px solid ${msg.isError ? "rgba(255,59,48,0.2)" : "#262626"}`,
              color: msg.isError ? "#FF3B30" : "#FFFFFF",
              fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px", lineHeight: "1.7",
            }}>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
              <p style={{ margin: "6px 0 0", fontSize: "10px", color: msg.role === "user" ? "rgba(255,255,255,0.5)" : "#404040", fontFamily: "JetBrains Mono" }}>
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
            <div style={{ width: "28px", height: "28px", backgroundColor: "#0055FF", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "10px", flexShrink: 0 }}>
              <Bot size={14} color="#FFFFFF" />
            </div>
            <div style={{ padding: "14px 18px", backgroundColor: "#1A1A1A", border: "1px solid #262626", borderRadius: "8px", display: "flex", gap: "5px", alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#0055FF", animation: "typing-dot 1.4s infinite ease-in-out", animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ borderTop: "1px solid #262626", padding: "20px 24px", backgroundColor: "#0A0A0A" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your message... (Enter to send)"
              data-testid="chat-input"
              rows={1}
              style={{
                flex: 1, backgroundColor: "#121212", border: "1px solid #262626",
                borderRadius: "6px", padding: "12px 16px", color: "#FFFFFF",
                fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px", outline: "none",
                resize: "none", lineHeight: "1.5", maxHeight: "120px", overflowY: "auto",
                transition: "border-color 0.15s ease",
              }}
              onFocus={e => e.target.style.borderColor = "#0055FF"}
              onBlur={e => e.target.style.borderColor = "#262626"}
            />
            <button onClick={sendMessage} disabled={isLoading || !input.trim()} data-testid="send-message-btn"
              style={{
                width: "44px", height: "44px", backgroundColor: !isLoading && input.trim() ? "#0055FF" : "#1A1A1A",
                border: "none", borderRadius: "6px", cursor: !isLoading && input.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background-color 0.15s ease", flexShrink: 0,
              }}>
              <Send size={16} color={!isLoading && input.trim() ? "#FFFFFF" : "#404040"} />
            </button>
          </div>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#2A2A2A", marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
