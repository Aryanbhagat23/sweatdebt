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
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"3px solid #333", borderTop:`3px solid ${T.accent}`, animation:"_sp 0.8s linear infinite" }}/>
    </div>
  );

  return (
    <div style={{ background:"#000", minHeight:"100vh", paddingBottom:"72px" }}>

      {/* ── STICKY HEADER — transparent over video ── */}
      <div style={{
        position:"fixed",
        top:0,
        left:"50%",
        transform:"translateX(-50%)",
        width:"100%",
        maxWidth:"480px",
        zIndex:200,
        background:"linear-gradient(to bottom, rgba(5,46,22,0.92) 0%, rgba(5,46,22,0.5) 70%, transparent 100%)",
        paddingTop:"env(safe-area-inset-top, 0px)",
        pointerEvents:"auto",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"12px 16px 16px" }}>
          <span style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:"#fff", letterSpacing:"0.04em", fontStyle:"italic", flexShrink:0 }}>
            SweatDebt
          </span>
          <div style={{ display:"flex", gap:"5px", flex:1, justifyContent:"center" }}>
            {[
              { key:"forYou",   label:"For You" },
              { key:"friends",  label:"Friends" },
              { key:"trending", label:"🔥 Hot"  },
            ].map(t => (
              <button key={t.key} type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: activeTab === t.key ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                  border: activeTab === t.key ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.15)",
                  borderRadius:"20px", padding:"5px 12px",
                  fontFamily:T.fontBody, fontSize:"12px",
                  fontWeight: activeTab === t.key ? "600" : "400",
                  color: activeTab === t.key ? "#fff" : "rgba(255,255,255,0.55)",
                  cursor:"pointer",
                  backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
                  transition:"all 0.2s", whiteSpace:"nowrap",
                }}
              >{t.label}</button>
            ))}
          </div>
          <div style={{ flexShrink:0 }}>
            <NotificationBell user={user} onClick={onBellClick} light />
          </div>
        </div>
      </div>

      {/* ── REEL ITEMS — each one is 100vh ── */}
      {filtered.length === 0 ? (
        <div style={{ height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px" }}>
          <div style={{ fontSize:"48px" }}>🎥</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:"#fff", letterSpacing:"0.04em", fontStyle:"italic" }}>
            {activeTab === "friends" ? "No friend forfeits yet" : "No forfeits yet"}
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:"rgba(255,255,255,0.45)", textAlign:"center", padding:"0 32px" }}>
            {activeTab === "friends" ? "Add friends to see their forfeits here" : "Be the first to lose a bet 😤"}
          </div>
        </div>
      ) : (
        filtered.map(video => (
          <ReelPage
            key={video.id}
            video={video}
            currentUser={user}
            onCommentOpen={() => { setActiveVideoId(video.id); setShowComments(true); }}
            onNavigate={navigate}
            commentCount={commentCounts[video.id] ?? video.comments ?? 0}
          />
        ))
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

/* ─────────────────────────────────────────
   REEL PAGE — one full-screen slot per video
───────────────────────────────────────── */
function ReelPage({ video, currentUser, onCommentOpen, onNavigate, commentCount }) {
  const [liked,     setLiked]     = useState(false);
  const [likes,     setLikes]     = useState(video.likes || 0);
  const [approved,  setApproved]  = useState(video.approved || false);
  const [disputed,  setDisputed]  = useState(video.disputed || false);
  const [approving, setApproving] = useState(false);
  const [playing,   setPlaying]   = useState(false);
  const vidRef = useRef(null);
  const pageRef = useRef(null);

  // play when scrolled into view, pause when out
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          vidRef.current?.play().catch(() => {});
          setPlaying(true);
        } else {
          vidRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(()=>{}); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : l - 1);
    try { await updateDoc(doc(db,"videos",video.id), { likes: increment(next?1:-1) }); } catch(e) {}
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await updateDoc(doc(db,"videos",video.id), { approved:true, disputed:false });
      if (video.betId && video.betId !== "general")
        await updateDoc(doc(db,"bets",video.betId), { status:"lost" });
      setApproved(true);
    } catch(e) {}
    setApproving(false);
  };

  const handleDispute = async () => {
    setApproving(true);
    try {
      await updateDoc(doc(db,"videos",video.id), { disputed:true, approved:false });
      if (video.betId && video.betId !== "general")
        await updateDoc(doc(db,"bets",video.betId), { status:"disputed" });
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
    <div ref={pageRef} style={{
      position:"relative",
      height:"100vh",
      display:"flex",
      flexDirection:"column",
      background:"#000",
      scrollSnapAlign:"start",
    }}>
      {/* VIDEO — centred, letterboxed if horizontal */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", cursor:"pointer" }}
        onClick={togglePlay}>
        <video
          ref={vidRef}
          src={video.videoUrl}
          style={{
            maxWidth:"100%",
            maxHeight:"100%",
            objectFit:"contain",   /* keeps aspect ratio, centres horizontally */
            display:"block",
          }}
          loop playsInline
        />

        {/* play/pause overlay */}
        {!playing && (
          <div style={{
            position:"absolute",
            width:"64px", height:"64px",
            borderRadius:"50%",
            background:"rgba(0,0,0,0.5)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"28px",
            pointerEvents:"none",
          }}>▶</div>
        )}
      </div>

      {/* bottom gradient */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"55%", background:"linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)", pointerEvents:"none" }}/>

      {/* status badge */}
      <div style={{ position:"absolute", top:"72px", left:"14px", zIndex:10 }}>
        {approved  && <Bdg bg="rgba(16,185,129,0.9)"  color="#052e16" text="APPROVED ✓" />}
        {disputed  && <Bdg bg="rgba(239,68,68,0.9)"   color="#fff"    text="DISPUTED ✗" />}
        {!approved && !disputed && <Bdg bg="rgba(5,46,22,0.8)" color="#10b981" text="FORFEIT 💀" />}
      </div>

      {/* ── RIGHT SIDE BUTTONS ── */}
      <div style={{
        position:"absolute", right:"12px", bottom:"180px",
        display:"flex", flexDirection:"column", alignItems:"center", gap:"20px",
        zIndex:10,
      }}>
        <SideBtn icon={liked?"❤️":"🤍"} count={likes}        label="Like"    onClick={handleLike} />
        <SideBtn icon="💬"               count={commentCount} label="Comment" onClick={onCommentOpen} />
        <SideBtn icon="↗"               count={null}         label="Share"   onClick={handleShare} />
        <SideBtn icon="⚔️"              count={null}         label="Bet"     onClick={() => onNavigate("/create")} />
      </div>

      {/* ── BOTTOM INFO ── */}
      <div style={{ position:"absolute", bottom:"80px", left:"14px", right:"72px", zIndex:10 }}>
        {/* user */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px", cursor:"pointer" }}
          onClick={() => onNavigate(`/profile/${video.uploadedBy}`)}>
          {video.uploaderPhoto
            ? <img src={video.uploaderPhoto} alt="" style={{ width:"38px", height:"38px", borderRadius:"50%", objectFit:"cover", border:"2px solid #10b981" }}/>
            : <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:"#052e16", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"16px", color:"#10b981", border:"2px solid #10b981" }}>
                {(video.uploadedByName||"?").charAt(0)}
              </div>
          }
          <div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:"#fff" }}>
              @{(video.uploadedByName||"user").toLowerCase().replace(/\s/g,"")}
            </div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.5)" }}>
              {ago(video.createdAt)}
            </div>
          </div>
        </div>

        {/* approve / dispute */}
        {canVerdict && (
          <div style={{ display:"flex", gap:"8px" }}>
            <button type="button" onClick={handleApprove} disabled={approving}
              style={{ flex:1, padding:"11px", background:"rgba(16,185,129,0.9)", border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"17px", letterSpacing:"0.04em", color:"#052e16", cursor:"pointer", opacity:approving?0.5:1 }}>
              ✓ APPROVE
            </button>
            <button type="button" onClick={handleDispute} disabled={approving}
              style={{ flex:1, padding:"11px", background:"rgba(239,68,68,0.12)", border:"2px solid rgba(239,68,68,0.65)", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"17px", letterSpacing:"0.04em", color:"#ef4444", cursor:"pointer", opacity:approving?0.5:1 }}>
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

/* ── Side button ── */
function SideBtn({ icon, count, label, onClick }) {
  const [p, setP] = useState(false);
  return (
    <div
      onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)}
      onTouchStart={()=>setP(true)} onTouchEnd={()=>setP(false)}
      onClick={onClick}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", cursor:"pointer", transform:p?"scale(0.88)":"scale(1)", transition:"transform 0.15s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      <div style={{ width:"46px", height:"46px", borderRadius:"50%", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>
        {icon}
      </div>
      {count !== null && count !== undefined && (
        <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.9)", fontWeight:"500" }}>{count}</div>
      )}
      <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:"rgba(255,255,255,0.45)", letterSpacing:"0.05em" }}>{label.toUpperCase()}</div>
    </div>
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