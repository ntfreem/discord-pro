import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Zap, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Radio, Hash, MessageSquare, AtSign } from "lucide-react";

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "28px", marginBottom: "20px" },
  label: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#A1A1AA", marginBottom: "8px", display: "block" },
  sectionLabel: { fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px", display: "block" },
  input: {
    width: "100%", backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", padding: "10px 14px", color: "#FFFFFF",
    fontFamily: "JetBrains Mono, monospace", fontSize: "13px", outline: "none",
    boxSizing: "border-box",
  },
  modeBtn: (active) => ({
    flex: 1, padding: "10px 12px", border: `1px solid ${active ? "#0055FF" : "#262626"}`,
    borderRadius: "4px", backgroundColor: active ? "#0055FF18" : "#0A0A0A",
    color: active ? "#FFFFFF" : "#A1A1AA", cursor: "pointer",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px", fontWeight: active ? "600" : "400",
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px",
    transition: "all 0.15s",
  }),
  channelChip: (selected) => ({
    display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px",
    border: `1px solid ${selected ? "#0055FF" : "#262626"}`,
    borderRadius: "4px", backgroundColor: selected ? "#0055FF18" : "#0A0A0A",
    cursor: "pointer", transition: "all 0.12s",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px",
    color: selected ? "#FFFFFF" : "#A1A1AA",
  }),
};

const LISTEN_MODES = [
  { key: "mention_only", icon: AtSign, label: "Mention Only", desc: "Responds when @tagged or in DMs" },
  { key: "all_channels", icon: Radio, label: "All Channels", desc: "Responds to every human message" },
  { key: "specific_channels", icon: Hash, label: "Specific Channels", desc: "Pick which channels to monitor" },
];

const REPLY_STYLES = [
  { key: "natural", icon: MessageSquare, label: "Natural reply", desc: "Replies without mentioning the user" },
  { key: "with_mention", icon: AtSign, label: "With @mention", desc: "Pings the user in the reply" },
];

const steps = [
  { num: "01", title: "Create a Discord Application", desc: "Go to the Discord Developer Portal and create a new application.", link: { label: "Open Discord Developer Portal", url: "https://discord.com/developers/applications" } },
  { num: "02", title: "Add a Bot", desc: 'Navigate to the "Bot" section and click "Add Bot".' },
  { num: "03", title: "Enable Message Content Intent", desc: 'Under Bot settings → Privileged Gateway Intents, enable "Message Content Intent".' },
  { num: "04", title: "Copy Your Bot Token", desc: 'Click "Reset Token" and paste it into the field below. Keep this secret!' },
  { num: "05", title: "Invite Bot to Your Server", desc: "Go to OAuth2 → URL Generator, select \"bot\" scope, add Send Messages + Read Message History permissions." },
  { num: "06", title: "Activate & Start", desc: "Configure listen mode below, toggle Active, save, then start the bot." },
];

