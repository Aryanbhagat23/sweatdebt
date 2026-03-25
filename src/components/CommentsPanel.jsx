import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, increment, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";

export default function CommentsPanel({ videoId, currentUser, onCountChange, onClose }) {
  const navigate = useNavigate();
  const [all,       setAll]       = useState([]);
  const [text,      setText]      = useState("");
  const [replyTo,   setReplyTo]   = useState(null);
  const [posting,   setPosting]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [animIn,    setAnimIn]    = useState(false);
  const [keyboardH, setKeyboardH] = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Track keyboard height (iOS + Android)
  useEffect(() => {
    if (!window.visualViewport) return;
    const fn = () => setKeyboardH(Math.max(0, window.innerHeight - window.visualViewport.height));
    window.visualViewport.addEventListener("resize", fn);
    window.visualViewport.addEventListener("scroll", fn);
    return () => {
      window.visualViewport.removeEventListener("resize", fn);
      window.visualViewport.removeEventListener("scroll", fn);
    };
  }, []);

  // Load comments
  useEffect(() => {
    const u = onSnapshot(query(collection(db,"videos",videoId,"comments")), snap => {
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      const top  = data.filter(c => !c.replyTo).sort((a,b) => (a.createdAt?.toDate?.()||0)-(b.createdAt?.toDate?.()||0));
      const replies = data.filter(c => !!c.replyTo);
      setAll(top.map(c => ({ ...c, replies: replies.filter(r=>r.replyTo===c.id).sort((a,b)=>(a.createdAt?.toDate?.()||0)-(b.createdAt?.toDate?.()||0)) })));
      onCountChange(data.length);
      setLoading(false);
    });
    return () => u();
  }, [videoId]);

  useEffect(() => {
    if (replyTo) setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
  }, [replyTo]);

  const post = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const t = text.trim();
    const captured = replyTo;
    setText(""); setReplyTo(null);
    try {
      await addDoc(collection(db,"videos",videoId,"comments"), {
        text: t, userId: currentUser.uid, userName: currentUser.displayName,
        userPhoto: currentUser.photoURL || null, createdAt: serverTimestamp(),
        likes: 0, replyTo: captured?.id || null, replyToName: captured?.userName || null,
      });
      await updateDoc(doc(db,"videos",videoId), { comments: increment(1) });
      setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 200);
    } catch (e) { console.error(e); setText(t); }
    setPosting(false);
  };

  const handleClose = () => {
    setAnimIn(false);
    setTimeout(onClose, 300);
  };

  const timeAgo = ts => {
    if (!ts?.toDate) return "now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`;
  };

  const REACTIONS = ["😂","🔥","💀","😤","👑","🫡","💪","😭"];

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/*
        Backdrop — zIndex 4000 covers EVERYTHING:
        - nav bar (1000)
        - feed icons (10)
        - dot indicators (50)
        This means the icons/nav are NEVER hidden by React state,
        they're simply covered by this backdrop. When panel closes,
        the backdrop removes and icons reappear instantly — no Android bug.
      */}
      <div style={{
        position:"fixed", inset:0,
        background: animIn ? "rgba(5,46,22,0.5)" : "rgba(5,46,22,0)",
        zIndex: 4000,
        transition:"background 0.3s ease",
      }} onClick={handleClose} />

      {/* Panel — zIndex 4001, above backdrop */}
      <div style={{
        position:"fixed",
        bottom: keyboardH > 0 ? keyboardH : 0,
        left:"50%",
        transform:`translateX(-50%) translateY(${animIn?"0%":"100%"})`,
        transition:"transform 0.32s cubic-bezier(0.32,0.72,0,1), bottom 0.15s ease",
        width:"100%",
        maxWidth:"480px",
        height: keyboardH > 0 ? `calc(82vh - ${keyboardH}px)` : "82vh",
        minHeight:"320px",
        background: T.bg0,
        borderRadius:"20px 20px 0 0",
        zIndex: 4001,
        display:"flex",
        flexDirection:"column",
        willChange:"transform",
      }}>
        {/* Handle */}
        <div style={{width:"36px",height:"4px",background:T.border,borderRadius:"2px",margin:"12px auto 0",flexShrink:0}}/>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 8px",flexShrink:0}}>
          <div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:T.panel,letterSpacing:"0.04em",fontStyle:"italic"}}>
            Comments <span style={{fontFamily:T.fontMono,fontSize:"14px",color:T.textMuted}}>{all.reduce((a,c)=>a+1+(c.replies?.length||0),0)}</span>
          </div>
          <div style={{fontSize:"18px",color:T.textMuted,cursor:"pointer",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center"}}
            onClick={handleClose}>✕</div>
        </div>

        {/* Reactions */}
        <div style={{display:"flex",gap:"8px",padding:"0 16px 10px",overflowX:"auto",flexShrink:0}}>
          {REACTIONS.map(e => (
            <button key={e} type="button"
              style={{background:T.bg1,border:`1px solid ${T.borderCard}`,borderRadius:T.rFull,padding:"6px 12px",fontSize:"18px",cursor:"pointer",flexShrink:0,boxShadow:T.shadowSm}}
              onClick={() => { setText(p=>p+e); inputRef.current?.focus({ preventScroll:true }); }}>
              {e}
            </button>
          ))}
        </div>

        {/* Comments list */}
        <div ref={listRef} style={{flex:1,overflowY:"auto",padding:"0 16px 4px",overscrollBehavior:"contain"}}>
          {loading ? (
            <div style={{display:"flex",justifyContent:"center",padding:"32px"}}>
              <div style={{width:"24px",height:"24px",borderRadius:"50%",border:`2px solid ${T.border}`,borderTop:`2px solid ${T.accent}`,animation:"spin 0.8s linear infinite"}}/>
            </div>
          ) : all.length === 0 ? (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{fontSize:"32px",marginBottom:"8px"}}>💬</div>
              <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:T.textMuted,letterSpacing:"0.04em",fontStyle:"italic"}}>No comments yet</div>
              <div style={{fontFamily:T.fontBody,fontSize:"13px",color:T.textMuted,marginTop:"4px"}}>Be the first to roast them 😂</div>
            </div>
          ) : (
            all.map(c => (
              <div key={c.id} style={{marginBottom:"4px"}}>
                <CommentRow c={c} isOwn={c.userId===currentUser?.uid} timeAgo={timeAgo}
                  onReply={() => { setReplyTo({id:c.id,userName:c.userName}); setText(""); setTimeout(()=>inputRef.current?.focus({preventScroll:true}),100); }}
                  onProfile={() => { handleClose(); setTimeout(()=>navigate(`/profile/${c.userId}`),300); }}/>
                {c.replies?.length > 0 && (
                  <div style={{marginLeft:"44px",borderLeft:`2px solid ${T.border}`,paddingLeft:"12px",marginBottom:"8px"}}>
                    {c.replies.map(r => (
                      <CommentRow key={r.id} c={r} isOwn={r.userId===currentUser?.uid} timeAgo={timeAgo}
                        onReply={() => { setReplyTo({id:c.id,userName:c.userName}); setText(""); setTimeout(()=>inputRef.current?.focus({preventScroll:true}),100); }}
                        onProfile={() => { handleClose(); setTimeout(()=>navigate(`/profile/${r.userId}`),300); }}
                        isReply/>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reply banner */}
        {replyTo && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",background:T.bg1,borderTop:`1px solid ${T.border}`,flexShrink:0}}>
            <div style={{fontFamily:T.fontBody,fontSize:"13px",color:T.accent}}>↩ Replying to @{replyTo.userName}</div>
            <div style={{color:T.textMuted,cursor:"pointer",fontSize:"16px",padding:"4px 8px"}}
              onClick={()=>{ setReplyTo(null); setText(""); }}>✕</div>
          </div>
        )}

        {/* Input — always visible, sticks to bottom */}
        <div style={{flexShrink:0,background:T.bg0,borderTop:`1px solid ${T.border}`,padding:"12px 16px",paddingBottom:keyboardH>0?"12px":"calc(16px + env(safe-area-inset-bottom,0px))"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            {currentUser?.photoURL
              ? <img src={currentUser.photoURL} alt="" style={{width:"34px",height:"34px",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
              : <div style={{width:"34px",height:"34px",borderRadius:"50%",background:T.panel,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"14px",color:T.accent,flexShrink:0}}>{currentUser?.displayName?.charAt(0)||"?"}</div>
            }
            <div style={{flex:1,display:"flex",alignItems:"center",gap:"8px",background:T.bg1,border:`1.5px solid ${T.borderMid}`,borderRadius:T.rFull,padding:"10px 14px",boxShadow:T.shadowSm}}>
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={replyTo ? `Reply to @${replyTo.userName}...` : "Add a comment..."}
                onKeyDown={e => e.key==="Enter" && post()}
                maxLength={300}
                style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.textDark,WebkitTextFillColor:T.textDark,caretColor:T.accent,fontSize:"15px",fontFamily:T.fontBody}}
              />
              {text.trim().length > 0 && (
                <button type="button" onClick={post} disabled={posting}
                  style={{background:T.panel,border:"none",borderRadius:"50%",width:"30px",height:"30px",fontSize:"14px",color:T.accent,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:posting?0.5:1,flexShrink:0}}>
                  {posting?"…":"↑"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CommentRow({ c, isOwn, timeAgo, onReply, onProfile, isReply }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(c.likes||0);
  const sz = isReply ? "28px" : "34px";
  return (
    <div style={{display:"flex",gap:"10px",padding:"10px 0",borderBottom:`1px solid ${T.borderCard}`}}>
      <div style={{cursor:"pointer",flexShrink:0}} onClick={onProfile}>
        {c.userPhoto
          ? <img src={c.userPhoto} alt="" style={{width:sz,height:sz,borderRadius:"50%",objectFit:"cover"}}/>
          : <div style={{width:sz,height:sz,borderRadius:"50%",background:T.panel,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:isReply?"11px":"13px",color:T.accent}}>{c.userName?.charAt(0)||"?"}</div>
        }
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
          <span style={{fontFamily:T.fontBody,fontSize:"13px",fontWeight:"600",color:isOwn?T.accent:T.panel,cursor:"pointer"}} onClick={onProfile}>{isOwn?"You":c.userName}</span>
          <span style={{fontFamily:T.fontMono,fontSize:"10px",color:T.textMuted}}>{timeAgo(c.createdAt)}</span>
        </div>
        {c.replyToName && <div style={{fontFamily:T.fontBody,fontSize:"12px",color:T.textMuted,marginBottom:"3px"}}><span style={{color:T.accent}}>@{c.replyToName}</span></div>}
        <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.panel,lineHeight:"1.5",marginBottom:"6px",wordBreak:"break-word"}}>{c.text}</div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px",cursor:"pointer"}}
            onClick={()=>{setLiked(!liked);setLikes(liked?likes-1:likes+1);}}>
            <span style={{fontSize:"13px",color:liked?T.accent:T.textMuted}}>{liked?"❤️":"♡"}</span>
            {likes>0&&<span style={{fontFamily:T.fontMono,fontSize:"11px",color:T.textMuted}}>{likes}</span>}
          </div>
          <div style={{fontFamily:T.fontBody,fontSize:"12px",color:T.textMuted,cursor:"pointer"}} onClick={onReply}>Reply</div>
        </div>
      </div>
    </div>
  );
}