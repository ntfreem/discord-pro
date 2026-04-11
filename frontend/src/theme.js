// Tron "Tactical Futurism" Design System
// Shared color palette, typography, and component tokens

export const colors = {
  bg: {
    base: "#030712",
    surface: "#050B14",
    panel: "#0B132B",
    glass: "rgba(11, 19, 43, 0.6)",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#94A3B8",
    accent: "#00F5FF",
    muted: "#475569",
  },
  brand: {
    cyan: "#00F5FF",
    blue: "#0088FF",
    void: "#050510",
    error: "#FF003C",
    success: "#00FF66",
    discord: "#5865F2",
    warning: "#F59E0B",
  },
  border: {
    default: "rgba(0, 136, 255, 0.3)",
    active: "#00F5FF",
    muted: "rgba(255, 255, 255, 0.1)",
    subtle: "rgba(0, 136, 255, 0.15)",
    faint: "rgba(0, 136, 255, 0.08)",
  },
};

export const fonts = {
  heading: "Outfit, sans-serif",
  body: "IBM Plex Sans, sans-serif",
  mono: "JetBrains Mono, monospace",
};

// Reusable style tokens for pages
export const T = {
  page: {
    padding: "40px 48px",
    backgroundColor: colors.bg.base,
    minHeight: "100vh",
  },
  overline: {
    fontFamily: fonts.mono,
    fontSize: "11px",
    color: colors.brand.cyan,
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    marginBottom: "8px",
  },
  h1: {
    fontFamily: fonts.heading,
    fontSize: "30px",
    fontWeight: "700",
    color: colors.text.primary,
    margin: "0 0 32px",
    letterSpacing: "-0.5px",
  },
  card: {
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: "2px",
    padding: "24px",
  },
  label: {
    fontFamily: fonts.body,
    fontSize: "13px",
    color: colors.text.secondary,
    marginBottom: "8px",
    display: "block",
  },
  monoLabel: {
    fontFamily: fonts.mono,
    fontSize: "11px",
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    margin: 0,
  },
  input: {
    width: "100%",
    backgroundColor: colors.bg.base,
    border: `1px solid rgba(0, 136, 255, 0.4)`,
    borderRadius: "2px",
    padding: "10px 14px",
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  textarea: {
    width: "100%",
    backgroundColor: colors.bg.base,
    border: `1px solid rgba(0, 136, 255, 0.4)`,
    borderRadius: "2px",
    padding: "10px 14px",
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    lineHeight: "1.6",
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  btnPrimary: {
    padding: "10px 20px",
    backgroundColor: colors.brand.blue,
    color: colors.text.primary,
    border: `1px solid rgba(0, 245, 255, 0.5)`,
    borderRadius: "2px",
    fontSize: "13px",
    fontFamily: fonts.body,
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.3s",
  },
  btnSecondary: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    color: colors.brand.cyan,
    border: `1px solid rgba(0, 136, 255, 0.5)`,
    borderRadius: "2px",
    fontSize: "13px",
    fontFamily: fonts.body,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  btnGhost: {
    padding: "6px 10px",
    backgroundColor: "transparent",
    border: `1px solid ${colors.border.default}`,
    borderRadius: "2px",
    color: colors.text.secondary,
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: fonts.body,
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.3s",
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: "15px",
    fontWeight: "600",
    color: colors.text.primary,
    margin: "0 0 6px",
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
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontWeight: "400",
  },
  td: {
    padding: "12px 20px",
    fontFamily: fonts.body,
    fontSize: "13px",
    color: colors.text.primary,
  },
  err: {
    backgroundColor: "rgba(255, 0, 60, 0.08)",
    border: "1px solid rgba(255, 0, 60, 0.3)",
    borderRadius: "2px",
    padding: "10px 14px",
    color: colors.brand.error,
    fontSize: "13px",
    marginBottom: "16px",
  },
  success: {
    backgroundColor: "rgba(0, 255, 102, 0.08)",
    border: "1px solid rgba(0, 255, 102, 0.2)",
    borderRadius: "2px",
    padding: "10px 14px",
    color: colors.brand.success,
    fontSize: "13px",
    marginBottom: "16px",
  },
};

// Focus/blur handlers for inputs
export const onFocus = (e) => {
  e.target.style.borderColor = colors.brand.cyan;
  e.target.style.boxShadow = `0 0 8px rgba(0, 245, 255, 0.15)`;
};
export const onBlur = (e) => {
  e.target.style.borderColor = "rgba(0, 136, 255, 0.4)";
  e.target.style.boxShadow = "none";
};

// Row hover helpers
export const rowEnter = (e) => {
  e.currentTarget.style.backgroundColor = "rgba(0, 245, 255, 0.04)";
};
export const rowLeave = (e) => {
  e.currentTarget.style.backgroundColor = "transparent";
};
