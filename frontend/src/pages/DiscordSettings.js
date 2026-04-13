import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Zap, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Radio, Hash, MessageSquare, AtSign, Link2, Server, Shield, Settings, Save, Eye, EyeOff } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

const LISTEN_MODES = [
  { key: "mention_only", icon: AtSign, label: "Mention Only", desc: "Responds when @tagged or in DMs" },
  { key: "all_channels", icon: Radio, label: "All Channels", desc: "Responds to every human message" },
  { key: "specific_channels", icon: Hash, label: "Specific Channels", desc: "Pick which channels to monitor" },
];

const REPLY_STYLES = [
  { key: "natural", icon: MessageSquare, label: "Natural reply", desc: "Replies without mentioning the user" },
  { key: "with_mention", icon: AtSign, label: "With @mention", desc: "Pings the user in the reply" },
];

const modeBtn = (active) => ({
  flex: 1, padding: "10px 12px", border: `1px solid ${active ? colors.brand.cyan : colors.border.default}`,
  borderRadius: "10px", backgroundColor: active ? "rgba(96,165,250,0.06)" : colors.bg.base,
  color: active ? colors.text.primary : colors.text.secondary, cursor: "pointer",
  fontFamily: fonts.body, fontSize: "12px", fontWeight: active ? "600" : "400",
  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px",
  transition: "all 0.2s",
});

const channelChip = (selected) => ({
  display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px",
  border: `1px solid ${selected ? colors.brand.cyan : colors.border.default}`,
  borderRadius: "10px", backgroundColor: selected ? "rgba(96,165,250,0.06)" : colors.bg.base,
  cursor: "pointer", transition: "all 0.2s",
  fontFamily: fonts.body, fontSize: "12px",
  color: selected ? colors.text.primary : colors.text.secondary,
});

function CredentialField({ label, value, onChange, placeholder, isSecret, testId, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={T.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isSecret && !show ? "password" : "text"}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} data-testid={testId}
          style={{ ...T.input, paddingRight: isSecret ? "40px" : undefined }}
          onFocus={onFocus} onBlur={onBlur}
        />
        {isSecret && (
          <button onClick={() => setShow(!show)} type="button"
            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: colors.text.muted, padding: "4px" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p style={T.hint}>{hint}</p>}
    </div>
  );
}

