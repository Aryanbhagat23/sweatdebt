import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import T from "../theme";

export default function NotificationBell({ user, onClick, light = false }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, snap => setUnread(snap.size));
    return () => unsub();
  }, [user]);

  const iconColor  = light ? "rgba(255,255,255,0.9)" : T.panel;
  const bgColor    = light ? "rgba(255,255,255,0.15)" : T.bg1;
  const borderColor = light ? "rgba(255,255,255,0.2)" : T.borderCard;

  return (
    <div onClick={onClick} style={{
      position:"relative",
      width:"36px", height:"36px",
      borderRadius:"50%",
      background: bgColor,
      border: `1px solid ${borderColor}`,
      backdropFilter: light ? "blur(8px)" : "none",
      WebkitBackdropFilter: light ? "blur(8px)" : "none",
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:"pointer",
      transition:"transform 0.2s",
    }}>
      <span style={{ fontSize:"16px", color: iconColor }}>🔔</span>
      {unread > 0 && (
        <div style={{
          position:"absolute", top:"-2px", right:"-2px",
          width:"16px", height:"16px",
          borderRadius:"50%",
          background:"#ef4444",
          border: light ? "2px solid transparent" : `2px solid ${T.bg0}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"9px", fontWeight:"700", color:"#fff",
          fontFamily:T.fontMono,
        }}>
          {unread > 9 ? "9+" : unread}
        </div>
      )}
    </div>
  );
}