import { useState, useEffect } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Save, Eye, EyeOff, Plus, X, ExternalLink, MessageSquare, Lightbulb } from "lucide-react";

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "28px", marginBottom: "20px" },
  sectionTitle: { fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 6px" },
  sectionSub: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#A1A1AA", margin: "0 0 20px" },
  label: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#A1A1AA", marginBottom: "7px", display: "block" },
  hint: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "11px", color: "#404040", marginTop: "5px" },
  input: {
    width: "100%", backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", padding: "9px 13px", color: "#FFFFFF",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%", backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", padding: "9px 13px", color: "#FFFFFF",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", outline: "none",
    resize: "vertical", boxSizing: "border-box", lineHeight: "1.6",
  },
};

const focus = e => e.target.style.borderColor = "#0055FF";
const blur = e => e.target.style.borderColor = "#262626";

export default function BotSettings() {
  const [config, setConfig] = useState({
    name: "", persona: "", custom_instructions: "",
    tone_instructions: "", manual_tone_examples: []
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);
  const [newEx, setNewEx] = useState({ label: "", user_msg: "", bot_msg: "" });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    api.get(`/admin/bot-config`).then(r => {
      if (r.data) setConfig({
        name: r.data.name || "",
        persona: r.data.persona || "",
        custom_instructions: r.data.custom_instructions || "",
        tone_instructions: r.data.tone_instructions || "",
        manual_tone_examples: r.data.manual_tone_examples || [],
      });
    }).catch(() => {});
    api.get(`/analytics/overview`).then(r => {
      setApprovedCount(r.data?.approved_for_training ?? 0);
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!config.name.trim()) { toast.error("Bot name is required"); return; }
    if (!config.persona.trim()) { toast.error("Persona description is required"); return; }
    setSaving(true);
    try {
      await api.put(`/admin/bot-config`, config);
      toast.success("Settings saved — bot updated immediately");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  const addExample = () => {
    if (!newEx.user_msg.trim() || !newEx.bot_msg.trim()) {
      toast.error("Both user message and bot response are required");
      return;
    }
    const ex = { id: Date.now().toString(), ...newEx };
    setConfig(p => ({ ...p, manual_tone_examples: [...(p.manual_tone_examples || []), ex] }));
    setNewEx({ label: "", user_msg: "", bot_msg: "" });
    setShowAddForm(false);
    toast.success("Example added — remember to save");
  };

  const removeExample = (index) => {
    setConfig(p => ({ ...p, manual_tone_examples: p.manual_tone_examples.filter((_, i) => i !== index) }));
    toast.success("Example removed — remember to save");
  };

  const totalToneExamples = (config.manual_tone_examples?.length || 0) + approvedCount;

  const systemPromptPreview = [
    `You are ${config.name || "[Bot Name]"}. ${config.persona || "[Persona]"}`,
    `KNOWLEDGE BASE — AUTHORITATIVE SOURCE:\n[Verified knowledge snippets injected here at runtime]\n→ Bot answers these with full confidence, no hedging`,
    config.tone_instructions || config.manual_tone_examples?.length
      ? `COMMUNICATION STYLE — MATCH THIS PRECISELY\n${config.tone_instructions ? `Tone guide: ${config.tone_instructions}\n` : ""}[${config.manual_tone_examples?.length || 0} crafted examples + ${approvedCount} approved conversations injected here]`
      : null,
    config.custom_instructions ? `ADDITIONAL INSTRUCTIONS:\n${config.custom_instructions}` : null,
  ].filter(Boolean).join("\n\n");

  return (
    <div style={S.page}>
      <p style={S.overline}>Configuration</p>
      <h1 style={S.h1}>Bot Settings</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* LEFT */}
        <div>
          {/* Identity */}
          <div style={S.card}>
            <p style={S.sectionTitle}>Identity</p>
            <p style={S.sectionSub}>Define who the bot is and how it presents itself.</p>

            <div style={{ marginBottom: "18px" }}>
              <label style={S.label}>Bot Name *</label>
              <input style={S.input} value={config.name}
                onChange={e => setConfig(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Aria, SupportBot, Max" data-testid="bot-name-input"
                onFocus={focus} onBlur={blur} />
              <p style={S.hint}>How the bot introduces itself.</p>
            </div>

            <div>
              <label style={S.label}>Persona *</label>
              <textarea style={{ ...S.textarea, minHeight: "110px" }} value={config.persona}
                onChange={e => setConfig(p => ({ ...p, persona: e.target.value }))}
                placeholder="You are a helpful customer support assistant for [Company]. You have deep knowledge of our products and always maintain a professional yet approachable tone."
                data-testid="bot-persona-input" onFocus={focus} onBlur={blur} />
              <p style={S.hint}>Core personality, role, and expertise area.</p>
            </div>
          </div>

          {/* Custom Instructions */}
          <div style={S.card}>
            <p style={S.sectionTitle}>Custom Instructions</p>
            <p style={S.sectionSub}>Guardrails and rules that always apply.</p>
            <textarea style={{ ...S.textarea, minHeight: "100px" }} value={config.custom_instructions}
              onChange={e => setConfig(p => ({ ...p, custom_instructions: e.target.value }))}
              placeholder="Always respond in English. Never share pricing without directing to sales. Keep answers under 3 paragraphs. If asked about topics outside your scope, politely redirect."
              data-testid="bot-instructions-input" onFocus={focus} onBlur={blur} />
            <p style={S.hint}>These rules override everything else.</p>
          </div>

          {/* Save */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={save} disabled={saving} data-testid="save-settings-btn"
              style={{
                padding: "11px 24px", backgroundColor: saving ? "#1A1A1A" : "#0055FF",
                color: "#FFFFFF", border: "none", borderRadius: "4px",
                fontSize: "13px", fontFamily: "IBM Plex Sans", fontWeight: "500",
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "8px",
                transition: "background-color 0.15s ease",
              }}>
              <Save size={13} />
              {saving ? "Saving..." : "Save All Settings"}
            </button>
            <button onClick={() => setShowPreview(!showPreview)} data-testid="toggle-preview-btn"
              style={{
                padding: "11px 18px", backgroundColor: "#1A1A1A", color: "#A1A1AA",
                border: "1px solid #262626", borderRadius: "4px", fontSize: "13px",
                fontFamily: "IBM Plex Sans", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? "Hide Preview" : "Preview Prompt"}
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {/* Tone Training */}
          <div style={S.card}>
            <p style={S.sectionTitle}>Tone Training</p>
            <p style={S.sectionSub}>
              Teach the bot exactly how to speak — vocabulary, energy, formality, sentence length.
            </p>

            {/* Tone description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={S.label}>Tone Description</label>
              <textarea style={{ ...S.textarea, minHeight: "80px" }} value={config.tone_instructions}
                onChange={e => setConfig(p => ({ ...p, tone_instructions: e.target.value }))}
                placeholder="Be concise and direct. Use casual, friendly language. Avoid corporate jargon. Short sentences. Reply like you're talking to a smart friend, not writing a report."
                data-testid="tone-instructions-input" onFocus={focus} onBlur={blur} />
              <p style={S.hint}>Plain-English description of the desired voice. Always active.</p>
            </div>

            {/* Manual examples */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <label style={{ ...S.label, margin: 0 }}>
                  Crafted Examples
                  <span style={{ marginLeft: "8px", fontFamily: "JetBrains Mono", fontSize: "10px", color: "#404040" }}>
                    {config.manual_tone_examples?.length || 0}
                  </span>
                </label>
                <button onClick={() => setShowAddForm(!showAddForm)} data-testid="add-tone-example-btn"
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "5px 12px", backgroundColor: "#1A1A1A", border: "1px solid #262626",
                    color: "#A1A1AA", borderRadius: "4px", fontSize: "12px",
                    fontFamily: "IBM Plex Sans", cursor: "pointer",
                  }}>
                  <Plus size={11} /> Add Example
                </button>
              </div>
              <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#404040", marginBottom: "12px", marginTop: 0 }}>
                Write ideal user/bot exchanges to show Claude exactly what "good" looks like.
              </p>

              {/* Existing examples */}
              {(config.manual_tone_examples || []).map((ex, i) => (
                <div key={ex.id || i} style={{
                  backgroundColor: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "4px",
                  padding: "12px", marginBottom: "8px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {ex.label || `Example ${i + 1}`}
                    </span>
                    <button onClick={() => removeExample(i)} data-testid="remove-example-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#404040", padding: "2px", display: "flex" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#FF3B30"}
                      onMouseLeave={e => e.currentTarget.style.color = "#404040"}>
                      <X size={12} />
                    </button>
                  </div>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: "0 0 5px", lineHeight: "1.5" }}>
                    <span style={{ color: "#0055FF", fontWeight: "500" }}>User: </span>{ex.user_msg}
                  </p>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: 0, lineHeight: "1.5" }}>
                    <span style={{ color: "#00FF66", fontWeight: "500" }}>Bot: </span>{ex.bot_msg}
                  </p>
                </div>
              ))}

              {/* Add form */}
              {showAddForm && (
                <div style={{ backgroundColor: "#0A0A0A", border: "1px dashed #262626", borderRadius: "4px", padding: "14px", marginBottom: "10px" }}>
                  <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>
                    New Example Exchange
                  </p>
                  <input value={newEx.label} onChange={e => setNewEx(p => ({ ...p, label: e.target.value }))}
                    placeholder="Label (optional, e.g. 'Billing question')"
                    style={{ ...S.input, marginBottom: "8px", fontSize: "12px" }} onFocus={focus} onBlur={blur}
                    data-testid="example-label-input" />
                  <textarea value={newEx.user_msg} onChange={e => setNewEx(p => ({ ...p, user_msg: e.target.value }))}
                    placeholder="What the user asks..."
                    style={{ ...S.textarea, minHeight: "55px", marginBottom: "8px", fontSize: "12px" }} onFocus={focus} onBlur={blur}
                    data-testid="example-user-input" />
                  <textarea value={newEx.bot_msg} onChange={e => setNewEx(p => ({ ...p, bot_msg: e.target.value }))}
                    placeholder="The ideal bot response (show the exact tone you want)..."
                    style={{ ...S.textarea, minHeight: "75px", marginBottom: "10px", fontSize: "12px" }} onFocus={focus} onBlur={blur}
                    data-testid="example-bot-input" />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={addExample} data-testid="save-example-btn"
                      style={{
                        padding: "7px 16px", backgroundColor: "#0055FF", color: "#FFFFFF",
                        border: "none", borderRadius: "4px", fontSize: "12px",
                        fontFamily: "IBM Plex Sans", fontWeight: "500", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "6px",
                      }}>
                      <Plus size={11} /> Save Example
                    </button>
                    <button onClick={() => setShowAddForm(false)}
                      style={{
                        padding: "7px 14px", backgroundColor: "transparent", color: "#A1A1AA",
                        border: "1px solid #262626", borderRadius: "4px", fontSize: "12px",
                        fontFamily: "IBM Plex Sans", cursor: "pointer",
                      }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Approved conversations link */}
              <div style={{ marginTop: "12px", padding: "11px 14px", backgroundColor: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MessageSquare size={13} color="#A1A1AA" />
                  <span style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA" }}>
                    <span style={{ color: approvedCount > 0 ? "#00FF66" : "#A1A1AA", fontWeight: "500" }}>{approvedCount}</span> approved conversation{approvedCount !== 1 ? "s" : ""} also used for training
                  </span>
                </div>
                <a href="/admin/conversations" data-testid="link-to-conversations"
                  style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#0055FF", fontFamily: "IBM Plex Sans", textDecoration: "none" }}>
                  Manage <ExternalLink size={11} />
                </a>
              </div>

              <div style={{ marginTop: "8px", padding: "10px 14px", backgroundColor: "#0055FF0A", border: "1px solid #0055FF1A", borderRadius: "4px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Lightbulb size={12} color="#0055FF" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: 0, lineHeight: "1.5" }}>
                    <strong style={{ color: "#FFFFFF" }}>Total: {totalToneExamples} tone examples active.</strong>{" "}
                    The more examples you add, the more consistently the bot speaks in your voice.
                    Crafted examples take priority over approved conversations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* System Prompt Preview */}
          {showPreview && (
            <div style={S.card}>
              <p style={S.sectionTitle}>System Prompt Preview</p>
              <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", marginBottom: "14px", marginTop: "4px" }}>
                Exactly what Claude receives. Knowledge and tone examples are injected at runtime per message.
              </p>
              <pre style={{
                backgroundColor: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "4px",
                padding: "14px 16px", color: "#A1A1AA", fontFamily: "JetBrains Mono, monospace",
                fontSize: "11px", lineHeight: "1.7", whiteSpace: "pre-wrap", wordBreak: "break-word",
                margin: 0, maxHeight: "420px", overflowY: "auto"
              }}>
                {systemPromptPreview}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
