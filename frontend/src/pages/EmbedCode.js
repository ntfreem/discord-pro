import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Code2, Globe, Monitor } from "lucide-react";

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "24px", marginBottom: "24px" },
};

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
        <p style={{ fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>{label}</p>
        <button onClick={copy} data-testid={testId}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
            backgroundColor: copied ? "#00FF6618" : "#1A1A1A", color: copied ? "#00FF66" : "#A1A1AA",
            border: `1px solid ${copied ? "#00FF6644" : "#262626"}`, borderRadius: "4px",
            fontSize: "12px", fontFamily: "IBM Plex Sans", cursor: "pointer",
            transition: "all 0.15s ease",
          }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{
        backgroundColor: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "4px",
        padding: "16px 20px", color: "#A1A1AA", fontFamily: "JetBrains Mono, monospace",
        fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap", wordBreak: "break-all",
        margin: 0, overflowX: "auto"
      }}>
        {code}
      </pre>
    </div>
  );
}

export default function EmbedCode() {
  const widgetUrl = `${window.location.origin}/widget`;
  const chatUrl = `${window.location.origin}/chat`;

  const iframeCode = `<!-- BotForge Chat Widget -->
<iframe
  src="${widgetUrl}"
  style="position:fixed;bottom:20px;right:20px;width:380px;height:600px;border:none;z-index:9999;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)"
  title="BotForge Chat"
></iframe>`;

  const scriptCode = `<!-- BotForge Chat Widget (Auto-inject) -->
<script>
(function() {
  var iframe = document.createElement('iframe');
  iframe.src = '${widgetUrl}';
  iframe.title = 'BotForge Chat';
  iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:380px;height:600px;border:none;z-index:9999;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)';
  document.body.appendChild(iframe);
})();
</script>`;

  const reactCode = `// React component embed
import React from 'react';

export function BotForgeWidget() {
  return (
    <iframe
      src="${widgetUrl}"
      title="BotForge Chat"
      style={{
        position: 'fixed', bottom: '20px', right: '20px',
        width: '380px', height: '600px', border: 'none',
        zIndex: 9999, borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}
    />
  );
}`;

  return (
    <div style={S.page}>
      <p style={S.overline}>Integration</p>
      <h1 style={S.h1}>Embed Code</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: Code */}
        <div>
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <Code2 size={16} color="#0055FF" />
              <p style={{ fontFamily: "Chivo", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>Embed Options</p>
            </div>
            <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", color: "#A1A1AA", marginBottom: "24px", marginTop: "8px" }}>
              Add the chat widget to any website using any of the methods below.
            </p>

            <CodeBlock code={iframeCode} label="HTML iframe" testId="copy-iframe-btn" />
            <CodeBlock code={scriptCode} label="JavaScript Snippet" testId="copy-script-btn" />
            <CodeBlock code={reactCode} label="React Component" testId="copy-react-btn" />
          </div>
        </div>

        {/* Right: Preview + Links */}
        <div>
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Monitor size={16} color="#0055FF" />
              <p style={{ fontFamily: "Chivo", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>Widget Preview</p>
            </div>

            <div style={{
              backgroundColor: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "8px",
              overflow: "hidden", height: "520px", position: "relative"
            }}>
              <iframe
                src={widgetUrl}
                title="BotForge Widget Preview"
                data-testid="widget-preview-iframe"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>

            <p style={{ fontFamily: "IBM Plex Sans", fontSize: "11px", color: "#404040", marginTop: "12px" }}>
              Live preview of your widget. Changes to bot settings apply immediately.
            </p>
          </div>

          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Globe size={16} color="#A1A1AA" />
              <p style={{ fontFamily: "Chivo", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>Direct URLs</p>
            </div>

            {[
              { label: "Standalone Chat Page", url: chatUrl, desc: "Full-page chat experience for sharing" },
              { label: "Embeddable Widget", url: widgetUrl, desc: "Compact widget for iframe embedding" },
            ].map(({ label, url, desc }) => (
              <div key={label} style={{ marginBottom: "16px", padding: "14px", backgroundColor: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", fontWeight: "500", color: "#FFFFFF", margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA", margin: 0 }}>{desc}</p>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    data-testid={`link-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{ padding: "6px 12px", backgroundColor: "#1A1A1A", border: "1px solid #262626", color: "#0055FF", borderRadius: "4px", fontSize: "12px", fontFamily: "IBM Plex Sans", textDecoration: "none", flexShrink: 0 }}>
                    Open →
                  </a>
                </div>
                <code style={{ display: "block", marginTop: "8px", fontFamily: "JetBrains Mono", fontSize: "11px", color: "#404040", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
