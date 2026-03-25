// src/theme.js — SweatDebt MINT CHALKBOARD LIGHT
// Mint-tinted white #f0fdf4 bg · White cards · Deep forest #052e16 panels · Emerald #10b981 accent

const T = {
  bg0:   "#f0fdf4",
  bg1:   "#ffffff",
  bg2:   "#f0fdf4",
  bg3:   "#dcfce7",
  panel: "#052e16",

  textDark:  "#052e16",
  textMid:   "#166534",
  textMuted: "#6b7280",
  textLight: "#ffffff",
  textFaded: "rgba(255,255,255,0.45)",

  accent:       "#10b981",
  accentLight:  "#d1fae5",
  accentBorder: "rgba(16,185,129,0.45)",
  accentDark:   "#059669",

  // orange aliases so old code still works
  orange:       "#10b981",
  orangeLight:  "#d1fae5",
  orangeBorder: "rgba(16,185,129,0.45)",
  orangeDark:   "#059669",

  green:        "#10b981",
  greenLight:   "#d1fae5",
  greenBorder:  "rgba(16,185,129,0.4)",

  red:          "#ef4444",
  redLight:     "#fee2e2",
  redBorder:    "rgba(239,68,68,0.4)",

  yellow:       "#f59e0b",
  yellowLight:  "#fef3c7",
  yellowBorder: "rgba(245,158,11,0.4)",

  border:       "rgba(5,46,22,0.1)",
  borderMid:    "rgba(5,46,22,0.18)",
  borderCard:   "rgba(5,46,22,0.07)",
  borderOrange: "rgba(16,185,129,0.4)",

  fontDisplay: "'Bebas Neue','Arial Black',sans-serif",
  fontBody:    "'DM Sans','Inter',system-ui,sans-serif",
  fontMono:    "'DM Mono','SF Mono',monospace",

  r8:"8px", r12:"12px", r14:"14px", r16:"16px",
  r20:"20px", r24:"24px", rFull:"9999px",

  shadowSm:  "0 2px 8px rgba(5,46,22,0.08)",
  shadowMd:  "0 4px 16px rgba(5,46,22,0.10)",
  shadowLg:  "0 8px 32px rgba(5,46,22,0.12)",
  shadowCard:"0 2px 12px rgba(5,46,22,0.07)",

  status:{
    pending:  {label:"PENDING",  color:"#f59e0b",bg:"#fef3c7",border:"rgba(245,158,11,0.4)"},
    accepted: {label:"ACTIVE",   color:"#10b981",bg:"#d1fae5",border:"rgba(16,185,129,0.4)"},
    lost:     {label:"LOST",     color:"#ef4444",bg:"#fee2e2",border:"rgba(239,68,68,0.4)"},
    won:      {label:"WON",      color:"#10b981",bg:"#d1fae5",border:"rgba(16,185,129,0.4)"},
    completed:{label:"DONE",     color:"#10b981",bg:"#d1fae5",border:"rgba(16,185,129,0.4)"},
    disputed: {label:"DISPUTED", color:"#ef4444",bg:"#fee2e2",border:"rgba(239,68,68,0.4)"},
    declined: {label:"DECLINED", color:"#6b7280",bg:"#f3f4f6",border:"rgba(107,114,128,0.3)"},
  },
};

export default T;
export const statusStyle = k => T.status[k] || T.status.pending;

export const panelStyle = (radius = T.r16) => ({
  background: T.panel, borderRadius: radius, overflow:"hidden",
});
export const cardStyle = (opts = {}) => ({
  background: T.bg1, border:`1px solid ${T.borderCard}`,
  borderRadius: opts.radius || T.r16, boxShadow: T.shadowCard, overflow:"hidden",
});
export const btnPrimary = {
  background:T.panel, border:"none", borderRadius:T.r16,
  padding:"15px 24px", fontFamily:T.fontDisplay, fontSize:"20px",
  letterSpacing:"0.05em", color:T.accent, cursor:"pointer",
  width:"100%", boxShadow:"0 4px 14px rgba(5,46,22,0.25)", transition:"all 0.15s",
};
export const btnAccent = {
  background:T.accent, border:"none", borderRadius:T.r16,
  padding:"15px 24px", fontFamily:T.fontDisplay, fontSize:"20px",
  letterSpacing:"0.05em", color:"#fff", cursor:"pointer",
  width:"100%", boxShadow:"0 4px 14px rgba(16,185,129,0.35)", transition:"all 0.15s",
};
export const btnNavy = btnPrimary;
export const btnOutline = {
  background:"transparent", border:`1.5px solid rgba(5,46,22,0.18)`,
  borderRadius:T.r16, padding:"14px 24px", fontFamily:T.fontDisplay,
  fontSize:"20px", letterSpacing:"0.05em", color:T.textDark,
  cursor:"pointer", width:"100%", transition:"all 0.15s",
};