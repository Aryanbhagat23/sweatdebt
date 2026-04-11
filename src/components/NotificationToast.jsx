// src/components/NotificationToast.jsx
// Shows a banner at the top of the screen when a push notification
// arrives while the user has the app open (foreground notifications)

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onForegroundMessage } from "../firebase";

const ICONS = {
  bet_challenge:   "⚔️",
  proof_uploaded:  "🎥",
  bet_approved:    "✅",
  bet_disputed:    "⚠️",
  friend_request:  "👋",
  friend_accepted: "🤝",
  jury_selected:   "⚖️",
  bet_accepted:    "✅",
  bet_declined:    "❌",
};

export default function NotificationToast({ user }) {
  const navigate  = useNavigate();
  const [toast,   setToast]   = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Listen for foreground FCM messages
    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      const url  = payload.data?.url || "/";
      const type = payload.data?.type || "default";

      showToast({ title, body, url, type });
    });

    return () => { if (unsub) unsub(); };
  }, [user]);

  const showToast = ({ title, body, url, type }) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ title, body, url, type });
    setVisible(true);

    // Auto-dismiss after 4 seconds
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 300); // wait for fade out
    }, 4000);
  };

  const handleTap = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => {
      setToast(null);
      if (toast?.url) navigate(toast.url);
    }, 200);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  if (!toast) return null;

  const icon = ICONS[toast.type] || "🔔";

  return (
    <div
      onClick={handleTap}
      style={{
        position:   "fixed",
        top:        `calc(env(safe-area-inset-top, 0px) + 8px)`,
        left:       "50%",
        transform:  `translateX(-50%) translateY(${visible ? "0" : "-120%"})`,
        width:      "calc(100% - 32px)",
        maxWidth:   "440px",
        zIndex:     9999,
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        cursor:     "pointer",
      }}
    >
      <div style={{
        background:    "rgba(5, 46, 22, 0.97)",
        backdropFilter:"blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border:        "1px solid rgba(16, 185, 129, 0.3)",
        borderRadius:  "16px",
        padding:       "12px 14px",
        display:       "flex",
        alignItems:    "center",
        gap:           "12px",
        boxShadow:     "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        {/* icon */}
        <div style={{
          width:          "40px",
          height:         "40px",
          borderRadius:   "12px",
          background:     "rgba(16,185,129,0.15)",
          border:         "1px solid rgba(16,185,129,0.3)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "20px",
          flexShrink:     0,
        }}>
          {icon}
        </div>

        {/* text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:  "monospace",
            fontSize:    "13px",
            fontWeight:  "700",
            color:       "#10b981",
            letterSpacing: "0.02em",
            marginBottom: "2px",
            whiteSpace:  "nowrap",
            overflow:    "hidden",
            textOverflow:"ellipsis",
          }}>
            {toast.title}
          </div>
          <div style={{
            fontFamily:  "system-ui",
            fontSize:    "12px",
            color:       "rgba(255,255,255,0.65)",
            lineHeight:  "1.4",
            display:     "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow:    "hidden",
          }}>
            {toast.body}
          </div>
        </div>

        {/* dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            background:   "rgba(255,255,255,0.08)",
            border:       "none",
            borderRadius: "50%",
            width:        "24px",
            height:       "24px",
            display:      "flex",
            alignItems:   "center",
            justifyContent:"center",
            color:        "rgba(255,255,255,0.4)",
            fontSize:     "12px",
            cursor:       "pointer",
            flexShrink:   0,
          }}
        >
          ✕
        </button>
      </div>

      {/* progress bar */}
      <div style={{
        position:     "absolute",
        bottom:       "4px",
        left:         "14px",
        right:        "14px",
        height:       "2px",
        background:   "rgba(16,185,129,0.15)",
        borderRadius: "1px",
        overflow:     "hidden",
      }}>
        <div style={{
          height:           "100%",
          background:       "#10b981",
          borderRadius:     "1px",
          animation:        visible ? "shrink 4s linear forwards" : "none",
        }}/>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}