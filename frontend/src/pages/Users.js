import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Users as UsersIcon, CheckCircle, XCircle, Shield, Clock } from "lucide-react";

const S = {
  page: { padding: "32px 40px", fontFamily: "IBM Plex Sans, sans-serif" },
  header: { marginBottom: "28px" },
  title: { fontFamily: "Chivo, sans-serif", fontSize: "26px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px", margin: "0 0 4px" },
  subtitle: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", color: "#A1A1AA", margin: 0 },
  tabs: { display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid #1E1E1E", paddingBottom: "0" },
  tab: (active) => ({
    padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", fontWeight: "500",
    color: active ? "#FFFFFF" : "#A1A1AA",
    borderBottom: active ? "2px solid #0055FF" : "2px solid transparent",
    marginBottom: "-1px", transition: "color 0.15s",
  }),
  table: { width: "100%", borderCollapse: "collapse" },
  th: { fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #1E1E1E" },
  td: { padding: "14px 16px", borderBottom: "1px solid #0D0D0D", fontSize: "13px", color: "#FFFFFF", verticalAlign: "middle" },
  badge: (color) => ({
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "3px 8px", borderRadius: "3px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace",
    backgroundColor: color === "green" ? "rgba(0,255,102,0.08)" : color === "yellow" ? "rgba(245,158,11,0.08)" : "rgba(161,161,170,0.08)",
    color: color === "green" ? "#00FF66" : color === "yellow" ? "#F59E0B" : "#A1A1AA",
    border: `1px solid ${color === "green" ? "rgba(0,255,102,0.2)" : color === "yellow" ? "rgba(245,158,11,0.2)" : "rgba(161,161,170,0.15)"}`,
  }),
  instanceChip: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "3px", fontSize: "11px", fontFamily: "IBM Plex Sans, sans-serif", backgroundColor: "rgba(0,85,255,0.1)", color: "#0055FF", border: "1px solid rgba(0,85,255,0.2)", marginRight: "4px", marginBottom: "2px" },
  empty: { textAlign: "center", padding: "60px 0", color: "#A1A1AA", fontSize: "14px" },
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all"); // all | assigned | unassigned

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    if (tab === "assigned") return u.assigned_instances?.length > 0;
    if (tab === "unassigned") return !u.assigned_instances?.length;
    return true;
  });

  const unassignedCount = users.filter(u => !u.assigned_instances?.length && u.role !== "superadmin").length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <h1 style={S.title}>Users</h1>
          {unassignedCount > 0 && (
            <span style={{
              padding: "2px 8px", borderRadius: "3px", fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
              backgroundColor: "rgba(245,158,11,0.12)", color: "#F59E0B",
              border: "1px solid rgba(245,158,11,0.25)",
            }} data-testid="unassigned-count">
              {unassignedCount} unassigned
            </span>
          )}
        </div>
        <p style={S.subtitle}>All registered users and their workspace assignments. Assign instances from the Instances page.</p>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { key: "all", label: `All (${users.length})` },
          { key: "assigned", label: `Assigned (${users.filter(u => u.assigned_instances?.length > 0).length})` },
          { key: "unassigned", label: `Unassigned (${users.filter(u => !u.assigned_instances?.length).length})` },
        ].map(t => (
          <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)} data-testid={`tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#A1A1AA", fontSize: "13px", fontFamily: "JetBrains Mono" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          <UsersIcon size={32} color="#2A2A2A" style={{ marginBottom: "12px", display: "block", margin: "0 auto 12px" }} />
          <p>No users in this category</p>
        </div>
      ) : (
        <div style={{ backgroundColor: "#111111", border: "1px solid #1E1E1E", borderRadius: "6px", overflow: "hidden" }}>
          <table style={S.table}>
            <thead>
              <tr style={{ backgroundColor: "#0D0D0D" }}>
                <th style={S.th}>Email</th>
                <th style={S.th}>Role</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Assigned Instances</th>
                <th style={S.th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} data-testid={`user-row-${user.id}`}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#0A0A0A"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <td style={S.td}>
                    <span style={{ fontFamily: "IBM Plex Sans, sans-serif", fontWeight: "500" }}>{user.email}</span>
                  </td>
                  <td style={S.td}>
                    {user.role === "superadmin" ? (
                      <span style={{ ...S.badge("green"), gap: "4px" }}>
                        <Shield size={10} /> Admin
                      </span>
                    ) : (
                      <span style={S.badge("grey")}>User</span>
                    )}
                  </td>
                  <td style={S.td}>
                    {user.is_verified ? (
                      <span style={S.badge("green")} data-testid={`verified-${user.id}`}>
                        <CheckCircle size={10} /> Verified
                      </span>
                    ) : (
                      <span style={S.badge("yellow")} data-testid={`unverified-${user.id}`}>
                        <Clock size={10} /> Pending
                      </span>
                    )}
                  </td>
                  <td style={S.td}>
                    {user.role === "superadmin" ? (
                      <span style={{ color: "#404040", fontSize: "12px", fontStyle: "italic" }}>All instances</span>
                    ) : user.assigned_instances?.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
                        {user.assigned_instances.map(inst => (
                          <span key={inst.id} style={S.instanceChip}>{inst.name}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#F59E0B", fontSize: "12px" }}>
                        <XCircle size={12} /> Unassigned
                      </span>
                    )}
                  </td>
                  <td style={{ ...S.td, color: "#A1A1AA", fontFamily: "JetBrains Mono, monospace", fontSize: "11px" }}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