function AppCredentialsPanel() {
  const [creds, setCreds] = useState({ client_id: "", client_secret: "", redirect_uri: "", bot_token: "" });
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get(`/discord/app-config`).then(r => {
      setExisting(r.data);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    const payload = {};
    if (creds.client_id.trim()) payload.client_id = creds.client_id.trim();
    if (creds.client_secret.trim()) payload.client_secret = creds.client_secret.trim();
    if (creds.redirect_uri.trim()) payload.redirect_uri = creds.redirect_uri.trim();
    if (creds.bot_token.trim()) payload.bot_token = creds.bot_token.trim();
    if (Object.keys(payload).length === 0) { toast.error("No changes to save"); return; }
    setSaving(true);
    try {
      await api.put(`/discord/app-config`, payload);
      toast.success("Discord credentials updated! Restart the bot to apply changes.");
      setCreds({ client_id: "", client_secret: "", redirect_uri: "", bot_token: "" });
      const r = await api.get(`/discord/app-config`);
      setExisting(r.data);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
    finally { setSaving(false); }
  };

  const allConfigured = existing?.has_client_id && existing?.has_client_secret && existing?.has_redirect_uri && existing?.has_bot_token;

  return (
    <div style={{ ...T.card, marginBottom: "20px", borderColor: allConfigured ? "rgba(52,211,153,0.2)" : colors.border.default }}>
      <button
        onClick={() => setExpanded(!expanded)}
        data-testid="app-credentials-toggle"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(96,165,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={18} color={colors.brand.cyan} />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>Discord App Credentials</p>
            <p style={{ fontFamily: fonts.body, fontSize: "11px", color: allConfigured ? colors.brand.success : colors.text.secondary, margin: "2px 0 0" }}>
              {allConfigured ? "All credentials configured" : "Configure your Discord application details"}
            </p>
          </div>
        </div>
        <span style={{ color: colors.text.muted, fontSize: "18px", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
          &#9662;
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: `1px solid ${colors.border.subtle}` }}>
          {/* Status indicators */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
            {[
              { label: "Client ID", ok: existing?.has_client_id, display: existing?.client_id },
              { label: "Client Secret", ok: existing?.has_client_secret, display: existing?.client_secret },
              { label: "Redirect URI", ok: existing?.has_redirect_uri, display: existing?.redirect_uri },
              { label: "Bot Token", ok: existing?.has_bot_token, display: existing?.bot_token },
            ].map(({ label, ok, display }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px",
                backgroundColor: ok ? "rgba(52,211,153,0.04)" : "rgba(244,63,94,0.04)",
                border: `1px solid ${ok ? "rgba(52,211,153,0.15)" : "rgba(244,63,94,0.15)"}`,
                borderRadius: "8px",
              }}>
                {ok ? <CheckCircle size={12} color={colors.brand.success} /> : <AlertCircle size={12} color={colors.brand.error} />}
                <span style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary }}>{label}</span>
                {ok && display && <span style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.muted, marginLeft: "auto" }}>{display}</span>}
              </div>
            ))}
          </div>

          <CredentialField
            label="Client ID" value={creds.client_id} onChange={v => setCreds(p => ({ ...p, client_id: v }))}
            placeholder={existing?.client_id || "Your Discord Application Client ID"}
            testId="app-client-id" hint="From Discord Developer Portal > Your App > General Information"
          />
          <CredentialField
            label="Client Secret" value={creds.client_secret} onChange={v => setCreds(p => ({ ...p, client_secret: v }))}
            placeholder={existing?.has_client_secret ? "Current: " + existing.client_secret : "Your Discord Application Client Secret"}
            isSecret testId="app-client-secret" hint="From Discord Developer Portal > Your App > General Information"
          />
          <CredentialField
            label="Redirect URI" value={creds.redirect_uri} onChange={v => setCreds(p => ({ ...p, redirect_uri: v }))}
            placeholder={existing?.redirect_uri || window.location.origin + "/api/discord/callback"}
            testId="app-redirect-uri"
            hint={`Must match exactly in Discord Developer Portal > OAuth2 > Redirects. Suggested: ${window.location.origin}/api/discord/callback`}
          />
          <CredentialField
            label="Bot Token" value={creds.bot_token} onChange={v => setCreds(p => ({ ...p, bot_token: v }))}
            placeholder={existing?.has_bot_token ? "Current: " + existing.bot_token : "Your Discord Bot Token"}
            isSecret testId="app-bot-token" hint="From Discord Developer Portal > Your App > Bot > Reset Token"
          />

          <button onClick={handleSave} disabled={saving} data-testid="save-app-credentials-btn"
            style={{ ...T.btnPrimary, opacity: saving ? 0.6 : 1, marginTop: "4px" }}>
            <Save size={14} /> {saving ? "Saving..." : "Save Credentials"}
          </button>
          <p style={{ ...T.hint, marginTop: "8px" }}>
            Leave fields empty to keep existing values. Only filled fields are updated.
          </p>
        </div>
      )}
    </div>
  );
}

