import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, getDocs, doc,
  setDoc, serverTimestamp, getDoc,
} from "firebase/firestore";
import T, { gradientText } from "../theme";

export default function NewChat({ user }) {
  const navigate = useNavigate();
  const [friends,    setFriends]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [starting,   setStarting]   = useState(null);
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "users", user.uid, "friends"));
        const list = snap.docs.map(d => {
          const data = d.data();
          return {
            // The document ID in the friends subcollection IS the friend's uid
            id:          d.id,
            uid:         d.id,            // always use doc ID as uid — most reliable
            displayName: data.displayName || data.name || "Unknown",
            username:    data.username    || "",
            email:       data.email       || "",
            photoURL:    data.photoURL    || null,
          };
        });
        setFriends(list);
      } catch (e) {
        console.error("load friends error:", e);
        setError("Could not load friends");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const startConversation = async (friend) => {
    if (starting) return;
    setStarting(friend.uid);
    setError("");

    try {
      const friendUid = friend.uid;

      // Conversation ID is always the two UIDs sorted — same for both users
      const convoId = [user.uid, friendUid].sort().join("_");
      const convoRef = doc(db, "conversations", convoId);

      // Check if conversation already exists
      const existing = await getDoc(convoRef);

      if (!existing.exists()) {
        // Create it fresh
        await setDoc(convoRef, {
          participants:     [user.uid, friendUid],
          participantNames: {
            [user.uid]:  user.displayName  || "Me",
            [friendUid]: friend.displayName || "Friend",
          },
          participantPhotos: {
            [user.uid]:  user.photoURL     || null,
            [friendUid]: friend.photoURL   || null,
          },
          lastMessage:   "",
          lastMessageAt: serverTimestamp(),
          lastSenderId:  null,
          unreadCount: {
            [user.uid]:  0,
            [friendUid]: 0,
          },
          createdAt: serverTimestamp(),
        });
      }

      // Navigate to the chat
      navigate(`/inbox/${convoId}`);
    } catch (e) {
      console.error("start conversation error:", e);
      setError("Could not open chat. Please try again.");
    }
    setStarting(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, paddingBottom: "40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "52px 16px 20px", borderBottom: `1px solid ${T.border}` }}>
        <button
          onClick={() => navigate("/inbox")}
          style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "50%", width: "44px", height: "44px", color: T.white, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >←</button>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "28px", color: T.white, letterSpacing: "0.04em" }}>
          New <span style={gradientText}>Message</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: "12px 16px 0", background: T.redDim, border: `1px solid ${T.redBorder}`, borderRadius: T.r12, padding: "12px 16px", fontFamily: T.fontBody, fontSize: "14px", color: T.red }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: `3px solid ${T.bg3}`, borderTop: `3px solid ${T.pink}`, animation: "spin 0.8s linear infinite" }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && friends.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>👥</div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: "26px", color: T.muted, letterSpacing: "0.04em", marginBottom: "8px" }}>No friends yet</div>
          <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: T.dim, marginBottom: "24px" }}>Add friends first to start messaging</div>
          <button
            style={{ background: T.gradPrimary, border: "none", borderRadius: T.r16, padding: "14px 28px", fontFamily: T.fontDisplay, fontSize: "20px", letterSpacing: "0.06em", color: "#fff", cursor: "pointer" }}
            onClick={() => navigate("/friends")}
          >
            🔍 Find Friends
          </button>
        </div>
      )}

      {/* Friends list */}
      {!loading && friends.length > 0 && (
        <div style={{ padding: "16px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
            Your Friends ({friends.length})
          </div>
          {friends.map(f => {
            const isStarting = starting === f.uid;
            return (
              <div
                key={f.uid}
                style={{ display: "flex", alignItems: "center", gap: "14px", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: T.r20, padding: "14px 16px", marginBottom: "10px", opacity: isStarting ? 0.7 : 1, transition: "opacity 0.15s" }}
              >
                {/* Avatar */}
                {f.photoURL
                  ? <img src={f.photoURL} alt="" style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.border}`, flexShrink: 0 }} />
                  : <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: T.gradPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "20px", color: "#fff", flexShrink: 0 }}>
                      {f.displayName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                }

                {/* Name + username */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fontBody, fontSize: "15px", fontWeight: "600", color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.displayName}
                  </div>
                  <div style={{ fontFamily: T.fontMono, fontSize: "12px", color: T.muted, marginTop: "2px" }}>
                    @{f.username || f.email?.split("@")[0] || f.uid?.slice(0,8)}
                  </div>
                </div>

                {/* Message button */}
                <button
                  onClick={() => startConversation(f)}
                  disabled={!!starting}
                  style={{ background: "transparent", border: `1px solid ${T.pinkBorder}`, borderRadius: T.rFull, padding: "8px 18px", fontFamily: T.fontDisplay, fontSize: "15px", letterSpacing: "0.04em", color: T.pink, cursor: starting ? "not-allowed" : "pointer", flexShrink: 0, transition: "all 0.15s" }}
                >
                  {isStarting ? "Opening..." : "Message →"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}