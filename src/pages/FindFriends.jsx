import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, getDocs, query, where,
  doc, setDoc, deleteDoc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import T from "../theme";

const C = {
  page:"#f0fdf4", card:"#ffffff", border:"#d1fae5",
  heading:"#052e16", muted:"#6b7280", accent:"#10b981",
};

export default function FindFriends({ user }) {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [results,    setResults]    = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [friends,    setFriends]    = useState([]);
  const [friendUids, setFriendUids] = useState(new Set());
  const [loadingFriend, setLoadingFriend] = useState(null);

  /* load existing friends */
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db,"users",user.uid,"friends"), snap => {
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      setFriends(data);
      setFriendUids(new Set(data.map(f=>f.id)));
    });
    return () => unsub();
  }, [user]);

  const handleSearch = async () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || term.length < 2) return;
    setSearching(true);
    try {
      const usersRef = collection(db,"users");
      // search by username
      const q1 = query(usersRef, where("username",">=",term), where("username","<=",term+"\uf8ff"));
      // search by displayName lowercase
      const q2 = query(usersRef, where("displayNameLower",">=",term), where("displayNameLower","<=",term+"\uf8ff"));

      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const seen = new Set();
      const all  = [];
      [...s1.docs, ...s2.docs].forEach(d => {
        if (!seen.has(d.id) && d.id !== user.uid) {
          seen.add(d.id);
          all.push({ id:d.id, ...d.data() });
        }
      });
      setResults(all);
    } catch(e) { console.error(e); }
    setSearching(false);
  };

  const toggleFriend = async (person) => {
    if (loadingFriend) return;
    setLoadingFriend(person.id);
    try {
      const myRef    = doc(db,"users",user.uid,"friends",person.id);
      const theirRef = doc(db,"users",person.id,"friends",user.uid);

      if (friendUids.has(person.id)) {
        await deleteDoc(myRef);
        await deleteDoc(theirRef);
      } else {
        await setDoc(myRef, {
          uid:         person.id,
          displayName: person.displayName || "Unknown",
          username:    person.username    || "",
          email:       person.email       || "",
          photoURL:    person.photoURL    || null,
          addedAt:     serverTimestamp(),
        });
        await setDoc(theirRef, {
          uid:         user.uid,
          displayName: user.displayName   || "",
          username:    "",
          email:       user.email         || "",
          photoURL:    user.photoURL      || null,
          addedAt:     serverTimestamp(),
        });
      }
    } catch(e) { console.error(e); }
    setLoadingFriend(null);
  };

  const PersonRow = ({ person, showRemove }) => {
    const isFr = friendUids.has(person.id);
    const isLoading = loadingFriend === person.id;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px" }}>
        {/* avatar */}
        <div onClick={()=>navigate(`/profile/${person.id}`)} style={{ cursor:"pointer", flexShrink:0 }}>
          {person.photoURL
            ? <img src={person.photoURL} alt="" style={{ width:"46px", height:"46px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.border}` }}/>
            : <div style={{ width:"46px", height:"46px", borderRadius:"50%", background:`${C.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", fontWeight:"700", color:C.accent, border:`2px solid ${C.border}` }}>
                {(person.displayName||"?").charAt(0).toUpperCase()}
              </div>
          }
        </div>
        {/* info */}
        <div style={{ flex:1, cursor:"pointer" }} onClick={()=>navigate(`/profile/${person.id}`)}>
          <div style={{ fontSize:"15px", fontWeight:"600", color:C.heading }}>{person.displayName||"Unknown"}</div>
          <div style={{ fontSize:"12px", color:C.muted, fontFamily:"monospace" }}>@{person.username||person.displayName?.toLowerCase().replace(/\s/g,"")}</div>
        </div>
        {/* action button */}
        <button type="button" onClick={()=>toggleFriend(person)} disabled={!!isLoading}
          style={{
            padding:"8px 16px", borderRadius:"20px", fontSize:"12px", fontFamily:"monospace", fontWeight:"700", cursor:"pointer", transition:"all 0.2s", flexShrink:0,
            background: isFr ? C.page      : C.heading,
            border:     isFr ? `1px solid #ef444460` : "none",
            color:      isFr ? "#ef4444"   : C.accent,
            opacity:    isLoading ? 0.5 : 1,
          }}>
          {isLoading ? "..." : isFr ? "Remove" : "+ Add"}
        </button>
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:C.page, paddingBottom:"90px" }}>

      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 16px" }}>
        <button type="button" onClick={()=>navigate(-1)}
          style={{ width:"44px", height:"44px", borderRadius:"50%", background:C.card, border:`1px solid ${C.border}`, color:C.heading, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ←
        </button>
        <div>
          <div style={{ fontSize:"28px", fontWeight:"700", color:C.heading, fontStyle:"italic", fontFamily:"monospace", letterSpacing:"0.04em" }}>Find Friends</div>
          <div style={{ fontSize:"12px", color:C.muted }}>{friends.length} friend{friends.length!==1?"s":""} so far</div>
        </div>
      </div>

      {/* search */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ display:"flex", gap:"8px" }}>
          <input
            value={searchTerm}
            onChange={e=>setSearchTerm(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleSearch()}
            placeholder="Search by name or username..."
            style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", padding:"14px 16px", color:C.heading, fontSize:"15px", fontFamily:"system-ui", outline:"none" }}
          />
          <button type="button" onClick={handleSearch} disabled={searching}
            style={{ padding:"14px 20px", background:C.heading, border:"none", borderRadius:"14px", fontFamily:"monospace", fontSize:"13px", fontWeight:"700", color:C.accent, cursor:"pointer", flexShrink:0 }}>
            {searching ? "..." : "SEARCH"}
          </button>
        </div>
      </div>

      {/* search results */}
      {results.length > 0 && (
        <div style={{ padding:"0 16px 20px" }}>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.1em", marginBottom:"10px" }}>
            RESULTS ({results.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {results.map(p => <PersonRow key={p.id} person={p} />)}
          </div>
        </div>
      )}

      {results.length === 0 && searchTerm && !searching && (
        <div style={{ textAlign:"center", padding:"24px", color:C.muted, fontSize:"14px" }}>
          No users found for "{searchTerm}"
        </div>
      )}

      {/* ── FRIEND LIST — always visible ── */}
      <div style={{ padding:"0 16px" }}>
        <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.1em", marginBottom:"10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span>YOUR FRIENDS ({friends.length})</span>
        </div>

        {friends.length === 0 ? (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"32px 20px", textAlign:"center" }}>
            <div style={{ fontSize:"36px", marginBottom:"10px" }}>👥</div>
            <div style={{ fontSize:"16px", fontWeight:"600", color:C.heading, marginBottom:"4px" }}>No friends yet</div>
            <div style={{ fontSize:"13px", color:C.muted }}>Search above to find and add friends</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {friends.map(f => (
              <PersonRow key={f.id} person={{ ...f, id:f.id }} showRemove />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}