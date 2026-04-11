import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Copy, Check, Code2, Globe, Monitor } from "lucide-react";
import { colors, fonts, T } from "../theme";

function CodeBlock({ code, label, testId }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <p style={T.monoLabel}>{label}</p>
        <button onClick={copy} data-testid={testId}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
            backgroundColor: copied ? "rgba(0,255,102,0.08)" : colors.bg.panel,
            color: copied ? colors.brand.success : colors.text.secondary,
            border: `1px solid ${copied ? "rgba(0,255,102,0.3)" : colors.border.default}`,
            borderRadius: "2px", fontSize: "12px", fontFamily: fonts.body, cursor: "pointer",
            transition: "all 0.15s ease",
          }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{
        backgroundColor: colors.bg.base, border: `1px solid ${colors.border.subtle}`, borderRadius: "2px",
        padding: "16px 20px", color: colors.text.secondary, fontFamily: fonts.mono,
        fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap", wordBreak: "break-all",
        margin: 0, overflowX: "auto"
      }}>
        {code}
      </pre>
    </div>
  );
}

export default function EmbedCode() {
  const { selectedInstance } = useAuth();
  const instanceParam = selectedInstance ? `?instance=${selectedInstance.id}` : "";
  const widgetUrl = `${window.location.origin}/widget${instanceParam}`;
  const chatUrl = `${window.location.origin}/chat${instanceParam}`;

  const iframeCode = `<!-- BridgeBot Chat Widget -->\n<iframe\n  src="${widgetUrl}"\n  style="position:fixed;bottom:20px;right:20px;width:380px;height:600px;border:none;z-index:9999;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)"\n  title="BridgeBot Chat"\n></iframe>`;

  const scriptCode = `<!-- BridgeBot Chat Widget (Auto-inject) -->\n<script>\n(function() {\n  var iframe = document.createElement('iframe');\n  iframe.src = '${widgetUrl}';\n  iframe.title = 'BridgeBot Chat';\n  iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:380px;height:600px;border:none;z-index:9999;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)';\n  document.body.appendChild(iframe);\n})();\n</script>`;

  const reactCode = `// React component embed\nimport React from 'react';\n\nexport function BridgeBotWidget() {\n  return (\n    <iframe\n      src="${widgetUrl}"\n      title="BridgeBot Chat"\n      style={{\n        position: 'fixed', bottom: '20px', right: '20px',\n        width: '380px', height: '600px', border: 'none',\n        zIndex: 9999, borderRadius: '8px',\n        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'\n      }}\n    />\n  );\n}`;

  return (
    <div style={T.page}>
      <p style={T.overline}>Integration</p>
      <h1 style={T.h1}>Embed Code</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <div style={T.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <Code2 size={16} color={colors.brand.blue} />
              <p style={T.sectionTitle}>Embed Options</p>
            </div>
            <p style={T.sectionSub}>Add the chat widget to any website using any of the methods below.</p>
            <CodeBlock code={iframeCode} label="HTML iframe" testId="copy-iframe-btn" />
            <CodeBlock code={scriptCode} label="JavaScript Snippet" testId="copy-script-btn" />
            <CodeBlock code={reactCode} label="React Component" testId="copy-react-btn" />
          </div>
        </div>

        <div>
          <div style={{ ...T.card, marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Monitor size={16} color={colors.brand.blue} />
              <p style={T.sectionTitle}>Widget Preview</p>
            </div>
            <div style={{
              backgroundColor: colors.bg.base, border: `1px solid ${colors.border.subtle}`, borderRadius: "4px",
              overflow: "hidden", height: "520px", position: "relative"
            }}>
              <iframe src={widgetUrl} title="BridgeBot Widget Preview" data-testid="widget-preview-iframe"
                style={{ width: "100%", height: "100%", border: "none" }} />
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.muted, marginTop: "12px" }}>
              Live preview. Changes to bot settings apply immediately.
            </p>
          </div>

          <div style={T.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Globe size={16} color={colors.text.secondary} />
              <p style={T.sectionTitle}>Direct URLs</p>
            </div>
            {[
              { label: "Standalone Chat Page", url: chatUrl, desc: "Full-page chat experience for sharing" },
              { label: "Embeddable Widget", url: widgetUrl, desc: "Compact widget for iframe embedding" },
            ].map(({ label, url, desc }) => (
              <div key={label} style={{ marginBottom: "12px", padding: "14px", backgroundColor: colors.bg.base, border: `1px solid ${colors.border.subtle}`, borderRadius: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: "500", color: colors.text.primary, margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: 0 }}>{desc}</p>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    data-testid={`link-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{
                      padding: "6px 12px", backgroundColor: colors.bg.panel,
                      border: `1px solid ${colors.border.default}`, color: colors.brand.cyan,
                      borderRadius: "2px", fontSize: "12px", fontFamily: fonts.body,
                      textDecoration: "none", flexShrink: 0, transition: "border-color 0.2s",
                    }}>
                    Open \u2192
                  </a>
                </div>
                <code style={{ display: "block", marginTop: "8px", fontFamily: fonts.mono, fontSize: "11px", color: colors.text.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {url}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
