import { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Zap, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "28px", marginBottom: "24px" },
  label: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#A1A1AA", marginBottom: "8px", display: "block" },
  input: {
    width: "100%", backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", padding: "10px 14px", color: "#FFFFFF",
    fontFamily: "JetBrains Mono, monospace", fontSize: "13px", outline: "none",
    boxSizing: "border-box",
  },
};

const steps = [
  {
    num: "01",
    title: "Create a Discord Application",
    desc: "Go to the Discord Developer Portal and create a new application. Give it a name and save.",
    link: { label: "Open Discord Developer Portal", url: "https://discord.com/developers/applications" }
  },
  {
    num: "02",
    title: "Add a Bot to Your Application",
    desc: "In your application, navigate to the \"Bot\" section and click \"Add Bot\". This creates your bot user.",
    link: null
  },
  {
    num: "03",
    title: "Enable Message Content Intent",
    desc: "Under the Bot settings, scroll to \"Privileged Gateway Intents\" and enable the \"Message Content Intent\". This is required for the bot to read messages.",
    link: null
  },
  {
    num: "04",
    title: "Copy Your Bot Token",
    desc: "Click \"Reset Token\" (or copy if already visible) and paste it into the field below. Keep this token secret!",
    link: null
  },
  {
    num: "05",
    title: "Invite Bot to Your Server",
    desc: "Go to OAuth2 → URL Generator, select \"bot\" scope, add permissions (Send Messages, Read Message History). Use the generated URL to invite the bot.",
    link: null
  },
  {
    num: "06",
    title: "Activate & Start",
    desc: "Paste your token below, toggle \"Active\", save, and start the bot. Mention your bot in any channel or DM it to chat.",
    link: null
  }
];

export default function DiscordSettings() {
  const [token, setToken] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [existing, setExisting] = useState(null);
  const [status, setStatus] = useState({ status: "offline", bot_name: null });
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  const loadConfig = () => {
    api.get(`/discord/config`).then(r => {
      setExisting(r.data);
      setIsActive(r.data?.is_active || false);
    }).catch(() => {});
  };

  const loadStatus = () => {
    api.get(`/discord/status`).then(r => setStatus(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadConfig();
    loadStatus();
    pollRef.current = setInterval(loadStatus, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const save = async () => {
    const update = { is_active: isActive };
    if (token.trim()) update.bot_token = token.trim();
    setSaving(true);
    try {
      await api.put(`/discord/config`, update);
      toast.success("Discord settings saved");
      setToken("");
      loadConfig();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const startBot = async () => {
    setStarting(true);
    try {
      await api.post(`/discord/restart`);
      toast.success("Discord bot starting...");
      setTimeout(loadStatus, 3000);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to start bot"); }
    finally { setStarting(false); }
  };

  const isOnline = status.status === "online";

  return (
    <div style={S.page}>
      <p style={S.overline}>Integration</p>
      <h1 style={S.h1}>Discord Bot</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: Setup guide */}
        <div>
          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>Setup Guide</p>
            {steps.map(({ num, title, desc, link }) => (
              <div key={num} style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                <span style={{
                  fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF",
                  flexShrink: 0, paddingTop: "2px", minWidth: "24px"
                }}>{num}</span>
                <div>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", fontWeight: "500", color: "#FFFFFF", margin: "0 0 4px" }}>{title}</p>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: "0 0 6px", lineHeight: "1.6" }}>{desc}</p>
                  {link && (
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "12px", color: "#0055FF", fontFamily: "IBM Plex Sans", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {link.label} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Config */}
        <div>
          {/* Status Card */}
          <div style={{ ...S.card, borderColor: isOnline ? "#00FF6630" : "#262626", marginBottom: "20px" }}>
            <p style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "14px" }}>Bot Status</p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: isOnline ? "#00FF66" : "#404040", boxShadow: isOnline ? "0 0 8px #00FF66" : "none" }} />
              <div>
                <p style={{ fontFamily: "Chivo", fontSize: "18px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>
                  {isOnline ? "Online" : "Offline"}
                </p>
                {status.bot_name && <p style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", margin: "2px 0 0" }}>{status.bot_name}</p>}
              </div>
              <button onClick={loadStatus} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#A1A1AA" }}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>Configuration</p>

            <div style={{ marginBottom: "20px" }}>
              <label style={S.label}>Bot Token *</label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={existing?.bot_token_display ? `Current: ${existing.bot_token_display}` : "Paste your Discord bot token..."}
                data-testid="discord-token-input"
                style={S.input}
                onFocus={e => e.target.style.borderColor = "#0055FF"}
                onBlur={e => e.target.style.borderColor = "#262626"}
              />
              <p style={{ fontFamily: "IBM Plex Sans", fontSize: "11px", color: "#404040", marginTop: "6px" }}>
                Leave empty to keep existing token. Stored securely.
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={S.label}>Active</label>
              <button
                onClick={() => setIsActive(!isActive)}
                data-testid="discord-active-toggle"
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 16px", backgroundColor: isActive ? "#00FF6618" : "#1A1A1A",
                  border: `1px solid ${isActive ? "#00FF6644" : "#262626"}`,
                  borderRadius: "4px", cursor: "pointer",
                  color: isActive ? "#00FF66" : "#A1A1AA",
                  fontFamily: "IBM Plex Sans", fontSize: "13px", fontWeight: "500",
                }}>
                {isActive ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {isActive ? "Bot is Active" : "Bot is Inactive"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={save} disabled={saving} data-testid="save-discord-btn"
                style={{
                  flex: 1, padding: "11px 20px", backgroundColor: "#0055FF", color: "#FFFFFF",
                  border: "none", borderRadius: "4px", fontSize: "13px",
                  fontFamily: "IBM Plex Sans", fontWeight: "500", cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}>
                {saving ? "Saving..." : "Save Configuration"}
              </button>
              <button onClick={startBot} disabled={starting} data-testid="start-discord-btn"
                style={{
                  padding: "11px 20px", backgroundColor: "#1A1A1A", color: "#00FF66",
                  border: "1px solid #00FF6644", borderRadius: "4px", fontSize: "13px",
                  fontFamily: "IBM Plex Sans", fontWeight: "500", cursor: starting ? "not-allowed" : "pointer",
                  opacity: starting ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: "7px",
                }}>
                <Zap size={13} />
                {starting ? "Starting..." : "Start Bot"}
              </button>
            </div>
          </div>

          <div style={{ ...S.card, backgroundColor: "#0A0A0A", border: "1px solid #1E1E1E" }}>
            <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px" }}>How to Interact</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {["@mention the bot in any channel: @BotName your question", "Send it a direct message (DM)", "The bot uses the same knowledge base and persona as your web widget"].map((tip) => (
                <div key={tip} style={{ display: "flex", gap: "10px" }}>
                  <span style={{ color: "#0055FF", fontFamily: "JetBrains Mono", fontSize: "11px", flexShrink: 0 }}>→</span>
                  <span style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", lineHeight: "1.5" }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
