import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const C = { bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a", cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.1)", cyanBorder:"rgba(0,212,255,0.3)", border1:"#1e3a5f", purple:"#a855f7" };

export default function InboxScreen({ user }) {
  const navigate = useNavigate();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.lastMessageAt?.toDate?.() || 0) - (a.lastMessageAt?.toDate?.() || 0));
      setConvos(data); setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`;
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, paddingBottom:"90px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 16px", borderBottom:`1px solid ${C.border1}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em", flex:1 }}>Messages</div>
        <button style={{ background:C.cyanDim, border:`1px solid ${C.cyanBorder}`, borderRadius:"12px", width:"44px", height:"44px", color:C.cyan, fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => navigate("/inbox/new")}>✏️</button>
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"64px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${C.border1}`, borderTop:`3px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
        </div>
      ) : convos.length === 0 ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"64px 20px", textAlign:"center" }}>
          <div style={{ fontSize:"56px", marginBottom:"16px" }}>💬</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"26px", color:C.muted, letterSpacing:"0.04em", marginBottom:"8px" }}>No messages yet</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.dim, marginBottom:"24px" }}>Start a conversation with a friend</div>
          <button style={{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"14px", padding:"14px 28px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:"#000", cursor:"pointer" }} onClick={() => navigate("/inbox/new")}>+ New Message</button>
        </div>
      ) : (
        convos.map(convo => {
          const otherId = convo.participants?.find(id => id !== user.uid);
          const otherName = convo.participantNames?.[otherId] || "Unknown";
          const otherPhoto = convo.participantPhotos?.[otherId] || null;
          const unread = (convo.unreadCount?.[user.uid] || 0) > 0;
          return (
            <div key={convo.id} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"14px 16px", background: unread ? C.cyanDim : "transparent", borderBottom:`1px solid ${C.border1}`, cursor:"pointer" }} onClick={() => navigate(`/inbox/${convo.id}`)}>
              {otherPhoto
                ? <img src={otherPhoto} alt="" style={{ width:"52px", height:"52px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${unread?C.cyan:C.border1}`, flexShrink:0 }} />
                : <div style={{ width:"52px", height:"52px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:"#000", border:`2px solid ${unread?C.cyan:C.border1}`, flexShrink:0 }}>{otherName?.charAt(0)||"?"}</div>
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", fontWeight: unread?"600":"500", color: unread?C.white:"rgba(224,242,254,0.8)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{otherName}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color: unread?C.cyan:C.muted, flexShrink:0, marginLeft:"8px" }}>{timeAgo(convo.lastMessageAt)}</div>
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color: unread?C.muted:C.dim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{convo.lastMessage || "Start the conversation..."}</div>
              </div>
              {unread && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:C.cyan, flexShrink:0, boxShadow:`0 0 6px ${C.cyan}` }} />}
            </div>
          );
        })
      )}
    </div>
  );
}