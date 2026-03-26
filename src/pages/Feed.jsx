import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, onSnapshot, doc, updateDoc, increment, getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";
import NotificationBell from "../components/NotificationBell";
import CommentsPanel from "../components/CommentsPanel";

export default function Feed({ user, onBellClick }) {
  const navigate = useNavigate();

  const [videos,        setVideos]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("forYou");
  const [friendUids,    setFriendUids]    = useState(new Set());
  const [showComments,  setShowComments]  = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});

  // load friends
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "friends"))
      .then(snap => setFriendUids(new Set(snap.docs.map(d => d.id))))
      .catch(() => {});
  }, [user]);

  // load videos
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "videos"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) =>
        (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)
      );
      setVideos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // filtered list
  let filtered = videos;
  if (activeTab === "friends") {
    filtered = videos.filter(v => friendUids.has(v.uploadedBy));
  } else if (activeTab === "trending") {
    filtered = [...videos].sort((a, b) =>
      ((b.likes || 0) + (b.comments || 0) * 2) -
      ((a.likes || 0) + (a.comments || 0) * 2)
    );
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"_sp 0.8s linear infinite" }}/>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>

      {/* ── TRANSPARENT OVERLAY HEADER ── */}
      <div style={{
        position:"sticky", top:0,
        zIndex:100,
        background:`linear-gradient(to bottom, ${T.panel}ee 0%, ${T.panel}cc 70%, ${T.panel}00 100%)`,
      }}>
        <div style={{ paddingTop:"env(safe-area-inset-top,0px)" }}>
          {/* row: logo + tabs + bell */}
          <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"12px 16px 8px" }}>
            <span style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.accent, letterSpacing:"0.04em", fontStyle:"italic", flexShrink:0 }}>
              SweatDebt
            </span>
            <div style={{ display:"flex", gap:"6px", flex:1, justifyContent:"center" }}>
              {[
                { key:"forYou",   label:"For You"  },
                { key:"friends",  label:"Friends"  },
                { key:"trending", label:"🔥 Hot"   },
              ].map(t => (
                <button key={t.key} type="button"
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    background: activeTab === t.key ? T.accent : "transparent",
                    border: activeTab === t.key ? "none" : `1px solid ${T.border}`,
                    borderRadius:"20px",
                    padding:"5px 12px",
                    fontFamily:T.fontBody,
                    fontSize:"12px",
                    fontWeight: activeTab === t.key ? "600" : "400",
                    color: activeTab === t.key ? T.bg0 : T.textMuted,
                    cursor:"pointer",
                    transition:"all 0.2s",
                    whiteSpace:"nowrap",
                  }}
                >{t.label}</button>
              ))}
            </div>
            <div style={{ flexShrink:0 }}>
              <NotificationBell user={user} onClick={onBellClick} />
            </div>
          </div>
        </div>
      </div>

      {/* ── VIDEO CARDS ── */}
      {filtered.length === 0 ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:"12px", padding:"24px" }}>
          <div style={{ fontSize:"48px" }}>🎥</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>
            {activeTab === "friends" ? "No friend forfeits yet" : "No forfeits yet"}
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, textAlign:"center" }}>
            {activeTab === "friends" ? "Add friends to see their forfeits here" : "Be the first to lose a bet 😤"}
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", padding:"8px 0" }}>
          {filtered.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              currentUser={user}
              onCommentOpen={() => { setActiveVideoId(video.id); setShowComments(true); }}
              onNavigate={navigate}
              commentCount={commentCounts[video.id] ?? video.comments ?? 0}
            />
          ))}
        </div>
      )}

      {/* COMMENTS PANEL */}
      {showComments && activeVideoId && (
        <CommentsPanel
          videoId={activeVideoId}
          currentUser={user}
          onCountChange={n => setCommentCounts(prev => ({ ...prev, [activeVideoId]: n }))}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}

/* ── Video Card ── */
function VideoCard({ video, currentUser, onCommentOpen, onNavigate, commentCount }) {
  const [liked,     setLiked]     = useState(false);
  const [likes,     setLikes]     = useState(video.likes || 0);
  const [approved,  setApproved]  = useState(video.approved || false);
  const [disputed,  setDisputed]  = useState(video.disputed || false);
  const [approving, setApproving] = useState(false);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : l - 1);
    try { await updateDoc(doc(db, "videos", video.id), { likes: increment(next ? 1 : -1) }); } catch(e) {}
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await updateDoc(doc(db, "videos", video.id), { approved:true, disputed:false });
      if (video.betId && video.betId !== "general")
        await updateDoc(doc(db, "bets", video.betId), { status:"lost" });
      setApproved(true);
    } catch(e) {}
    setApproving(false);
  };

  const handleDispute = async () => {
    setApproving(true);
    try {
      await updateDoc(doc(db, "videos", video.id), { disputed:true, approved:false });
      if (video.betId && video.betId !== "general")
        await updateDoc(doc(db, "bets", video.betId), { status:"disputed" });
      setDisputed(true);
    } catch(e) {}
    setApproving(false);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title:"SweatDebt forfeit", url:window.location.href });
      else await navigator.clipboard?.writeText(window.location.href);
    } catch(e) {}
  };

  const canVerdict = !approved && !disputed && (
    video.uploadedBy     === currentUser?.uid   ||
    video.opponentEmail  === currentUser?.email ||
    video.createdByEmail === currentUser?.email ||
    video.betCreatedBy   === currentUser?.uid
  );

  return (
    <div style={{ background:T.bg1, borderRadius:"0", borderTop:`1px solid ${T.borderCard}`, borderBottom:`1px solid ${T.borderCard}` }}>

      {/* status badge */}
      <div style={{ position:"relative" }}>
        <video
          src={video.videoUrl}
          style={{ width:"100%", maxHeight:"480px", display:"block", objectFit:"cover", background:"#000" }}
          controls playsInline preload="metadata"
        />
        <div style={{ position:"absolute", top:"10px", left:"10px" }}>
          {approved  && <Bdg bg={T.accent}   color={T.bg0}   text="APPROVED ✓" />}
          {disputed  && <Bdg bg="#ef4444"    color="#fff"    text="DISPUTED ✗" />}
          {!approved && !disputed && <Bdg bg={T.panel} color={T.accent} text="FORFEIT 💀" />}
        </div>
      </div>

      {/* user row + actions */}
      <div style={{ display:"flex", alignItems:"center", padding:"10px 14px" }}>
        {/* avatar */}
        <div style={{ cursor:"pointer", marginRight:"10px", flexShrink:0 }}
          onClick={() => onNavigate(`/profile/${video.uploadedBy}`)}>
          {video.uploaderPhoto
            ? <img src={video.uploaderPhoto} alt="" style={{ width:"38px", height:"38px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${T.accent}` }}/>
            : <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"16px", color:T.accent }}>
                {(video.uploadedByName || "?").charAt(0)}
              </div>
          }
        </div>
        {/* name + time */}
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:T.panel, cursor:"pointer" }}
            onClick={() => onNavigate(`/profile/${video.uploadedBy}`)}>
            @{(video.uploadedByName || "user").toLowerCase().replace(/\s/g,"")}
          </div>
          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>
            {ago(video.createdAt)}
          </div>
        </div>
        {/* action buttons */}
        <div style={{ display:"flex", gap:"4px" }}>
          <ActionBtn icon={liked ? "❤️" : "🤍"} label={String(likes)}   onClick={handleLike} active={liked} />
          <ActionBtn icon="💬"                    label={String(commentCount)} onClick={onCommentOpen} />
          <ActionBtn icon="↗"                    label="Share"           onClick={handleShare} />
        </div>
      </div>

      {/* approve / dispute */}
      {canVerdict && (
        <div style={{ display:"flex", gap:"8px", padding:"0 14px 12px" }}>
          <button type="button" onClick={handleApprove} disabled={approving}
            style={{ flex:1, padding:"12px", background:T.accent, border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:T.bg0, cursor:"pointer", opacity:approving?0.5:1 }}>
            ✓ APPROVE
          </button>
          <button type="button" onClick={handleDispute} disabled={approving}
            style={{ flex:1, padding:"12px", background:"transparent", border:"2px solid #ef4444", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:"#ef4444", cursor:"pointer", opacity:approving?0.5:1 }}>
            ✗ DISPUTE
          </button>
        </div>
      )}

      {approved && (
        <div style={{ margin:"0 14px 12px", background:`${T.accent}20`, border:`1px solid ${T.accent}60`, borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:T.accent }}>
          ✓ Forfeit approved! 🏆
        </div>
      )}
      {disputed && (
        <div style={{ margin:"0 14px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#ef4444" }}>
          ⚠ Disputed — going to jury...
        </div>
      )}

      {/* rematch */}
      <div style={{ padding:"0 14px 14px" }}>
        <button type="button"
          style={{ width:"100%", padding:"10px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:"10px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:T.textMuted, cursor:"pointer" }}>
          ⚔️ CHALLENGE TO REMATCH
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, active }) {
  const [p, setP] = useState(false);
  return (
    <button type="button"
      onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)}
      onTouchStart={()=>setP(true)} onTouchEnd={()=>setP(false)}
      onClick={onClick}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:"2px",
        background:"transparent", border:"none", cursor:"pointer",
        padding:"6px 8px", borderRadius:"10px",
        transform: p ? "scale(0.9)" : "scale(1)",
        transition:"transform 0.15s",
        minWidth:"44px", minHeight:"44px", justifyContent:"center",
      }}>
      <span style={{ fontSize:"20px" }}>{icon}</span>
      <span style={{ fontFamily:T.fontMono, fontSize:"10px", color:active ? T.accent : T.textMuted }}>{label}</span>
    </button>
  );
}

function Bdg({ bg, color, text }) {
  return (
    <div style={{ display:"inline-block", background:bg, color, fontSize:"11px", fontWeight:"700", fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em", padding:"4px 10px", borderRadius:"6px" }}>
      {text}
    </div>
  );
}

function ago(ts) {
  if (!ts?.toDate) return "just now";
  const s = Math.floor((new Date() - ts.toDate()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}