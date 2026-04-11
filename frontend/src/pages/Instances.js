import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { Plus, Trash2, UserPlus, UserMinus, Bot, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { colors, fonts, T, onFocus, onBlur } from "../theme";

function CreateInstanceModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.post("/admin/instances", { name: name.trim(), description });
      toast.success("Instance created");
      onCreate();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create instance");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", padding: "32px", width: "100%", maxWidth: "420px" }}>
        <h2 style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: "700", color: colors.text.primary, margin: "0 0 24px" }}>
          New Bot Instance
        </h2>
        <form onSubmit={handleCreate}>
          <label style={{ ...T.label, fontFamily: fonts.mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Instance Name *</label>
          <input data-testid="new-instance-name" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Corp Support Bot" style={{ ...T.input, marginBottom: "16px" }} required onFocus={onFocus} onBlur={onBlur} />
          <label style={{ ...T.label, fontFamily: fonts.mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Description</label>
          <input data-testid="new-instance-desc" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Optional description" style={{ ...T.input, marginBottom: "24px" }} onFocus={onFocus} onBlur={onBlur} />
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={T.btnGhost}>Cancel</button>
            <button data-testid="create-instance-submit" type="submit" style={{ ...T.btnPrimary, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? "Creating..." : "Create Instance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InstanceRow({ instance, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assigning, setAssigning] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${instance.name}"? This removes all its knowledge, conversations, and config.`)) return;
    try { await api.delete(`/admin/instances/${instance.id}`); toast.success("Instance deleted"); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || "Delete failed"); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignEmail.trim()) return;
    setAssigning(true);
    try { await api.post(`/admin/instances/${instance.id}/assign-user`, { user_email: assignEmail.trim() }); toast.success(`Assigned ${assignEmail}`); setAssignEmail(""); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || "Assignment failed"); }
    finally { setAssigning(false); }
  };

  const handleUnassign = async (userId, email) => {
    try { await api.delete(`/admin/instances/${instance.id}/unassign-user/${userId}`); toast.success(`Removed ${email}`); onRefresh(); }
    catch { toast.error("Failed to remove user"); }
  };

  return (
    <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", overflow: "hidden", marginBottom: "8px", transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: "14px", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{ width: "36px", height: "36px", backgroundColor: "rgba(59,130,246,0.1)", border: `1px solid ${colors.border.default}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Bot size={16} color={colors.brand.blue} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: colors.text.primary, margin: 0 }}>{instance.name}</p>
          {instance.description && <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.text.secondary, margin: "2px 0 0" }}>{instance.description}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary, backgroundColor: colors.bg.panel, padding: "3px 8px", borderRadius: "10px" }}>
            {(instance.assigned_users || []).length} user{(instance.assigned_users || []).length !== 1 ? "s" : ""}
          </span>
          <button data-testid={`delete-instance-${instance.id}`} onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            style={{ background: "none", border: `1px solid rgba(244,63,94,0.2)`, borderRadius: "10px", padding: "5px 8px", cursor: "pointer", color: colors.brand.error, display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s", fontSize: "12px", fontFamily: fonts.body }}>
            <Trash2 size={12} />
          </button>
          {expanded ? <ChevronUp size={14} color={colors.text.muted} /> : <ChevronDown size={14} color={colors.text.muted} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border.subtle}`, padding: "20px" }}>
          <form onSubmit={handleAssign} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input data-testid={`assign-email-${instance.id}`} type="email" value={assignEmail} onChange={e => setAssignEmail(e.target.value)}
              placeholder="user@example.com" style={{ ...T.input, flex: 1, width: "auto" }} onFocus={onFocus} onBlur={onBlur} />
            <button data-testid={`assign-submit-${instance.id}`} type="submit"
              style={{ ...T.btnPrimary, opacity: assigning ? 0.7 : 1 }} disabled={assigning}>
              <UserPlus size={13} /> {assigning ? "Assigning..." : "Assign User"}
            </button>
          </form>

          {(instance.assigned_users || []).length === 0 ? (
            <p style={{ color: colors.text.muted, fontSize: "13px", fontFamily: fonts.body }}>No users assigned to this instance yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(instance.assigned_users || []).map(u => (
                <div key={u.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", backgroundColor: colors.bg.base, border: `1px solid ${colors.border.subtle}`, borderRadius: "10px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: colors.bg.panel, border: `1px solid ${colors.border.default}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: fonts.heading, fontSize: "11px", color: colors.text.secondary, fontWeight: "700" }}>{u.email[0].toUpperCase()}</span>
                    </div>
                    <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.text.primary }}>{u.email}</span>
                    {u.is_verified === false && (
                      <span style={{ fontFamily: fonts.mono, fontSize: "9px", color: colors.brand.warning, backgroundColor: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: "10px", textTransform: "uppercase" }}>unverified</span>
                    )}
                  </div>
                  <button data-testid={`unassign-user-${u.id}`} onClick={() => handleUnassign(u.id, u.email)} style={T.btnGhost}>
                    <UserMinus size={12} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.muted, marginTop: "16px" }}>ID: {instance.id}</p>
        </div>
      )}
    </div>
  );
}

export default function Instances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { refreshInstances } = useAuth();

  const fetchInstances = useCallback(async () => {
    try { const res = await api.get("/admin/instances"); setInstances(res.data); }
    catch { toast.error("Failed to load instances"); }
    finally { setLoading(false); }
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchInstances(), refreshInstances()]);
  }, [fetchInstances, refreshInstances]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  if (loading) {
    return (
      <div style={{ ...T.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: colors.text.secondary, fontFamily: fonts.mono, fontSize: "13px" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={T.page}>
      {showCreate && <CreateInstanceModal onClose={() => setShowCreate(false)} onCreate={handleRefresh} />}
      <p style={T.overline}>Superadmin</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <h1 style={{ ...T.h1, margin: 0 }}>Instance Management</h1>
        <button data-testid="create-instance-btn" onClick={() => setShowCreate(true)} style={T.btnPrimary}>
          <Plus size={15} /> New Instance
        </button>
      </div>

      {instances.length === 0 ? (
        <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <Bot size={32} color={colors.text.muted} style={{ marginBottom: "16px" }} />
          <p style={{ color: colors.text.secondary, fontSize: "15px", fontFamily: fonts.body, marginBottom: "8px" }}>No instances yet</p>
          <p style={{ color: colors.text.muted, fontSize: "13px", fontFamily: fonts.body, marginBottom: "20px" }}>Create your first bot instance to get started</p>
          <button onClick={() => setShowCreate(true)} style={T.btnPrimary}><Plus size={15} /> Create First Instance</button>
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.secondary, marginBottom: "16px" }}>
            {instances.length} instance{instances.length !== 1 ? "s" : ""} — Click any row to expand and manage users
          </p>
          {instances.map(inst => (<InstanceRow key={inst.id} instance={inst} onRefresh={handleRefresh} />))}
        </div>
      )}
    </div>
  );
}
