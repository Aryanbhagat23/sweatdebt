import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, query, onSnapshot,
  addDoc, updateDoc, doc, increment, serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7",
  green:"#00e676", red:"#ff4d6d",
};

export default function CommentsPanel({ videoId, currentUser, onCountChange, onClose }) {
  const navigate = useNavigate();
  const [allComments, setAllComments] = useState([]);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "videos", videoId, "comments"));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Separate top-level and replies
      const topLevel = all.filter(c => !c.replyTo)
        .sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0));
      const replies = all.filter(c => !!c.replyTo);
      // Attach replies to parents
      const threaded = topLevel.map(c => ({
        ...c,
        replies: replies
          .filter(r => r.replyTo === c.id)
          .sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0)),
      }));
      setAllComments(threaded);
      onCountChange(all.length);
      setLoading(false);
    });
    return () => unsub();
  }, [videoId]);

  useEffect(() => {
    if (replyingTo) setTimeout(() => inputRef.current?.focus(), 100);
  }, [replyingTo]);

  useEffect(() => {
    if (!loading) setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 100);
  }, [allComments, loading]);

  const post = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const t = text.trim();
    setText(""); setReplyingTo(null);
    try {
      await addDoc(collection(db, "videos", videoId, "comments"), {
        text: t,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhoto: currentUser.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
        replyTo: replyingTo?.id || null,
        replyToName: replyingTo?.userName || null,
      });
      await updateDoc(doc(db, "videos", videoId), { comments: increment(1) });
    } catch (e) { console.error(e); setText(t); }
    setPosting(false);
  };

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  const quickReactions = ["😂", "🔥", "💀", "😤", "👑", "🫡", "💪", "😭"];

  return (
    <>
      <style>{`
        @keyframes slideUpPanel { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Backdrop — covers nav bar */}
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:2000 }} onClick={onClose} />

      {/* Panel — fixed above nav */}
      <div style={{
        position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:"480px", height:"75vh",
        background:C.bg1, borderRadius:"20px 20px 0 0",
        zIndex:2001,
        animation:"slideUpPanel 0.35s cubic-bezier(0.32,0.72,0,1)",
        display:"flex", flexDirection:"column",
      }}>
        {/* Handle */}
        <div style={{ width:"36px", height:"4px", background:C.bg3, borderRadius:"2px", margin:"12px auto 0", flexShrink:0 }} />

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px 8px", flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:C.white, letterSpacing:"0.04em" }}>
            Comments <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"14px", color:C.muted }}>{allComments.reduce((a, c) => a + 1 + (c.replies?.length || 0), 0)}</span>
          </div>
          <div style={{ fontSize:"18px", color:C.muted, cursor:"pointer", width:"44px", height:"44px", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>✕</div>
        </div>

        {/* Quick reactions */}
        <div style={{ display:"flex", gap:"8px", padding:"0 16px 10px", overflowX:"auto", flexShrink:0 }}>
          {quickReactions.map(e => (
            <button key={e} style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"20px", padding:"6px 12px", fontSize:"18px", cursor:"pointer", flexShrink:0 }}
              onClick={() => { setText(p => p + e); inputRef.current?.focus(); }}>{e}</button>
          ))}
        </div>

        {/* Comments list */}
        <div ref={listRef} style={{ flex:1, overflowY:"auto", padding:"0 16px 4px" }}>
          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"32px" }}>
              <div style={{ width:"24px", height:"24px", borderRadius:"50%", border:`2px solid ${C.border1}`, borderTop:`2px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
            </div>
          ) : allComments.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <div style={{ fontSize:"32px", marginBottom:"8px" }}>💬</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:C.muted, letterSpacing:"0.04em" }}>No comments yet</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.dim, marginTop:"4px" }}>Be the first to roast them 😂</div>
            </div>
          ) : (
            allComments.map(comment => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                timeAgo={timeAgo}
                onReply={(c) => {
                  setReplyingTo({ id: c.id, userName: c.userName });
                  setText("");
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                onProfile={(uid) => { onClose(); navigate(`/profile/${uid}`); }}
              />
            ))
          )}
        </div>

        {/* Reply banner */}
        {replyingTo && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 16px", background:C.bg2, borderTop:`1px solid ${C.border1}`, flexShrink:0 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.cyan }}>↩ Replying to @{replyingTo.userName}</div>
            <div style={{ color:C.muted, cursor:"pointer", fontSize:"16px", padding:"4px 8px" }} onClick={() => { setReplyingTo(null); setText(""); }}>✕</div>
          </div>
        )}

        {/* Input — always visible, never covered by nav */}
        <div style={{ flexShrink:0, background:C.bg1, borderTop:`1px solid ${C.border1}`, padding:"12px 16px", paddingBottom:"calc(16px + env(safe-area-inset-bottom,0px))" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            {currentUser?.photoURL
              ? <img src={currentUser.photoURL} alt="" style={{ width:"34px", height:"34px", borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
              : <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", color:"#000", flexShrink:0 }}>{currentUser?.displayName?.charAt(0)||"?"}</div>
            }
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px", background:C.bg3, border:`1.5px solid ${C.border2}`, borderRadius:"24px", padding:"10px 14px" }}>
              <input
                ref={inputRef}
                style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e0f2fe", caretColor:C.cyan, WebkitTextFillColor:"#e0f2fe", fontSize:"15px", fontFamily:"'DM Sans',sans-serif" }}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : "Add a comment..."}
                onKeyDown={e => e.key === "Enter" && post()}
                maxLength={300}
              />
              {text.trim().length > 0 && (
                <button style={{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"50%", width:"30px", height:"30px", fontSize:"14px", color:"#000", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:posting?0.5:1, flexShrink:0 }}
                  onClick={post} disabled={posting}>{posting ? "…" : "↑"}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CommentThread({ comment, currentUser, timeAgo, onReply, onProfile }) {
  const [showReplies, setShowReplies] = useState(true);
  return (
    <div style={{ marginBottom:"4px" }}>
      <CommentRow c={comment} currentUser={currentUser} timeAgo={timeAgo}
        onReply={() => onReply(comment)}
        onProfile={() => onProfile(comment.userId)}
        replyCount={comment.replies?.length || 0}
        showReplies={showReplies}
        onToggleReplies={() => setShowReplies(p => !p)}
      />
      {showReplies && comment.replies?.length > 0 && (
        <div style={{ marginLeft:"44px", borderLeft:`2px solid ${C.border1}`, paddingLeft:"12px", marginBottom:"8px" }}>
          {comment.replies.map(r => (
            <CommentRow key={r.id} c={r} currentUser={currentUser} timeAgo={timeAgo}
              onReply={() => onReply(comment)}
              onProfile={() => onProfile(r.userId)}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({ c, currentUser, timeAgo, onReply, onProfile, isReply, replyCount, showReplies, onToggleReplies }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(c.likes || 0);
  const isOwn = c.userId === currentUser?.uid;
  const size = isReply ? "28px" : "34px";
  return (
    <div style={{ display:"flex", gap:"10px", padding:"10px 0", borderBottom:`1px solid #172847` }}>
      <div style={{ cursor:"pointer", flexShrink:0 }} onClick={onProfile}>
        {c.userPhoto
          ? <img src={c.userPhoto} alt="" style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover" }} />
          : <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,#00d4ff,#a855f7)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:isReply?"11px":"13px", color:"#000" }}>{c.userName?.charAt(0)||"?"}</div>
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", color:isOwn?"#00d4ff":"#e0f2fe", cursor:"pointer" }} onClick={onProfile}>{isOwn ? "You" : c.userName}</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#3d5a7a" }}>{timeAgo(c.createdAt)}</span>
        </div>
        {c.replyToName && (
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#64748b", marginBottom:"3px" }}>
            <span style={{ color:"#00d4ff" }}>@{c.replyToName}</span>
          </div>
        )}
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:"rgba(224,242,254,0.9)", lineHeight:"1.5", marginBottom:"6px", wordBreak:"break-word" }}>{c.text}</div>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"5px", cursor:"pointer" }}
            onClick={() => { setLiked(!liked); setLikes(liked ? likes - 1 : likes + 1); }}>
            <span style={{ fontSize:"13px", color:liked?"#ff4d6d":"#64748b" }}>{liked ? "❤️" : "♡"}</span>
            {likes > 0 && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"#64748b" }}>{likes}</span>}
          </div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#64748b", cursor:"pointer" }} onClick={onReply}>Reply</div>
          {!isReply && replyCount > 0 && (
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#00d4ff", cursor:"pointer" }} onClick={onToggleReplies}>
              {showReplies ? `Hide ${replyCount} repl${replyCount > 1 ? "ies" : "y"}` : `View ${replyCount} repl${replyCount > 1 ? "ies" : "y"}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}