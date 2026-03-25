// src/components/NotificationBell.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import T from "../theme";

export default function NotificationBell({ user, onClick }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) return;
    const u = onSnapshot(query(collection(db,"notifications"), where("toUserId","==",user.uid), where("read","==",false)), snap=>setUnread(snap.size), ()=>{});
    return () => u();
  }, [user]);
  return (
    <div style={{ position:"relative", cursor:"pointer", width:"40px", height:"40px", display:"flex", alignItems:"center", justifyContent:"center", background:T.panel, borderRadius:"50%", boxShadow:T.shadowSm }} onClick={onClick}>
      <span style={{ fontSize:"18px" }}>🔔</span>
      {unread > 0 && (
        <div style={{ position:"absolute", top:"-2px", right:"-2px", width:"18px", height:"18px", borderRadius:"50%", background:T.accent, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color:"#fff", border:`2px solid ${T.bg0}` }}>
          {unread > 9 ? "9+" : unread}
        </div>
      )}
    </div>
  );
}