import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot, orderBy,
} from "firebase/firestore";
import T from "../theme";

const CHALK  = "#2C4A3E";
const MINT   = "#f0fdf4";
const ACCENT = "#10b981";
const MUTED  = "#6b7280";
const BORDER = "#d1fae5";
const WHITE  = "#ffffff";

function timeAgo(ts) {
  if (!ts?.toDate) return "";
  const s = Math.floor((new Date() - ts.toDate()) / 1000);
  if (s < 60)    return "now";
  if (s < 3600)  return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

export default function InboxScreen({ user }) {
  const navigate = useNavigate();
  const [convos,  setConvos]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.updatedAt?.seconds||0) - (a.updatedAt?.seconds||0));
      setConvos(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  const getOtherName = (c) => {
    const names = c.participantNames || {};
    return Object.entries(names).find(([uid]) => uid !== user.uid)?.[1] || "Unknown";
  };

  const getOtherPhoto = (c) => {
    const photos = c.participantPhotos || {};
    return Object.entries(photos).find(([uid]) => uid !== user.uid)?.[1] || null;
  };

  const getUnread = (c) => c.unreadCount?.[user.uid] || 0;

  return (
    <div style={{ minHeight:"100vh", background:MINT, paddingBottom:"80px" }}>

      {/* Header */}
      <div style={{
        background:WHITE, borderBottom:`1px solid ${BORDER}`,
        padding:"52px 20px 16px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:10,
      }}>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:CHALK, letterSpacing:"0.04em", fontStyle:"italic" }}>
          Messages
        </div>
        <button onClick={() => navigate("/inbox/new")} style={{
          background:CHALK, border:"none", borderRadius:"20px",
          padding:"8px 18px", display:"flex", alignItems:"center", gap:"6px",
          fontFamily:T.fontMono, fontSize:"12px", fontWeight:"700",
          color:ACCENT, cursor:"pointer", letterSpacing:"0.04em",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          NEW
        </button>
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"48px" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"50%", border:`3px solid ${BORDER}`, borderTop:`3px solid ${ACCENT}`, animation:"spin 0.8s linear infinite" }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : convos.length === 0 ? (
        /* ── Empty state ── */
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 32px", textAlign:"center" }}>
          <div style={{
            width:"80px", height:"80px", borderRadius:"24px",
            background:CHALK, display:"flex", alignItems:"center", justifyContent:"center",
            marginBottom:"20px",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:CHALK, letterSpacing:"0.04em", marginBottom:"8px" }}>
            No messages yet
          </div>
          <div style={{ fontFamily:"system-ui", fontSize:"14px", color:MUTED, lineHeight:"1.6", marginBottom:"28px" }}>
            Challenge a friend to a bet and the trash talk starts automatically
          </div>
          <button onClick={() => navigate("/create")} style={{
            background:CHALK, border:"none", borderRadius:"16px",
            padding:"14px 28px",
            fontFamily:T.fontDisplay, fontSize:"18px",
            letterSpacing:"0.05em", color:ACCENT, cursor:"pointer",
          }}>
            ⚔️ START A BET
          </button>
          <button onClick={() => navigate("/inbox/new")} style={{
            background:"transparent", border:`1.5px solid ${BORDER}`,
            borderRadius:"16px", padding:"12px 28px", marginTop:"10px",
            fontFamily:"system-ui", fontSize:"14px", color:MUTED, cursor:"pointer",
          }}>
            Send a message
          </button>
        </div>
      ) : (
        /* ── Conversation list ── */
        <div style={{ padding:"8px 0" }}>
          {convos.map(c => {
            const name    = getOtherName(c);
            const photo   = getOtherPhoto(c);
            const unread  = getUnread(c);
            const initial = name.charAt(0).toUpperCase();

            return (
              <div key={c.id}
                onClick={() => navigate(`/inbox/${c.id}`)}
                style={{
                  display:"flex", alignItems:"center", gap:"14px",
                  padding:"14px 20px", cursor:"pointer",
                  background: unread > 0 ? "rgba(16,185,129,0.04)" : WHITE,
                  borderBottom:`1px solid ${BORDER}`,
                  transition:"background 0.15s",
                }}>
                {/* Avatar */}
                <div style={{ position:"relative", flexShrink:0 }}>
                  {photo
                    ? <img src={photo} alt="" style={{ width:"48px", height:"48px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${unread>0?ACCENT:BORDER}` }}/>
                    : <div style={{
                        width:"48px", height:"48px", borderRadius:"50%",
                        background:CHALK,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:T.fontDisplay, fontSize:"20px", color:ACCENT,
                        border:`2px solid ${unread>0?ACCENT:BORDER}`,
                      }}>{initial}</div>
                  }
                  {unread > 0 && (
                    <div style={{
                      position:"absolute", top:"-2px", right:"-2px",
                      width:"18px", height:"18px", borderRadius:"50%",
                      background:ACCENT, border:`2px solid ${WHITE}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontFamily:T.fontMono, fontSize:"9px", fontWeight:"700", color:WHITE,
                    }}>{unread > 9 ? "9+" : unread}</div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"3px" }}>
                    <span style={{
                      fontFamily:"system-ui", fontSize:"15px",
                      fontWeight: unread>0 ? "700" : "500",
                      color:CHALK,
                    }}>{name}</span>
                    <span style={{ fontFamily:T.fontMono, fontSize:"11px", color:MUTED, flexShrink:0 }}>
                      {timeAgo(c.updatedAt)}
                    </span>
                  </div>
                  <div style={{
                    fontFamily:"system-ui", fontSize:"13px",
                    color: unread>0 ? CHALK : MUTED,
                    fontWeight: unread>0 ? "500" : "400",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>
                    {c.lastMessage || "Say something…"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}