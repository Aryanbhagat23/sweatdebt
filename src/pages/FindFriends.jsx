import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, getDocs, doc, setDoc, deleteDoc,
  serverTimestamp, getDoc, query, where,
} from "firebase/firestore";
import T, { gradientText } from "../theme";

export default function FindFriends({ user }) {
  const navigate = useNavigate();
  const [search, setSearch]       = useState("");
  const [results, setResults]     = useState([]);
  const [friends, setFriends]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [actioningId, setActioningId] = useState(null);

  // Load current friends list on mount
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "friends")).then(snap => {
      setFriends(snap.docs.map(d => d.id));
    });
  }, [user]);

  const doSearch = async () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    setLoading(true);
    setSearched(true);

    try {
      // Search by username first
      const snap = await getDocs(collection(db, "users"));
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== user.uid)
        .filter(u => {
          const name     = (u.displayName || "").toLowerCase();
          const username = (u.username || "").toLowerCase();
          const email    = (u.email || "").toLowerCase();
          return name.includes(q) || username.includes(q) || email.includes(q);
        });
      setResults(all);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleFriend = async (person) => {
    setActioningId(person.id);
    try {
      const myRef    = doc(db, "users", user.uid, "friends", person.id);
      const theirRef = doc(db, "users", person.id, "friends", user.uid);
      const isFriend = friends.includes(person.id);

      if (isFriend) {
        await deleteDoc(myRef);
        await deleteDoc(theirRef);
        setFriends(prev => prev.filter(id => id !== person.id));
      } else {
        await setDoc(myRef, {
          uid: person.id,
          displayName: person.displayName || "",
          email: person.email || "",
          photoURL: person.photoURL || null,
          username: person.username || "",
          addedAt: serverTimestamp(),
        });
        await setDoc(theirRef, {
          uid: user.uid,
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || null,
          addedAt: serverTimestamp(),
        });
        // Send notification
        try {
          await setDoc(doc(db, "notifications", `${person.id}_friend_request_${user.uid}_${Date.now()}`), {
            toUserId:  person.id,
            fromUserId: user.uid,
            fromName:  user.displayName,
            fromPhoto: user.photoURL || null,
            type:      "friend_request",
            message:   `${user.displayName} sent you a friend request 👋`,
            read:      false,
            createdAt: serverTimestamp(),
          });
        } catch (_) {}
        setFriends(prev => [...prev, person.id]);
      }
    } catch (e) {
      console.error(e);
    }
    setActioningId(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, paddingBottom: "40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "52px 16px 20px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "50%", width: "44px", height: "44px", color: T.white, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >←</button>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "32px", color: T.white, letterSpacing: "0.02em" }}>
          Find <span style={gradientText}>Friends</span>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "0 16px 20px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Search by name, username or email..."
            style={{ flex: 1, background: T.bg2, border: `1px solid ${T.borderMid}`, borderRadius: T.r16, padding: "14px 16px", color: "#ffffff", WebkitTextFillColor: "#ffffff", fontSize: "16px", fontFamily: T.fontBody, outline: "none", caretColor: T.pink }}
          />
          <button
            onClick={doSearch}
            disabled={!search.trim() || loading}
            style={{ background: T.gradPrimary, border: "none", borderRadius: T.r16, padding: "14px 20px", fontFamily: T.fontDisplay, fontSize: "18px", letterSpacing: "0.04em", color: "#fff", cursor: "pointer", opacity: !search.trim() ? 0.4 : 1, flexShrink: 0 }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: `3px solid ${T.bg3}`, borderTop: `3px solid ${T.pink}`, animation: "spin 0.8s linear infinite" }} />
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: "22px", color: T.muted, letterSpacing: "0.04em" }}>No users found</div>
          <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: T.dim, marginTop: "8px" }}>Try a different name or username</div>
        </div>
      )}

      {/* Empty state before search */}
      {!loading && !searched && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>👥</div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: "22px", color: T.muted, letterSpacing: "0.04em" }}>Find your friends</div>
          <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: T.dim, marginTop: "8px" }}>Search by name, username or email</div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </div>
          {results.map(person => {
            const isFriend = friends.includes(person.id);
            const actioning = actioningId === person.id;
            return (
              <div
                key={person.id}
                style={{ display: "flex", alignItems: "center", gap: "14px", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: T.r20, padding: "14px 16px", marginBottom: "10px" }}
              >
                {/* Avatar */}
                <div
                  style={{ cursor: "pointer", flexShrink: 0 }}
                  onClick={() => navigate(`/profile/${person.id}`)}
                >
                  {person.photoURL
                    ? <img src={person.photoURL} alt="" style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${isFriend ? T.pink : T.border}` }} />
                    : <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: T.gradPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "20px", color: "#fff" }}>
                        {person.displayName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/profile/${person.id}`)}>
                  <div style={{ fontFamily: T.fontBody, fontSize: "15px", fontWeight: "600", color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {person.displayName || "Unknown"}
                  </div>
                  <div style={{ fontFamily: T.fontMono, fontSize: "12px", color: T.muted, marginTop: "2px" }}>
                    @{person.username || person.email?.split("@")[0] || ""}
                  </div>
                  {person.currentWinStreak >= 3 && (
                    <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.orange, marginTop: "3px" }}>🔥 {person.currentWinStreak} streak</div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => toggleFriend(person)}
                    disabled={actioning}
                    style={{ background: isFriend ? T.bg3 : T.gradPrimary, border: isFriend ? `1px solid ${T.border}` : "none", borderRadius: T.r12, padding: "10px 16px", fontFamily: T.fontDisplay, fontSize: "14px", letterSpacing: "0.04em", color: isFriend ? T.muted : "#fff", cursor: "pointer", opacity: actioning ? 0.6 : 1, transition: "all 0.2s" }}
                  >
                    {actioning ? "..." : isFriend ? "Friends ✓" : "+ Add"}
                  </button>
                  <button
                    onClick={() => navigate("/create", { state: { opponent: { email: person.email, displayName: person.displayName, uid: person.id } } })}
                    style={{ background: T.pinkDim, border: `1px solid ${T.pinkBorder}`, borderRadius: T.r12, padding: "10px 14px", fontFamily: T.fontDisplay, fontSize: "14px", color: T.pink, cursor: "pointer" }}
                  >
                    ⚔️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}