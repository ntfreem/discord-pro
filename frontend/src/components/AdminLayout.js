import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, BookOpen, MessageSquare, Settings,
  BarChart2, Zap, Code2, ExternalLink, Bot, LogOut, ChevronDown, Shield, Users
} from "lucide-react";
import { useState } from "react";
import { colors, fonts, radius } from "@/theme";

const baseNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/knowledge", label: "Knowledge Base", icon: BookOpen },
  { path: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  { path: "/admin/settings", label: "Bot Settings", icon: Settings },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/admin/discord", label: "Discord", icon: Zap },
  { path: "/admin/embed", label: "Embed Code", icon: Code2 },
];

const adminNavItem = { path: "/admin/instances", label: "Instances", icon: Shield };
const usersNavItem = { path: "/admin/users", label: "Users", icon: Users };

function NoInstanceBanner({ isSuperAdmin }) {
  return (
    <div style={{
      margin: "12px", padding: "12px 14px",
      backgroundColor: "rgba(251, 191, 36, 0.06)", border: "1px solid rgba(251, 191, 36, 0.15)",
      borderRadius: radius.md, fontSize: "12px", color: colors.brand.warning,
      fontFamily: fonts.body, lineHeight: "1.5",
    }}>
      {isSuperAdmin
        ? "Select an instance to manage it."
        : "No workspace assigned. Contact your admin."}
    </div>
  );
}

export default function AdminLayout() {
  const { user, instances, selectedInstance, selectInstance, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navItems = user?.role === "superadmin"
    ? [...baseNavItems, adminNavItem, usersNavItem]
    : baseNavItems;

  const handleLogout = () => { logout(); navigate("/login"); };
  const handleInstanceSwitch = (inst) => { selectInstance(inst); setDropdownOpen(false); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: colors.bg.base }}>
      <aside style={{
        width: "250px", backgroundColor: colors.bg.surface,
        borderRight: `1px solid ${colors.border.default}`,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${colors.border.default}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{
              width: "36px", height: "36px",
              background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`,
              borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
            }}>
              <Bot size={20} color="#FFFFFF" />
            </div>
            <div>
              <span style={{
                fontFamily: fonts.heading, fontSize: "18px", fontWeight: "700",
                color: colors.text.primary, letterSpacing: "-0.3px",
              }}>
                Bridge<span style={{ color: colors.brand.light }}>Bot</span>
              </span>
              <p style={{
                fontFamily: fonts.mono, fontSize: "9px", color: colors.text.muted,
                textTransform: "uppercase", letterSpacing: "0.15em", margin: 0,
              }}>AI Platform</p>
            </div>
          </div>

          {/* Instance selector */}
          {instances.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                data-testid="instance-switcher"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", backgroundColor: colors.bg.panel,
                  border: `1px solid ${colors.border.default}`, borderRadius: radius.md,
                  cursor: "pointer", transition: "border-color 0.25s, box-shadow 0.25s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <div style={{
                    width: "22px", height: "22px",
                    background: `linear-gradient(135deg, rgba(59,130,246,0.2), rgba(96,165,250,0.1))`,
                    borderRadius: radius.sm, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Bot size={11} color={colors.brand.light} />
                  </div>
                  <span style={{
                    fontFamily: fonts.body, fontSize: "12px", fontWeight: "500",
                    color: selectedInstance ? colors.text.primary : colors.text.muted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {selectedInstance ? selectedInstance.name : "Select workspace"}
                  </span>
                </div>
                <ChevronDown size={13} color={colors.text.muted} style={{ transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "none" }} />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  backgroundColor: colors.bg.panel, border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.md, zIndex: 100, overflow: "hidden",
                  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
                }}>
                  {instances.map(inst => (
                    <button
                      key={inst.id}
                      data-testid={`switch-instance-${inst.id}`}
                      onClick={() => handleInstanceSwitch(inst)}
                      style={{
                        width: "100%", padding: "10px 14px",
                        backgroundColor: selectedInstance?.id === inst.id ? colors.bg.hover : "transparent",
                        border: "none", textAlign: "left", cursor: "pointer",
                        borderBottom: `1px solid ${colors.border.muted}`,
                        transition: "background-color 0.15s",
                        fontFamily: fonts.body, fontSize: "12px", fontWeight: "500",
                        color: selectedInstance?.id === inst.id ? colors.brand.light : colors.text.primary,
                      }}
                    >
                      {inst.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!selectedInstance && <NoInstanceBanner isSuperAdmin={user?.role === "superadmin"} />}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 12px", overflowY: "auto" }}>
          {navItems.map(({ path, label, icon: Icon, exact }) => (
            <NavLink
              key={path} to={path} end={exact}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 14px", marginBottom: "2px", borderRadius: radius.md,
                textDecoration: "none",
                fontFamily: fonts.body, fontSize: "13px", fontWeight: isActive ? "600" : "400",
                color: isActive ? colors.brand.light : colors.text.secondary,
                backgroundColor: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
                transition: "all 0.2s ease",
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${colors.border.default}` }}>
          <a
            href={`/chat${selectedInstance ? `?instance=${selectedInstance.id}` : ""}`}
            target="_blank" rel="noopener noreferrer"
            data-testid="nav-open-chat"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              color: colors.brand.light, fontSize: "12px",
              fontFamily: fonts.body, fontWeight: "500",
              textDecoration: "none", marginBottom: "14px",
              transition: "color 0.2s",
            }}
          >
            <ExternalLink size={12} /> Open Chat Demo
          </a>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0",
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontFamily: fonts.body, fontSize: "12px", fontWeight: "500",
                color: colors.text.primary, margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{user?.email}</p>
              <p style={{
                fontFamily: fonts.mono, fontSize: "9px",
                color: user?.role === "superadmin" ? colors.brand.light : colors.text.muted,
                margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.12em",
              }}>{user?.role === "superadmin" ? "Admin" : "User"}</p>
            </div>
            <button
              data-testid="logout-btn" onClick={handleLogout} title="Sign out"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "6px", borderRadius: radius.sm, marginLeft: "8px",
                display: "flex", alignItems: "center", transition: "opacity 0.2s",
              }}
            >
              <LogOut size={15} color={colors.text.secondary} />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: "250px", flex: 1, minHeight: "100vh", backgroundColor: colors.bg.base }}
        onClick={() => dropdownOpen && setDropdownOpen(false)}
      >
        <Outlet />
      </main>
    </div>
  );
}
