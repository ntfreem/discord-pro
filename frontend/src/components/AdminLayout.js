import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, MessageSquare, Settings,
  BarChart2, Zap, Code2, ExternalLink, Bot
} from "lucide-react";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/knowledge", label: "Knowledge Base", icon: BookOpen },
  { path: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  { path: "/admin/settings", label: "Bot Settings", icon: Settings },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/admin/discord", label: "Discord", icon: Zap },
  { path: "/admin/embed", label: "Embed Code", icon: Code2 },
];

const sidebarStyle = {
  width: "240px",
  backgroundColor: "#0A0A0A",
  borderRight: "1px solid #262626",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  top: 0,
  left: 0,
  height: "100vh",
  zIndex: 10,
};

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0A0A0A" }}>
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid #262626" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", backgroundColor: "#0055FF",
              borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Bot size={18} color="#FFFFFF" />
            </div>
            <div>
              <span style={{
                fontFamily: "Chivo, sans-serif", fontSize: "18px",
                fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px"
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
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
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

        {/* Bottom */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #262626" }}>
          <a
            href="/chat"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="nav-open-chat"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              color: "#0055FF", fontSize: "13px",
              fontFamily: "IBM Plex Sans, sans-serif", fontWeight: "500",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={13} />
            Open Chat Demo
          </a>
        </div>
      </aside>

      <main style={{ marginLeft: "240px", flex: 1, minHeight: "100vh", backgroundColor: "#0A0A0A" }}>
        <Outlet />
      </main>
    </div>
  );
}
