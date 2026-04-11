import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Users as UsersIcon, CheckCircle, XCircle, Shield, Clock } from "lucide-react";
import { colors, fonts, T, rowEnter, rowLeave } from "../theme";

const badge = (color) => ({
  display: "inline-flex", alignItems: "center", gap: "4px",
  padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontFamily: fonts.mono,
  backgroundColor: color === "green" ? "rgba(52,211,153,0.08)" : color === "yellow" ? "rgba(245,158,11,0.08)" : "rgba(148,163,184,0.08)",
  color: color === "green" ? colors.brand.success : color === "yellow" ? colors.brand.warning : colors.text.secondary,
  border: `1px solid ${color === "green" ? "rgba(52,211,153,0.2)" : color === "yellow" ? "rgba(245,158,11,0.2)" : "rgba(148,163,184,0.15)"}`,
});

const instanceChip = {
  display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "10px",
  fontSize: "11px", fontFamily: fonts.body, backgroundColor: "rgba(59,130,246,0.1)",
  color: colors.brand.blue, border: "1px solid rgba(59,130,246,0.2)", marginRight: "4px", marginBottom: "2px",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const fetchUsers = useCallback(async () => {
    try { const res = await api.get("/admin/users"); setUsers(res.data); }
    catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    if (tab === "assigned") return u.assigned_instances?.length > 0;
    if (tab === "unassigned") return !u.assigned_instances?.length;
    return true;
  });

  const unassignedCount = users.filter(u => !u.assigned_instances?.length && u.role !== "superadmin").length;

  return (
    <div style={T.page}>
      <p style={T.overline}>Admin</p>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <h1 style={{ ...T.h1, margin: "0 0 32px" }}>Users</h1>
        {unassignedCount > 0 && (
          <span style={{
            padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontFamily: fonts.mono,
            backgroundColor: "rgba(245,158,11,0.12)", color: colors.brand.warning,
            border: "1px solid rgba(245,158,11,0.25)",
          }} data-testid="unassigned-count">
            {unassignedCount} unassigned
          </span>
        )}
      </div>
      <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.text.secondary, marginBottom: "20px", marginTop: "-20px" }}>
        All registered users and their workspace assignments. Assign instances from the Instances page.
      </p>

      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: `1px solid ${colors.border.default}` }}>
        {[
          { key: "all", label: `All (${users.length})` },
          { key: "assigned", label: `Assigned (${users.filter(u => u.assigned_instances?.length > 0).length})` },
          { key: "unassigned", label: `Unassigned (${users.filter(u => !u.assigned_instances?.length).length})` },
        ].map(t => (
          <button key={t.key} style={{
            padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
            fontFamily: fonts.body, fontSize: "13px", fontWeight: "500",
            color: tab === t.key ? colors.text.primary : colors.text.secondary,
            borderBottom: tab === t.key ? `2px solid ${colors.brand.cyan}` : "2px solid transparent",
            marginBottom: "-1px", transition: "color 0.15s",
          }} onClick={() => setTab(t.key)} data-testid={`tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: colors.text.secondary, fontSize: "13px", fontFamily: fonts.mono }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: colors.text.secondary, fontSize: "14px" }}>
          <UsersIcon size={32} color={colors.text.muted} style={{ display: "block", margin: "0 auto 12px" }} />
          <p>No users in this category</p>
        </div>
      ) : (
        <div style={{ backgroundColor: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                {["Email", "Role", "Status", "Assigned Instances", "Joined"].map(h => (<th key={h} style={T.th}>{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} data-testid={`user-row-${user.id}`}
                  style={{ borderBottom: `1px solid ${colors.border.faint}`, transition: "background 0.2s" }}
                  onMouseEnter={rowEnter} onMouseLeave={rowLeave}>
                  <td style={{ ...T.td, fontWeight: "500" }}>{user.email}</td>
                  <td style={T.td}>
                    {user.role === "superadmin" ? <span style={badge("green")}><Shield size={10} /> Admin</span> : <span style={badge("grey")}>User</span>}
                  </td>
                  <td style={T.td}>
                    {user.is_verified
                      ? <span style={badge("green")} data-testid={`verified-${user.id}`}><CheckCircle size={10} /> Verified</span>
                      : <span style={badge("yellow")} data-testid={`unverified-${user.id}`}><Clock size={10} /> Pending</span>}
                  </td>
                  <td style={T.td}>
                    {user.role === "superadmin"
                      ? <span style={{ color: colors.text.muted, fontSize: "12px", fontStyle: "italic" }}>All instances</span>
                      : user.assigned_instances?.length > 0
                        ? <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>{user.assigned_instances.map(inst => (<span key={inst.id} style={instanceChip}>{inst.name}</span>))}</div>
                        : <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: colors.brand.warning, fontSize: "12px" }}><XCircle size={12} /> Unassigned</span>}
                  </td>
                  <td style={{ ...T.td, color: colors.text.secondary, fontFamily: fonts.mono, fontSize: "11px" }}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "\u2014"}
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
