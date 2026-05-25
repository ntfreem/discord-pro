import { useState, useEffect } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import {
  Settings, CheckCircle, AlertCircle, Eye, EyeOff, Save, Trash2,
  ExternalLink, Copy, Clock, AlertTriangle, BookOpen, Server,
} from "lucide-react";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

function CredentialField({ label, value, onChange, placeholder, isSecret, testId, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={T.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isSecret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={testId}
          style={{ ...T.input, paddingRight: isSecret ? "40px" : undefined }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {isSecret && (
          <button
            onClick={() => setShow(!show)}
            type="button"
            style={{
              position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: colors.text.muted, padding: "4px",
            }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p style={T.hint}>{hint}</p>}
    </div>
  );
}

function StepCard({ step, title, children }) {
  return (
    <div style={{ display: "flex", gap: "14px", marginBottom: "18px" }}>
      <div
        style={{
          flexShrink: 0,
          width: "28px", height: "28px",
          borderRadius: "50%",
          backgroundColor: "rgba(96,165,250,0.12)",
          border: `1px solid ${colors.brand.light}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: fonts.mono, fontSize: "11px", fontWeight: "600",
          color: colors.brand.light,
        }}
      >
        {step}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: fonts.heading, fontSize: "13px", fontWeight: "600", color: colors.text.primary, margin: "0 0 6px" }}>
          {title}
        </p>
        <div style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, lineHeight: "1.6" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ ok, label, display }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 14px",
        backgroundColor: ok ? "rgba(52,211,153,0.04)" : "rgba(244,63,94,0.04)",
        border: `1px solid ${ok ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}`,
        borderRadius: "10px",
      }}
    >
      {ok ? <CheckCircle size={14} color={colors.brand.success} /> : <AlertCircle size={14} color={colors.brand.error} />}
      <span style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary }}>{label}</span>
      {ok && display && (
        <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.muted, marginLeft: "auto" }}>
          {display}
        </span>
      )}
      {!ok && (
        <span style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.brand.error, marginLeft: "auto" }}>
          Not set
        </span>
      )}
    </div>
  );
}

export default function DiscordAppSetup() {
  const [existing, setExisting] = useState(null);
  const [creds, setCreds] = useState({ client_id: "", client_secret: "", redirect_uri: "", bot_token: "" });
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [clearConnections, setClearConnections] = useState(false);
  const [clearing, setClearing] = useState(false);

  const suggestedRedirect = `${window.location.origin}/api/discord/callback`;

  const loadConfig = async () => {
    try {
      const r = await api.get(`/discord/app-config`);
      setExisting(r.data);
    } catch (e) {
      // ignore — page still renders the setup guide
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    const payload = {};
    if (creds.client_id.trim()) payload.client_id = creds.client_id.trim();
    if (creds.client_secret.trim()) payload.client_secret = creds.client_secret.trim();
    if (creds.redirect_uri.trim()) payload.redirect_uri = creds.redirect_uri.trim();
    if (creds.bot_token.trim()) payload.bot_token = creds.bot_token.trim();
    if (Object.keys(payload).length === 0) {
      toast.error("No changes to save");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/discord/app-config`, payload);
      toast.success("Discord credentials saved. Bot will restart with new values.");
      setCreds({ client_id: "", client_secret: "", redirect_uri: "", bot_token: "" });
      await loadConfig();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openConfirm = async () => {
    setShowConfirm(true);
    setLoadingConnections(true);
    setClearConnections(false);
    try {
      const r = await api.get(`/discord/app-config/connections`);
      setConnections(r.data.connections || []);
    } catch (e) {
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const r = await api.delete(`/discord/app-config`, { params: { clear_connections: clearConnections } });
      toast.success(
        clearConnections
          ? `App credentials cleared. ${r.data.connections_cleared || 0} instance mapping(s) reset.`
          : "App credentials cleared. Instance mappings preserved."
      );
      setShowConfirm(false);
      await loadConfig();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to clear");
    } finally {
      setClearing(false);
    }
  };

  const copyRedirect = () => {
    navigator.clipboard.writeText(suggestedRedirect);
    toast.success("Redirect URI copied to clipboard");
  };

  const allConfigured =
    existing?.has_client_id && existing?.has_client_secret && existing?.has_redirect_uri && existing?.has_bot_token;

  const updatedDisplay = existing?.updated_at
    ? new Date(existing.updated_at).toLocaleString()
    : "Never";

  return (
    <div style={T.page} data-testid="discord-app-setup-page">
      <p style={T.overline}>Platform Settings</p>
      <h1 style={T.h1}>Discord App Setup</h1>
      <p style={{ ...T.subtitle, marginBottom: "32px", maxWidth: "720px" }}>
        Configure the global Discord application that powers every bot instance on this platform. You only need to do this once.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
        {/* LEFT: Current Config + Update Form + Danger Zone */}
        <div>
          {/* Current Configuration */}
          <div style={{ ...T.card, marginBottom: "20px", borderColor: allConfigured ? "rgba(52,211,153,0.25)" : colors.border.default }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div
                style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  backgroundColor: allConfigured ? "rgba(52,211,153,0.1)" : "rgba(96,165,250,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Settings size={18} color={allConfigured ? colors.brand.success : colors.brand.light} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
                  Current Configuration
                </p>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: allConfigured ? colors.brand.success : colors.text.secondary, margin: "2px 0 0" }}>
                  {allConfigured ? "All credentials configured" : "Some credentials are missing"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: colors.text.muted, fontFamily: fonts.mono, fontSize: "10px" }}>
                <Clock size={11} /> {updatedDisplay}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <StatusBadge ok={existing?.has_client_id} label="Client ID" display={existing?.client_id} />
              <StatusBadge ok={existing?.has_client_secret} label="Client Secret" display={existing?.client_secret} />
              <StatusBadge ok={existing?.has_redirect_uri} label="Redirect URI" display={existing?.redirect_uri} />
              <StatusBadge ok={existing?.has_bot_token} label="Bot Token" display={existing?.bot_token} />
            </div>
          </div>

          {/* Update Form */}
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: "0 0 4px" }}>
              Update Credentials
            </p>
            <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: "0 0 18px" }}>
              Paste values from your Discord Developer Portal. Leave blank to keep existing values.
            </p>

            <CredentialField
              label="Client ID"
              value={creds.client_id}
              onChange={(v) => setCreds((p) => ({ ...p, client_id: v }))}
              placeholder={existing?.client_id || "Your Discord Application Client ID"}
              testId="setup-client-id"
              hint="Developer Portal → Your App → General Information"
            />
            <CredentialField
              label="Client Secret"
              value={creds.client_secret}
              onChange={(v) => setCreds((p) => ({ ...p, client_secret: v }))}
              placeholder={existing?.has_client_secret ? "Current: " + existing.client_secret : "Your Discord Application Client Secret"}
              isSecret
              testId="setup-client-secret"
              hint="Developer Portal → Your App → OAuth2 → Reset Secret"
            />
            <CredentialField
              label="Redirect URI"
              value={creds.redirect_uri}
              onChange={(v) => setCreds((p) => ({ ...p, redirect_uri: v }))}
              placeholder={existing?.redirect_uri || suggestedRedirect}
              testId="setup-redirect-uri"
              hint={`Must match exactly in Discord Developer Portal → OAuth2 → Redirects`}
            />
            <CredentialField
              label="Bot Token"
              value={creds.bot_token}
              onChange={(v) => setCreds((p) => ({ ...p, bot_token: v }))}
              placeholder={existing?.has_bot_token ? "Current: " + existing.bot_token : "Your Discord Bot Token"}
              isSecret
              testId="setup-bot-token"
              hint="Developer Portal → Your App → Bot → Reset Token"
            />

            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="setup-save-btn"
              style={{ ...T.btnPrimary, opacity: saving ? 0.6 : 1, marginTop: "4px" }}
            >
              <Save size={14} /> {saving ? "Saving..." : "Save Credentials"}
            </button>
          </div>

          {/* Danger Zone */}
          <div
            style={{
              ...T.card,
              marginBottom: "20px",
              borderColor: "rgba(244,63,94,0.3)",
              backgroundColor: "rgba(244,63,94,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  backgroundColor: "rgba(244,63,94,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <AlertTriangle size={18} color={colors.brand.error} />
              </div>
              <div>
                <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
                  Danger Zone
                </p>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, margin: "2px 0 0" }}>
                  Clear all Discord App credentials
                </p>
              </div>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, lineHeight: "1.6", margin: "0 0 16px" }}>
              This removes the saved Client ID, Client Secret, Redirect URI, and Bot Token. The bot will go offline immediately.
              You'll need to reconfigure the app (and possibly re-invite the bot to each Discord server) before instances can send replies again.
            </p>
            <button
              onClick={openConfirm}
              disabled={!existing?.has_client_id && !existing?.has_bot_token}
              data-testid="setup-clear-btn"
              style={{
                padding: "10px 16px",
                backgroundColor: "rgba(244,63,94,0.08)",
                color: colors.brand.error,
                border: `1px solid rgba(244,63,94,0.3)`,
                borderRadius: "10px",
                fontFamily: fonts.body, fontSize: "12px", fontWeight: "600",
                cursor: (!existing?.has_client_id && !existing?.has_bot_token) ? "not-allowed" : "pointer",
                opacity: (!existing?.has_client_id && !existing?.has_bot_token) ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: "6px",
                transition: "all 0.2s",
              }}
            >
              <Trash2 size={14} /> Clear All Discord App Settings
            </button>
          </div>
        </div>

        {/* RIGHT: Setup Guide */}
        <div>
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div
                style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  backgroundColor: "rgba(96,165,250,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <BookOpen size={18} color={colors.brand.light} />
              </div>
              <div>
                <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
                  Developer Portal Setup Guide
                </p>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, margin: "2px 0 0" }}>
                  One-time setup for the global Discord app
                </p>
              </div>
            </div>

            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noreferrer"
              data-testid="open-dev-portal-link"
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 14px", marginBottom: "20px",
                backgroundColor: "rgba(88,101,242,0.1)",
                border: `1px solid rgba(88,101,242,0.25)`,
                borderRadius: "10px",
                textDecoration: "none",
                color: colors.brand.discord,
                fontFamily: fonts.body, fontSize: "12px", fontWeight: "600",
              }}
            >
              <ExternalLink size={14} /> Open Discord Developer Portal
            </a>

            <StepCard step="1" title="Create the Application">
              On the Developer Portal, click <b>New Application</b>, name it (e.g. "BridgeBot"), and accept the terms.
            </StepCard>

            <StepCard step="2" title="Set App Branding">
              Under <b>General Information</b>, upload an icon and add a short description. This is what users see on the
              invite screen.
            </StepCard>

            <StepCard step="3" title="Create the Bot User">
              Open the <b>Bot</b> tab → click <b>Reset Token</b> and copy it. Enable all three Privileged Gateway Intents:
              <b> Presence</b>, <b>Server Members</b>, <b>Message Content</b>. Save changes.
            </StepCard>

            <StepCard step="4" title="Copy OAuth2 Credentials">
              Open the <b>OAuth2</b> tab → copy <b>Client ID</b>, then click <b>Reset Secret</b> and copy it. You'll paste both
              in the form on the left.
            </StepCard>

            <StepCard step="5" title="Add Redirect URI">
              In <b>OAuth2 → Redirects</b>, click <b>Add Redirect</b> and paste:
              <div
                style={{
                  marginTop: "8px",
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 10px",
                  backgroundColor: colors.bg.base,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: "8px",
                }}
              >
                <code style={{ flex: 1, fontFamily: fonts.mono, fontSize: "11px", color: colors.text.primary, wordBreak: "break-all" }}>
                  {suggestedRedirect}
                </code>
                <button
                  onClick={copyRedirect}
                  data-testid="copy-redirect-btn"
                  type="button"
                  style={{
                    background: "none", border: `1px solid ${colors.border.default}`,
                    color: colors.text.secondary, padding: "4px 8px",
                    borderRadius: "6px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "4px",
                    fontFamily: fonts.body, fontSize: "10px",
                  }}
                >
                  <Copy size={11} /> Copy
                </button>
              </div>
              <p style={{ marginTop: "6px", marginBottom: 0, fontSize: "11px", color: colors.text.muted }}>
                Must match exactly — including <code>https://</code>, no trailing slash.
              </p>
            </StepCard>

            <StepCard step="6" title="Paste Credentials Here">
              Paste the four values into the <b>Update Credentials</b> form on the left and click <b>Save</b>.
            </StepCard>

            <StepCard step="7" title="Invite the Bot">
              Go to <b>Discord → Discord Bot</b> in the sidebar, switch to the instance you want, and click
              <b> Invite Bot to Server</b>.
            </StepCard>
          </div>

          {/* How Mappings Work */}
          <div style={{ ...T.card }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  backgroundColor: "rgba(96,165,250,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Server size={18} color={colors.brand.light} />
              </div>
              <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
                How the mapping works
              </p>
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, lineHeight: "1.8" }}>
              <li><b>1 Discord App</b> → produces a single bot identity (name, avatar, token).</li>
              <li>The backend uses <b>one WebSocket</b> to Discord with that bot token.</li>
              <li>Each <b>bot instance</b> is mapped to <b>1 Discord server</b> via its <code>guild_id</code>.</li>
              <li>Incoming messages are routed by <code>guild_id</code> → instance → its knowledge base and persona.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div
          onClick={() => !clearing && setShowConfirm(false)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            data-testid="clear-confirm-dialog"
            style={{
              backgroundColor: colors.bg.surface,
              border: `1px solid rgba(244,63,94,0.3)`,
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "520px", width: "100%",
              maxHeight: "80vh", overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <AlertTriangle size={22} color={colors.brand.error} />
              <p style={{ fontFamily: fonts.heading, fontSize: "16px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
                Clear Discord App Settings?
              </p>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.text.secondary, lineHeight: "1.6", margin: "0 0 16px" }}>
              This will permanently remove the saved Client ID, Client Secret, Redirect URI, and Bot Token. The bot will go offline immediately.
            </p>

            <div
              style={{
                padding: "12px 14px", borderRadius: "10px",
                backgroundColor: "rgba(251,191,36,0.06)",
                border: "1px solid rgba(251,191,36,0.2)",
                marginBottom: "16px",
              }}
            >
              <p style={{ fontFamily: fonts.body, fontSize: "12px", fontWeight: "600", color: colors.brand.warning, margin: "0 0 8px" }}>
                Currently connected instances ({loadingConnections ? "…" : connections.length})
              </p>
              {loadingConnections ? (
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.muted, margin: 0 }}>Loading…</p>
              ) : connections.length === 0 ? (
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.muted, margin: 0 }}>
                  No active instance ↔ server mappings.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "16px", fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, lineHeight: "1.7" }}>
                  {connections.map((c) => (
                    <li key={c.instance_id + c.guild_id} data-testid="connection-row">
                      <b>{c.instance_name}</b> → {c.guild_name || c.guild_id}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label
              style={{
                display: "flex", alignItems: "flex-start", gap: "8px",
                padding: "10px 12px",
                backgroundColor: clearConnections ? "rgba(244,63,94,0.05)" : colors.bg.base,
                border: `1px solid ${clearConnections ? "rgba(244,63,94,0.25)" : colors.border.default}`,
                borderRadius: "10px",
                cursor: "pointer",
                marginBottom: "20px",
              }}
            >
              <input
                type="checkbox"
                checked={clearConnections}
                onChange={(e) => setClearConnections(e.target.checked)}
                data-testid="clear-connections-checkbox"
                style={{ marginTop: "3px", accentColor: colors.brand.error }}
              />
              <div>
                <p style={{ fontFamily: fonts.body, fontSize: "12px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
                  Also reset all instance ↔ server mappings
                </p>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.secondary, margin: "4px 0 0", lineHeight: "1.5" }}>
                  Recommended when switching to a brand-new Discord app. Each instance will need to re-invite the new bot.
                </p>
              </div>
            </label>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={clearing}
                data-testid="clear-cancel-btn"
                style={{
                  padding: "10px 18px",
                  backgroundColor: "transparent",
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: "10px",
                  fontFamily: fonts.body, fontSize: "12px", fontWeight: "600",
                  cursor: clearing ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                data-testid="clear-confirm-btn"
                style={{
                  padding: "10px 18px",
                  backgroundColor: colors.brand.error,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  fontFamily: fonts.body, fontSize: "12px", fontWeight: "600",
                  cursor: clearing ? "not-allowed" : "pointer",
                  opacity: clearing ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <Trash2 size={13} /> {clearing ? "Clearing…" : "Yes, Clear Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
