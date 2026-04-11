import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Plus, Trash2, Globe, FileText, HelpCircle, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur, rowEnter, rowLeave } from "../theme";

const typeIcon = { faq: HelpCircle, url: Globe, document: FileText };
const typeColor = { faq: colors.brand.blue, url: colors.brand.success, document: colors.text.secondary };

function TypeBadge({ type }) {
  const Icon = typeIcon[type] || HelpCircle;
  const c = typeColor[type] || colors.brand.blue;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 8px", borderRadius: "2px",
      fontSize: "11px", fontFamily: fonts.mono, textTransform: "uppercase", letterSpacing: "0.05em",
      backgroundColor: `${c}18`, color: c
    }}>
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
    <div style={T.page}>
      <p style={T.overline}>Knowledge Management</p>
      <h1 style={T.h1}>Knowledge Base</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: `1px solid ${colors.border.default}`, paddingBottom: "0" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} data-testid={`tab-${id}`} style={{
            padding: "10px 20px", backgroundColor: "transparent", border: "none",
            borderBottom: activeTab === id ? `2px solid ${colors.brand.cyan}` : "2px solid transparent",
            color: activeTab === id ? colors.text.primary : colors.text.secondary, cursor: "pointer",
            fontFamily: fonts.body, fontSize: "13px", fontWeight: "500",
            display: "flex", alignItems: "center", gap: "7px", marginBottom: "-1px",
            transition: "color 0.2s ease, border-color 0.2s ease",
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* FAQ Tab */}
      {activeTab === "faq" && (
        <div style={T.card}>
          <p style={T.sectionTitle}>Add FAQ Entry</p>
          <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
            <div>
              <label style={T.label}>Question / Title *</label>
              <input style={T.input} value={faq.title} onChange={e => setFaq(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. How do I reset my password?" data-testid="faq-title-input"
                onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={T.label}>Answer / Content *</label>
              <textarea style={{ ...T.textarea, minHeight: "100px" }} value={faq.content} onChange={e => setFaq(p => ({ ...p, content: e.target.value }))}
                placeholder="Provide a clear, detailed answer..." data-testid="faq-content-input"
                onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <button onClick={addFaq} disabled={loading} data-testid="faq-add-btn" style={{ ...T.btnPrimary, opacity: loading ? 0.6 : 1 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Tab */}
      {activeTab === "url" && (
        <div style={T.card}>
          <p style={T.sectionTitle}>Scrape URL</p>
          <p style={{ ...T.sectionSub, marginTop: "4px" }}>
            Enter a URL and we'll automatically extract and index its content for your bot to learn from.
          </p>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={T.label}>URL *</label>
              <input style={T.input} value={urlEntry.url} onChange={e => setUrlEntry(p => ({ ...p, url: e.target.value }))}
                placeholder="https://docs.yoursite.com/faq" data-testid="url-input" onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={T.label}>Custom Title (optional)</label>
              <input style={T.input} value={urlEntry.title} onChange={e => setUrlEntry(p => ({ ...p, title: e.target.value }))}
                placeholder="Auto-detected from page title" data-testid="url-title-input" onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <button onClick={scrapeUrl} disabled={scraping} data-testid="url-scrape-btn" style={{ ...T.btnPrimary, opacity: scraping ? 0.6 : 1 }}>
                {scraping ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                {scraping ? "Scraping..." : "Scrape & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Tab */}
      {activeTab === "document" && (
        <div style={T.card}>
          <p style={T.sectionTitle}>Upload Document</p>
          <p style={{ ...T.sectionSub, marginTop: "4px" }}>Upload .txt or .pdf files. Content will be extracted and indexed for your bot.</p>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={T.label}>Title *</label>
              <input style={T.input} value={docTitle} onChange={e => setDocTitle(e.target.value)}
                placeholder="e.g. Product Documentation v2" data-testid="doc-title-input" onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={T.label}>File (.txt or .pdf) *</label>
              <input ref={fileRef} type="file" accept=".txt,.pdf" data-testid="doc-file-input"
                style={{ ...T.input, padding: "8px 14px", cursor: "pointer" }} />
            </div>
            <div>
              <button onClick={uploadFile} disabled={uploading} data-testid="doc-upload-btn" style={{ ...T.btnPrimary, opacity: uploading ? 0.6 : 1 }}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sources List */}
      <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "2px", overflow: "hidden", marginTop: "24px" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.default}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
            All Sources
            <span style={{ marginLeft: "10px", fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary }}>{sources.length}</span>
          </p>
        </div>
        {sources.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <p style={{ fontFamily: fonts.body, color: colors.text.secondary, fontSize: "14px" }}>No knowledge sources yet. Add your first source above.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                {["Type", "Title", "Added", "Active", "Actions"].map(h => (
                  <th key={h} style={T.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id} style={{ borderBottom: `1px solid ${colors.border.faint}`, transition: "background-color 0.2s ease" }}
                  onMouseEnter={rowEnter} onMouseLeave={rowLeave} data-testid="knowledge-source-row">
                  <td style={{ padding: "12px 20px" }}><TypeBadge type={source.type} /></td>
                  <td style={{ padding: "12px 20px", fontFamily: fonts.body, fontSize: "13px", color: colors.text.primary, maxWidth: "300px" }}>
                    <div style={{ fontWeight: 500 }}>{source.title}</div>
                    {source.url && <div style={{ fontSize: "11px", color: colors.text.secondary, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{source.url}</div>}
                  </td>
                  <td style={{ padding: "12px 20px", fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary }}>
                    {source.created_at ? new Date(source.created_at).toLocaleDateString() : "\u2014"}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <button onClick={() => toggleSource(source.id)} data-testid="toggle-source-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: source.is_active ? colors.brand.success : colors.text.muted, padding: 0 }}>
                      {source.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <button onClick={() => deleteSource(source.id)} data-testid="delete-source-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary, padding: "4px", transition: "color 0.2s ease" }}
                      onMouseEnter={e => e.currentTarget.style.color = colors.brand.error}
                      onMouseLeave={e => e.currentTarget.style.color = colors.text.secondary}>
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