export default function DiscordSettings() {
  const [token, setToken] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [listenMode, setListenMode] = useState("mention_only");
  const [replyStyle, setReplyStyle] = useState("natural");
  const [monitoredChannelIds, setMonitoredChannelIds] = useState([]);
  const [existing, setExisting] = useState(null);
  const [status, setStatus] = useState({ status: "offline", bot_name: null });
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [channels, setChannels] = useState([]);
  const [fetchingChannels, setFetchingChannels] = useState(false);
  const pollRef = useRef(null);

  const loadConfig = useCallback(() => {
    api.get(`/discord/config`).then(r => {
      setExisting(r.data);
      setIsActive(r.data?.is_active || false);
      setListenMode(r.data?.listen_mode || "mention_only");
      setReplyStyle(r.data?.reply_style || "natural");
      setMonitoredChannelIds(r.data?.monitored_channel_ids || []);
    }).catch(() => {});
  }, []);

  const loadStatus = useCallback(() => {
    api.get(`/discord/status`).then(r => setStatus(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadConfig();
    loadStatus();
    pollRef.current = setInterval(loadStatus, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadConfig, loadStatus]);

  const fetchChannels = async () => {
    setFetchingChannels(true);
    try {
      const res = await api.get(`/discord/channels`);
      setChannels(res.data);
      if (res.data.length === 0) toast.info("No text channels found. Make sure the bot is in your server.");
      else toast.success(`Found ${res.data.length} channel(s)`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to fetch channels");
    } finally {
      setFetchingChannels(false);
    }
  };

  const toggleChannel = (id) => {
    setMonitoredChannelIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const save = async () => {
    const update = { is_active: isActive, listen_mode: listenMode, reply_style: replyStyle, monitored_channel_ids: monitoredChannelIds };
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

  const syncName = async () => {
    setSyncing(true);
    try {
      const res = await api.post(`/discord/sync-name`);
      toast.success(res.data.message || "Name synced to Discord");
      setTimeout(loadStatus, 2000);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to sync name");
    } finally {
      setSyncing(false);
    }
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

  // Group channels by guild for the picker
  const channelsByGuild = channels.reduce((acc, ch) => {
    (acc[ch.guild_name] = acc[ch.guild_name] || []).push(ch);
    return acc;
  }, {});

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
              <div key={num} style={{ display: "flex", gap: "16px", marginBottom: "22px" }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", flexShrink: 0, paddingTop: "2px", minWidth: "24px" }}>{num}</span>
                <div>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", fontWeight: "500", color: "#FFFFFF", margin: "0 0 4px" }}>{title}</p>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: "0 0 6px", lineHeight: "1.6" }}>{desc}</p>
                  {link && <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#0055FF", fontFamily: "IBM Plex Sans", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>{link.label} <ExternalLink size={11} /></a>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Config */}
        <div>
          {/* Status */}
          <div style={{ ...S.card, borderColor: isOnline ? "#00FF6630" : "#262626" }}>
            <p style={S.sectionLabel}>Bot Status</p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: isOnline ? "#00FF66" : "#404040", boxShadow: isOnline ? "0 0 8px #00FF66" : "none", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "Chivo", fontSize: "18px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>{isOnline ? "Online" : "Offline"}</p>
                {status.bot_name && <p style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", margin: "2px 0 0" }}>{status.bot_name}</p>}
              </div>
              <button onClick={loadStatus} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#A1A1AA" }}><RefreshCw size={14} /></button>
            </div>
            {/* Sync name button */}
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #1E1E1E" }}>
              <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: "0 0 10px" }}>
                Bot name is set in <strong style={{ color: "#FFFFFF" }}>Bot Settings → Name</strong>. Sync it to Discord here.
              </p>
              <button onClick={syncName} disabled={syncing} data-testid="sync-name-btn"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", backgroundColor: "#0A0A0A", border: "1px solid #262626", borderRadius: "4px", color: "#A1A1AA", fontFamily: "IBM Plex Sans", fontSize: "12px", cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.6 : 1 }}>
                <RefreshCw size={11} />
                {syncing ? "Syncing..." : "Sync Name to Discord"}
              </button>
            </div>
          </div>

          {/* Token + Active */}
          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 20px" }}>Configuration</p>

            <div style={{ marginBottom: "20px" }}>
              <label style={S.label}>Bot Token</label>
              <input type="password" value={token} onChange={e => setToken(e.target.value)}
                placeholder={existing?.bot_token_display ? `Current: ${existing.bot_token_display}` : "Paste your Discord bot token..."}
                data-testid="discord-token-input" style={S.input}
                onFocus={e => e.target.style.borderColor = "#0055FF"}
                onBlur={e => e.target.style.borderColor = "#262626"} />
              <p style={{ fontFamily: "IBM Plex Sans", fontSize: "11px", color: "#404040", marginTop: "6px" }}>Leave empty to keep existing token.</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={S.label}>Bot Active</label>
              <button onClick={() => setIsActive(!isActive)} data-testid="discord-active-toggle"
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", backgroundColor: isActive ? "#00FF6618" : "#1A1A1A", border: `1px solid ${isActive ? "#00FF6644" : "#262626"}`, borderRadius: "4px", cursor: "pointer", color: isActive ? "#00FF66" : "#A1A1AA", fontFamily: "IBM Plex Sans", fontSize: "13px", fontWeight: "500" }}>
                {isActive ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          {/* Listen Mode */}
          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 16px" }}>Listen Mode</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: listenMode === "specific_channels" ? "20px" : "0" }}>
              {LISTEN_MODES.map(({ key, icon: Icon, label, desc }) => (
                <button key={key} onClick={() => setListenMode(key)} data-testid={`listen-mode-${key}`}
                  style={S.modeBtn(listenMode === key)}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Icon size={12} />{label}
                  </span>
                  <span style={{ fontSize: "10px", color: "#A1A1AA", fontFamily: "IBM Plex Sans" }}>{desc}</span>
                </button>
              ))}
            </div>

            {/* Channel picker — shown only for specific_channels */}
            {listenMode === "specific_channels" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <label style={{ ...S.label, margin: 0 }}>Select Channels to Monitor</label>
                  <button onClick={fetchChannels} disabled={fetchingChannels} data-testid="fetch-channels-btn"
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", backgroundColor: "#0A0A0A", border: "1px solid #262626", borderRadius: "4px", color: "#A1A1AA", fontFamily: "IBM Plex Sans", fontSize: "12px", cursor: "pointer" }}>
                    <RefreshCw size={11} className={fetchingChannels ? "animate-spin" : ""} />
                    {fetchingChannels ? "Fetching..." : "Fetch Channels"}
                  </button>
                </div>

                {channels.length === 0 && (
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", padding: "16px", backgroundColor: "#0A0A0A", borderRadius: "4px", border: "1px solid #1E1E1E", margin: 0 }}>
                    Click "Fetch Channels" to load channels from your Discord server.
                    {monitoredChannelIds.length > 0 && ` (${monitoredChannelIds.length} saved)`}
                  </p>
                )}

                {Object.entries(channelsByGuild).map(([guildName, guildChannels]) => (
                  <div key={guildName} style={{ marginBottom: "12px" }}>
                    <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{guildName}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {guildChannels.map(ch => (
                        <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                          data-testid={`channel-${ch.id}`}
                          style={S.channelChip(monitoredChannelIds.includes(ch.id))}>
                          <Hash size={11} />
                          {ch.name}
                          {monitoredChannelIds.includes(ch.id) && <CheckCircle size={10} color="#00FF66" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {monitoredChannelIds.length > 0 && (
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "11px", color: "#0055FF", marginTop: "8px" }}>
                    {monitoredChannelIds.length} channel{monitoredChannelIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reply Style */}
          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 16px" }}>Reply Style</p>
            <div style={{ display: "flex", gap: "8px" }}>
              {REPLY_STYLES.map(({ key, icon: Icon, label, desc }) => (
                <button key={key} onClick={() => setReplyStyle(key)} data-testid={`reply-style-${key}`}
                  style={{ ...S.modeBtn(replyStyle === key), flex: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Icon size={12} />{label}
                  </span>
                  <span style={{ fontSize: "10px", color: "#A1A1AA", fontFamily: "IBM Plex Sans" }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save + Start */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={save} disabled={saving} data-testid="save-discord-btn"
              style={{ flex: 1, padding: "11px 20px", backgroundColor: "#0055FF", color: "#FFFFFF", border: "none", borderRadius: "4px", fontSize: "13px", fontFamily: "IBM Plex Sans", fontWeight: "500", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save Configuration"}
            </button>
            <button onClick={startBot} disabled={starting} data-testid="start-discord-btn"
              style={{ padding: "11px 20px", backgroundColor: "#1A1A1A", color: "#00FF66", border: "1px solid #00FF6644", borderRadius: "4px", fontSize: "13px", fontFamily: "IBM Plex Sans", fontWeight: "500", cursor: starting ? "not-allowed" : "pointer", opacity: starting ? 0.6 : 1, display: "flex", alignItems: "center", gap: "7px" }}>
              <Zap size={13} />
              {starting ? "Starting..." : "Start Bot"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

