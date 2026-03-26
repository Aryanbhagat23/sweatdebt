import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import {
  collection, onSnapshot, doc, updateDoc, increment, getDocs
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";
import NotificationBell from "../components/NotificationBell";
import CommentsPanel from "../components/CommentsPanel";

export default function Feed({ user, onBellClick }) {
  const [videos, setVideos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("forYou");
  const [idx, setIdx]               = useState(0);
  const [friendUids, setFriendUids] = useState(new Set());
  const [showComments, setShowComments] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const idxRef = useRef(idx);
const filteredLenRef = useRef(filtered.length);
useEffect(() => { idxRef.current = idx; }, [idx]);
useEffect(() => { filteredLenRef.current = filtered.length; }, [filtered.length]);

  // Overlay visibility
  const [headerVisible, setHeaderVisible] = useState(true);
  const hideTimer = useRef(null);

  const containerRef = useRef(null);
  const touchStartY  = useRef(null);
  const touchStartX  = useRef(null);
  const isSwiping    = useRef(false);
  const navigate     = useNavigate();

  // Auto-hide header after 3 seconds
  const resetHideTimer = useCallback(() => {
    setHeaderVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHeaderVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [idx]);

  // Load friend UIDs
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "friends")).then(snap => {
      setFriendUids(new Set(snap.docs.map(d => d.id)));
    });
  }, [user]);

  // Load videos
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "videos"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setVideos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtered videos by tab
  const filtered = (() => {
    if (activeTab === "friends") {
      return videos.filter(v => friendUids.has(v.uploadedBy));
    }
    if (activeTab === "trending") {
      return [...videos].sort((a, b) =>
        ((b.likes || 0) + (b.comments || 0) * 2) -
        ((a.likes || 0) + (a.comments || 0) * 2)
      );
    }
    return videos;
  })();

  // Touch swipe — vertical for videos, stops propagation from comments
  const onTouchStart = useCallback(e => {
  if (showComments) return;
  touchStartY.current = e.touches[0].clientY;
  touchStartX.current = e.touches[0].clientX;
  isSwiping.current = false;
  resetHideTimer();
}, [showComments]);

const onTouchMove = useCallback(e => {
  if (showComments) return;
  const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
  const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
  if (dy > dx) { isSwiping.current = true; e.preventDefault(); }
}, [showComments]);

