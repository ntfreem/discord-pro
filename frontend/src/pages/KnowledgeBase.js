import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2, Globe, FileText, HelpCircle, ToggleLeft, ToggleRight, Loader2, ChevronUp, ChevronDown, ArrowUpCircle, Pencil, X, Save, Lock } from "lucide-react";
import { colors, fonts, T, onFocus, onBlur, rowEnter, rowLeave } from "../theme";

const typeIcon = { faq: HelpCircle, url: Globe, document: FileText };
const typeColor = { faq: colors.brand.blue, url: colors.brand.success, document: colors.text.secondary };

const PRIORITY_LEVELS = [
  { value: 0, label: "Normal", color: colors.text.secondary },
  { value: 1, label: "Medium", color: colors.brand.warning },
  { value: 2, label: "High", color: colors.brand.error },
];

function TypeBadge({ type }) {
  const Icon = typeIcon[type] || HelpCircle;
  const c = typeColor[type] || colors.brand.blue;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 8px", borderRadius: "10px",
      fontSize: "11px", fontFamily: fonts.mono, textTransform: "uppercase", letterSpacing: "0.05em",
      backgroundColor: `${c}18`, color: c
    }}>
      <Icon size={10} />{type}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const level = PRIORITY_LEVELS.find(p => p.value === priority) || PRIORITY_LEVELS[0];
  return (
    <span data-testid="priority-badge" style={{
      display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "10px",
      fontSize: "11px", fontFamily: fonts.mono, letterSpacing: "0.03em",
      backgroundColor: `${level.color}18`, color: level.color
    }}>
      {priority >= 2 && <ArrowUpCircle size={10} />}
      {level.label}
    </span>
  );
}

