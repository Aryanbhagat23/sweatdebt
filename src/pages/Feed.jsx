import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";
import NotificationBell from "../components/NotificationBell";
import CommentsPanel from "../components/CommentsPanel";

/* ─────────────────────────────────────────────────────────────
   FEED PAGE
───────────────────────────────────────────────────────────── */
export default function Feed({ user, onBellClick }) {
  const navigate = useNavigate();

  const [videos, setVideos]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState("forYou");
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [friendUids, setFriendUids]       = useState(new Set());
  const [showComments, setShowComments]   = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [headerVisible, setHeaderVisible] = useState(true);

  // ── refs ──
const containerRef = useRef(null);
const touchStartY  = useRef(0);
const touchStartX  = useRef(0);
const idxRef       = useRef(0);
const lenRef       = useRef(0);
const hideTimer    = useRef(null);

// keep refs in sync with state
useEffect(() => { idxRef.current = currentIdx; }, [currentIdx]);
useEffect(() => { lenRef.current = filtered.length; }, [filtered.length]);

// ── header auto-hide ──
const resetHideTimer = () => {
  setHeaderVisible(true);
  if (hideTimer.current) clearTimeout(hideTimer.current);
  hideTimer.current = setTimeout(() => setHeaderVisible(false), 3000);
};
useEffect(() => {
  resetHideTimer();
  return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
}, [currentIdx]);

// ── touch swipe — attached directly, never recreated ──
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  let startY = 0;
  let startX = 0;
  let moving = false;

  const onStart = e => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    moving = false;
  };

  const onMove = e => {
    const dy = Math.abs(e.touches[0].clientY - startY);
    const dx = Math.abs(e.touches[0].clientX - startX);
    if (dy > dx) { moving = true; e.preventDefault(); }
  };

  const onEnd = e => {
    if (!moving) return;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy < -60 && idxRef.current < lenRef.current - 1) {
      setCurrentIdx(i => i + 1);
    }
    if (dy > 60 && idxRef.current > 0) {
      setCurrentIdx(i => i - 1);
    }
    moving = false;
  };

  el.addEventListener("touchstart", onStart, { passive: true });
  el.addEventListener("touchmove",  onMove,  { passive: false });
  el.addEventListener("touchend",   onEnd,   { passive: true });

  return () => {
    el.removeEventListener("touchstart", onStart);
    el.removeEventListener("touchmove",  onMove);
    el.removeEventListener("touchend",   onEnd);
  };
}, []); // ← empty array — attaches ONCE, uses local vars not stale state

  const switchTab = tab => { setActiveTab(tab); setCurrentIdx(0); resetHideTimer(); };
  const currentVideo = filtered[currentIdx];

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"3px solid #222", borderTop:`3px solid ${T.accent}`, animation:"_spin 0.8s linear infinite" }}/>
    </div>
  );

  return (
    <div
      ref={containerRef}
      onClick={resetHideTimer}
      style={{ position:"relative", width:"100%", height:"100vh", overflow:"hidden", background:"#000", userSelect:"none", WebkitUserSelect:"none" }}
    >
      <style>{`@keyframes _fadein{from{opacity:0}to{opacity:1}}`}</style>

      {/* VIDEO */}
      {filtered.length === 0
        ? <EmptyFeed tab={activeTab} />
        : <ReelCard
            key={currentVideo.id}
            video={currentVideo}
            currentUser={user}
            onCommentOpen={() => { setActiveVideoId(currentVideo.id); setShowComments(true); }}
            onNavigate={navigate}
            commentCount={commentCounts[currentVideo.id] ?? currentVideo.comments ?? 0}
          />
      }

      {/* TRANSPARENT OVERLAY HEADER */}
      <div style={{
        position:"fixed", top:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:"480px",
        zIndex: showComments ? 0 : 200,
        pointerEvents: showComments ? "none" : "auto",
        opacity: headerVisible ? 1 : 0,
        transition:"opacity 0.4s ease",
      }}>
        <div style={{ background:"linear-gradient(to bottom,rgba(5,46,22,0.88) 0%,rgba(5,46,22,0.45) 65%,transparent 100%)", paddingTop:"env(safe-area-inset-top,0px)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"12px 16px 8px" }}>
            <span style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:"#fff", letterSpacing:"0.04em", fontStyle:"italic", flexShrink:0 }}>SweatDebt</span>
            <div style={{ display:"flex", gap:"5px", flex:1, justifyContent:"center" }}>
              {[{key:"forYou",label:"For You"},{key:"friends",label:"Friends"},{key:"trending",label:"🔥 Hot"}].map(t => (
                <button key={t.key} type="button" onClick={e=>{e.stopPropagation();switchTab(t.key);}} style={{
                  background: activeTab===t.key?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.08)",
                  border: activeTab===t.key?"1px solid rgba(255,255,255,0.55)":"1px solid rgba(255,255,255,0.15)",
                  borderRadius:"20px", padding:"5px 11px",
                  fontFamily:T.fontBody, fontSize:"12px",
                  fontWeight: activeTab===t.key?"600":"400",
                  color: activeTab===t.key?"#fff":"rgba(255,255,255,0.55)",
                  cursor:"pointer", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)",
                  transition:"all 0.2s", whiteSpace:"nowrap",
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ flexShrink:0 }} onClick={e=>e.stopPropagation()}>
              <NotificationBell user={user} onClick={onBellClick} light />
            </div>
          </div>
          {filtered.length > 1 && (
            <div style={{ display:"flex", justifyContent:"center", gap:"4px", paddingBottom:"10px" }}>
              {filtered.slice(0, Math.min(filtered.length,7)).map((_,i) => (
                <div key={i} style={{ width:i===currentIdx?"20px":"6px", height:"4px", borderRadius:"2px", background:i===currentIdx?"#fff":"rgba(255,255,255,0.3)", transition:"all 0.3s ease" }}/>
              ))}
              {filtered.length>7 && <span style={{ fontFamily:T.fontMono, fontSize:"9px", color:"rgba(255,255,255,0.4)", alignSelf:"center", marginLeft:"2px" }}>+{filtered.length-7}</span>}
            </div>
          )}
        </div>
      </div>

      {/* tap hint */}
      {!headerVisible && !showComments && filtered.length>0 && (
        <div style={{ position:"fixed", bottom:"100px", left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.4)", borderRadius:"20px", padding:"5px 14px", fontFamily:T.fontBody, fontSize:"11px", color:"rgba(255,255,255,0.4)", pointerEvents:"none", animation:"_fadein 0.5s ease", zIndex:100 }}>
          tap to show menu
        </div>
      )}

      {/* COMMENTS */}
      {showComments && activeVideoId && (
        <CommentsPanel
          videoId={activeVideoId}
          currentUser={user}
          onCountChange={n => setCommentCounts(prev => ({ ...prev, [activeVideoId]: n }))}
          onClose={() => { setShowComments(false); resetHideTimer(); }}
        />
      )}
    </div>
  );
}

/* ── Empty state ── */
function EmptyFeed({ tab }) {
  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px", background:"#000" }}>
      <div style={{ fontSize:"48px" }}>🎥</div>
      <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:"#fff", letterSpacing:"0.04em", fontStyle:"italic" }}>
        {tab==="friends"?"No friend forfeits yet":"No forfeits yet"}
      </div>
      <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:"rgba(255,255,255,0.45)", textAlign:"center", padding:"0 32px" }}>
        {tab==="friends"?"Add friends to see their forfeits here":"Be the first to lose a bet 😤"}
      </div>
    </div>
  );
}