const onTouchEnd = useCallback(e => {
  if (showComments || !isSwiping.current) return;
  const dy = e.changedTouches[0].clientY - touchStartY.current;
  if (dy < -50 && idxRef.current < filteredLenRef.current - 1)
    setIdx(i => i + 1);
  if (dy > 50 && idxRef.current > 0)
    setIdx(i => i - 1);
  isSwiping.current = false;
}, [showComments]);

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  el.addEventListener("touchstart", onTouchStart, { passive: true });
  el.addEventListener("touchmove",  onTouchMove,  { passive: false });
  el.addEventListener("touchend",   onTouchEnd,   { passive: true });
  return () => {
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchmove",  onTouchMove);
    el.removeEventListener("touchend",   onTouchEnd);
  };
}, [onTouchStart, onTouchMove, onTouchEnd]);

  const switchTab = tab => {
    setActiveTab(tab);
    setIdx(0);
    resetHideTimer();
  };

  const handleVideoTap = () => {
    if (showComments) return;
    resetHideTimer();
  };

  const currentVideo = filtered[idx];

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div ref={containerRef} style={{ position:"relative", width:"100%", height:"100vh", overflow:"hidden", background:"#000", userSelect:"none", WebkitUserSelect:"none" }}
      onClick={handleVideoTap}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes tabSlide { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* ── VIDEO AREA ── */}
      {filtered.length === 0 ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px" }}>
          <div style={{ fontSize:"48px" }}>🎥</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:"#fff", letterSpacing:"0.04em", fontStyle:"italic" }}>
            {activeTab === "friends" ? "No friend forfeits yet" : "No forfeits yet"}
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:"rgba(255,255,255,0.5)", textAlign:"center", padding:"0 32px" }}>
            {activeTab === "friends" ? "Add friends to see their forfeits here" : "Be the first to lose a bet 😤"}
          </div>
        </div>
      ) : (
        <ReelCard
          key={currentVideo.id}
          video={currentVideo}
          currentUser={user}
          isActive={true}
          onCommentOpen={() => { setActiveVideoId(currentVideo.id); setShowComments(true); }}
          onNavigate={navigate}
          commentCount={commentCounts[currentVideo.id] ?? currentVideo.comments ?? 0}
        />
      )}

      {/* ── TRANSPARENT OVERLAY HEADER — floats on video ── */}
      <div style={{
        position:"fixed",
        top:0, left:"50%",
        transform:"translateX(-50%)",
        width:"100%", maxWidth:"480px",
        zIndex: showComments ? 0 : 200,
        pointerEvents: showComments ? "none" : "auto",
        opacity: headerVisible ? 1 : 0,
        transition:"opacity 0.4s ease",
      }}>
        {/* Gradient fade — dark at top, transparent at bottom */}
        <div style={{
          background:"linear-gradient(to bottom, rgba(5,46,22,0.85) 0%, rgba(5,46,22,0.4) 60%, transparent 100%)",
          paddingTop:"env(safe-area-inset-top, 0px)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"12px 16px 8px" }}>
            {/* Logo */}
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:"#fff", letterSpacing:"0.04em", fontStyle:"italic", flex:"0 0 auto" }}>
              SweatDebt
            </div>

            {/* Tab pills — glass style */}
            <div style={{ display:"flex", gap:"6px", flex:1, justifyContent:"center" }}>
              {[
                { key:"forYou",   label:"For You" },
                { key:"friends",  label:"Friends" },
                { key:"trending", label:"🔥 Hot" },
              ].map(t => (
                <button key={t.key} type="button"
                  onClick={e => { e.stopPropagation(); switchTab(t.key); }}
                  style={{
                    background: activeTab === t.key ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                    border: activeTab === t.key ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.15)",
                    borderRadius:"20px",
                    padding:"5px 12px",
                    fontFamily: T.fontBody,
                    fontSize:"12px",
                    fontWeight: activeTab === t.key ? "600" : "400",
                    color: activeTab === t.key ? "#fff" : "rgba(255,255,255,0.6)",
                    cursor:"pointer",
                    backdropFilter:"blur(8px)",
                    WebkitBackdropFilter:"blur(8px)",
                    transition:"all 0.2s",
                    whiteSpace:"nowrap",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Bell */}
            <div style={{ flex:"0 0 auto" }} onClick={e => e.stopPropagation()}>
              <NotificationBell user={user} onClick={onBellClick} light />
            </div>
          </div>

          {/* Dot indicators — which video you're on */}
          {filtered.length > 1 && (
            <div style={{ display:"flex", justifyContent:"center", gap:"4px", paddingBottom:"8px" }}>
              {filtered.slice(0, Math.min(filtered.length, 7)).map((_, i) => (
                <div key={i} style={{
                  width: i === idx ? "20px" : "6px",
                  height:"4px",
                  borderRadius:"2px",
                  background: i === idx ? "#fff" : "rgba(255,255,255,0.3)",
                  transition:"all 0.3s ease",
                }}/>
              ))}
              {filtered.length > 7 && (
                <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:"rgba(255,255,255,0.4)", alignSelf:"center", marginLeft:"2px" }}>
                  +{filtered.length - 7}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tap-anywhere hint — shows briefly when header is hidden */}
      {!headerVisible && !showComments && filtered.length > 0 && (
        <div style={{
          position:"fixed", top:"50%", left:"50%",
          transform:"translate(-50%, -50%)",
          background:"rgba(0,0,0,0.35)",
          borderRadius:"20px",
          padding:"6px 14px",
          fontFamily:T.fontBody,
          fontSize:"11px",
          color:"rgba(255,255,255,0.5)",
          pointerEvents:"none",
          animation:"fadeIn 0.5s ease",
          zIndex:100,
        }}>
          tap to show menu
        </div>
      )}

      {/* ── COMMENTS PANEL ── */}
      {showComments && activeVideoId && (
        <CommentsPanel
          videoId={activeVideoId}
          currentUser={user}
          onCountChange={n => setCommentCounts(p => ({ ...p, [activeVideoId]: n }))}
          onClose={() => { setShowComments(false); resetHideTimer(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   REEL CARD — full screen video + side actions
───────────────────────────────────────── */
function ReelCard({ video, currentUser, onCommentOpen, onNavigate, commentCount }) {
  const [liked,     setLiked]     = useState(false);
  const [likes,     setLikes]     = useState(video.likes || 0);
  const [approved,  setApproved]  = useState(video.approved || false);
  const [disputed,  setDisputed]  = useState(video.disputed || false);
  const [approving, setApproving] = useState(false);
  const videoRef = useRef(null);

  // Auto-play
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
    return () => v.pause();
  }, []);

  const handleLike = async e => {
    e.stopPropagation();
    setLiked(!liked);
    setLikes(l => liked ? l - 1 : l + 1);
    await updateDoc(doc(db, "videos", video.id), { likes: increment(liked ? -1 : 1) });
  };

  const handleApprove = async e => {
    e.stopPropagation();
    setApproving(true);
    await updateDoc(doc(db, "videos", video.id), { approved:true, disputed:false });
    if (video.betId && video.betId !== "general")
      await updateDoc(doc(db, "bets", video.betId), { status:"lost" });
    setApproved(true);
    setApproving(false);
  };

  const handleDispute = async e => {
    e.stopPropagation();
    setApproving(true);
    await updateDoc(doc(db, "videos", video.id), { disputed:true, approved:false });
    if (video.betId && video.betId !== "general")
      await updateDoc(doc(db, "bets", video.betId), { status:"disputed" });
    setDisputed(true);
    setApproving(false);
  };

  const handleShare = async e => {
    e.stopPropagation();
    if (navigator.share) {
      await navigator.share({ title:"SweatDebt forfeit", url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  // Only show approve/dispute to the bet participants
  const canVerdict =
    !approved && !disputed &&
    (video.uploadedBy === currentUser?.uid ||
     video.opponentEmail === currentUser?.email ||
     video.createdByEmail === currentUser?.email ||
     video.betCreatedBy === currentUser?.uid);

  return (
    <div style={{ position:"relative", width:"100%", height:"100vh" }}>
      {/* Video */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
        loop playsInline muted={false}
        onClick={() => {}}
      />

      {/* Bottom gradient */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        height:"55%",
        background:"linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
        pointerEvents:"none",
      }}/>

      {/* Status badge */}
      <div style={{ position:"absolute", top:"70px", left:"14px" }}>
        {approved && <div style={badge("#10b981","#052e16")}>APPROVED ✓</div>}
        {disputed && <div style={badge("#ef4444","#fff")}>DISPUTED ✗</div>}
        {!approved && !disputed && <div style={badge("rgba(5,46,22,0.75)","#10b981")}>FORFEIT 💀</div>}
      </div>

      {/* ── RIGHT SIDE ACTION BUTTONS ── */}
      <div style={{
        position:"absolute", right:"12px", bottom:"140px",
        display:"flex", flexDirection:"column", alignItems:"center", gap:"20px",
        zIndex:10,
      }}>
        {/* Like */}
        <ActionBtn icon={liked ? "❤️" : "🤍"} count={likes} label="Like" onClick={handleLike} active={liked} />

        {/* Comment */}
        <ActionBtn icon="💬" count={commentCount} label="Comment"
          onClick={e => { e.stopPropagation(); onCommentOpen(); }} />

        {/* Share */}
        <ActionBtn icon="↗" count={null} label="Share" onClick={handleShare} />

        {/* Challenge rematch */}
        <ActionBtn icon="⚔️" count={null} label="Bet"
          onClick={e => { e.stopPropagation(); onNavigate("/create"); }} />
      </div>

      {/* ── BOTTOM INFO ── */}
      <div style={{
        position:"absolute", bottom:"80px", left:"14px", right:"70px",
        zIndex:10,
      }}>
        {/* User row */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px", cursor:"pointer" }}
          onClick={e => { e.stopPropagation(); onNavigate(`/profile/${video.uploadedBy}`); }}>
          {video.uploaderPhoto
            ? <img src={video.uploaderPhoto} alt="" style={{ width:"38px", height:"38px", borderRadius:"50%", objectFit:"cover", border:"2px solid #10b981" }}/>
            : <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"16px", color:T.accent, border:"2px solid #10b981" }}>
                {video.uploadedByName?.charAt(0)||"?"}
              </div>
          }
          <div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:"#fff" }}>
              @{video.uploadedByName?.toLowerCase().replace(/\s/g,"")}
            </div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.6)" }}>
              {timeAgo(video.createdAt)}
            </div>
          </div>
        </div>

        {/* Approve / Dispute */}
        {canVerdict && (
          <div style={{ display:"flex", gap:"8px" }}>
            <button type="button" onClick={handleApprove} disabled={approving}
              style={{ flex:1, padding:"10px", background:"rgba(16,185,129,0.9)", border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#052e16", cursor:"pointer", opacity:approving?0.5:1 }}>
              ✓ APPROVE
            </button>
            <button type="button" onClick={handleDispute} disabled={approving}
              style={{ flex:1, padding:"10px", background:"rgba(239,68,68,0.15)", border:"2px solid rgba(239,68,68,0.7)", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#ef4444", cursor:"pointer", opacity:approving?0.5:1 }}>
              ✗ DISPUTE
            </button>
          </div>
        )}

        {approved && (
          <div style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#10b981" }}>
            ✓ Forfeit approved! 🏆
          </div>
        )}
        {disputed && (
          <div style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#ef4444" }}>
            ⚠ Disputed — going to jury...
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function ActionBtn({ icon, count, label, onClick, active }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={onClick}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center",
        gap:"3px", cursor:"pointer",
        transform: pressed ? "scale(0.88)" : "scale(1)",
        transition:"transform 0.15s cubic-bezier(0.34,1.56,0.64,1)"
      }}>
      <div style={{
        width:"46px", height:"46px", borderRadius:"50%",
        background:"rgba(255,255,255,0.15)",
        backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)",
        border:"1px solid rgba(255,255,255,0.2)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"20px",
      }}>
        {icon}
      </div>
      {count !== null && count !== undefined && (
        <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.9)", fontWeight:"500" }}>
          {count}
        </div>
      )}
      <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:"rgba(255,255,255,0.5)", letterSpacing:"0.05em" }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

function badge(bg, color) {
  return {
    display:"inline-block",
    background: bg,
    color: color,
    fontSize:"11px",
    fontWeight:"700",
    fontFamily:"'DM Mono', monospace",
    letterSpacing:"0.05em",
    padding:"4px 10px",
    borderRadius:"6px",
    backdropFilter:"blur(4px)",
  };
}

function timeAgo(ts) {
  if (!ts?.toDate) return "just now";
  const s = Math.floor((new Date() - ts.toDate()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}