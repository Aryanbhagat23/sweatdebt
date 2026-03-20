import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function NotificationBell({ user, onClick }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Count pending incoming bets as "unread"
    const q = query(
      collection(db, "bets"),
      where("opponentEmail", "==", user.email),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, snap => setUnread(snap.size));
    return () => unsub();
  }, [user]);

  return (
    <div onClick={onClick} style={{
      position:"relative",
      width:"36px",height:"36px",
      display:"flex",alignItems:"center",justifyContent:"center",
      cursor:"pointer",
    }}>
      <span style={{fontSize:"22px"}}>🔔</span>
      {unread > 0 && (
        <div style={{
          position:"absolute",
          top:"0px",right:"0px",
          width:"16px",height:"16px",
          borderRadius:"50%",
          background:"#ff5c1a",
          border:"2px solid #111",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"9px",fontWeight:"700",color:"#fff",
          fontFamily:"monospace",
        }}>{unread > 9 ? "9+" : unread}</div>
      )}
    </div>
  );
}