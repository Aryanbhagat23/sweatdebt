import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, query, where, getDocs,
  orderBy, startAt, endAt, doc,
  setDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";

export default function UserSearch({ onSelectUser, currentUser, onClose }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [friends, setFriends] = useState({});
  const [friendLoading, setFriendLoading] = useState({});

  // Load existing friends on mount
  useEffect(() => {
    if (!currentUser) return;
    const loadFriends = async () => {
      try {
        const snap = await getDocs(collection(db, "users", currentUser.uid, "friends"));
        const f = {};
        snap.docs.forEach(d => { f[d.id] = true; });
        setFriends(f);
      } catch (e) {
        console.error("Load friends error:", e);
      }
    };
    loadFriends();
  }, [currentUser]);

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
      const uq = query(
        collection(db, "users"),
        orderBy("username"),
        startAt(lower),
        endAt(lower + "\uf8ff")
      );
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
      console.error("Search error:", e);
      // If index not ready, try simple fetch
      try {
        const allSnap = await getDocs(collection(db, "users"));
        const lower = text.toLowerCase().trim();
        const users = allSnap.docs
          .filter(d => d.id !== currentUser.uid)
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u =>
            u.displayName?.toLowerCase().includes(lower) ||
            u.username?.toLowerCase().includes(lower)
          );
        setResults(users);
        setSearched(true);
      } catch (e2) {
        console.error("Fallback search error:", e2);
      }
    }
    setLoading(false);
  };

  const toggleFriend = async (targetUser) => {
    const uid = targetUser.id;
    setFriendLoading(prev => ({ ...prev, [uid]: true }));
    try {
      const myFriendRef = doc(db, "users", currentUser.uid, "friends", uid);
      const theirFriendRef = doc(db, "users", uid, "friends", currentUser.uid);

      if (friends[uid]) {
        // Remove friend — both sides
        await deleteDoc(myFriendRef);
        await deleteDoc(theirFriendRef);
        setFriends(prev => { const n = { ...prev }; delete n[uid]; return n; });
      } else {
        // Add friend — both sides
        await setDoc(myFriendRef, {
          uid: targetUser.id,
          displayName: targetUser.displayName,
          email: targetUser.email,
          username: targetUser.username,
          photoURL: targetUser.photoURL || null,
          addedAt: serverTimestamp(),
        });
        await setDoc(theirFriendRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          username: currentUser.displayName?.toLowerCase().replace(/\s/g, "") || "",
          photoURL: currentUser.photoURL || null,
          addedAt: serverTimestamp(),
        });
        setFriends(prev => ({ ...prev, [uid]: true }));
      }
    } catch (e) {
      console.error("Toggle friend error:", e);
    }
    setFriendLoading(prev => ({ ...prev, [uid]: false }));
  };

  return (
    <div style={S.wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

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
            <span style={S.clearBtn} onClick={() => {
              setSearchText(""); setResults([]); setSearched(false);
            }}>✕</span>
          )}
        </div>
        {onClose && (
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={S.center}>
          <div style={S.spinner} />
          <div style={S.loadingText}>Searching...</div>
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div style={S.center}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <div style={S.emptyText}>No users found</div>
          <div style={S.emptySub}>Try a different name or ask them to join SweatDebt</div>
        </div>
      )}

      {/* Hint */}
      {!loading && !searched && (
        <div style={S.hintWrap}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
          <div style={S.hintTitle}>Find Your Friends</div>
          <div style={S.hintSub}>Type at least 2 characters to search</div>
          <div style={S.hintTips}>
            <div style={S.tip}>💡 Search by first name or username</div>
            <div style={S.tip}>💡 Add friends to see them in your bets</div>
            <div style={S.tip}>💡 They need to have signed in at least once</div>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div style={S.results}>
          <div style={S.resultsLabel}>
            {results.length} user{results.length > 1 ? "s" : ""} found
          </div>
          {results.map(u => (
            <UserCard
              key={u.id}
              user={u}
              isFriend={!!friends[u.id]}
              friendLoading={!!friendLoading[u.id]}
              onToggleFriend={() => toggleFriend(u)}
              onChallenge={() => onSelectUser(u)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({ user, isFriend, friendLoading, onToggleFriend, onChallenge }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{
        ...S.userCard,
        transform: pressed ? "scale(0.98)" : "scale(1)",
        transition: "all 0.15s",
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      {/* Avatar */}
      <div style={S.avatarWrap} onClick={onChallenge}>
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} style={S.avatarImg} />
        ) : (
          <div style={S.avatarFallback}>
            {user.displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        {isFriend && <div style={S.friendBadge}>✓</div>}
      </div>

      {/* Info */}
      <div style={S.userInfo} onClick={onChallenge}>
        <div style={S.userName}>{user.displayName}</div>
        <div style={S.userHandle}>@{user.username}</div>
        {user.bio && (
          <div style={S.userBio}>
            {user.bio.slice(0, 40)}{user.bio.length > 40 ? "..." : ""}
          </div>
        )}
        <div style={S.userStats}>
          <span style={S.statChip}>⚔️ {(user.wins || 0) + (user.losses || 0)}</span>
          <span style={{ ...S.statChip, color: "#00e676" }}>✓ {user.wins || 0}W</span>
          <span style={{ ...S.statChip, color: "#d4ff00" }}>⭐ {user.honour || 100}</span>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
        <button
          style={{
            ...S.friendBtn,
            background: isFriend ? "#1a1a1a" : "#d4ff00",
            color: isFriend ? "#888" : "#000",
            border: isFriend ? "1px solid #333" : "none",
            opacity: friendLoading ? 0.6 : 1,
          }}
          onClick={e => { e.stopPropagation(); onToggleFriend(); }}
          disabled={friendLoading}
        >
          {friendLoading ? "..." : isFriend ? "✓ Friends" : "+ Add"}
        </button>
        <button style={S.challengeBtn} onClick={e => { e.stopPropagation(); onChallenge(); }}>
          ⚔️ Bet
        </button>
      </div>
    </div>
  );
}

const S = {
  wrap: { flex: 1 },
  searchRow: { display: "flex", alignItems: "center", gap: "10px", padding: "16px 16px 12px" },
  searchBox: { flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "#1a1a1a", border: "1px solid #333", borderRadius: "14px", padding: "10px 14px" },
  searchIcon: { fontSize: "16px", flexShrink: 0 },
  input: { flex: 1, background: "none", border: "none", outline: "none", color: "#f5f0e8", fontSize: "16px", fontFamily: "'DM Sans',sans-serif" },
  clearBtn: { fontSize: "14px", color: "#555", cursor: "pointer", padding: "2px 4px" },
  cancelBtn: { background: "none", border: "none", color: "#d4ff00", fontSize: "15px", fontWeight: "500", cursor: "pointer", flexShrink: 0, padding: "8px 4px", fontFamily: "'DM Sans',sans-serif" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px", gap: "12px" },
  spinner: { width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #222", borderTop: "3px solid #d4ff00", animation: "spin 0.8s linear infinite" },
  loadingText: { fontFamily: "'DM Mono',monospace", fontSize: "12px", color: "#555" },
  emptyText: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "24px", color: "#555", letterSpacing: "0.04em", textAlign: "center" },
  emptySub: { fontFamily: "'DM Sans',sans-serif", fontSize: "13px", color: "#444", textAlign: "center" },
  hintWrap: { padding: "32px 24px", textAlign: "center" },
  hintTitle: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", color: "#f5f0e8", marginBottom: "8px", letterSpacing: "0.04em" },
  hintSub: { fontFamily: "'DM Sans',sans-serif", fontSize: "14px", color: "#666", marginBottom: "20px" },
  hintTips: { display: "flex", flexDirection: "column", gap: "10px", textAlign: "left", background: "#1a1a1a", borderRadius: "14px", padding: "16px" },
  tip: { fontFamily: "'DM Sans',sans-serif", fontSize: "13px", color: "#888", lineHeight: "1.5" },
  results: { padding: "0 16px" },
  resultsLabel: { fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#555", letterSpacing: "0.1em", marginBottom: "12px", textTransform: "uppercase" },
  userCard: { display: "flex", alignItems: "center", gap: "12px", background: "#1a1a1a", border: "1px solid #222", borderRadius: "16px", padding: "14px", marginBottom: "10px" },
  avatarWrap: { position: "relative", width: "52px", height: "52px", flexShrink: 0, cursor: "pointer" },
  avatarImg: { width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", border: "2px solid #d4ff00" },
  avatarFallback: { width: "52px", height: "52px", borderRadius: "50%", background: "linear-gradient(135deg,#d4ff00,#ff5c1a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "20px", color: "#000" },
  friendBadge: { position: "absolute", bottom: "-2px", right: "-2px", width: "18px", height: "18px", borderRadius: "50%", background: "#00e676", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#000", fontWeight: "700", border: "2px solid #111" },
  userInfo: { flex: 1, minWidth: 0, cursor: "pointer" },
  userName: { fontFamily: "'DM Sans',sans-serif", fontSize: "15px", fontWeight: "600", color: "#f5f0e8", marginBottom: "2px" },
  userHandle: { fontFamily: "'DM Mono',monospace", fontSize: "12px", color: "#666", marginBottom: "4px" },
  userBio: { fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: "#555", marginBottom: "4px", lineHeight: "1.3" },
  userStats: { display: "flex", gap: "4px", flexWrap: "wrap" },
  statChip: { fontSize: "10px", color: "#888", background: "#222", padding: "2px 6px", borderRadius: "8px" },
  friendBtn: { padding: "8px 14px", borderRadius: "10px", fontFamily: "'DM Sans',sans-serif", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", minWidth: "80px", textAlign: "center", transition: "all 0.2s" },
  challengeBtn: { background: "transparent", border: "1px solid #333", borderRadius: "10px", padding: "8px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: "#888", cursor: "pointer", whiteSpace: "nowrap", minWidth: "80px", textAlign: "center" },
};