function PrioritySelector({ value, onChange, style }) {
  return (
    <div style={{ display: "flex", gap: "6px", ...style }}>
      {PRIORITY_LEVELS.map(({ value: v, label, color }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          data-testid={`priority-${label.toLowerCase()}`}
          style={{
            padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontFamily: fonts.body,
            fontWeight: value === v ? "600" : "400", cursor: "pointer", transition: "all 0.2s",
            border: `1px solid ${value === v ? color : colors.border.default}`,
            backgroundColor: value === v ? `${color}12` : colors.bg.base,
            color: value === v ? color : colors.text.secondary,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EditModal({ source, onClose, onSaved }) {
  const [title, setTitle] = useState(source.title || "");
  const [content, setContent] = useState(source.content || "");
  const [url, setUrl] = useState(source.url || "");
  const [priority, setPriority] = useState(source.priority || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), content: content.trim(), priority };
      if (source.type === "url" && url.trim()) payload.url = url.trim();
      const res = await api.put(`/knowledge/sources/${source.id}`, payload);
      toast.success("Source updated");
      onSaved(res.data);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        data-testid="edit-source-modal"
        style={{
          width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto",
          backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`,
          borderRadius: "14px", padding: "28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Pencil size={16} color={colors.brand.cyan} />
            <h2 style={{ fontFamily: fonts.heading, fontSize: "17px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
              Edit Source
            </h2>
            <TypeBadge type={source.type} />
          </div>
          <button onClick={onClose} data-testid="edit-modal-close" style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary, padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={T.label}>Title *</label>
            <input
              style={T.input} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Source title" data-testid="edit-title-input"
              onFocus={onFocus} onBlur={onBlur}
            />
          </div>

          {source.type === "url" && (
            <div>
              <label style={T.label}>URL</label>
              <input
                style={T.input} value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://..." data-testid="edit-url-input"
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>
          )}

          <div>
            <label style={T.label}>Content</label>
            <textarea
              style={{ ...T.textarea, minHeight: "180px" }} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Source content..." data-testid="edit-content-input"
              onFocus={onFocus} onBlur={onBlur}
            />
            <p style={T.hint}>{content.length.toLocaleString()} characters</p>
          </div>

          <div>
            <label style={T.label}>Priority</label>
            <PrioritySelector value={priority} onChange={setPriority} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
          <button onClick={onClose} data-testid="edit-cancel-btn" style={T.btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={saving} data-testid="edit-save-btn"
            style={{ ...T.btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeBase() {
  const { selectedInstance } = useAuth();
  const [activeTab, setActiveTab] = useState("faq");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [faq, setFaq] = useState({ title: "", content: "", priority: 0 });
  const [urlEntry, setUrlEntry] = useState({ url: "", title: "", priority: 0, auth_username: "", auth_password: "" });
  const [docTitle, setDocTitle] = useState("");
  const [docPriority, setDocPriority] = useState(0);
  const [scraping, setScraping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const fileRef = useRef(null);

  const loadSources = useCallback(() => {
    api.get(`/knowledge/sources`).then(r => setSources(r.data)).catch(() => {});
  }, [selectedInstance]);

  useEffect(() => { loadSources(); }, [loadSources]);

  const addFaq = async () => {
    if (!faq.title.trim() || !faq.content.trim()) { toast.error("Title and content are required"); return; }
    setLoading(true);
    try {
      await api.post(`/knowledge/sources/faq`, faq);
      toast.success("FAQ added successfully");
      setFaq({ title: "", content: "", priority: 0 });
      loadSources();
    } catch { toast.error("Failed to add FAQ"); }
    finally { setLoading(false); }
  };

  const scrapeUrl = async () => {
    if (!urlEntry.url.trim()) { toast.error("URL is required"); return; }
    setScraping(true);
    try {
      const payload = { url: urlEntry.url, title: urlEntry.title, priority: urlEntry.priority };
      if (urlEntry.auth_username?.trim()) payload.auth_username = urlEntry.auth_username.trim();
      if (urlEntry.auth_password?.trim()) payload.auth_password = urlEntry.auth_password.trim();
      await api.post(`/knowledge/sources/url`, payload);
      toast.success("URL scraped and saved successfully");
      setUrlEntry({ url: "", title: "", priority: 0, auth_username: "", auth_password: "" });
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
    form.append("priority", docPriority);
    setUploading(true);
    try {
      await api.post(`/knowledge/sources/upload`, form);
      toast.success("Document uploaded successfully");
      setDocTitle("");
      setDocPriority(0);
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

  const updatePriority = async (id, newPriority) => {
    try {
      await api.patch(`/knowledge/sources/${id}/priority`, { priority: newPriority });
      setSources(prev => {
        const updated = prev.map(s => s.id === id ? { ...s, priority: newPriority } : s);
        return updated.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      });
      const label = PRIORITY_LEVELS.find(p => p.value === newPriority)?.label || "Normal";
      toast.success(`Priority set to ${label}`);
    } catch { toast.error("Failed to update priority"); }
  };

  const handleEditSaved = (updated) => {
    setSources(prev => {
      const list = prev.map(s => s.id === updated.id ? updated : s);
      return list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });
    setEditing(null);
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
              <label style={T.label}>Priority</label>
              <PrioritySelector value={faq.priority} onChange={v => setFaq(p => ({ ...p, priority: v }))} />
              <p style={T.hint}>High priority sources are checked first when answering questions.</p>
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
              <label style={T.label}>Priority</label>
              <PrioritySelector value={urlEntry.priority} onChange={v => setUrlEntry(p => ({ ...p, priority: v }))} />
              <p style={T.hint}>High priority sources are checked first when answering questions.</p>
            </div>
            {/* Auth credentials for protected URLs */}
            <div style={{ padding: "14px", backgroundColor: colors.bg.base, borderRadius: "10px", border: `1px solid ${colors.border.subtle}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Lock size={12} color={colors.text.muted} />
                <label style={{ ...T.label, margin: 0, fontSize: "12px" }}>Authentication (optional)</label>
              </div>
              <p style={{ ...T.hint, marginTop: 0, marginBottom: "10px" }}>If the URL requires login, enter credentials below. Uses HTTP Basic Auth.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ ...T.label, fontSize: "11px" }}>Username / Email</label>
                  <input style={T.input} value={urlEntry.auth_username} onChange={e => setUrlEntry(p => ({ ...p, auth_username: e.target.value }))}
                    placeholder="username" data-testid="url-auth-username" onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={{ ...T.label, fontSize: "11px" }}>Password</label>
                  <input style={T.input} type="password" value={urlEntry.auth_password} onChange={e => setUrlEntry(p => ({ ...p, auth_password: e.target.value }))}
                    placeholder="password" data-testid="url-auth-password" onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
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
              <label style={T.label}>Priority</label>
              <PrioritySelector value={docPriority} onChange={setDocPriority} />
              <p style={T.hint}>High priority sources are checked first when answering questions.</p>
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
      <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", overflow: "hidden", marginTop: "24px" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.default}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>
            All Sources
            <span style={{ marginLeft: "10px", fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary }}>{sources.length}</span>
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.text.muted, margin: 0 }}>
            Sorted by priority (highest first)
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
                {["Type", "Title", "Priority", "Active", "Actions"].map(h => (
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
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <PriorityBadge priority={source.priority || 0} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                        <button
                          onClick={() => updatePriority(source.id, Math.min((source.priority || 0) + 1, 2))}
                          disabled={(source.priority || 0) >= 2}
                          data-testid="priority-up-btn"
                          style={{
                            background: "none", border: "none", cursor: (source.priority || 0) >= 2 ? "default" : "pointer",
                            color: (source.priority || 0) >= 2 ? colors.border.subtle : colors.text.secondary,
                            padding: "0", lineHeight: 1,
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => updatePriority(source.id, Math.max((source.priority || 0) - 1, 0))}
                          disabled={(source.priority || 0) <= 0}
                          data-testid="priority-down-btn"
                          style={{
                            background: "none", border: "none", cursor: (source.priority || 0) <= 0 ? "default" : "pointer",
                            color: (source.priority || 0) <= 0 ? colors.border.subtle : colors.text.secondary,
                            padding: "0", lineHeight: 1,
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <button onClick={() => toggleSource(source.id)} data-testid="toggle-source-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: source.is_active ? colors.brand.success : colors.text.muted, padding: 0 }}>
                      {source.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button onClick={() => setEditing(source)} data-testid="edit-source-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary, padding: "4px", transition: "color 0.2s ease" }}
                        onMouseEnter={e => e.currentTarget.style.color = colors.brand.cyan}
                        onMouseLeave={e => e.currentTarget.style.color = colors.text.secondary}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteSource(source.id)} data-testid="delete-source-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", color: colors.text.secondary, padding: "4px", transition: "color 0.2s ease" }}
                        onMouseEnter={e => e.currentTarget.style.color = colors.brand.error}
                        onMouseLeave={e => e.currentTarget.style.color = colors.text.secondary}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditModal source={editing} onClose={() => setEditing(null)} onSaved={handleEditSaved} />
      )}
    </div>
  );
}