/* ── Reel Card ── */
function ReelCard({ video, currentUser, onCommentOpen, onNavigate, commentCount }) {
  const [liked,     setLiked]     = useState(false);
  const [likes,     setLikes]     = useState(video.likes || 0);
  const [approved,  setApproved]  = useState(video.approved || false);
  const [disputed,  setDisputed]  = useState(video.disputed || false);
  const [approving, setApproving] = useState(false);
  const vidRef = useRef(null);

  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    v.play().catch(() => {});
    return () => { try { v.pause(); } catch(e){} };
  }, []);

  const handleLike = async e => {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l+1 : l-1);
    try { await updateDoc(doc(db,"videos",video.id),{likes:increment(next?1:-1)}); } catch(e){}
  };

  const handleApprove = async e => {
    e.stopPropagation(); setApproving(true);
    try {
      await updateDoc(doc(db,"videos",video.id),{approved:true,disputed:false});
      if (video.betId && video.betId!=="general")
        await updateDoc(doc(db,"bets",video.betId),{status:"lost"});
      setApproved(true);
    } catch(e){}
    setApproving(false);
  };

  const handleDispute = async e => {
    e.stopPropagation(); setApproving(true);
    try {
      await updateDoc(doc(db,"videos",video.id),{disputed:true,approved:false});
      if (video.betId && video.betId!=="general")
        await updateDoc(doc(db,"bets",video.betId),{status:"disputed"});
      setDisputed(true);
    } catch(e){}
    setApproving(false);
  };

  const handleShare = async e => {
    e.stopPropagation();
    try {
      if (navigator.share) await navigator.share({title:"SweatDebt forfeit",url:window.location.href});
      else await navigator.clipboard?.writeText(window.location.href);
    } catch(e){}
  };

  const canVerdict = !approved && !disputed && (
    video.uploadedBy     === currentUser?.uid   ||
    video.opponentEmail  === currentUser?.email ||
    video.createdByEmail === currentUser?.email ||
    video.betCreatedBy   === currentUser?.uid
  );

  return (
    <div style={{ position:"relative", width:"100%", height:"100vh" }}>
      <video ref={vidRef} src={video.videoUrl} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loop playsInline />

      {/* bottom gradient */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"60%", background:"linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.3) 60%,transparent 100%)", pointerEvents:"none" }}/>

      {/* status badge */}
      <div style={{ position:"absolute", top:"80px", left:"14px" }}>
        {approved  && <Badge bg="rgba(16,185,129,0.9)"  color="#052e16" text="APPROVED ✓"/>}
        {disputed  && <Badge bg="rgba(239,68,68,0.9)"   color="#fff"    text="DISPUTED ✗"/>}
        {!approved && !disputed && <Badge bg="rgba(5,46,22,0.75)" color="#10b981" text="FORFEIT 💀"/>}
      </div>

      {/* right side buttons */}
      <div style={{ position:"absolute", right:"12px", bottom:"150px", display:"flex", flexDirection:"column", alignItems:"center", gap:"20px", zIndex:10 }}>
        <SideBtn icon={liked?"❤️":"🤍"} count={likes}        label="Like"    onClick={handleLike}/>
        <SideBtn icon="💬"               count={commentCount} label="Comment" onClick={e=>{e.stopPropagation();onCommentOpen();}}/>
        <SideBtn icon="↗"               count={null}         label="Share"   onClick={handleShare}/>
        <SideBtn icon="⚔️"              count={null}         label="Bet"     onClick={e=>{e.stopPropagation();onNavigate("/create");}}/>
      </div>

      {/* bottom info */}
      <div style={{ position:"absolute", bottom:"80px", left:"14px", right:"70px", zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px", cursor:"pointer" }}
          onClick={e=>{e.stopPropagation();onNavigate(`/profile/${video.uploadedBy}`);}}>
          {video.uploaderPhoto
            ? <img src={video.uploaderPhoto} alt="" style={{ width:"38px", height:"38px", borderRadius:"50%", objectFit:"cover", border:"2px solid #10b981" }}/>
            : <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"16px", color:T.accent, border:"2px solid #10b981" }}>{(video.uploadedByName||"?").charAt(0)}</div>
          }
          <div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:"#fff" }}>@{(video.uploadedByName||"user").toLowerCase().replace(/\s/g,"")}</div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.55)" }}>{ago(video.createdAt)}</div>
          </div>
        </div>

        {canVerdict && (
          <div style={{ display:"flex", gap:"8px" }}>
            <button type="button" onClick={handleApprove} disabled={approving} style={{ flex:1, padding:"10px", background:"rgba(16,185,129,0.9)", border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#052e16", cursor:"pointer", opacity:approving?0.5:1 }}>✓ APPROVE</button>
            <button type="button" onClick={handleDispute} disabled={approving} style={{ flex:1, padding:"10px", background:"rgba(239,68,68,0.12)", border:"2px solid rgba(239,68,68,0.65)", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#ef4444", cursor:"pointer", opacity:approving?0.5:1 }}>✗ DISPUTE</button>
          </div>
        )}
        {approved && <div style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#10b981" }}>✓ Forfeit approved! 🏆</div>}
        {disputed && <div style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#ef4444" }}>⚠ Disputed — going to jury...</div>}
      </div>
    </div>
  );
}

/* ── Side button ── */
function SideBtn({ icon, count, label, onClick }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)}
      onTouchStart={()=>setPressed(true)} onTouchEnd={()=>setPressed(false)}
      onClick={onClick}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", cursor:"pointer", transform:pressed?"scale(0.88)":"scale(1)", transition:"transform 0.15s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      <div style={{ width:"46px", height:"46px", borderRadius:"50%", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>{icon}</div>
      {count!==null && count!==undefined && <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.9)", fontWeight:"500" }}>{count}</div>}
      <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:"rgba(255,255,255,0.45)", letterSpacing:"0.05em" }}>{label.toUpperCase()}</div>
    </div>
  );
}

/* ── Status badge ── */
function Badge({ bg, color, text }) {
  return (
    <div style={{ display:"inline-block", background:bg, color, fontSize:"11px", fontWeight:"700", fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em", padding:"4px 10px", borderRadius:"6px", backdropFilter:"blur(4px)" }}>{text}</div>
  );
}

/* ── Time ago ── */
function ago(ts) {
  if (!ts?.toDate) return "just now";
  const s = Math.floor((new Date() - ts.toDate()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}