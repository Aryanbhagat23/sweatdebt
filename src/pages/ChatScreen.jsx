import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, updateDoc,
  setDoc, increment, getDoc,
} from "firebase/firestore";
import T from "../theme";

export default function ChatScreen({ user }) {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [posting,   setPosting]   = useState(false);
  const [other,     setOther]     = useState(null);
  const [convo,     setConvo]     = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Load conversation + other user
  useEffect(() => {
    if (!conversationId || !user) return;
    getDoc(doc(db, "conversations", conversationId)).then(snap => {
      if (!snap.exists()) { navigate("/inbox"); return; }
      const d = snap.data();
      setConvo(d);
      const oid = d.participants?.find(id => id !== user.uid);
      if (oid) getDoc(doc(db, "users", oid)).then(s => { if (s.exists()) setOther({ id: oid, ...s.data() }); });
    });
  }, [conversationId, user]);

  // Listen to messages
  useEffect(() => {
    if (!conversationId) return;
    const u = onSnapshot(
      query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc")),
      snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        // Mark as read
        updateDoc(doc(db, "conversations", conversationId), {
          [`unreadCount.${user.uid}`]: 0,
        }).catch(() => {});
      },
      () => setLoading(false)
    );
    return () => u();
  }, [conversationId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? "auto" : "smooth" });
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || posting || !conversationId) return;
    setPosting(true);
    setText("");
    try {
      const oid = convo?.participants?.find(id => id !== user.uid);
      await addDoc(collection(db, "conversations", conversationId, "messages"), {
        text:        t,
        senderId:    user.uid,
        senderName:  user.displayName,
        senderPhoto: user.photoURL || null,
        createdAt:   serverTimestamp(),
        read:        false,
      });
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage:    t.length > 60 ? t.slice(0, 60) + "..." : t,
        lastMessageAt:  serverTimestamp(),
        lastSenderId:   user.uid,
        [`unreadCount.${oid}`]: increment(1),
      });
      // Notification
      if (oid) {
        await setDoc(doc(db, "notifications", `${oid}_dm_${user.uid}_${Date.now()}`), {
          toUserId:  oid,
          fromUserId: user.uid,
          fromName:  user.displayName,
          fromPhoto: user.photoURL || null,
          type:      "direct_message",
          message:   `${user.displayName}: ${t.slice(0, 50)}${t.length > 50 ? "..." : ""}`,
          link:      `/inbox/${conversationId}`,
          read:      false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
      setText(t); // restore on error
    }
    setPosting(false);
  };

  const timeLabel = (ts, prev) => {
    if (!ts?.toDate) return null;
    const d = ts.toDate();
    const p = prev?.toDate?.();
    if (p && d - p < 5 * 60 * 1000) return null;
    const now = new Date();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return time;
    if (new Date(now - 86400000).toDateString() === d.toDateString()) return `Yesterday ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  const QUICK = ["😂", "🔥", "👑", "Let's bet!", "You're on!", "gg"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg0, overflow: "hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "52px 16px 12px", background: "rgba(10,10,15,0.97)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <button
          onClick={() => navigate("/inbox")}
          style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "50%", width: "44px", height: "44px", color: T.white, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >←</button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, cursor: "pointer" }} onClick={() => other && navigate(`/profile/${other.id}`)}>
          {other?.photoURL
            ? <img src={other.photoURL} alt="" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.pink}`, flexShrink: 0 }} />
            : <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: T.gradPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "15px", color: "#fff", flexShrink: 0 }}>
                {other?.displayName?.charAt(0) || "?"}
              </div>
          }
          <div>
            <div style={{ fontFamily: T.fontBody, fontSize: "16px", fontWeight: "700", color: T.white }}>{other?.displayName || "Chat"}</div>
            <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.muted }}>@{other?.username || ""}</div>
          </div>
        </div>

        <button
          onClick={() => navigate("/create", { state: { opponent: { email: other?.email, displayName: other?.displayName, uid: other?.id } } })}
          style={{ background: T.pinkDim, border: `1px solid ${T.pinkBorder}`, borderRadius: T.r12, padding: "8px 14px", fontFamily: T.fontDisplay, fontSize: "14px", color: T.pink, cursor: "pointer", letterSpacing: "0.04em", flexShrink: 0 }}
        >
          ⚔️ BET
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: `2px solid ${T.bg3}`, borderTop: `2px solid ${T.pink}`, animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60%", gap: "10px", textAlign: "center" }}>
            {other?.photoURL
              ? <img src={other.photoURL} alt="" style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.pink}` }} />
              : <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: T.gradPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "28px", color: "#fff" }}>
                  {other?.displayName?.charAt(0) || "?"}
                </div>
            }
            <div style={{ fontFamily: T.fontDisplay, fontSize: "22px", color: T.white, letterSpacing: "0.04em" }}>{other?.displayName}</div>
            <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: T.muted }}>Send a message to start the conversation</div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.senderId === user.uid;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const lbl  = timeLabel(m.createdAt, prev?.createdAt);
            const grouped = prev && prev.senderId === m.senderId && (m.createdAt?.toDate?.() - prev.createdAt?.toDate?.()) < 5 * 60 * 1000;
            return (
              <React.Fragment key={m.id}>
                {lbl && (
                  <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                    <span style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.dim, background: T.bg2, padding: "3px 10px", borderRadius: T.r12 }}>{lbl}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px", marginBottom: grouped ? "2px" : "8px", paddingLeft: isMe ? "60px" : "0", paddingRight: isMe ? "0" : "60px", animation: "fi 0.2s ease" }}>
                  {!isMe && (
                    <div style={{ width: "28px", height: "28px", flexShrink: 0, marginBottom: "2px", opacity: (!next || next.senderId !== m.senderId) ? 1 : 0 }}>
                      {other?.photoURL
                        ? <img src={other.photoURL} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                        : <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: T.gradPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "11px", color: "#fff" }}>
                            {m.senderName?.charAt(0) || "?"}
                          </div>
                      }
                    </div>
                  )}
                  <div style={{ maxWidth: "72%", background: isMe ? T.gradPrimary : T.bg2, color: T.white, borderRadius: isMe ? `18px 18px ${grouped ? "18px" : "4px"} 18px` : `18px 18px 18px ${grouped ? "18px" : "4px"}`, padding: "10px 14px", border: isMe ? "none" : `1px solid ${T.border}` }}>
                    <div style={{ fontFamily: T.fontBody, fontSize: "15px", lineHeight: "1.5", wordBreak: "break-word", color: "#ffffff" }}>{m.text}</div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div style={{ display: "flex", gap: "8px", padding: "8px 16px", overflowX: "auto", flexShrink: 0, borderTop: `1px solid ${T.border}`, background: "rgba(10,10,15,0.97)" }}>
        {QUICK.map(q => (
          <button
            key={q}
            type="button"
            style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.rFull, padding: "6px 14px", fontFamily: T.fontBody, fontSize: "13px", color: T.white, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
            onClick={() => { setText(p => p + q); inputRef.current?.focus(); }}
          >{q}</button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 16px", paddingBottom: "calc(10px + env(safe-area-inset-bottom,0px))", background: "rgba(10,10,15,0.97)", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: T.bg2, border: `1px solid ${T.borderMid}`, borderRadius: T.rFull, padding: "10px 14px" }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Message..."
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            maxLength={1000}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#ffffff", WebkitTextFillColor: "#ffffff", caretColor: T.pink, fontSize: "15px", fontFamily: T.fontBody }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!text.trim() || posting}
            style={{ background: text.trim() ? T.gradPrimary : T.bg3, border: "none", borderRadius: "50%", width: "34px", height: "34px", fontSize: "16px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() && !posting ? 1 : 0.4, transition: "all 0.2s" }}
          >
            {posting ? "…" : "↑"}
          </button>
        </div>
      </div>
    </div>
  );
}