import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, setDoc, increment, getDoc } from "firebase/firestore";

const C = { bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847", white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a", cyan:"#00d4ff", border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7" };

export default function ChatScreen({ user }) {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [convoData, setConvoData] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    getDoc(doc(db, "conversations", conversationId)).then(snap => {
      if (!snap.exists()) { navigate("/inbox"); return; }
      const data = snap.data(); setConvoData(data);
      const otherId = data.participants?.find(id => id !== user.uid);
      if (otherId) getDoc(doc(db, "users", otherId)).then(s => { if (s.exists()) setOtherUser({ id: otherId, ...s.data() }); });
    });
  }, [conversationId, user]);

  useEffect(() => {
    if (!conversationId) return;
    const q = query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      updateDoc(doc(db, "conversations", conversationId), { [`unreadCount.${user.uid}`]: 0 }).catch(() => {});
    }, () => setLoading(false));
    return () => unsub();
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? "auto" : "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || posting || !conversationId) return;
    setPosting(true);
    const t = text.trim(); setText("");
    try {
      const otherId = convoData?.participants?.find(id => id !== user.uid);
      await addDoc(collection(db, "conversations", conversationId, "messages"), { text:t, senderId:user.uid, senderName:user.displayName, senderPhoto:user.photoURL||null, createdAt:serverTimestamp(), read:false });
      await updateDoc(doc(db, "conversations", conversationId), { lastMessage:t.length>60?t.slice(0,60)+"...":t, lastMessageAt:serverTimestamp(), lastSenderId:user.uid, [`unreadCount.${otherId}`]:increment(1) });
      if (otherId) await setDoc(doc(db, "notifications", `${otherId}_dm_${user.uid}_${Date.now()}`), { toUserId:otherId, fromUserId:user.uid, fromName:user.displayName, fromPhoto:user.photoURL||null, type:"direct_message", message:`${user.displayName}: ${t.slice(0,50)}${t.length>50?"...":""}`, link:`/inbox/${conversationId}`, read:false, createdAt:serverTimestamp() });
    } catch (e) { console.error(e); setText(t); }
    setPosting(false);
  };

  const tLabel = (ts, prevTs) => {
    if (!ts?.toDate) return null;
    const d = ts.toDate(), prev = prevTs?.toDate?.();
    if (prev && (d - prev) < 5*60*1000) return null;
    const now = new Date();
    const t = d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    if (d.toDateString() === now.toDateString()) return t;
    if (new Date(now-86400000).toDateString() === d.toDateString()) return `Yesterday ${t}`;
    return `${d.toLocaleDateString([], { month:"short", day:"numeric" })} ${t}`;
  };

  const quick = ["😂","🔥","👑","Let's bet!","You're on!","gg"];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:C.bg0, overflow:"hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 12px", background:"rgba(7,13,26,0.97)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.border1}`, flexShrink:0 }}>
        <button style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }} onClick={() => navigate("/inbox")}>←</button>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", flex:1, cursor:"pointer" }} onClick={() => otherUser && navigate(`/profile/${otherUser.id}`)}>
          {otherUser?.photoURL
            ? <img src={otherUser.photoURL} alt="" style={{ width:"38px", height:"38px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.cyan}`, flexShrink:0 }} />
            : <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", color:"#000", flexShrink:0 }}>{otherUser?.displayName?.charAt(0)||"?"}</div>
          }
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"16px", fontWeight:"600", color:C.white }}>{otherUser?.displayName||"Chat"}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted }}>@{otherUser?.username||""}</div>
          </div>
        </div>
        <button style={{ background:"rgba(0,212,255,0.1)", border:"1px solid rgba(0,212,255,0.3)", borderRadius:"10px", padding:"8px 14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", color:C.cyan, cursor:"pointer", letterSpacing:"0.04em" }}
          onClick={() => navigate("/create", { state: { opponent: { email:otherUser?.email, displayName:otherUser?.displayName, uid:otherUser?.id } } })}>
          ⚔️ BET
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px 8px" }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"40px" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", border:`2px solid ${C.border1}`, borderTop:`2px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60%", gap:"10px", textAlign:"center" }}>
            {otherUser?.photoURL
              ? <img src={otherUser.photoURL} alt="" style={{ width:"72px", height:"72px", borderRadius:"50%", objectFit:"cover", border:`3px solid ${C.cyan}` }} />
              : <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:"#000" }}>{otherUser?.displayName?.charAt(0)||"?"}</div>
            }
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.white, letterSpacing:"0.04em" }}>{otherUser?.displayName}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted }}>Send a message to start the conversation</div>
          </div>
        ) : messages.map((msg, i) => {
          const isMe = msg.senderId === user.uid;
          const prev = messages[i-1], next = messages[i+1];
          const label = tLabel(msg.createdAt, prev?.createdAt);
          const grouped = prev && prev.senderId === msg.senderId && (msg.createdAt?.toDate?.()-prev.createdAt?.toDate?.()) < 5*60*1000;
          return (
            <React.Fragment key={msg.id}>
              {label && <div style={{ textAlign:"center", padding:"12px 0 4px" }}><span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.dim, background:C.bg2, padding:"3px 10px", borderRadius:"10px" }}>{label}</span></div>}
              <div style={{ display:"flex", justifyContent: isMe?"flex-end":"flex-start", alignItems:"flex-end", gap:"8px", marginBottom: grouped?"2px":"8px", paddingLeft: isMe?"60px":"0", paddingRight: isMe?"0":"60px", animation:"fi 0.2s ease" }}>
                {!isMe && (
                  <div style={{ width:"28px", height:"28px", flexShrink:0, marginBottom:"2px", opacity: (!next||next.senderId!==msg.senderId)?1:0 }}>
                    {otherUser?.photoURL
                      ? <img src={otherUser.photoURL} alt="" style={{ width:"28px", height:"28px", borderRadius:"50%", objectFit:"cover" }} />
                      : <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"11px", color:"#000" }}>{msg.senderName?.charAt(0)||"?"}</div>
                    }
                  </div>
                )}
                <div style={{ maxWidth:"70%", background: isMe?`linear-gradient(135deg,${C.cyan},${C.purple})`:C.bg2, color: isMe?"#000":C.white, borderRadius: isMe?`18px 18px ${grouped?"18px":"4px"} 18px`:`18px 18px 18px ${grouped?"18px":"4px"}`, padding:"10px 14px", border: isMe?"none":`1px solid ${C.border1}` }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", lineHeight:"1.5", wordBreak:"break-word" }}>{msg.text}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div style={{ display:"flex", gap:"8px", padding:"8px 16px", overflowX:"auto", flexShrink:0, borderTop:`1px solid ${C.border1}`, background:"rgba(7,13,26,0.97)" }}>
        {quick.map(q => (
          <button key={q} style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"6px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.white, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}
            onClick={() => { setText(p => p+q); inputRef.current?.focus(); }}>{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding:"10px 16px", paddingBottom:"calc(10px + env(safe-area-inset-bottom,0px))", background:"rgba(7,13,26,0.97)", borderTop:`1px solid ${C.border1}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", background:C.bg2, border:`1.5px solid ${C.border2}`, borderRadius:"24px", padding:"10px 14px" }}>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="Message..." onKeyDown={e => e.key==="Enter" && !e.shiftKey && send()} maxLength={1000}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e0f2fe", caretColor:C.cyan, WebkitTextFillColor:"#e0f2fe", fontSize:"15px", fontFamily:"'DM Sans',sans-serif" }} />
          <button onClick={send} disabled={!text.trim()||posting}
            style={{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"50%", width:"32px", height:"32px", fontSize:"16px", color:"#000", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor: text.trim()?"pointer":"not-allowed", opacity: text.trim()&&!posting?1:0.4, transition:"opacity 0.2s" }}>
            {posting?"…":"↑"}
          </button>
        </div>
      </div>
    </div>
  );
}