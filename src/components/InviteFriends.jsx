// src/components/InviteFriends.jsx
// Night Gold palette — matches ProfileOverlay design

import React, { useState } from "react";
import { getReferralLink, getReferralWhatsAppMsg } from "../utils/referral";
import T from "../theme";

const NAVY   = "#2C4A3E";
const GOLD   = "#10b981";
const ORANGE = "#6ee7b7";
const SAND   = "#f0fdf4";
const SAND2  = "#d1fae5";
const WHITE  = "#ffffff";
const MUTED  = "#6b7280";
const BORDER = "#d1fae5";

export default function InviteFriends({ user, referralCount = 0 }) {
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const link  = getReferralLink(user.uid);
  const waMsg = getReferralWhatsAppMsg(user.displayName, user.uid);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch(e) {}
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`);
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title:"Join SweatDebt!", text:waMsg, url:link });
      else handleCopy();
    } catch(e) {}
  };

  return (
    <div style={{
      background: WHITE,
      border: `1px solid ${BORDER}`,
      borderRadius: "16px",
      overflow: "hidden",
      marginBottom: "10px",
    }}>
      {/* ── Header — navy/gold to match ME page hero ── */}
      <div style={{
        background: NAVY,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle ring decoration matching hero */}
        <div style={{ position:"absolute", top:"-10px", right:"-10px", width:"70px", height:"70px", opacity:0.07, pointerEvents:"none" }}>
          <svg viewBox="0 0 70 70" fill="none" width="70" height="70">
            <circle cx="70" cy="0" r="35" stroke="white" strokeWidth="1"/>
            <circle cx="70" cy="0" r="52" stroke="white" strokeWidth="1"/>
          </svg>
        </div>

        <div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: "16px", color: WHITE, letterSpacing: "0.04em", fontStyle: "italic" }}>
            🎁 Invite Friends
          </div>
          <div style={{ fontFamily: T.fontBody, fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>
            You both get +10 honour 💪
          </div>
        </div>

        {referralCount > 0 && (
          <div style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "20px",
            padding: "3px 10px",
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#10b981",
            fontWeight: "700",
          }}>
            {referralCount} invited
          </div>
        )}
      </div>

      {/* ── Body — warm sand to match ME page body ── */}
      <div style={{ padding: "14px 16px", background: SAND }}>

        {/* How it works — 3 steps */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          {[
            { step: "1", text: "Share your link" },
            { step: "2", text: "Friend signs up" },
            { step: "3", text: "Both get +10 honour" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                width: "26px", height: "26px", borderRadius: "50%",
                background: NAVY, color: "#10b981",
                fontFamily: "monospace", fontSize: "12px", fontWeight: "700",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 5px",
              }}>
                {s.step}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: "10px", color: MUTED, lineHeight: "1.3" }}>
                {s.text}
              </div>
            </div>
          ))}
        </div>

        {/* Link display */}
        <div style={{
          background: WHITE,
          border: `1px solid ${BORDER}`,
          borderRadius: "10px",
          padding: "10px 12px",
          fontFamily: "monospace",
          fontSize: "11px",
          color: NAVY,
          marginBottom: "10px",
          wordBreak: "break-all",
          lineHeight: "1.5",
        }}>
          🔗 {link}
        </div>

        {/* Share buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleWhatsApp}
            style={{
              flex: 1, padding: "11px",
              background: "#25D366", border: "none",
              borderRadius: "12px",
              fontFamily: T.fontBody, fontSize: "13px", fontWeight: "600",
              color: WHITE, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            📱 WhatsApp
          </button>
          <button
            onClick={handleNativeShare}
            style={{
              flex: 1, padding: "11px",
              background: NAVY, border: "none",
              borderRadius: "12px",
              fontFamily: T.fontBody, fontSize: "13px", fontWeight: "600",
              color: "#10b981", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            ↗️ Share
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: "11px 14px",
              background: copied ? "rgba(245,197,24,0.1)" : WHITE,
              border: `1px solid ${copied ? GOLD : BORDER}`,
              borderRadius: "12px",
              fontFamily: T.fontBody, fontSize: "13px", fontWeight: "600",
              color: copied ? GOLD : MUTED, cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓" : "📋"}
          </button>
        </div>

        {/* Rewards teaser — night gold style */}
        <div style={{
          marginTop: "10px",
          padding: "8px 12px",
          background: "rgba(245,197,24,0.08)",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: "10px",
          fontFamily: T.fontBody,
          fontSize: "11px",
          color: "#92400e",
          textAlign: "center",
        }}>
          🎁 Real rewards coming soon — earn honour now, redeem later!
        </div>
      </div>
    </div>
  );
}