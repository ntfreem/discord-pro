import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Plus, Trash2, Globe, FileText, HelpCircle, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: { fontFamily: "JetBrains Mono", fontSize: "11px", color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" },
  h1: { fontFamily: "Chivo, sans-serif", fontSize: "30px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px" },
  card: { backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", padding: "24px", marginBottom: "24px" },
  label: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#A1A1AA", marginBottom: "8px", display: "block" },
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
    resize: "vertical", minHeight: "100px", boxSizing: "border-box",
  },
  btnPrimary: {
    padding: "10px 20px", backgroundColor: "#0055FF", color: "#FFFFFF",
    border: "none", borderRadius: "4px", fontSize: "13px",
    fontFamily: "IBM Plex Sans, sans-serif", fontWeight: "500", cursor: "pointer",
    display: "flex", alignItems: "center", gap: "8px",
  },
  btnSecondary: {
    padding: "10px 20px", backgroundColor: "#1A1A1A", color: "#FFFFFF",
    border: "1px solid #262626", borderRadius: "4px", fontSize: "13px",
    fontFamily: "IBM Plex Sans, sans-serif", fontWeight: "500", cursor: "pointer",
  },
};

const typeIcon = { faq: HelpCircle, url: Globe, document: FileText };
const typeColor = { faq: "#0055FF", url: "#00FF66", document: "#A1A1AA" };

