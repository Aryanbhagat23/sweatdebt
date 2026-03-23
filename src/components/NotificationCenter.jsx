import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, writeBatch, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.08)", cyanBorder:"rgba(0,212,255,0.3)",
  green:"#00e676", red:"#ff4d6d", border1:"#1e3a5f", purple:"#a855f7", coral:"#ff6b4a",
};

const TYPE_ICON = { friend_request:"👋", friend_accepted:"🤝", bet_challenge:"⚔️", comment_like:"❤️", comment_reply:"💬", bet_approved:"✅", bet_disputed:"⚠️", direct_message:"💬" };
const TYPE_COLOR = { friend_request:C.cyan, friend_accepted:C.green, bet_challenge:C.coral, comment_like:C.red, comment_reply:C.purple, bet_approved:C.green, bet_disputed:C.red, direct_message:C.cyan };

export default function NotificationCenter({ user, isOpen, onClose }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (isOpen) { setVisible(true); setTimeout(() => setAnimIn(true), 10); }
    else { setAnimIn(false); setTimeout(() => setVisible(false), 300); }
  }, [isOpen]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "notifications"), where("toUserId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setNotifications(data);
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [user]);

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  };

  const handleClick = async (n) => {
    await updateDoc(doc(db, "notifications", n.id), { read: true });
    onClose();
    if (n.link) navigate(n.link);
    else if (n.type === "friend_request") navigate(`/profile/${n.fromUserId}`);
    else if (n.type === "bet_challenge") navigate("/");
    else if (["comment_reply", "comment_like"].includes(n.type)) navigate("/feed");
    else if (n.type === "friend_accepted") navigate(`/profile/${n.fromUserId}`);
    else if (n.type === "direct_message") navigate(n.link || "/inbox");
  };

  const acceptFriend = async (n, e) => {
    e.stopPropagation();
    try {
      await setDoc(doc(db, "users", user.uid, "friends", n.fromUserId), {
        uid: n.fromUserId, displayName: n.fromName, photoURL: n.fromPhoto || null, addedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "users", n.fromUserId, "friends", user.uid), {
        uid: user.uid, displayName: user.displayName, photoURL: user.photoURL || null, addedAt: serverTimestamp(),
      });
      await deleteDoc(doc(db, "notifications", n.id));
      await setDoc(doc(db, "notifications", `${n.fromUserId}_friend_accepted_${user.uid}_${Date.now()}`), {
        toUserId: n.fromUserId, fromUserId: user.uid, fromName: user.displayName,
        fromPhoto: user.photoURL || null, type: "friend_accepted",
        message: `${user.displayName} accepted your friend request`,
        read: false, createdAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
  };

  const declineFriend = async (n, e) => {
    e.stopPropagation();
    await deleteDoc(doc(db, "notifications", n.id));
  };

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "just now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return `${Math.floor(s / 604800)}w ago`;
  };

  const unread = notifications.filter(n => !n.read).length;
  if (!visible) return null;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position:"fixed", inset:0, zIndex:1900, background:animIn?"rgba(0,0,0,0.6)":"transparent", transition:"background 0.3s" }} onClick={onClose} />
      <div style={{
        position:"fixed", top:0, left:"50%",
        width:"100%", maxWidth:"480px",
        background:C.bg1, borderRadius:"0 0 24px 24px",
        maxHeight:"72vh", overflowY:"auto",
        zIndex:1901,
        transform: animIn ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-100%)",
        transition:"transform 0.35s cubic-bezier(0.32,0.72,0,1)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
        paddingTop:"env(safe-area-inset-top,0)",
      }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px 12px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.white, letterSpacing:"0.04em" }}>Notifications</div>
            {unread > 0 && <div style={{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, color:"#000", fontFamily:"'DM Mono',monospace", fontSize:"11px", fontWeight:"700", padding:"3px 8px", borderRadius:"20px" }}>{unread} new</div>}
          </div>
          <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
            {unread > 0 && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:C.cyan, cursor:"pointer" }} onClick={markAllRead}>Mark all read</div>}
            <div style={{ fontSize:"20px", color:C.muted, cursor:"pointer" }} onClick={onClose}>✕</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"32px" }}>
            <div style={{ width:"24px", height:"24px", borderRadius:"50%", border:`2px solid ${C.border1}`, borderTop:`2px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding:"48px 20px", textAlign:"center" }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔔</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.muted, letterSpacing:"0.04em" }}>No notifications yet</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.dim, marginTop:"4px" }}>Challenges, likes and friend requests will appear here</div>
          </div>
        ) : (
          <div style={{ padding:"0 16px 16px" }}>
            {notifications.map(n => (
              <div key={n.id} style={{
                display:"flex", alignItems:"flex-start", gap:"12px",
                padding:"14px", background: n.read ? C.bg2 : C.cyanDim,
                borderRadius:"14px", marginBottom:"8px", cursor:"pointer",
                border:`1px solid ${n.read ? C.border1 : C.cyanBorder}`,
              }} onClick={() => handleClick(n)}>
                <div style={{ position:"relative", flexShrink:0 }}>
                  {n.fromPhoto
                    ? <img src={n.fromPhoto} alt="" style={{ width:"42px", height:"42px", borderRadius:"50%", objectFit:"cover" }} />
                    : <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", color:"#000" }}>{n.fromName?.charAt(0)||"?"}</div>
                  }
                  <div style={{ position:"absolute", bottom:"-2px", right:"-2px", width:"18px", height:"18px", borderRadius:"50%", background:C.bg2, border:`1px solid ${C.border1}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px" }}>
                    {TYPE_ICON[n.type] || "🔔"}
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.white, marginBottom:"3px", lineHeight:"1.4" }}>{n.message}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted }}>{timeAgo(n.createdAt)}</div>
                  {n.type === "friend_request" && (
                    <div style={{ display:"flex", gap:"8px", marginTop:"10px" }}>
                      <button style={{ flex:1, padding:"8px", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"10px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", color:"#000", cursor:"pointer", letterSpacing:"0.04em" }}
                        onClick={e => acceptFriend(n, e)}>Accept</button>
                      <button style={{ flex:1, padding:"8px", background:"transparent", border:`1px solid ${C.border1}`, borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted, cursor:"pointer" }}
                        onClick={e => declineFriend(n, e)}>Decline</button>
                    </div>
                  )}
                </div>
                {!n.read && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:C.cyan, flexShrink:0, marginTop:"6px", boxShadow:`0 0 6px ${C.cyan}` }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}