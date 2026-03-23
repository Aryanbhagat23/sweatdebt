import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

const C = { bg0:"#070d1a", bg2:"#111f38", white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a", cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)", border1:"#1e3a5f", purple:"#a855f7" };

export default function NewChat({ user }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "friends")).then(snap => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user]);

  const start = async (friend) => {
    setStarting(friend.id);
    try {
      const friendUid = friend.uid || friend.id;
      const convoId = [user.uid, friendUid].sort().join("_");
      const existing = await getDoc(doc(db, "conversations", convoId));
      if (!existing.exists()) {
        await setDoc(doc(db, "conversations", convoId), {
          participants: [user.uid, friendUid],
          participantNames: { [user.uid]: user.displayName, [friendUid]: friend.displayName },
          participantPhotos: { [user.uid]: user.photoURL||null, [friendUid]: friend.photoURL||null },
          lastMessage: "", lastMessageAt: serverTimestamp(), lastSenderId: null,
          unreadCount: { [user.uid]: 0, [friendUid]: 0 },
          createdAt: serverTimestamp(),
        });
      }
      navigate(`/inbox/${convoId}`);
    } catch (e) { console.error(e); }
    setStarting(null);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, paddingBottom:"40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 16px", borderBottom:`1px solid ${C.border1}` }}>
        <button style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }} onClick={() => navigate("/inbox")}>←</button>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em" }}>New Message</div>
      </div>

      <div style={{ padding:"16px" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>Your Friends ({friends.length})</div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"40px" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", border:`3px solid ${C.border1}`, borderTop:`3px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
          </div>
        ) : friends.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>👥</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.muted, letterSpacing:"0.04em", marginBottom:"8px" }}>No friends yet</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.dim, marginBottom:"20px" }}>Add friends to start chatting</div>
            <button style={{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"14px", padding:"12px 24px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", letterSpacing:"0.06em", color:"#000", cursor:"pointer" }} onClick={() => navigate("/friends")}>🔍 Find Friends</button>
          </div>
        ) : (
          friends.map(f => (
            <div key={f.id} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"14px", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", marginBottom:"8px", cursor:"pointer", opacity: starting===f.id?0.6:1, transition:"all 0.15s" }}
              onClick={() => !starting && start(f)}>
              {f.photoURL
                ? <img src={f.photoURL} alt="" style={{ width:"48px", height:"48px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.border1}`, flexShrink:0 }} />
                : <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", color:"#000", flexShrink:0 }}>{f.displayName?.charAt(0)||"?"}</div>
              }
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", fontWeight:"500", color:C.white }}>{f.displayName}</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:C.muted, marginTop:"2px" }}>@{f.username||""}</div>
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.cyan }}>{starting===f.id?"...":"Message →"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}