function TypeBadge({ type }) {
  const Icon = typeIcon[type] || HelpCircle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: `${typeColor[type]}18`, color: typeColor[type] }}>
      <Icon size={10} />{type}
    </span>
  );
}

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState("faq");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [faq, setFaq] = useState({ title: "", content: "" });
  const [urlEntry, setUrlEntry] = useState({ url: "", title: "" });
  const [docTitle, setDocTitle] = useState("");
  const [scraping, setScraping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const loadSources = useCallback(() => {
    api.get(`/knowledge/sources`).then(r => setSources(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  const addFaq = async () => {
    if (!faq.title.trim() || !faq.content.trim()) { toast.error("Title and content are required"); return; }
    setLoading(true);
    try {
      await api.post(`/knowledge/sources/faq`, faq);
      toast.success("FAQ added successfully");
      setFaq({ title: "", content: "" });
      loadSources();
    } catch { toast.error("Failed to add FAQ"); }
    finally { setLoading(false); }
  };

  const scrapeUrl = async () => {
    if (!urlEntry.url.trim()) { toast.error("URL is required"); return; }
    setScraping(true);
    try {
      await api.post(`/knowledge/sources/url`, urlEntry);
      toast.success("URL scraped and saved successfully");
      setUrlEntry({ url: "", title: "" });
      loadSources();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to scrape URL"); }
    finally { setScraping(false); }
  };

  const uploadFile = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Please select a file"); return; }
    if (!docTitle.trim()) { toast.error("Title is required"); return; }
    const form = new FormData();
    form.append("file", file);
    form.append("title", docTitle);
    setUploading(true);
    try {
      await api.post(`/knowledge/sources/upload`, form);
      toast.success("Document uploaded successfully");
      setDocTitle("");
      if (fileRef.current) fileRef.current.value = "";
      loadSources();
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); }
  };

  const deleteSource = async (id) => {
    try {
      await api.delete(`/knowledge/sources/${id}`);
      toast.success("Source deleted");
      setSources(prev => prev.filter(s => s.id !== id));
    } catch { toast.error("Failed to delete"); }
  };

  const toggleSource = async (id) => {
    try {
      const r = await api.patch(`/knowledge/sources/${id}/toggle`);
      setSources(prev => prev.map(s => s.id === id ? { ...s, is_active: r.data.is_active } : s));
    } catch { toast.error("Failed to toggle"); }
  };

  const tabs = [
    { id: "faq", label: "FAQ", icon: HelpCircle },
    { id: "url", label: "URL Scraper", icon: Globe },
    { id: "document", label: "Upload Document", icon: FileText },
  ];

  return (
    <div style={S.page}>
      <p style={S.overline}>Knowledge Management</p>
      <h1 style={S.h1}>Knowledge Base</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid #262626", paddingBottom: "0" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} data-testid={`tab-${id}`} style={{
            padding: "10px 20px", backgroundColor: "transparent", border: "none",
            borderBottom: activeTab === id ? "2px solid #0055FF" : "2px solid transparent",
            color: activeTab === id ? "#FFFFFF" : "#A1A1AA", cursor: "pointer",
            fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", fontWeight: "500",
            display: "flex", alignItems: "center", gap: "7px", marginBottom: "-1px",
            transition: "color 0.15s ease",
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* FAQ Tab */}
      {activeTab === "faq" && (
        <div style={S.card}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 20px" }}>Add FAQ Entry</p>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={S.label}>Question / Title *</label>
              <input style={S.input} value={faq.title} onChange={e => setFaq(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. How do I reset my password?" data-testid="faq-title-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
            </div>
            <div>
              <label style={S.label}>Answer / Content *</label>
              <textarea style={S.textarea} value={faq.content} onChange={e => setFaq(p => ({ ...p, content: e.target.value }))}
                placeholder="Provide a clear, detailed answer..." data-testid="faq-content-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
            </div>
            <div>
              <button onClick={addFaq} disabled={loading} data-testid="faq-add-btn" style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}>
                {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
                Add FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Tab */}
      {activeTab === "url" && (
        <div style={S.card}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 20px" }}>Scrape URL</p>
          <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", color: "#A1A1AA", marginBottom: "20px", marginTop: 0 }}>
            Enter a URL and we'll automatically extract and index its content for your bot to learn from.
          </p>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={S.label}>URL *</label>
              <input style={S.input} value={urlEntry.url} onChange={e => setUrlEntry(p => ({ ...p, url: e.target.value }))}
                placeholder="https://docs.yoursite.com/faq" data-testid="url-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
            </div>
            <div>
              <label style={S.label}>Custom Title (optional)</label>
              <input style={S.input} value={urlEntry.title} onChange={e => setUrlEntry(p => ({ ...p, title: e.target.value }))}
                placeholder="Auto-detected from page title" data-testid="url-title-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
            </div>
            <div>
              <button onClick={scrapeUrl} disabled={scraping} data-testid="url-scrape-btn" style={{ ...S.btnPrimary, opacity: scraping ? 0.6 : 1 }}>
                {scraping ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Globe size={14} />}
                {scraping ? "Scraping..." : "Scrape & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Tab */}
      {activeTab === "document" && (
        <div style={S.card}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 20px" }}>Upload Document</p>
          <p style={{ fontFamily: "IBM Plex Sans", fontSize: "13px", color: "#A1A1AA", marginBottom: "20px", marginTop: 0 }}>
            Upload .txt or .pdf files. Content will be extracted and indexed for your bot.
          </p>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={S.label}>Title *</label>
              <input style={S.input} value={docTitle} onChange={e => setDocTitle(e.target.value)}
                placeholder="e.g. Product Documentation v2" data-testid="doc-title-input"
                onFocus={e => e.target.style.borderColor = "#0055FF"} onBlur={e => e.target.style.borderColor = "#262626"} />
            </div>
            <div>
              <label style={S.label}>File (.txt or .pdf) *</label>
              <input ref={fileRef} type="file" accept=".txt,.pdf" data-testid="doc-file-input"
                style={{ ...S.input, padding: "8px 14px", cursor: "pointer" }} />
            </div>
            <div>
              <button onClick={uploadFile} disabled={uploading} data-testid="doc-upload-btn" style={{ ...S.btnPrimary, opacity: uploading ? 0.6 : 1 }}>
                {uploading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <FileText size={14} />}
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sources List */}
      <div style={{ backgroundColor: "#121212", border: "1px solid #262626", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "900", color: "#FFFFFF", margin: 0 }}>
            All Sources
            <span style={{ marginLeft: "10px", fontFamily: "JetBrains Mono", fontSize: "11px", color: "#A1A1AA" }}>{sources.length}</span>
          </p>
        </div>
        {sources.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <p style={{ fontFamily: "IBM Plex Sans", color: "#A1A1AA", fontSize: "14px" }}>No knowledge sources yet. Add your first source above.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                {["Type", "Title", "Added", "Active", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontFamily: "JetBrains Mono", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: "400" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id} style={{ borderBottom: "1px solid #161616", transition: "background-color 0.15s ease" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1A1A1A"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  data-testid="knowledge-source-row">
                  <td style={{ padding: "12px 20px" }}><TypeBadge type={source.type} /></td>
                  <td style={{ padding: "12px 20px", fontFamily: "IBM Plex Sans", fontSize: "13px", color: "#FFFFFF", maxWidth: "300px" }}>
                    <div style={{ fontWeight: 500 }}>{source.title}</div>
                    {source.url && <div style={{ fontSize: "11px", color: "#A1A1AA", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{source.url}</div>}
                  </td>
                  <td style={{ padding: "12px 20px", fontFamily: "IBM Plex Sans", fontSize: "12px", color: "#A1A1AA" }}>
                    {source.created_at ? new Date(source.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <button onClick={() => toggleSource(source.id)} data-testid="toggle-source-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: source.is_active ? "#00FF66" : "#404040", padding: 0 }}>
                      {source.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <button onClick={() => deleteSource(source.id)} data-testid="delete-source-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#A1A1AA", padding: "4px", transition: "color 0.15s ease" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#FF3B30"}
                      onMouseLeave={e => e.currentTarget.style.color = "#A1A1AA"}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
