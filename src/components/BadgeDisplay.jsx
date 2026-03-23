// src/components/BadgeDisplay.jsx
// Used in profiles to show all earned badges
// Also exports BadgeToast for showing newly earned badges

import React, { useState, useEffect } from "react";
import { BADGES, getBadgeInfo } from "../utils/streaks";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", border1:"#1e3a5f", purple:"#a855f7",
  amber:"#f59e0b", green:"#00e676",
};

// ── Full badge grid for profile page ─────────────────────────────────────────
export default function BadgeDisplay({ earnedBadgeIds = [], compact = false }) {
  const earned = new Set(earnedBadgeIds);
  const allBadges = Object.values(BADGES);

  if (compact) {
    // Just show earned badges as small icons
    const earnedBadges = allBadges.filter(b => earned.has(b.id));
    if (earnedBadges.length === 0) return null;
    return (
      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
        {earnedBadges.map(b => (
          <div key={b.id} title={`${b.label} — ${b.desc}`} style={{
            background:"rgba(0,212,255,0.1)", border:"1px solid rgba(0,212,255,0.2)",
            borderRadius:"20px", padding:"4px 10px",
            display:"flex", alignItems:"center", gap:"5px",
          }}>
            <span style={{ fontSize:"14px" }}>{b.icon}</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.cyan, letterSpacing:"0.05em" }}>{b.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Full grid — shows all badges, locked ones are greyed out
  return (
    <div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>
        Badges ({earnedBadgeIds.length}/{allBadges.length})
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px" }}>
        {allBadges.map(b => {
          const isEarned = earned.has(b.id);
          return (
            <div key={b.id} style={{
              background: isEarned ? "rgba(0,212,255,0.08)" : C.bg2,
              border:`1px solid ${isEarned ? "rgba(0,212,255,0.3)" : C.border1}`,
              borderRadius:"14px", padding:"12px 10px", textAlign:"center",
              opacity: isEarned ? 1 : 0.4,
              transition:"all 0.2s",
            }}>
              <div style={{ fontSize:"28px", marginBottom:"6px", filter: isEarned ? "none" : "grayscale(100%)" }}>{b.icon}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", fontWeight:"600", color: isEarned ? C.cyan : C.muted, letterSpacing:"0.05em", marginBottom:"3px" }}>{b.label}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:C.dim, lineHeight:"1.4" }}>{b.desc}</div>
              {isEarned && (
                <div style={{ marginTop:"6px", width:"6px", height:"6px", borderRadius:"50%", background:C.cyan, margin:"6px auto 0", boxShadow:`0 0 6px ${C.cyan}` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Toast that pops up when a new badge is earned ─────────────────────────────
export function BadgeToast({ badgeId, onClose }) {
  const badge = getBadgeInfo(badgeId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 400); }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (!badge) return null;

  return (
    <>
      <style>{`@keyframes badgeIn{from{transform:translateY(-80px) scale(0.8);opacity:0}to{transform:translateY(0) scale(1);opacity:1}} @keyframes badgeOut{from{transform:translateY(0) scale(1);opacity:1}to{transform:translateY(-80px) scale(0.8);opacity:0}}`}</style>
      <div style={{
        position:"fixed", top:"60px", left:"50%", transform:"translateX(-50%)",
        zIndex:9999,
        animation: visible ? "badgeIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)" : "badgeOut 0.4s ease",
        width:"100%", maxWidth:"340px", padding:"0 20px",
      }}>
        <div style={{
          background:"linear-gradient(135deg,rgba(0,212,255,0.15),rgba(168,85,247,0.15))",
          border:"1px solid rgba(0,212,255,0.4)",
          borderRadius:"20px", padding:"16px 20px",
          display:"flex", alignItems:"center", gap:"14px",
          backdropFilter:"blur(20px)",
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize:"40px", flexShrink:0 }}>{badge.icon}</div>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"rgba(0,212,255,0.7)", letterSpacing:"0.1em", marginBottom:"3px" }}>BADGE UNLOCKED</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.white, letterSpacing:"0.04em", lineHeight:1, marginBottom:"3px" }}>{badge.label}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted }}>{badge.desc}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Streak flame component ────────────────────────────────────────────────────
export function StreakBadge({ streak, size = "normal" }) {
  if (!streak || streak < 1) return null;

  const config =
    streak >= 10 ? { icon:"👑", color:"#a855f7", bg:"rgba(168,85,247,0.15)", border:"rgba(168,85,247,0.4)" } :
    streak >= 5  ? { icon:"⚡", color:"#00d4ff", bg:"rgba(0,212,255,0.15)",  border:"rgba(0,212,255,0.4)"  } :
    streak >= 3  ? { icon:"🔥", color:"#f59e0b", bg:"rgba(245,158,11,0.15)", border:"rgba(245,158,11,0.4)" } :
                   { icon:"💪", color:"#64748b", bg:"rgba(100,116,139,0.1)", border:"rgba(100,116,139,0.3)" };

  const isSmall = size === "small";

  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:"5px",
      background:config.bg, border:`1px solid ${config.border}`,
      borderRadius:"20px", padding: isSmall ? "3px 8px" : "5px 12px",
    }}>
      <span style={{ fontSize: isSmall ? "12px" : "16px" }}>{config.icon}</span>
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isSmall ? "13px" : "18px", color:config.color, letterSpacing:"0.04em" }}>
        {streak} STREAK
      </span>
    </div>
  );
}