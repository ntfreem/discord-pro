import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, BookOpen, MessageSquare, Settings,
  BarChart2, Zap, Code2, ExternalLink, Bot, LogOut, ChevronDown, Shield
} from "lucide-react";
import { useState } from "react";

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

const sidebarStyle = {
  width: "240px",
  backgroundColor: "#0A0A0A",
  borderRight: "1px solid #262626",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  top: 0, left: 0,
  height: "100vh",
  zIndex: 10,
};

function NoInstanceBanner({ isSuperAdmin }) {
  return (
    <div style={{
      margin: "12px", padding: "12px",
      backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
      borderRadius: "4px",
    }}>
      <p style={{
        fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px",
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
    ? [...baseNavItems, adminNavItem]
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
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0A0A0A" }}>
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #262626" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <div style={{
              width: "32px", height: "32px", backgroundColor: "#0055FF",
              borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={18} color="#FFFFFF" />
            </div>
            <div>
              <span style={{
                fontFamily: "Chivo, sans-serif", fontSize: "18px",
                fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px",
              }}>
                Bot<span style={{ color: "#0055FF" }}>Forge</span>
              </span>
              <p style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
                color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.2em",
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
                  padding: "8px 10px", backgroundColor: "#141414",
                  border: "1px solid #262626", borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <div style={{
                    width: "20px", height: "20px", backgroundColor: "rgba(0,85,255,0.2)",
                    borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Bot size={11} color="#0055FF" />
                  </div>
                  <span style={{
                    fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px",
                    color: selectedInstance ? "#FFFFFF" : "#A1A1AA",
                    fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {selectedInstance ? selectedInstance.name : "Select workspace"}
                  </span>
                </div>
                <ChevronDown size={12} color="#A1A1AA" />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
                  backgroundColor: "#1A1A1A", border: "1px solid #262626",
                  borderRadius: "4px", zIndex: 100, overflow: "hidden",
                }}>
                  {instances.map(inst => (
                    <button
                      key={inst.id}
                      data-testid={`switch-instance-${inst.id}`}
                      onClick={() => handleInstanceSwitch(inst)}
                      style={{
                        width: "100%", padding: "9px 12px",
                        backgroundColor: selectedInstance?.id === inst.id ? "#0055FF22" : "transparent",
                        border: "none", textAlign: "left", cursor: "pointer",
                        borderBottom: "1px solid #262626",
                      }}
                    >
                      <span style={{
                        fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px",
                        color: selectedInstance?.id === inst.id ? "#0055FF" : "#FFFFFF", fontWeight: "500",
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
                padding: "9px 12px", marginBottom: "2px", borderRadius: "4px",
                textDecoration: "none",
                fontFamily: "IBM Plex Sans, sans-serif", fontSize: "13px", fontWeight: "500",
                color: isActive ? "#FFFFFF" : "#A1A1AA",
                backgroundColor: isActive ? "#1A1A1A" : "transparent",
                borderLeft: isActive ? "2px solid #0055FF" : "2px solid transparent",
                transition: "color 0.15s ease, background-color 0.15s ease",
              })}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user info + logout */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #262626" }}>
          <a
            href={`/chat${selectedInstance ? `?instance=${selectedInstance.id}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="nav-open-chat"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              color: "#0055FF", fontSize: "12px",
              fontFamily: "IBM Plex Sans, sans-serif", fontWeight: "500",
              textDecoration: "none", marginBottom: "12px",
            }}
          >
            <ExternalLink size={12} />
            Open Chat Demo
          </a>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 0", borderTop: "1px solid #1A1A1A",
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontFamily: "IBM Plex Sans, sans-serif", fontSize: "12px",
                color: "#FFFFFF", margin: 0, fontWeight: "500",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user?.email}
              </p>
              <p style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
                color: user?.role === "superadmin" ? "#0055FF" : "#A1A1AA",
                margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.1em",
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
                padding: "6px", borderRadius: "4px", marginLeft: "8px",
                display: "flex", alignItems: "center",
              }}
            >
              <LogOut size={14} color="#A1A1AA" />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: "240px", flex: 1, minHeight: "100vh", backgroundColor: "#0A0A0A" }}
        onClick={() => dropdownOpen && setDropdownOpen(false)}
      >
        <Outlet />
      </main>
    </div>
  );
}
