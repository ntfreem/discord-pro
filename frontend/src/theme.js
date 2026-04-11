// Discord-Pro — Soft AI Bot Design System
// Rounded, approachable, lighter blue palette

export const colors = {
  bg: {
    base: "#0B1120",
    surface: "#111827",
    panel: "#1E293B",
    glass: "rgba(30, 41, 59, 0.7)",
    hover: "rgba(96, 165, 250, 0.06)",
  },
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    accent: "#60A5FA",
    muted: "#64748B",
    white: "#FFFFFF",
  },
  brand: {
    primary: "#3B82F6",
    light: "#60A5FA",
    lighter: "#93C5FD",
    soft: "#DBEAFE",
    glow: "rgba(59, 130, 246, 0.15)",
    error: "#F43F5E",
    success: "#34D399",
    warning: "#FBBF24",
    discord: "#5865F2",
    // Compat aliases
    cyan: "#60A5FA",
    blue: "#3B82F6",
  },
  border: {
    default: "rgba(148, 163, 184, 0.15)",
    active: "#60A5FA",
    muted: "rgba(148, 163, 184, 0.08)",
    subtle: "rgba(148, 163, 184, 0.1)",
    faint: "rgba(148, 163, 184, 0.06)",
  },
  shadow: {
    card: "0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)",
    cardHover: "0 8px 25px rgba(59, 130, 246, 0.12), 0 4px 10px rgba(0,0,0,0.2)",
    glow: "0 0 20px rgba(59, 130, 246, 0.15)",
    input: "0 0 0 3px rgba(59, 130, 246, 0.15)",
  },
};

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  full: "9999px",
};

export const fonts = {
  heading: "Outfit, sans-serif",
  body: "IBM Plex Sans, sans-serif",
  mono: "JetBrains Mono, monospace",
};

// Reusable style tokens
export const T = {
  page: {
    padding: "32px 40px",
    backgroundColor: colors.bg.base,
    minHeight: "100vh",
  },
  overline: {
    fontFamily: fonts.mono,
    fontSize: "11px",
    color: colors.brand.light,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    marginBottom: "6px",
  },
  h1: {
    fontFamily: fonts.heading,
    fontSize: "28px",
    fontWeight: "700",
    color: colors.text.primary,
    margin: "0 0 28px",
    letterSpacing: "-0.3px",
  },
  card: {
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.lg,
    padding: "24px",
    boxShadow: colors.shadow.card,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: "13px",
    color: colors.text.secondary,
    marginBottom: "6px",
    display: "block",
  },
  monoLabel: {
    fontFamily: fonts.mono,
    fontSize: "11px",
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    margin: 0,
  },
  input: {
    width: "100%",
    backgroundColor: colors.bg.panel,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    padding: "10px 14px",
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  },
  textarea: {
    width: "100%",
    backgroundColor: colors.bg.panel,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    padding: "10px 14px",
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    lineHeight: "1.6",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  },
  btnPrimary: {
    padding: "10px 20px",
    background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`,
    color: "#FFFFFF",
    border: "none",
    borderRadius: radius.md,
    fontSize: "13px",
    fontFamily: fonts.body,
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.25s ease",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
  },
  btnSecondary: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    color: colors.brand.light,
    border: `1px solid ${colors.border.active}`,
    borderRadius: radius.md,
    fontSize: "13px",
    fontFamily: fonts.body,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.25s ease",
  },
  btnGhost: {
    padding: "7px 12px",
    backgroundColor: "transparent",
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.sm,
    color: colors.text.secondary,
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: fonts.body,
    display: "flex",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.25s ease",
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: "15px",
    fontWeight: "600",
    color: colors.text.primary,
    margin: "0 0 4px",
  },
  sectionSub: {
    fontFamily: fonts.body,
    fontSize: "13px",
    color: colors.text.secondary,
    margin: "0 0 20px",
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: "11px",
    color: colors.text.muted,
    marginTop: "5px",
  },
  th: {
    padding: "10px 20px",
    textAlign: "left",
    fontFamily: fonts.mono,
    fontSize: "10px",
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: "500",
  },
  td: {
    padding: "12px 20px",
    fontFamily: fonts.body,
    fontSize: "13px",
    color: colors.text.primary,
  },
  err: {
    backgroundColor: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    borderRadius: radius.md,
    padding: "10px 14px",
    color: colors.brand.error,
    fontSize: "13px",
    marginBottom: "16px",
  },
  success: {
    backgroundColor: "rgba(52, 211, 153, 0.08)",
    border: "1px solid rgba(52, 211, 153, 0.2)",
    borderRadius: radius.md,
    padding: "10px 14px",
    color: colors.brand.success,
    fontSize: "13px",
    marginBottom: "16px",
  },
};

// Focus/blur handlers for inputs
export const onFocus = (e) => {
  e.target.style.borderColor = colors.brand.light;
  e.target.style.boxShadow = colors.shadow.input;
};
export const onBlur = (e) => {
  e.target.style.borderColor = "rgba(148, 163, 184, 0.15)";
  e.target.style.boxShadow = "none";
};

// Row hover helpers
export const rowEnter = (e) => {
  e.currentTarget.style.backgroundColor = colors.bg.hover;
};
export const rowLeave = (e) => {
  e.currentTarget.style.backgroundColor = "transparent";
};
