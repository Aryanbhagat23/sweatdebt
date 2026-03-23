import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, query, orderBy, startAt, endAt,
  getDocs, doc, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  green:"#00e676", red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7",
};

export default function UserSearch({ onSelectUser, currentUser, onClose }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [friends, setFriends] = useState({});
  const [pendingSent, setPendingSent] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!currentUser) return;
    // Load existing friends
    getDocs(collection(db, "users", currentUser.uid, "friends")).then(snap => {
      const f = {};
      snap.docs.forEach(d => { f[d.id] = true; });
      setFriends(f);
    });
    // Load pending sent requests
    getDocs(query(collection(db, "notifications"),
      ...[require("firebase/firestore").where("fromUserId", "==", currentUser.uid),
          require("firebase/firestore").where("type", "==", "friend_request")]
    )).then(snap => {
      const p = {};
      snap.docs.forEach(d => { p[d.data().toUserId] = true; });
      setPendingSent(p);
    }).catch(() => {});
  }, [currentUser]);

  const search = async (text) => {
    setSearchText(text);
    if (text.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const lower = text.toLowerCase().trim();
      const [uSnap, nSnap] = await Promise.all([
        getDocs(query(collection(db,"users"), orderBy("username"), startAt(lower), endAt(lower+"\uf8ff"))),
        getDocs(query(collection(db,"users"), orderBy("displayName"), startAt(text), endAt(text+"\uf8ff"))),
      ]);
      const seen = new Set();
      const users = [];
      [...uSnap.docs, ...nSnap.docs].forEach(d => {
        if (!seen.has(d.id) && d.id !== currentUser.uid) {
          seen.add(d.id);
          users.push({ id: d.id, ...d.data() });
        }
      });
      setResults(users);
      setSearched(true);
    } catch {
      // Fallback if indexes not ready
      try {
        const all = await getDocs(collection(db, "users"));
        const lower = text.toLowerCase().trim();
        const users = all.docs
          .filter(d => d.id !== currentUser.uid)
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.displayName?.toLowerCase().includes(lower) || u.username?.toLowerCase().includes(lower));
        setResults(users);
        setSearched(true);
      } catch (e2) { console.error(e2); }
    }
    setLoading(false);
  };

  const sendRequest = async (target) => {
    const uid = target.id;
    setActionLoading(p => ({ ...p, [uid]: true }));
    try {
      await setDoc(doc(db, "notifications", `${uid}_friend_request_${currentUser.uid}`), {
        toUserId: uid, fromUserId: currentUser.uid,
        fromName: currentUser.displayName, fromPhoto: currentUser.photoURL || null,
        type: "friend_request",
        message: `${currentUser.displayName} sent you a friend request`,
        read: false, createdAt: serverTimestamp(),
      });
      setPendingSent(p => ({ ...p, [uid]: true }));
    } catch (e) { console.error(e); }
    setActionLoading(p => ({ ...p, [uid]: false }));
  };

  const cancelRequest = async (target) => {
    const uid = target.id;
    setActionLoading(p => ({ ...p, [uid]: true }));
    try {
      await deleteDoc(doc(db, "notifications", `${uid}_friend_request_${currentUser.uid}`));
      setPendingSent(p => { const n = { ...p }; delete n[uid]; return n; });
    } catch (e) { console.error(e); }
    setActionLoading(p => ({ ...p, [uid]: false }));
  };

  const removeFriend = async (target) => {
    const uid = target.id;
    setActionLoading(p => ({ ...p, [uid]: true }));
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "friends", uid));
      await deleteDoc(doc(db, "users", uid, "friends", currentUser.uid));
      setFriends(p => { const n = { ...p }; delete n[uid]; return n; });
    } catch (e) { console.error(e); }
    setActionLoading(p => ({ ...p, [uid]: false }));
  };

  return (
    <div style={{ flex:1 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Search input */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"16px 16px 12px" }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"10px 14px" }}>
          <span style={{ fontSize:"16px", flexShrink:0 }}>🔍</span>
          <input
            style={{ flex:1, background:"none", border:"none", outline:"none", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif" }}
            placeholder="Search by name or @username..."
            value={searchText}
            onChange={e => search(e.target.value)}
            autoFocus
          />
          {searchText.length > 0 && (
            <span style={{ fontSize:"14px", color:C.muted, cursor:"pointer", padding:"2px 4px" }}
              onClick={() => { setSearchText(""); setResults([]); setSearched(false); }}>✕</span>
          )}
        </div>
        {onClose && <button style={{ background:"none", border:"none", color:C.cyan, fontSize:"15px", fontWeight:"500", cursor:"pointer", flexShrink:0, padding:"8px 4px", fontFamily:"'DM Sans',sans-serif" }} onClick={onClose}>Cancel</button>}
      </div>

      {loading && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 20px", gap:"12px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${C.border1}`, borderTop:`3px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:C.muted }}>Searching...</div>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 20px", gap:"12px" }}>
          <div style={{ fontSize:"40px" }}>🔍</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.muted, letterSpacing:"0.04em" }}>No users found</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.dim, textAlign:"center" }}>Try a different name or ask them to join SweatDebt</div>
        </div>
      )}

      {!loading && !searched && (
        <div style={{ padding:"32px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>👥</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, marginBottom:"8px", letterSpacing:"0.04em" }}>Find Friends</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"20px" }}>Type at least 2 characters to search</div>
          <div style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"16px", textAlign:"left" }}>
            {["Search by first name or @username", "Send a friend request — they accept or decline", "Friends can see each other's videos and challenge each other"].map(tip => (
              <div key={tip} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted, lineHeight:"1.8" }}>💡 {tip}</div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", marginBottom:"12px", textTransform:"uppercase" }}>
            {results.length} user{results.length > 1 ? "s" : ""} found
          </div>
          {results.map(u => {
            const isFriend = !!friends[u.id];
            const isPending = !!pendingSent[u.id];
            const isLoading = !!actionLoading[u.id];
            return (
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:"12px", background:C.bg2, border:`1px solid ${isFriend ? C.cyanBorder : C.border1}`, borderRadius:"16px", padding:"14px", marginBottom:"10px" }}>
                <div style={{ position:"relative", flexShrink:0, cursor:"pointer" }} onClick={() => onSelectUser(u)}>
                  {u.photoURL
                    ? <img src={u.photoURL} alt="" style={{ width:"52px", height:"52px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${isFriend ? C.cyan : C.border2}` }} />
                    : <div style={{ width:"52px", height:"52px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:"#000" }}>{u.displayName?.charAt(0)||"?"}</div>
                  }
                  {isFriend && <div style={{ position:"absolute", bottom:"-2px", right:"-2px", width:"18px", height:"18px", borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:"#000", fontWeight:"700", border:`2px solid ${C.bg2}` }}>✓</div>}
                </div>
                <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => onSelectUser(u)}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", fontWeight:"600", color:C.white, marginBottom:"2px" }}>{u.displayName}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:C.muted, marginBottom:"4px" }}>@{u.username}</div>
                  {u.bio && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:C.dim, marginBottom:"4px" }}>{u.bio.slice(0,40)}{u.bio.length>40?"...":""}</div>}
                  <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                    <span style={{ fontSize:"10px", color:C.muted, background:C.bg3, padding:"2px 6px", borderRadius:"8px" }}>⚔️ {(u.wins||0)+(u.losses||0)}</span>
                    <span style={{ fontSize:"10px", color:C.green, background:C.bg3, padding:"2px 6px", borderRadius:"8px" }}>✓ {u.wins||0}W</span>
                    <span style={{ fontSize:"10px", color:C.cyan, background:C.bg3, padding:"2px 6px", borderRadius:"8px" }}>⭐ {u.honour||100}</span>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"6px", flexShrink:0 }}>
                  {isFriend ? (
                    <button style={{ padding:"7px 12px", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap", background:C.bg3, color:C.muted, border:`1px solid ${C.border1}`, opacity:isLoading?0.6:1 }}
                      onClick={() => removeFriend(u)} disabled={isLoading}>{isLoading?"...":"✓ Friends"}</button>
                  ) : isPending ? (
                    <button style={{ padding:"7px 12px", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", cursor:"pointer", whiteSpace:"nowrap", background:C.cyanDim, color:C.cyan, border:`1px solid ${C.cyanBorder}`, opacity:isLoading?0.6:1 }}
                      onClick={() => cancelRequest(u)} disabled={isLoading}>{isLoading?"...":"Pending ✕"}</button>
                  ) : (
                    <button style={{ padding:"7px 14px", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, color:"#000", border:"none", opacity:isLoading?0.6:1 }}
                      onClick={() => sendRequest(u)} disabled={isLoading}>{isLoading?"...":"+ Add"}</button>
                  )}
                  <button style={{ padding:"7px 12px", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:C.muted, background:"transparent", border:`1px solid ${C.border1}`, cursor:"pointer", whiteSpace:"nowrap" }}
                    onClick={() => onSelectUser(u)}>⚔️ Bet</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}