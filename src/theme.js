// src/theme.js
// ═══════════════════════════════════════════════════════════════
// SWEATDEBT — MIDNIGHT NEON DESIGN SYSTEM
// Single source of truth. Import this everywhere instead of
// hardcoding hex values. Change here → whole app updates.
// ═══════════════════════════════════════════════════════════════

export const T = {
  // ── Backgrounds ───────────────────────────────────────────────
  bg0:   "#0a0a0f",   // deepest black — page background
  bg1:   "#111118",   // card background
  bg2:   "#18181f",   // elevated card
  bg3:   "#1f1f28",   // input / chip background
  bg4:   "#26262f",   // hover state

  // ── Text ──────────────────────────────────────────────────────
  white: "#ffffff",   // primary text
  offWhite: "#f0eeff", // slightly warm white
  muted: "#6b6b80",   // secondary text
  dim:   "#3d3d50",   // tertiary / disabled

  // ── Brand accents ─────────────────────────────────────────────
  pink:    "#ff2d55",   // primary CTA — hot pink
  pinkDim: "rgba(255,45,85,0.12)",
  pinkBorder: "rgba(255,45,85,0.35)",

  orange:    "#ff9f0a",   // secondary accent — fire orange
  orangeDim: "rgba(255,159,10,0.12)",
  orangeBorder: "rgba(255,159,10,0.35)",

  // ── Semantic colours ──────────────────────────────────────────
  green:    "#30d158",   // success / win
  greenDim: "rgba(48,209,88,0.12)",
  greenBorder: "rgba(48,209,88,0.35)",

  red:    "#ff453a",   // error / danger / loss
  redDim: "rgba(255,69,58,0.12)",
  redBorder: "rgba(255,69,58,0.35)",

  yellow:    "#ffd60a",   // warning / pending
  yellowDim: "rgba(255,214,10,0.12)",
  yellowBorder: "rgba(255,214,10,0.35)",

  blue:    "#0a84ff",   // info
  blueDim: "rgba(10,132,255,0.12)",

  // ── Borders ───────────────────────────────────────────────────
  border:    "rgba(255,255,255,0.07)",   // default subtle border
  borderMid: "rgba(255,255,255,0.13)",   // slightly visible
  borderHot: "rgba(255,45,85,0.4)",      // pink glow border

  // ── Gradients (as CSS strings) ────────────────────────────────
  gradPrimary:  "linear-gradient(135deg,#ff2d55,#ff9f0a)",   // pink → orange (main CTA)
  gradFire:     "linear-gradient(135deg,#ff9f0a,#ff2d55)",   // orange → pink
  gradSubtle:   "linear-gradient(135deg,#1a1a2e,#16213e)",   // dark card
  gradOverlay:  "linear-gradient(to top,rgba(10,10,15,0.98) 0%,rgba(10,10,15,0.3) 40%,transparent 65%,rgba(10,10,15,0.5) 100%)",

  // ── Typography ────────────────────────────────────────────────
  fontDisplay: "'Bebas Neue', 'Arial Black', sans-serif",   // headings, numbers
  fontBody:    "'DM Sans', 'Inter', system-ui, sans-serif",  // body text
  fontMono:    "'DM Mono', 'SF Mono', monospace",            // labels, timestamps

  // ── Border radius ─────────────────────────────────────────────
  r8:  "8px",
  r12: "12px",
  r16: "16px",
  r20: "20px",
  r24: "24px",
  rFull: "9999px",

  // ── Shadows / glows ───────────────────────────────────────────
  glowPink:   "0 0 20px rgba(255,45,85,0.3)",
  glowOrange: "0 0 20px rgba(255,159,10,0.3)",
  glowGreen:  "0 0 12px rgba(48,209,88,0.3)",

  // ── Status config (use statusStyle(status) helper) ────────────
  status: {
    pending:   { label:"PENDING",   color:"#ffd60a", bg:"rgba(255,214,10,0.1)",   border:"rgba(255,214,10,0.35)"  },
    accepted:  { label:"ACTIVE",    color:"#ff9f0a", bg:"rgba(255,159,10,0.1)",   border:"rgba(255,159,10,0.35)"  },
    lost:      { label:"LOST",      color:"#ff453a", bg:"rgba(255,69,58,0.1)",    border:"rgba(255,69,58,0.35)"   },
    won:       { label:"WON",       color:"#30d158", bg:"rgba(48,209,88,0.1)",    border:"rgba(48,209,88,0.35)"   },
    completed: { label:"DONE",      color:"#30d158", bg:"rgba(48,209,88,0.1)",    border:"rgba(48,209,88,0.35)"   },
    disputed:  { label:"DISPUTED",  color:"#ff9f0a", bg:"rgba(255,159,10,0.1)",   border:"rgba(255,159,10,0.35)"  },
    declined:  { label:"DECLINED",  color:"#6b6b80", bg:"rgba(107,107,128,0.1)", border:"rgba(107,107,128,0.3)"  },
  },
};

// ── Helper: get status style by key ──────────────────────────────
export const statusStyle = (key) => T.status[key] || T.status.pending;

// ── Helper: gradient text style (for JSX inline styles) ──────────
export const gradientText = {
  background: T.gradPrimary,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

// ── Helper: pill badge ────────────────────────────────────────────
export const pillStyle = (color, bg, border) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: T.rFull,
  padding: "4px 10px",
  fontFamily: T.fontMono,
  fontSize: "11px",
  fontWeight: "700",
  color,
  letterSpacing: "0.06em",
});

// ── Helper: card style ────────────────────────────────────────────
export const cardStyle = (opts = {}) => ({
  background: opts.elevated ? T.bg2 : T.bg1,
  border: `1px solid ${opts.hot ? T.borderHot : T.border}`,
  borderRadius: opts.radius || T.r20,
  overflow: "hidden",
  ...opts,
});

// ── Helper: primary button ────────────────────────────────────────
export const btnPrimary = {
  background: T.gradPrimary,
  border: "none",
  borderRadius: T.r16,
  padding: "16px 24px",
  fontFamily: T.fontDisplay,
  fontSize: "22px",
  letterSpacing: "0.06em",
  color: "#fff",
  cursor: "pointer",
  width: "100%",
  transition: "opacity 0.2s, transform 0.1s",
};

export const btnSecondary = {
  background: "transparent",
  border: `1px solid ${T.borderMid}`,
  borderRadius: T.r16,
  padding: "14px 24px",
  fontFamily: T.fontDisplay,
  fontSize: "20px",
  letterSpacing: "0.06em",
  color: T.white,
  cursor: "pointer",
  width: "100%",
  transition: "all 0.2s",
};

export const btnGhost = {
  background: "transparent",
  border: "none",
  padding: "10px 16px",
  fontFamily: T.fontBody,
  fontSize: "14px",
  color: T.muted,
  cursor: "pointer",
};

export default T;