import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, query, where, getDocs,
  doc, setDoc, deleteDoc, onSnapshot, getDoc,
} from "firebase/firestore";
import T from "../theme";

const CHALK  = "#2C4A3E";
const MINT   = "#f0fdf4";
const ACCENT = "#10b981";
const MUTED  = "#6b7280";
const BORDER = "#d1fae5";
const WHITE  = "#ffffff";

export default function FindFriends({ user }) {
  const navigate  = useNavigate();
  const [search,  setSearch]  = useState("");
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding,  setAdding]  = useState({});

  // load existing friends
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "friends"),
      snap => setFriends(snap.docs.map(d => ({ uid:d.id, ...d.data() })))
    );
    return () => unsub();
  }, [user]);

  const friendUids = new Set(friends.map(f => f.uid));

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const term = search.trim().toLowerCase();
      // Search by username
      const q1 = query(collection(db,"users"), where("username",">=",term), where("username","<=",term+"\uf8ff"));
      // Search by displayName
      const q2 = query(collection(db,"users"), where("displayName",">=",search.trim()), where("displayName","<=",search.trim()+"\uf8ff"));

      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const seen = new Set();
      const all  = [];
      [...s1.docs, ...s2.docs].forEach(d => {
        if (d.id === user.uid) return; // exclude self
        if (seen.has(d.id)) return;    // deduplicate
        seen.add(d.id);
        all.push({ uid:d.id, ...d.data() });
      });
      setResults(all);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleAdd = async (person) => {
    setAdding(a => ({ ...a, [person.uid]:true }));
    try {
      // Add to my friends
      await setDoc(doc(db,"users",user.uid,"friends",person.uid), {
        uid:         person.uid,
        displayName: person.displayName || person.username || "Unknown",
        username:    person.username    || "",
        email:       person.email       || "",
        photoURL:    person.photoURL    || null,
      });
      // Add me to their friends
      const mySnap = await getDoc(doc(db,"users",user.uid));
      const me     = mySnap.data() || {};
      await setDoc(doc(db,"users",person.uid,"friends",user.uid), {
        uid:         user.uid,
        displayName: me.displayName || user.displayName || "Unknown",
        username:    me.username    || "",
        email:       me.email       || user.email || "",
        photoURL:    me.photoURL    || user.photoURL || null,
      });
    } catch(e) { console.error(e); }
    setAdding(a => ({ ...a, [person.uid]:false }));
  };

  const handleRemove = async (uid) => {
    try {
      await deleteDoc(doc(db,"users",user.uid,"friends",uid));
      await deleteDoc(doc(db,"users",uid,"friends",user.uid));
    } catch(e) { console.error(e); }
  };

  const UserRow = ({ person, isFriend }) => (
    <div style={{
      display:"flex", alignItems:"center", gap:"12px",
      background:WHITE, border:`1px solid ${BORDER}`,
      borderRadius:"16px", padding:"12px 14px",
      marginBottom:"8px",
    }}>
      {person.photoURL
        ? <img src={person.photoURL} alt="" style={{ width:"44px", height:"44px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${BORDER}`, flexShrink:0 }}/>
        : <div style={{
            width:"44px", height:"44px", borderRadius:"50%", flexShrink:0,
            background:CHALK, display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:T.fontDisplay, fontSize:"18px", color:ACCENT,
          }}>
            {(person.displayName || person.username || "?").charAt(0).toUpperCase()}
          </div>
      }
      <div style={{ flex:1, minWidth:0 }} onClick={() => navigate(`/profile/${person.uid}`)} style={{ flex:1, minWidth:0, cursor:"pointer" }}>
        <div style={{ fontFamily:"system-ui", fontSize:"14px", fontWeight:"600", color:CHALK }}>
          {person.displayName || person.username || "Unknown"}
        </div>
        <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:MUTED, marginTop:"2px" }}>
          @{person.username || person.uid.slice(0,8)}
        </div>
      </div>
      {isFriend ? (
        <button onClick={() => handleRemove(person.uid)} style={{
          padding:"7px 14px", background:"rgba(239,68,68,0.08)",
          border:"1.5px solid rgba(239,68,68,0.3)",
          borderRadius:"20px", fontFamily:T.fontMono, fontSize:"11px",
          fontWeight:"700", color:"#ef4444", cursor:"pointer", flexShrink:0,
        }}>Remove</button>
      ) : (
        <button
          onClick={() => handleAdd(person)}
          disabled={adding[person.uid]}
          style={{
            padding:"7px 14px",
            background: adding[person.uid] ? MINT : CHALK,
            border:"none", borderRadius:"20px",
            fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700",
            color: adding[person.uid] ? MUTED : ACCENT,
            cursor: adding[person.uid] ? "not-allowed" : "pointer", flexShrink:0,
          }}>
          {adding[person.uid] ? "Adding…" : "+ Add"}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:MINT, paddingBottom:"40px" }}>

      {/* Header */}
      <div style={{ background:CHALK, padding:"52px 20px 20px", display:"flex", alignItems:"center", gap:"12px" }}>
        <button onClick={() => navigate(-1)} style={{
          width:"36px", height:"36px", borderRadius:"50%",
          background:"rgba(255,255,255,0.12)", border:"none",
          color:"#fff", fontSize:"18px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>‹</button>
        <div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"26px", color:"#fff", letterSpacing:"0.04em", fontStyle:"italic" }}>
            Find Friends
          </div>
          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.45)", marginTop:"2px" }}>
            {friends.length} friend{friends.length !== 1 ? "s" : ""} so far
          </div>
        </div>
      </div>

      <div style={{ padding:"20px" }}>

        {/* Search bar */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key==="Enter" && handleSearch()}
            placeholder="Search by name or @username…"
            style={{
              flex:1, padding:"13px 16px",
              background:WHITE, border:`1.5px solid ${BORDER}`,
              borderRadius:"14px", fontFamily:"system-ui", fontSize:"14px",
              color:CHALK, outline:"none",
            }}
          />
          <button onClick={handleSearch} disabled={loading} style={{
            padding:"13px 20px", background:CHALK, border:"none",
            borderRadius:"14px", fontFamily:T.fontMono, fontSize:"12px",
            fontWeight:"700", color:ACCENT, cursor:"pointer", flexShrink:0, letterSpacing:"0.06em",
          }}>
            {loading ? "…" : "SEARCH"}
          </button>
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:MUTED, letterSpacing:"0.1em", marginBottom:"10px" }}>
              SEARCH RESULTS ({results.length})
            </div>
            {results.map(p => (
              <UserRow key={p.uid} person={p} isFriend={friendUids.has(p.uid)}/>
            ))}
          </div>
        )}

        {results.length === 0 && search && !loading && (
          <div style={{ textAlign:"center", padding:"24px", fontFamily:"system-ui", fontSize:"14px", color:MUTED }}>
            No users found for "{search}"
          </div>
        )}

        {/* Friends list */}
        <div>
          <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:MUTED, letterSpacing:"0.1em", marginBottom:"10px" }}>
            YOUR FRIENDS ({friends.length})
          </div>
          {friends.length === 0 ? (
            <div style={{
              background:WHITE, border:`1px solid ${BORDER}`, borderRadius:"16px",
              padding:"32px", textAlign:"center",
            }}>
              <div style={{ fontSize:"36px", marginBottom:"10px" }}>👥</div>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:CHALK, marginBottom:"6px" }}>No friends yet</div>
              <div style={{ fontFamily:"system-ui", fontSize:"13px", color:MUTED }}>
                Search for someone above or share your challenge link to get started
              </div>
            </div>
          ) : (
            // Deduplicate friends by uid before rendering
            [...new Map(friends.map(f => [f.uid, f])).values()].map(f => (
              <UserRow key={f.uid} person={f} isFriend={true}/>
            ))
          )}
        </div>
      </div>
    </div>
  );
}