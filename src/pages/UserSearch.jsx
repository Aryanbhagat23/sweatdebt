import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection, query, where,
  getDocs, orderBy, startAt, endAt
} from "firebase/firestore";
import { SkeletonSearchResult } from "../components/Skeleton";

export default function UserSearch({ onSelectUser, currentUser, onClose }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (text) => {
    setSearchText(text);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const lower = text.toLowerCase().trim();
      // Search by username
      const uq = query(
        collection(db, "users"),
        orderBy("username"),
        startAt(lower),
        endAt(lower + "\uf8ff")
      );
      // Search by displayName
      const nq = query(
        collection(db, "users"),
        orderBy("displayName"),
        startAt(text),
        endAt(text + "\uf8ff")
      );
      const [uSnap, nSnap] = await Promise.all([getDocs(uq), getDocs(nq)]);
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={S.wrap}>
      {/* Search input */}
      <div style={S.searchRow}>
        <div style={S.searchBox}>
          <span style={S.searchIcon}>🔍</span>
          <input
            style={S.input}
            placeholder="Search by name or username..."
            value={searchText}
            onChange={e => search(e.target.value)}
            autoFocus
          />
          {searchText.length > 0 && (
            <span style={S.clearBtn} onClick={() => { setSearchText(""); setResults([]); setSearched(false); }}>✕</span>
          )}
        </div>
        {onClose && (
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{padding:"0 16px"}}>
            {[...Array(4)].map((_,i)=>(
              <SkeletonSearchResult key={i}/>
                ))}
            <span style={{...S.dot, animationDelay:"0s"}}/>
            <span style={{...S.dot, animationDelay:"0.15s"}}/>
            <span style={{...S.dot, animationDelay:"0.3s"}}/>
          </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div style={S.center}>
          <div style={S.emptyIcon}>🔍</div>
          <div style={S.emptyText}>No users found for "{searchText}"</div>
          <div style={S.emptySub}>Try a different name or ask them to join SweatDebt</div>
        </div>
      )}

      {/* Hint before searching */}
      {!loading && !searched && (
        <div style={S.hintWrap}>
          <div style={S.hintTitle}>Find your friends</div>
          <div style={S.hintSub}>Type at least 2 characters to search</div>
          <div style={S.hintTips}>
            <div style={S.tip}>💡 Search by first name</div>
            <div style={S.tip}>💡 Search by username</div>
            <div style={S.tip}>💡 They need to have signed in at least once</div>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div style={S.results}>
          <div style={S.resultsLabel}>{results.length} user{results.length>1?"s":""} found</div>
          {results.map(u => (
            <UserCard
              key={u.id}
              user={u}
              onSelect={() => onSelectUser(u)}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:scale(0)}
          40%{transform:scale(1)}
        }
      `}</style>
    </div>
  );
}

function UserCard({ user, onSelect }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      style={{
        ...S.userCard,
        transform:pressed?"scale(0.98)":"scale(1)",
        transition:"all 0.15s"
      }}
      onMouseDown={()=>setPressed(true)}
      onMouseUp={()=>setPressed(false)}
      onTouchStart={()=>setPressed(true)}
      onTouchEnd={()=>setPressed(false)}
      onClick={onSelect}
    >
      {/* Avatar with photo support */}
      <div style={S.avatarWrap}>
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} style={S.avatarImg}/>
        ) : (
          <div style={S.avatarFallback}>
            {user.displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        {/* Online indicator */}
        <div style={S.onlineDot}/>
      </div>

      <div style={S.userInfo}>
        <div style={S.userName}>{user.displayName}</div>
        <div style={S.userHandle}>@{user.username}</div>
        {user.bio && (
          <div style={S.userBio}>{user.bio.slice(0,40)}{user.bio.length>40?"...":""}</div>
        )}
        <div style={S.userStats}>
          <span style={S.statChip}>⚔️ {(user.wins||0)+(user.losses||0)}</span>
          <span style={{...S.statChip,color:"#00e676"}}>✓ {user.wins||0}W</span>
          <span style={{...S.statChip,color:"#d4ff00"}}>⭐ {user.honour||100}</span>
        </div>
      </div>

      <div style={S.challengeBtn}>⚔️</div>
    </div>
  );
}

const S = {
  wrap:{flex:1},
  searchRow:{display:"flex",alignItems:"center",gap:"10px",padding:"16px 16px 12px"},
  searchBox:{flex:1,display:"flex",alignItems:"center",gap:"8px",background:"#1a1a1a",border:"1px solid #333",borderRadius:"14px",padding:"10px 14px"},
  searchIcon:{fontSize:"16px",flexShrink:0},
  input:{flex:1,background:"none",border:"none",outline:"none",color:"#f5f0e8",fontSize:"16px",fontFamily:"sans-serif"},
  clearBtn:{fontSize:"14px",color:"#555",cursor:"pointer",padding:"2px 4px"},
  cancelBtn:{background:"none",border:"none",color:"#d4ff00",fontSize:"15px",fontWeight:"500",cursor:"pointer",flexShrink:0,padding:"8px 4px"},
  center:{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 20px",gap:"12px"},
  loadingDots:{display:"flex",gap:"6px",alignItems:"center"},
  dot:{display:"inline-block",width:"8px",height:"8px",borderRadius:"50%",background:"#d4ff00",animation:"bounce 1.2s infinite ease-in-out"},
  emptyIcon:{fontSize:"40px"},
  emptyText:{color:"#888",fontSize:"15px",fontWeight:"500",textAlign:"center"},
  emptySub:{color:"#444",fontSize:"13px",textAlign:"center",lineHeight:"1.5"},
  hintWrap:{padding:"32px 24px",textAlign:"center"},
  hintTitle:{fontSize:"18px",fontWeight:"600",color:"#f5f0e8",marginBottom:"8px"},
  hintSub:{fontSize:"14px",color:"#666",marginBottom:"24px"},
  hintTips:{display:"flex",flexDirection:"column",gap:"10px",textAlign:"left",background:"#1a1a1a",borderRadius:"14px",padding:"16px"},
  tip:{fontSize:"13px",color:"#888",lineHeight:"1.5"},
  results:{padding:"0 16px"},
  resultsLabel:{fontSize:"11px",color:"#555",letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:"12px",textTransform:"uppercase"},
  userCard:{display:"flex",alignItems:"center",gap:"14px",background:"#1a1a1a",border:"1px solid #222",borderRadius:"16px",padding:"14px",marginBottom:"10px",cursor:"pointer",transition:"all 0.15s"},
  userAvatar:{width:"48px",height:"48px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",fontWeight:"700",color:"#000",flexShrink:0},
  userInfo:{flex:1},
  userName:{fontSize:"16px",fontWeight:"600",color:"#f5f0e8",marginBottom:"2px"},
  userHandle:{fontSize:"12px",color:"#666",fontFamily:"monospace",marginBottom:"6px"},
  userStats:{display:"flex",gap:"6px",flexWrap:"wrap"},
  statChip:{fontSize:"11px",color:"#888",background:"#222",padding:"3px 8px",borderRadius:"10px"},
  challengeBtn:{background:"#d4ff00",color:"#000",fontSize:"12px",fontWeight:"700",padding:"8px 14px",borderRadius:"10px",flexShrink:0,whiteSpace:"nowrap"},
// Add these to the S object in UserSearch.jsx:
avatarWrap:{position:"relative",width:"52px",height:"52px",flexShrink:0},
avatarImg:{width:"52px",height:"52px",borderRadius:"50%",objectFit:"cover",border:"2px solid #d4ff00"},
avatarFallback:{width:"52px",height:"52px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",fontWeight:"700",color:"#000"},
onlineDot:{position:"absolute",bottom:"2px",right:"2px",width:"12px",height:"12px",borderRadius:"50%",background:"#00e676",border:"2px solid #111"},
userBio:{fontSize:"12px",color:"#555",marginBottom:"4px",lineHeight:"1.3"},
};