export default function DiscordSettings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [inviting, setInviting] = useState(false);
  const pollRef = useRef(null);
  const isAdmin = user?.role === "superadmin";

  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    const guild = searchParams.get("guild");
    const reason = searchParams.get("reason");
    if (oauthStatus === "success") {
      toast.success(guild ? `Bot invited to "${guild}" successfully!` : "Bot invited successfully!");
      setSearchParams({}, { replace: true });
    } else if (oauthStatus === "error") {
      toast.error(reason === "access_denied" ? "Bot invitation was cancelled." : `Failed to invite bot: ${reason || "unknown error"}`);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    loadConfig(); loadStatus();
    pollRef.current = setInterval(loadStatus, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadConfig, loadStatus]);

  const fetchChannels = async () => {
    setFetchingChannels(true);
    try {
      const res = await api.get(`/discord/channels`);
      setChannels(res.data);
      if (res.data.length === 0) toast.info("No text channels found.");
      else toast.success(`Found ${res.data.length} channel(s)`);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to fetch channels"); }
    finally { setFetchingChannels(false); }
  };

  const toggleChannel = (id) => setMonitoredChannelIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const save = async () => {
    const update = { is_active: isActive, listen_mode: listenMode, reply_style: replyStyle, monitored_channel_ids: monitoredChannelIds };
    if (token.trim()) update.bot_token = token.trim();
    setSaving(true);
    try { await api.put(`/discord/config`, update); toast.success("Discord settings saved"); setToken(""); loadConfig(); } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const syncName = async () => {
    setSyncing(true);
    try { const res = await api.post(`/discord/sync-name`); toast.success(res.data.message || "Name synced"); setTimeout(loadStatus, 2000); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed to sync name"); }
    finally { setSyncing(false); }
  };

  const startBot = async () => {
    setStarting(true);
    try { await api.post(`/discord/restart`); toast.success("Discord bot starting..."); setTimeout(loadStatus, 3000); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed to start bot"); }
    finally { setStarting(false); }
  };

  const inviteBot = async () => {
    setInviting(true);
    try {
      const res = await api.get(`/discord/oauth-url`);
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to generate invite link");
      setInviting(false);
    }
  };

  const isOnline = status.status === "online";
  const oauthEnabled = existing?.oauth_enabled;
  const oauthConnected = existing?.oauth_connected;

  const channelsByGuild = channels.reduce((acc, ch) => {
    (acc[ch.guild_name] = acc[ch.guild_name] || []).push(ch);
    return acc;
  }, {});

  return (
    <div style={T.page}>
      <p style={T.overline}>Integration</p>
      <h1 style={T.h1}>Discord Bot</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: Admin creds + Invite + Guide */}
        <div>
          {/* App Credentials (admin only) */}
          {isAdmin && <AppCredentialsPanel />}

          {/* Invite Bot Card */}
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(88,101,242,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Server size={18} color={colors.brand.discord} />
              </div>
              <div>
                <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>Connect to Discord</p>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, margin: "2px 0 0" }}>Invite the bot to your Discord server</p>
              </div>
            </div>

            {oauthConnected && existing?.guild_name && (
              <div data-testid="oauth-guild-info" style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px",
                backgroundColor: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)",
                borderRadius: "10px", marginBottom: "16px",
              }}>
                <CheckCircle size={15} color={colors.brand.success} />
                <div>
                  <p style={{ fontFamily: fonts.body, fontSize: "12px", fontWeight: "500", color: colors.brand.success, margin: 0 }}>
                    Connected to "{existing.guild_name}"
                  </p>
                  <p style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.secondary, margin: "2px 0 0" }}>
                    Guild ID: {existing.guild_id}
                  </p>
                </div>
              </div>
            )}

            {oauthEnabled ? (
              <button
                onClick={inviteBot} disabled={inviting} data-testid="invite-bot-btn"
                style={{
                  width: "100%", padding: "13px 20px", backgroundColor: colors.brand.discord,
                  color: "#FFFFFF", border: "none", borderRadius: "10px",
                  fontSize: "14px", fontFamily: fonts.body, fontWeight: "600",
                  cursor: inviting ? "not-allowed" : "pointer", opacity: inviting ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                <Link2 size={16} />
                {inviting ? "Redirecting to Discord..." : oauthConnected ? "Invite to Another Server" : "Invite Bot to Server"}
              </button>
            ) : (
              <div style={{ padding: "14px", backgroundColor: colors.bg.base, borderRadius: "10px", border: `1px solid ${colors.border.subtle}` }}>
                <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: 0 }}>
                  Discord OAuth is not configured. {isAdmin ? "Open App Credentials above to set up." : "Contact the administrator to set up the Discord Application credentials."}
                </p>
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 24px" }}>Setup Guide</p>
            {[
              { num: "01", title: "Enable Message Content Intent", desc: 'Go to the Discord Developer Portal, select your app, navigate to "Bot" settings, and enable "Message Content Intent".', link: { label: "Open Discord Developer Portal", url: "https://discord.com/developers/applications" } },
              { num: "02", title: "Invite Bot to Your Server", desc: 'Click the "Invite Bot to Server" button above. Select a server and authorize the bot.' },
              { num: "03", title: "Configure & Start", desc: "Set your preferred listen mode and reply style, toggle Active, save, then start the bot." },
            ].map(({ num, title, desc, link }) => (
              <div key={num} style={{ display: "flex", gap: "16px", marginBottom: "22px" }}>
                <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.brand.cyan, flexShrink: 0, paddingTop: "2px", minWidth: "24px" }}>{num}</span>
                <div>
                  <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: "500", color: colors.text.primary, margin: "0 0 4px" }}>{title}</p>
                  <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: "0 0 6px", lineHeight: "1.6" }}>{desc}</p>
                  {link && <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: colors.brand.cyan, fontFamily: fonts.body, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>{link.label} <ExternalLink size={11} /></a>}
                </div>
              </div>
            ))}
          </div>

          {/* Manual Token (fallback) */}
          {!oauthConnected && (
            <div style={{ ...T.card, opacity: 0.85 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Shield size={14} color={colors.text.muted} />
                <p style={{ fontFamily: fonts.heading, fontSize: "13px", fontWeight: "600", color: colors.text.secondary, margin: 0 }}>Manual Setup (Advanced)</p>
              </div>
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.muted, margin: "0 0 12px", lineHeight: "1.6" }}>
                If you prefer, you can paste your bot token directly instead of using the invite button.
              </p>
              <input type="password" value={token} onChange={e => setToken(e.target.value)}
                placeholder={existing?.bot_token_display ? `Current: ${existing.bot_token_display}` : "Paste your Discord bot token..."}
                data-testid="discord-token-input" style={T.input} onFocus={onFocus} onBlur={onBlur} />
              <p style={T.hint}>Leave empty to keep existing token.</p>
            </div>
          )}
        </div>

        {/* Right: Config */}
        <div>
          {/* Status */}
          <div style={{ ...T.card, borderColor: isOnline ? "rgba(52,211,153,0.3)" : colors.border.default, marginBottom: "20px" }}>
            <p style={{ ...T.monoLabel, marginBottom: "12px", fontSize: "10px" }}>Bot Status</p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: isOnline ? colors.brand.success : colors.text.muted, boxShadow: isOnline ? `0 0 12px ${colors.brand.success}` : "none", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: "700", color: colors.text.primary, margin: 0 }}>{isOnline ? "Online" : "Offline"}</p>
                {status.bot_name && <p style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary, margin: "2px 0 0" }}>{status.bot_name}</p>}
              </div>
              <button onClick={loadStatus} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: colors.text.secondary }}><RefreshCw size={14} /></button>
            </div>
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${colors.border.subtle}` }}>
              <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: "0 0 10px" }}>
                Bot name is set in <strong style={{ color: colors.text.primary }}>Bot Settings</strong>. Sync it to Discord here.
              </p>
              <button onClick={syncName} disabled={syncing} data-testid="sync-name-btn"
                style={{ ...T.btnGhost, opacity: syncing ? 0.6 : 1 }}>
                <RefreshCw size={11} /> {syncing ? "Syncing..." : "Sync Name to Discord"}
              </button>
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 20px" }}>Configuration</p>
            <div style={{ marginBottom: "20px" }}>
              <label style={T.label}>Bot Active</label>
              <button onClick={() => setIsActive(!isActive)} data-testid="discord-active-toggle"
                style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
                  backgroundColor: isActive ? "rgba(52,211,153,0.06)" : colors.bg.panel,
                  border: `1px solid ${isActive ? "rgba(52,211,153,0.3)" : colors.border.default}`,
                  borderRadius: "10px", cursor: "pointer",
                  color: isActive ? colors.brand.success : colors.text.secondary,
                  fontFamily: fonts.body, fontSize: "13px", fontWeight: "500", transition: "all 0.2s",
                }}>
                {isActive ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          {/* Listen Mode */}
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 16px" }}>Listen Mode</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: listenMode === "specific_channels" ? "20px" : "0" }}>
              {LISTEN_MODES.map(({ key, icon: Icon, label, desc }) => (
                <button key={key} onClick={() => setListenMode(key)} data-testid={`listen-mode-${key}`} style={modeBtn(listenMode === key)}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Icon size={12} />{label}</span>
                  <span style={{ fontSize: "10px", color: colors.text.secondary, fontFamily: fonts.body }}>{desc}</span>
                </button>
              ))}
            </div>

            {listenMode === "specific_channels" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <label style={{ ...T.label, margin: 0 }}>Select Channels to Monitor</label>
                  <button onClick={fetchChannels} disabled={fetchingChannels} data-testid="fetch-channels-btn" style={T.btnGhost}>
                    <RefreshCw size={11} className={fetchingChannels ? "animate-spin" : ""} />
                    {fetchingChannels ? "Fetching..." : "Fetch Channels"}
                  </button>
                </div>
                {channels.length === 0 && (
                  <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, padding: "16px", backgroundColor: colors.bg.base, borderRadius: "10px", border: `1px solid ${colors.border.subtle}`, margin: 0 }}>
                    Click "Fetch Channels" to load channels from your Discord server.
                    {monitoredChannelIds.length > 0 && ` (${monitoredChannelIds.length} saved)`}
                  </p>
                )}
                {Object.entries(channelsByGuild).map(([guildName, guildChannels]) => (
                  <div key={guildName} style={{ marginBottom: "12px" }}>
                    <p style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.secondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{guildName}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {guildChannels.map(ch => (
                        <button key={ch.id} onClick={() => toggleChannel(ch.id)} data-testid={`channel-${ch.id}`} style={channelChip(monitoredChannelIds.includes(ch.id))}>
                          <Hash size={11} /> {ch.name}
                          {monitoredChannelIds.includes(ch.id) && <CheckCircle size={10} color={colors.brand.success} />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {monitoredChannelIds.length > 0 && (
                  <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.brand.cyan, marginTop: "8px" }}>
                    {monitoredChannelIds.length} channel{monitoredChannelIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reply Style */}
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 16px" }}>Reply Style</p>
            <div style={{ display: "flex", gap: "8px" }}>
              {REPLY_STYLES.map(({ key, icon: Icon, label, desc }) => (
                <button key={key} onClick={() => setReplyStyle(key)} data-testid={`reply-style-${key}`} style={modeBtn(replyStyle === key)}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Icon size={12} />{label}</span>
                  <span style={{ fontSize: "10px", color: colors.text.secondary, fontFamily: fonts.body }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save + Start */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={save} disabled={saving} data-testid="save-discord-btn"
              style={{ ...T.btnPrimary, flex: 1, justifyContent: "center", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save Configuration"}
            </button>
            <button onClick={startBot} disabled={starting} data-testid="start-discord-btn"
              style={{
                padding: "11px 20px", backgroundColor: colors.bg.panel,
                color: colors.brand.success, border: `1px solid rgba(52,211,153,0.3)`,
                borderRadius: "10px", fontSize: "13px", fontFamily: fonts.body, fontWeight: "500",
                cursor: starting ? "not-allowed" : "pointer", opacity: starting ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: "7px", transition: "all 0.2s",
              }}>
              <Zap size={13} /> {starting ? "Starting..." : "Start Bot"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
