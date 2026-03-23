import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Save, Eye, EyeOff } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "28px", marginBottom: "24px" },
  label: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#A1A1AA", marginBottom: "8px", display: "block" },
  hint: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "11px", color: "#404040", marginTop: "6px" },
  input: {
    width: "100%", backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", padding: "10px 14px", color: "#FFFFFF",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px", outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%", backgroundColor: "#0A0A0A", border: "1px solid #262626",
    borderRadius: "4px", padding: "10px 14px", color: "#FFFFFF",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px", outline: "none",
    resize: "vertical", minHeight: "120px", boxSizing: "border-box", lineHeight: "1.6",
  },
};

export default function BotSettings() {
  const [config, setConfig] = useState({ name: "", persona: "", custom_instructions: "" });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/bot-config`).then(r => {
      if (r.data) setConfig({
        name: r.data.name || "",
        persona: r.data.persona || "",
        custom_instructions: r.data.custom_instructions || "",
      });
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!config.name.trim()) { toast.error("Bot name is required"); return; }
    if (!config.persona.trim()) { toast.error("Persona description is required"); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/admin/bot-config`, config);
      toast.success("Bot settings saved successfully");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  const systemPromptPreview = `You are ${config.name || "[Bot Name]"}. ${config.persona || "[Persona not set]"}${config.custom_instructions ? `\n\nADDITIONAL INSTRUCTIONS:\n${config.custom_instructions}` : ""}

KNOWLEDGE BASE (injected automatically at runtime):
[Relevant knowledge snippets will appear here based on user's question]

COMMUNICATION STYLE (from approved training examples):
[Approved conversation examples will appear here]`;

  return (
    <div style={S.page}>
      <p style={S.overline}>Configuration</p>
      <h1 style={S.h1}>Bot Settings</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: Config Form */}
        <div>
          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>Identity</p>

            <div style={{ marginBottom: "20px" }}>
              <label style={S.label}>Bot Name *</label>
              <input style={S.input} value={config.name} onChange={e => setConfig(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Aria, SupportBot, HelpDesk Pro" data-testid="bot-name-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
              <p style={S.hint}>This is how your bot introduces itself.</p>
            </div>

            <div>
              <label style={S.label}>Persona Description *</label>
              <textarea style={S.textarea} value={config.persona} onChange={e => setConfig(p => ({ ...p, persona: e.target.value }))}
                placeholder="You are a helpful, friendly customer support assistant for [Company]. You have deep knowledge of our products and always maintain a professional yet approachable tone."
                data-testid="bot-persona-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
              <p style={S.hint}>Describe the bot's personality, role, and approach.</p>
            </div>
          </div>

          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>Custom Instructions</p>
            <div>
              <label style={S.label}>Additional Instructions</label>
              <textarea style={{ ...S.textarea, minHeight: "140px" }} value={config.custom_instructions}
                onChange={e => setConfig(p => ({ ...p, custom_instructions: e.target.value }))}
                placeholder="Always respond in English. If you don't know the answer, say so clearly. Never share personal information. Keep responses under 3 paragraphs."
                data-testid="bot-instructions-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
              <p style={S.hint}>Extra rules or constraints for the bot's behavior.</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={save} disabled={saving} data-testid="save-settings-btn"
              style={{
                padding: "12px 24px", backgroundColor: saving ? "#1A1A1A" : "#0055FF",
                color: "#FFFFFF", border: "none", borderRadius: "4px",
                fontSize: "14px", fontFamily: "IBM Plex Sans", fontWeight: "500",
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
              <Save size={14} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
            <button onClick={() => setShowPreview(!showPreview)} data-testid="toggle-preview-btn"
              style={{
                padding: "12px 20px", backgroundColor: "#1A1A1A", color: "#A1A1AA",
                border: "1px solid #262626", borderRadius: "4px", fontSize: "13px",
                fontFamily: "IBM Plex Sans", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>
        </div>

        {/* Right: System Prompt Preview */}
        <div>
          {showPreview && (
            <div style={S.card}>
              <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 16px" }}>System Prompt Preview</p>
              <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", marginBottom: "16px" }}>
                This is the prompt Claude receives (knowledge and tone examples are injected dynamically at runtime).
              </p>
              <pre style={{
                backgroundColor: "#0A0A0A", border: "1px solid #262626", borderRadius: "4px",
                padding: "16px", color: "#A1A1AA", fontFamily: "JetBrains Mono, monospace",
                fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap", wordBreak: "break-word",
                margin: 0, maxHeight: "500px", overflowY: "auto"
              }}>
                {systemPromptPreview}
              </pre>
            </div>
          )}

          <div style={S.card}>
            <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 16px" }}>How the Bot Brain Works</p>
            {[
              { step: "01", title: "Knowledge Base", desc: "When a user sends a message, the system searches your knowledge sources and injects the most relevant content into Claude's context." },
              { step: "02", title: "Persona & Tone", desc: "Your persona description defines the bot's character. Approved training examples teach the bot your preferred communication style." },
              { step: "03", title: "Custom Instructions", desc: "Additional instructions enforce specific rules and constraints, like language, response length, or what topics to avoid." },
              { step: "04", title: "One Brain", desc: "The same configuration powers both the web chat widget and your Discord bot — consistent behavior everywhere." },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: "flex", gap: "14px", marginBottom: "20px" }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", flexShrink: 0, paddingTop: "2px" }}>{step}</span>
                <div>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", fontWeight: "500", color: "#FFFFFF", margin: "0 0 4px" }}>{title}</p>
                  <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: 0, lineHeight: "1.6" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
