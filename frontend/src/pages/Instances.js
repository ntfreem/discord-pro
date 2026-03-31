import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { Plus, Trash2, UserPlus, UserMinus, Bot, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const S = {
  page: { padding: "40px 48px", backgroundColor: "#0A0A0A", minHeight: "100vh" },
  overline: {
    fontFamily: "JetBrains Mono, monospace", fontSize: "11px",
    color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px",
  },
  h1: {
    fontFamily: "Chivo, sans-serif", fontSize: "30px",
    fontWeight: "900", color: "#FFFFFF", margin: "0 0 32px", letterSpacing: "-0.5px",
  },
  card: {
    backgroundColor: "#121212", border: "1px solid #262626",
    borderRadius: "6px", overflow: "hidden", marginBottom: "12px",
  },
  label: {
    fontFamily: "JetBrains Mono, monospace", fontSize: "11px",
    color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.1em",
  },
  input: {
    padding: "9px 12px", backgroundColor: "#0A0A0A",
    border: "1px solid #262626", borderRadius: "4px",
    color: "#FFFFFF", fontFamily: "IBM Plex Sans, sans-serif",
    fontSize: "13px", outline: "none",
  },
  btnPrimary: {
    padding: "9px 16px", backgroundColor: "#0055FF",
    border: "none", borderRadius: "4px", color: "#FFFFFF",
    cursor: "pointer", fontSize: "13px",
    fontFamily: "IBM Plex Sans, sans-serif", fontWeight: "600",
    display: "flex", alignItems: "center", gap: "6px",
  },
  btnDanger: {
    padding: "6px 10px", backgroundColor: "transparent",
    border: "1px solid rgba(255,60,60,0.3)", borderRadius: "4px",
    color: "#FF6B6B", cursor: "pointer", fontSize: "12px",
    fontFamily: "IBM Plex Sans, sans-serif",
    display: "flex", alignItems: "center", gap: "4px",
  },
  btnGhost: {
    padding: "6px 10px", backgroundColor: "transparent",
    border: "1px solid #262626", borderRadius: "4px",
    color: "#A1A1AA", cursor: "pointer", fontSize: "12px",
    fontFamily: "IBM Plex Sans, sans-serif",
    display: "flex", alignItems: "center", gap: "4px",
  },
};

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        backgroundColor: "#121212", border: "1px solid #262626",
        borderRadius: "8px", padding: "32px", width: "100%", maxWidth: "420px",
      }}>
        <h2 style={{ fontFamily: "Chivo, sans-serif", fontSize: "18px", fontWeight: "900", color: "#FFFFFF", margin: "0 0 24px" }}>
          New Bot Instance
        </h2>
        <form onSubmit={handleCreate}>
          <label style={{ ...S.label, display: "block", marginBottom: "6px" }}>Instance Name *</label>
          <input
            data-testid="new-instance-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Corp Support Bot"
            style={{ ...S.input, width: "100%", boxSizing: "border-box", marginBottom: "16px" }}
            required
          />
          <label style={{ ...S.label, display: "block", marginBottom: "6px" }}>Description</label>
          <input
            data-testid="new-instance-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
            style={{ ...S.input, width: "100%", boxSizing: "border-box", marginBottom: "24px" }}
          />
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={S.btnGhost}>Cancel</button>
            <button
              data-testid="create-instance-submit"
              type="submit"
              style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
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
    try {
      await api.delete(`/admin/instances/${instance.id}`);
      toast.success("Instance deleted");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignEmail.trim()) return;
    setAssigning(true);
    try {
      await api.post(`/admin/instances/${instance.id}/assign-user`, { user_email: assignEmail.trim() });
      toast.success(`Assigned ${assignEmail}`);
      setAssignEmail("");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (userId, email) => {
    try {
      await api.delete(`/admin/instances/${instance.id}/unassign-user/${userId}`);
      toast.success(`Removed ${email}`);
      onRefresh();
    } catch (err) {
      toast.error("Failed to remove user");
    }
  };

  return (
    <div style={S.card}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", padding: "16px 20px",
        gap: "14px", cursor: "pointer",
      }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{
          width: "36px", height: "36px", backgroundColor: "rgba(0,85,255,0.1)",
          border: "1px solid rgba(0,85,255,0.2)", borderRadius: "6px",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Bot size={16} color="#0055FF" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Chivo, sans-serif", fontSize: "15px", fontWeight: "700", color: "#FFFFFF", margin: 0 }}>
            {instance.name}
          </p>
          {instance.description && (
            <p style={{ fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px", color: "#A1A1AA", margin: "2px 0 0" }}>
              {instance.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "11px",
            color: "#A1A1AA", backgroundColor: "#1A1A1A",
            padding: "3px 8px", borderRadius: "3px",
          }}>
            {(instance.assigned_users || []).length} user{(instance.assigned_users || []).length !== 1 ? "s" : ""}
          </span>
          <button
            data-testid={`delete-instance-${instance.id}`}
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            style={S.btnDanger}
          >
            <Trash2 size={12} />
          </button>
          {expanded ? <ChevronUp size={14} color="#A1A1AA" /> : <ChevronDown size={14} color="#A1A1AA" />}
        </div>
      </div>

      {/* Expanded user management */}
      {expanded && (
        <div style={{ borderTop: "1px solid #1E1E1E", padding: "20px" }}>
          {/* Assign user form */}
          <form onSubmit={handleAssign} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              data-testid={`assign-email-${instance.id}`}
              type="email"
              value={assignEmail}
              onChange={e => setAssignEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ ...S.input, flex: 1 }}
            />
            <button
              data-testid={`assign-submit-${instance.id}`}
              type="submit"
              style={{ ...S.btnPrimary, opacity: assigning ? 0.7 : 1 }}
              disabled={assigning}
            >
              <UserPlus size={13} />
              {assigning ? "Assigning..." : "Assign User"}
            </button>
          </form>

          {/* Assigned users list */}
          {(instance.assigned_users || []).length === 0 ? (
            <p style={{ color: "#404040", fontSize: "13px", fontFamily: "IBM Plex Sans, sans-serif" }}>
              No users assigned to this instance yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(instance.assigned_users || []).map(u => (
                <div key={u.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", backgroundColor: "#0A0A0A",
                  border: "1px solid #1A1A1A", borderRadius: "4px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "26px", height: "26px", borderRadius: "50%",
                      backgroundColor: "#1A1A1A", border: "1px solid #262626",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontFamily: "Chivo, sans-serif", fontSize: "11px", color: "#A1A1AA", fontWeight: "700" }}>
                        {u.email[0].toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#FFFFFF" }}>
                      {u.email}
                    </span>
                    {u.is_verified === false && (
                      <span style={{
                        fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
                        color: "#F59E0B", backgroundColor: "rgba(245,158,11,0.1)",
                        padding: "2px 6px", borderRadius: "3px", textTransform: "uppercase",
                      }}>
                        unverified
                      </span>
                    )}
                  </div>
                  <button
                    data-testid={`unassign-user-${u.id}`}
                    onClick={() => handleUnassign(u.id, u.email)}
                    style={S.btnGhost}
                  >
                    <UserMinus size={12} />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Instance ID */}
          <p style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "10px",
            color: "#333", marginTop: "16px",
          }}>
            ID: {instance.id}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Instances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchInstances = useCallback(async () => {
    try {
      const res = await api.get("/admin/instances");
      setInstances(res.data);
    } catch {
      toast.error("Failed to load instances");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  if (loading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#A1A1AA", fontFamily: "JetBrains Mono", fontSize: "13px" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {showCreate && (
        <CreateInstanceModal
          onClose={() => setShowCreate(false)}
          onCreate={fetchInstances}
        />
      )}

      <p style={S.overline}>Superadmin</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <h1 style={{ ...S.h1, margin: 0 }}>Instance Management</h1>
        <button
          data-testid="create-instance-btn"
          onClick={() => setShowCreate(true)}
          style={S.btnPrimary}
        >
          <Plus size={15} />
          New Instance
        </button>
      </div>

      {instances.length === 0 ? (
        <div style={{
          backgroundColor: "#121212", border: "1px solid #262626",
          borderRadius: "6px", padding: "48px", textAlign: "center",
        }}>
          <Bot size={32} color="#262626" style={{ marginBottom: "16px" }} />
          <p style={{ color: "#A1A1AA", fontSize: "15px", fontFamily: "IBM Plex Sans, sans-serif", marginBottom: "8px" }}>
            No instances yet
          </p>
          <p style={{ color: "#404040", fontSize: "13px", fontFamily: "IBM Plex Sans, sans-serif", marginBottom: "20px" }}>
            Create your first bot instance to get started
          </p>
          <button onClick={() => setShowCreate(true)} style={S.btnPrimary}>
            <Plus size={15} /> Create First Instance
          </button>
        </div>
      ) : (
        <div>
          <p style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "11px",
            color: "#A1A1AA", marginBottom: "16px",
          }}>
            {instances.length} instance{instances.length !== 1 ? "s" : ""} — Click any row to expand and manage users
          </p>
          {instances.map(inst => (
            <InstanceRow key={inst.id} instance={inst} onRefresh={fetchInstances} />
          ))}
        </div>
      )}
    </div>
  );
}
