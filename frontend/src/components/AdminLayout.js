import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, BookOpen, MessageSquare, Settings,
  BarChart2, Zap, Code2, ExternalLink, Bot, LogOut, ChevronDown, Shield, Users
} from "lucide-react";
import { useState } from "react";
import { colors, fonts } from "@/theme";

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
      margin: "12px", padding: "12px",
      backgroundColor: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.2)`,
      borderRadius: "2px",
    }}>
      <p style={{
        fontFamily: fonts.body, fontSize: "12px",
        color: "#F59E0B", margin: 0, lineHeight: "1.5",
      }}>
        {isSuperAdmin
          ? "Select an instance to manage it."
          : "No workspace assigned. Contact your admin."}
      </p>
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleInstanceSwitch = (inst) => {
    selectInstance(inst);
    setDropdownOpen(false);
  };

  const hasInstance = !!selectedInstance;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: colors.bg.base }}>
      <aside style={{
        width: "240px",
        backgroundColor: colors.bg.surface,
        borderRight: `1px solid ${colors.border.default}`,
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0,
        height: "100vh",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${colors.border.default}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <div style={{
              width: "32px", height: "32px", backgroundColor: colors.brand.blue,
              borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 12px rgba(0, 136, 255, 0.4)`,
            }}>
              <Bot size={18} color="#FFFFFF" />
            </div>
            <div>
              <span style={{
                fontFamily: fonts.heading, fontSize: "18px",
                fontWeight: "700", color: colors.text.primary, letterSpacing: "-0.5px",
              }}>
                Bridge<span style={{ color: colors.brand.cyan }}>Bot</span>
              </span>
              <p style={{
                fontFamily: fonts.mono, fontSize: "9px",
                color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.2em",
                margin: 0,
              }}>AI PLATFORM</p>
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
                  padding: "8px 10px", backgroundColor: colors.bg.base,
                  border: `1px solid ${colors.border.default}`, borderRadius: "2px",
                  cursor: "pointer", transition: "border-color 0.3s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <div style={{
                    width: "20px", height: "20px", backgroundColor: "rgba(0,136,255,0.15)",
                    borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Bot size={11} color={colors.brand.blue} />
                  </div>
                  <span style={{
                    fontFamily: fonts.mono, fontSize: "11px",
                    color: selectedInstance ? colors.text.primary : colors.text.muted,
                    fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {selectedInstance ? selectedInstance.name : "Select workspace"}
                  </span>
                </div>
                <ChevronDown size={12} color={colors.text.muted} />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
                  backgroundColor: colors.bg.panel, border: `1px solid ${colors.border.default}`,
                  borderRadius: "2px", zIndex: 100, overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                }}>
                  {instances.map(inst => (
                    <button
                      key={inst.id}
                      data-testid={`switch-instance-${inst.id}`}
                      onClick={() => handleInstanceSwitch(inst)}
                      style={{
                        width: "100%", padding: "9px 12px",
                        backgroundColor: selectedInstance?.id === inst.id ? "rgba(0,245,255,0.08)" : "transparent",
                        border: "none", textAlign: "left", cursor: "pointer",
                        borderBottom: `1px solid ${colors.border.subtle}`,
                        transition: "background-color 0.2s",
                      }}
                    >
                      <span style={{
                        fontFamily: fonts.mono, fontSize: "11px",
                        color: selectedInstance?.id === inst.id ? colors.brand.cyan : colors.text.primary,
                        fontWeight: "500",
                      }}>
                        {inst.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* No instance warning */}
        {!hasInstance && <NoInstanceBanner isSuperAdmin={user?.role === "superadmin"} />}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px", overflowY: "auto" }}>
          {navItems.map(({ path, label, icon: Icon, exact }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 12px", marginBottom: "2px", borderRadius: "2px",
                textDecoration: "none",
                fontFamily: fonts.body, fontSize: "13px", fontWeight: "500",
                color: isActive ? colors.brand.cyan : colors.text.secondary,
                backgroundColor: isActive ? "rgba(0, 245, 255, 0.06)" : "transparent",
                borderLeft: isActive ? `2px solid ${colors.brand.cyan}` : "2px solid transparent",
                transition: "color 0.2s ease, background-color 0.2s ease",
              })}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user info + logout */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${colors.border.default}` }}>
          <a
            href={`/chat${selectedInstance ? `?instance=${selectedInstance.id}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="nav-open-chat"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              color: colors.brand.cyan, fontSize: "12px",
              fontFamily: fonts.body, fontWeight: "500",
              textDecoration: "none", marginBottom: "12px",
              transition: "text-shadow 0.3s",
            }}
          >
            <ExternalLink size={12} />
            Open Chat Demo
          </a>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 0", borderTop: `1px solid ${colors.border.subtle}`,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontFamily: fonts.body, fontSize: "12px",
                color: colors.text.primary, margin: 0, fontWeight: "500",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user?.email}
              </p>
              <p style={{
                fontFamily: fonts.mono, fontSize: "9px",
                color: user?.role === "superadmin" ? colors.brand.cyan : colors.text.muted,
                margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.15em",
              }}>
                {user?.role === "superadmin" ? "Admin" : "User"}
              </p>
            </div>
            <button
              data-testid="logout-btn"
              onClick={handleLogout}
              title="Sign out"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "6px", borderRadius: "2px", marginLeft: "8px",
                display: "flex", alignItems: "center",
                transition: "color 0.2s",
              }}
            >
              <LogOut size={14} color={colors.text.secondary} />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: "240px", flex: 1, minHeight: "100vh", backgroundColor: colors.bg.base }}
        onClick={() => dropdownOpen && setDropdownOpen(false)}
      >
        <Outlet />
      </main>
    </div>
  );
}
