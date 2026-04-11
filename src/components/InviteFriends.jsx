// src/components/InviteFriends.jsx
// Shows on the ME page — lets users share their referral link
// Both referrer and new user get +10 honour when link is used

import React, { useState } from "react";
import { getReferralLink, getReferralWhatsAppMsg } from "../utils/referral";
import T from "../theme";

const CHALK  = "#2C4A3E";
const ACCENT = "#10b981";
const MINT   = "#f0fdf4";
const BORDER = "#d1fae5";
const MUTED  = "#6b7280";
const WHITE  = "#ffffff";

export default function InviteFriends({ user, referralCount = 0 }) {
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const link     = getReferralLink(user.uid);
  const waMsg    = getReferralWhatsAppMsg(user.displayName, user.uid);

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
      if (navigator.share) {
        await navigator.share({ title:"Join SweatDebt!", text:waMsg, url:link });
      } else {
        handleCopy();
      }
    } catch(e) {}
  };

  return (
    <div style={{
      background: WHITE,
      border: `1px solid ${BORDER}`,
      borderRadius: "16px",
      overflow: "hidden",
      marginBottom: "12px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* header */}
      <div style={{
        background: CHALK,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: "17px", color: WHITE, letterSpacing: "0.04em", fontStyle: "italic" }}>
            🎁 Invite Friends
          </div>
          <div style={{ fontFamily: T.fontBody, fontSize: "12px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>
            You both get +10 honour 💪
          </div>
        </div>
        {referralCount > 0 && (
          <div style={{
            background: "rgba(16,185,129,0.2)",
            border: "1px solid rgba(16,185,129,0.4)",
            borderRadius: "20px",
            padding: "4px 12px",
            fontFamily: T.fontMono,
            fontSize: "11px",
            color: ACCENT,
            fontWeight: "700",
          }}>
            {referralCount} invited
          </div>
        )}
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* how it works */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          {[
            { step: "1", text: "Share your link" },
            { step: "2", text: "Friend signs up" },
            { step: "3", text: "Both get +10 honour" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: CHALK, color: ACCENT,
                fontFamily: T.fontMono, fontSize: "13px", fontWeight: "700",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 5px",
              }}>
                {s.step}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: "11px", color: MUTED, lineHeight: "1.3" }}>
                {s.text}
              </div>
            </div>
          ))}
        </div>

        {/* link display */}
        <div style={{
          background: MINT,
          border: `1px solid ${BORDER}`,
          borderRadius: "10px",
          padding: "10px 12px",
          fontFamily: "monospace",
          fontSize: "11px",
          color: CHALK,
          marginBottom: "10px",
          wordBreak: "break-all",
          lineHeight: "1.5",
        }}>
          🔗 {link}
        </div>

        {/* share buttons */}
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
              background: CHALK, border: "none",
              borderRadius: "12px",
              fontFamily: T.fontBody, fontSize: "13px", fontWeight: "600",
              color: ACCENT, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            ↗️ Share
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: "11px 14px",
              background: copied ? `${ACCENT}15` : MINT,
              border: `1px solid ${copied ? ACCENT : BORDER}`,
              borderRadius: "12px",
              fontFamily: T.fontBody, fontSize: "13px", fontWeight: "600",
              color: copied ? ACCENT : MUTED, cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {copied ? "✓" : "📋"}
          </button>
        </div>

        {/* coming soon rewards teaser */}
        <div style={{
          marginTop: "10px",
          padding: "8px 12px",
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.25)",
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