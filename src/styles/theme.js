// Global theme — import this in every page
export const theme = {
  // Colors
  black: "#0a0a0a",
  dark: "#111",
  gray: "#1a1a1a",
  mid: "#222",
  border: "#2a2a2a",
  white: "#f5f0e8",
  muted: "#555",
  acid: "#d4ff00",
  orange: "#ff5c1a",
  green: "#00e676",
  red: "#ff4444",
  blue: "#4a9eff",

  // Typography
  fontDisplay: "'Bebas Neue', sans-serif",
  fontBody: "'DM Sans', sans-serif",
  fontMono: "'DM Mono', monospace",

  // Font sizes
  displayXL: "48px",
  displayLG: "36px",
  displayMD: "28px",
  displaySM: "22px",
  bodyLG: "17px",
  bodyMD: "15px",
  bodySM: "13px",
  bodyXS: "11px",
  mono: "12px",

  // Spacing
  pagePad: "16px",
  headerPad: "52px 16px 16px",

  // Radius
  radiusSM: "10px",
  radiusMD: "14px",
  radiusLG: "20px",
  radiusXL: "24px",
  radiusFull: "999px",
};

// Reusable text styles
export const T = {
  // Display headings — Bebas Neue
  hero: { fontFamily: theme.fontDisplay, fontSize: "56px", color: theme.white, letterSpacing: "0.02em", lineHeight: 0.95 },
  h1: { fontFamily: theme.fontDisplay, fontSize: "40px", color: theme.white, letterSpacing: "0.03em", lineHeight: 1 },
  h2: { fontFamily: theme.fontDisplay, fontSize: "32px", color: theme.white, letterSpacing: "0.03em", lineHeight: 1 },
  h3: { fontFamily: theme.fontDisplay, fontSize: "26px", color: theme.white, letterSpacing: "0.03em", lineHeight: 1 },
  h4: { fontFamily: theme.fontDisplay, fontSize: "22px", color: theme.white, letterSpacing: "0.03em", lineHeight: 1 },
  h5: { fontFamily: theme.fontDisplay, fontSize: "18px", color: theme.white, letterSpacing: "0.03em", lineHeight: 1 },

  // Stat numbers — Bebas Neue
  statXL: { fontFamily: theme.fontDisplay, fontSize: "48px", color: theme.white, lineHeight: 1 },
  statLG: { fontFamily: theme.fontDisplay, fontSize: "36px", color: theme.white, lineHeight: 1 },
  statMD: { fontFamily: theme.fontDisplay, fontSize: "28px", color: theme.white, lineHeight: 1 },

  // Body — DM Sans
  bodyLG: { fontFamily: theme.fontBody, fontSize: "17px", color: theme.white, lineHeight: 1.5 },
  bodyMD: { fontFamily: theme.fontBody, fontSize: "15px", color: theme.white, lineHeight: 1.5 },
  bodySM: { fontFamily: theme.fontBody, fontSize: "13px", color: theme.white, lineHeight: 1.5 },
  bodyMuted: { fontFamily: theme.fontBody, fontSize: "14px", color: theme.muted, lineHeight: 1.5 },

  // Labels — DM Mono
  label: { fontFamily: theme.fontMono, fontSize: "11px", color: theme.muted, letterSpacing: "0.1em", textTransform: "uppercase" },
  mono: { fontFamily: theme.fontMono, fontSize: "12px", color: theme.muted },
  monoBold: { fontFamily: theme.fontMono, fontSize: "13px", color: theme.white, fontWeight: "500" },
};

// Reusable component styles
export const C = {
  page: { minHeight: "100vh", background: theme.dark, paddingBottom: "90px" },
  header: { padding: "52px 16px 16px" },
  card: { background: theme.gray, borderRadius: theme.radiusLG, padding: "18px", border: `1px solid ${theme.border}`, marginBottom: "10px" },
  btn: { background: theme.acid, border: "none", borderRadius: theme.radiusMD, padding: "18px", fontFamily: theme.fontDisplay, fontSize: "22px", letterSpacing: "0.06em", color: theme.black, cursor: "pointer", width: "100%", minHeight: "58px" },
  btnOutline: { background: "transparent", border: `1px solid ${theme.border}`, borderRadius: theme.radiusMD, padding: "16px", fontFamily: theme.fontBody, fontSize: "15px", color: theme.muted, cursor: "pointer", width: "100%", minHeight: "52px" },
  input: { width: "100%", background: theme.gray, border: `1px solid ${theme.border}`, borderRadius: theme.radiusMD, padding: "14px 16px", color: theme.white, fontSize: "16px", fontFamily: theme.fontBody, outline: "none" },
  sectionLabel: { fontFamily: "'DM Mono', monospace", fontSize: "11px", color: theme.muted, letterSpacing: "0.12em", textTransform: "uppercase", padding: "16px 16px 10px" },
  avatar: (size=44) => ({ width: size+"px", height: size+"px", borderRadius: "50%", background: `linear-gradient(135deg,${theme.acid},${theme.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size*0.36)+"px", fontWeight: "700", color: theme.black, flexShrink: 0, fontFamily: theme.fontDisplay }),
};