import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, onSnapshot, collection, query,
  orderBy, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import T from "../theme";

export default function ChatScreen({ user }) {
  const { convoId } = useParams();
  const navigate    = useNavigate();

  const [convo,    setConvo]    = useState(null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Load conversation
  useEffect(() => {
    if (!convoId) return;
    const unsub = onSnapshot(doc(db,"conversations",convoId), snap => {
      if (snap.exists()) setConvo({ id:snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [convoId]);

  // Load messages
  useEffect(() => {
    if (!convoId) return;
    const q = query(collection(db,"conversations",convoId,"messages"), orderBy("createdAt","asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
    });
    return () => unsub();
  }, [convoId]);

  // Mark as read
  useEffect(() => {
    if (!convoId||!user) return;
    updateDoc(doc(db,"conversations",convoId),{
      [`unreadCount.${user.uid}`]: 0,
    }).catch(()=>{});
  }, [convoId, user, messages.length]);

  const send = async () => {
    if (!text.trim()||sending) return;
    setSending(true);
    const t = text.trim();
    setText("");
    try {
      const otherUid = convo?.participants?.find(p=>p!==user.uid);
      await addDoc(collection(db,"conversations",convoId,"messages"),{
        type:        "text",
        text:        t,
        senderId:    user.uid,
        senderName:  user.displayName,
        senderPhoto: user.photoURL||null,
        createdAt:   serverTimestamp(),
        read:        false,
      });
      await updateDoc(doc(db,"conversations",convoId),{
        lastMessage:   t,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUid}`]: 1,
      });
    } catch(e) { console.error(e); setText(t); }
    setSending(false);
  };

  const otherUid  = convo?.participants?.find(p=>p!==user?.uid);
  const otherName = convo?.participantNames?.[otherUid] || "Chat";
  const otherPhoto = convo?.participantPhotos?.[otherUid] || null;

  const timeStr = ts => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    return d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  };

  const QUICK_REPLIES = ["😂","🔥","Let's go!","gg","You're on!","No chance 😤"];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:T.bg0 }}>

      {/* Header */}
      <div style={{ background:T.panel, padding:"52px 16px 14px", display:"flex", alignItems:"center", gap:"12px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <button type="button" onClick={()=>navigate(-1)}
          style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"50%", width:"40px", height:"40px", color:T.panel, fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ←
        </button>
        {otherPhoto
          ? <img src={otherPhoto} alt="" style={{ width:"40px", height:"40px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${T.accent}` }}/>
          : <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:T.bg1, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:T.accent, flexShrink:0 }}>
              {otherName.charAt(0)}
            </div>
        }
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fontBody, fontSize:"16px", fontWeight:"600", color:"#fff" }}>{otherName}</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.accent, opacity:0.8 }}>tap to view profile</div>
        </div>
        {/* Challenge button */}
        <button type="button"
          onClick={()=>navigate("/create",{state:{opponent:{email:convo?.participantNames?.[otherUid]||"",displayName:otherName,uid:otherUid}}})}
          style={{ background:T.accent, border:"none", borderRadius:"12px", padding:"8px 14px", fontFamily:T.fontDisplay, fontSize:"14px", letterSpacing:"0.04em", color:"#052e16", cursor:"pointer", flexShrink:0 }}>
          ⚔️ BET
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:"8px" }}>
        {messages.length===0 && (
          <div style={{ textAlign:"center", padding:"48px 20px" }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>👋</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"15px", color:T.textMuted }}>
              Start the conversation — or tap ⚔️ BET to challenge them!
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderId === user?.uid;
          const showTime = i===0 || (messages[i-1]?.createdAt?.toDate?.() &&
            msg.createdAt?.toDate?.() - messages[i-1].createdAt.toDate() > 300000);

          // ── Challenge card message ──
          if (msg.type === "challenge") {
            return (
              <div key={msg.id}>
                {showTime && <TimeLabel ts={msg.createdAt} />}
                <ChallengeCard
                  msg={msg}
                  isMe={isMe}
                  onAccept={()=>navigate(`/upload/${msg.betId}`)}
                  onViewBet={()=>navigate("/bets")}
                />
              </div>
            );
          }

          // ── Regular text message ──
          return (
            <div key={msg.id}>
              {showTime && <TimeLabel ts={msg.createdAt} />}
              <div style={{ display:"flex", justifyContent: isMe?"flex-end":"flex-start", alignItems:"flex-end", gap:"8px" }}>
                {!isMe && (
                  msg.senderPhoto
                    ? <img src={msg.senderPhoto} alt="" style={{ width:"28px", height:"28px", borderRadius:"50%", objectFit:"cover", flexShrink:0, marginBottom:"2px" }}/>
                    : <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"12px", color:T.accent, flexShrink:0, marginBottom:"2px" }}>
                        {msg.senderName?.charAt(0)||"?"}
                      </div>
                )}
                <div style={{ maxWidth:"72%" }}>
                  <div style={{
                    background: isMe ? T.accent : T.bg1,
                    color:      isMe ? "#052e16" : T.panel,
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding:"10px 14px",
                    fontFamily:T.fontBody,
                    fontSize:"15px",
                    lineHeight:"1.5",
                    border: isMe ? "none" : `1px solid ${T.borderCard}`,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted, marginTop:"3px", textAlign:isMe?"right":"left" }}>
                    {timeStr(msg.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Quick replies */}
      <div style={{ display:"flex", gap:"6px", padding:"0 16px 8px", overflowX:"auto", flexShrink:0 }}>
        {QUICK_REPLIES.map(q=>(
          <button key={q} type="button" onClick={()=>setText(q)}
            style={{ flexShrink:0, background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"20px", padding:"6px 14px", fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, cursor:"pointer", whiteSpace:"nowrap" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 16px", paddingBottom:"calc(10px + env(safe-area-inset-bottom,0px))", background:T.bg1, borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="" style={{ width:"34px", height:"34px", borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
          : <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"14px", color:T.accent, flexShrink:0 }}>
              {user?.displayName?.charAt(0)||"?"}
            </div>
        }
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px", background:T.bg0, border:`1px solid ${T.borderCard}`, borderRadius:"24px", padding:"10px 16px" }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Message..."
            maxLength={500}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:T.panel, fontSize:"15px", fontFamily:T.fontBody, WebkitTextFillColor:T.panel, caretColor:T.accent }}
          />
          {text.trim() && (
            <button type="button" onClick={send} disabled={sending}
              style={{ background:T.accent, border:"none", borderRadius:"50%", width:"30px", height:"30px", fontSize:"14px", color:"#052e16", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity:sending?0.5:1 }}>
              ↑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Challenge card — renders in chat ── */
function ChallengeCard({ msg, isMe, onAccept, onViewBet }) {
  return (
    <div style={{ display:"flex", justifyContent: isMe?"flex-end":"flex-start" }}>
      <div style={{ maxWidth:"85%", background:T.bg1, border:`2px solid ${T.accent}40`, borderRadius:"20px", overflow:"hidden" }}>
        {/* Header strip */}
        <div style={{ background:T.panel, padding:"8px 14px", display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ fontSize:"16px" }}>⚔️</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", fontWeight:"700", color:T.accent, letterSpacing:"0.1em" }}>
            {isMe ? "YOU CHALLENGED THEM" : "YOU'VE BEEN CHALLENGED!"}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding:"12px 14px" }}>
          {/* Bet description */}
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.panel, fontWeight:"600", marginBottom:"10px", lineHeight:"1.4" }}>
            "{msg.betDescription}"
          </div>

          {/* Forfeit detail */}
          <div style={{ background:T.bg0, borderRadius:"10px", padding:"10px 12px", marginBottom:"12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em" }}>FORFEIT IF LOST</span>
            <span style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:"#f97316", letterSpacing:"0.04em" }}>
              {msg.forfeitIcon} {msg.reps} {msg.forfeitName}
            </span>
          </div>

          {/* Deadline */}
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, marginBottom:"12px" }}>
            ⏱ {msg.deadlineHours}h to complete after accepted
          </div>

          {/* Action buttons */}
          {!isMe ? (
            <div style={{ display:"flex", gap:"8px" }}>
              <button type="button" onClick={onAccept}
                style={{ flex:1, padding:"11px", background:T.accent, border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#052e16", cursor:"pointer" }}>
                ✓ ACCEPT
              </button>
              <button type="button" onClick={onViewBet}
                style={{ flex:1, padding:"11px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:T.textMuted, cursor:"pointer" }}>
                VIEW BET
              </button>
            </div>
          ) : (
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, textAlign:"center" }}>
              Waiting for them to accept…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeLabel({ ts }) {
  if (!ts?.toDate) return null;
  const d = ts.toDate();
  const now = new Date();
  const isToday = d.toDateString()===now.toDateString();
  const label = isToday
    ? d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
    : d.toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
  return (
    <div style={{ textAlign:"center", margin:"8px 0", fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted }}>
      {label}
    </div>
  );
}