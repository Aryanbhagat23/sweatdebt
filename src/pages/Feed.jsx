import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc,
  increment, getDocs, getDoc, addDoc, serverTimestamp,
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

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "friends"))
      .then(snap => setFriendUids(new Set(snap.docs.map(d => d.id))))
      .catch(() => {});
  }, [user]);

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
    <div style={{ height:"100dvh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"3px solid #333", borderTop:`3px solid ${T.accent}`, animation:"_sp 0.8s linear infinite" }}/>
    </div>
  );

  return (
    <div style={{ position:"relative", height:"100dvh", background:"#000" }}>
      {/* STICKY HEADER */}
      <div style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        background:"linear-gradient(to bottom, rgba(5,46,22,0.92) 0%, rgba(5,46,22,0.5) 70%, transparent 100%)",
        paddingTop:"env(safe-area-inset-top, 0px)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"12px 16px 20px" }}>
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

      {/* SCROLL SNAP CONTAINER */}
      <div style={{
        height:"100dvh",
        overflowY:"scroll",
        scrollSnapType:"y mandatory",
        WebkitOverflowScrolling:"touch",
        scrollbarWidth:"none",
        msOverflowStyle:"none",
      }}>
        <style>{`::-webkit-scrollbar{display:none}`}</style>

        {filtered.length === 0 ? (
          <div style={{ height:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px", scrollSnapAlign:"start" }}>
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
      </div>

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

/* ─────────────────────────────────────────────────────────────────
   REEL PAGE
───────────────────────────────────────────────────────────────── */
function ReelPage({ video, currentUser, onCommentOpen, onNavigate, commentCount }) {
  const [liked,       setLiked]       = useState(false);
  const [likes,       setLikes]       = useState(video.likes || 0);
  const [approved,    setApproved]    = useState(video.approved || false);
  const [disputed,    setDisputed]    = useState(video.disputed || false);
  const [jurors,      setJurors]      = useState(video.jurors || []);
  const [juryStatus,  setJuryStatus]  = useState(video.juryStatus || null);
  const [approving,   setApproving]   = useState(false);
  const [playing,     setPlaying]     = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft,   setDescDraft]   = useState(video.description || "");
  const [savingDesc,  setSavingDesc]  = useState(false);
  const vidRef  = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    setApproved(video.approved || false);
    setDisputed(video.disputed || false);
    setJurors(video.jurors || []);
    setJuryStatus(video.juryStatus || null);
    setLikes(video.likes || 0);
  }, [video.approved, video.disputed, video.jurors, video.juryStatus, video.likes]);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { vidRef.current?.play().catch(()=>{}); setPlaying(true); }
        else                       { vidRef.current?.pause();              setPlaying(false); }
      },
      { threshold: 0.8 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(()=>{}); setPlaying(true); }
    else           { v.pause(); setPlaying(false); }
  };

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l+1 : l-1);
    try { await updateDoc(doc(db,"videos",video.id), { likes: increment(next?1:-1) }); } catch(e){}
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await updateDoc(doc(db,"videos",video.id), { approved:true, disputed:false });
      if (video.betId && video.betId !== "general")
        await updateDoc(doc(db,"bets",video.betId), { status:"lost" });
      setApproved(true);
    } catch(e){}
    setApproving(false);
  };

  const handleDispute = async () => {
    setApproving(true);
    try {
      const friendsSnap = await getDocs(collection(db, "users", video.uploadedBy, "friends"));
      const allFriends  = friendsSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      const excluded = new Set([
        video.uploadedBy,
        video.betCreatedBy || null,
        currentUser?.uid,
      ]);
      const eligible = allFriends.filter(f => !excluded.has(f.uid));
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      const picked   = shuffled.slice(0, 3);

      const jurorList = picked.map(f => ({
        uid:   f.uid,
        name:  f.displayName || "Unknown",
        photo: f.photoURL    || null,
        vote:  null,
      }));

      const juryDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await updateDoc(doc(db,"videos",video.id), {
        disputed:     true,
        approved:     false,
        jurors:       jurorList,
        juryStatus:   jurorList.length > 0 ? "pending" : "no_jury",
        juryDeadline,
      });
      if (video.betId && video.betId !== "general")
        await updateDoc(doc(db,"bets",video.betId), { status:"jury" });

      // ✅ Notify every juror so they know to go vote
      await Promise.all(jurorList.map(j =>
        addDoc(collection(db, "notifications"), {
          toUserId:   j.uid,
          fromUserId: currentUser?.uid || null,
          fromName:   currentUser?.displayName || "SweatDebt",
          type:       "jury_selected",
          videoId:    video.id,
          betId:      video.betId || null,
          message:    `⚖️ You've been selected as a juror! Watch the forfeit video and vote LEGIT or FAKE. You have 48 hours.`,
          read:       false,
          createdAt:  serverTimestamp(),
        }).catch(() => {}) // non-critical
      ));

      setDisputed(true);
      setJurors(jurorList);
      setJuryStatus(jurorList.length > 0 ? "pending" : "no_jury");
    } catch(e){ console.error("Dispute error:", e); }
    setApproving(false);
  };

  const handleJuryVote = async (verdict) => {
    if (!currentUser) return;
    setApproving(true);
    try {
      const updatedJurors = jurors.map(j =>
        j.uid === currentUser.uid ? { ...j, vote: verdict } : j
      );
      const approveCount = updatedJurors.filter(j => j.vote === "approve").length;
      const rejectCount  = updatedJurors.filter(j => j.vote === "reject").length;
      const majority     = Math.ceil(updatedJurors.length / 2);
      const updates      = { jurors: updatedJurors };

      if (approveCount >= majority) {
        updates.approved   = true;
        updates.disputed   = false;
        updates.juryStatus = "approved";
        if (video.betId && video.betId !== "general")
          await updateDoc(doc(db,"bets",video.betId), { status:"lost" });
        try {
          const uploaderRef  = doc(db,"users",video.uploadedBy);
          const uploaderSnap = await getDoc(uploaderRef);
          if (uploaderSnap.exists()) {
            const h = uploaderSnap.data().honour ?? 100;
            await updateDoc(uploaderRef, { honour: Math.min(100, h + 5) });
          }
          if (currentUser?.uid) {
            const dispRef  = doc(db,"users",currentUser.uid);
            const dispSnap = await getDoc(dispRef);
            if (dispSnap.exists()) {
              const h2 = dispSnap.data().honour ?? 100;
              await updateDoc(dispRef, { honour: Math.max(0, h2 - 5) });
            }
          }
        } catch(e){}
      } else if (rejectCount >= majority) {
        updates.juryStatus = "rejected";
        updates.approved   = false;
        if (video.betId && video.betId !== "general")
          await updateDoc(doc(db,"bets",video.betId), { status:"disputed" });
        try {
          const uploaderRef  = doc(db,"users",video.uploadedBy);
          const uploaderSnap = await getDoc(uploaderRef);
          if (uploaderSnap.exists()) {
            const h = uploaderSnap.data().honour ?? 100;
            await updateDoc(uploaderRef, { honour: Math.max(0, h - 15) });
          }
        } catch(e){}
      }

      await updateDoc(doc(db,"videos",video.id), updates);
      setJurors(updatedJurors);
      if (updates.approved !== undefined) setApproved(updates.approved);
      if (updates.juryStatus)             setJuryStatus(updates.juryStatus);
    } catch(e){ console.error("Jury vote error:", e); }
    setApproving(false);
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try { await deleteDoc(doc(db,"videos",video.id)); }
    catch(e){ console.error(e); setDeleting(false); }
  };

  const handleSaveDesc = async () => {
    setSavingDesc(true);
    try {
      await updateDoc(doc(db,"videos",video.id), { description: descDraft.trim() });
      setEditingDesc(false);
    } catch(e){}
    setSavingDesc(false);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title:"SweatDebt forfeit", url:window.location.href });
      else await navigator.clipboard?.writeText(window.location.href);
    } catch(e){}
  };

  // ── WHO SEES WHAT ────────────────────────────────────────────────────────────
  const isOwner = video.uploadedBy === currentUser?.uid;

  // The OPPONENT is whoever did NOT upload the video but is part of the bet.
  // They could be identified by opponentEmail, opponentUid, betCreatedBy, or createdByEmail.
  const isOpponent =
    !isOwner && (
      video.opponentUid      === currentUser?.uid  ||
      video.betCreatedBy     === currentUser?.uid  ||
      video.opponentEmail    === currentUser?.email ||
      video.createdByEmail   === currentUser?.email
    );

  // Only the opponent can approve or dispute — never the uploader themselves
  const canVerdict = isOpponent && !approved && !disputed && !juryStatus;

  // Uploader sees a "waiting" message instead
  const isWaitingForOpponent = isOwner && !approved && !disputed && !juryStatus;

  const myJurorEntry = jurors.find(j => j.uid === currentUser?.uid);
  const isJuror      = !!myJurorEntry && myJurorEntry.vote === null && juryStatus === "pending";
  const votesIn      = jurors.filter(j => j.vote !== null).length;
  const totalJurors  = jurors.length;
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={pageRef}
      style={{
        position:"relative",
        height:"100dvh",
        width:"100%",
        scrollSnapAlign:"start",
        scrollSnapStop:"always",
        overflow:"hidden",
        background:"#000",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}
    >
      {/* VIDEO */}
      <video
        ref={vidRef}
        src={video.videoUrl}
        onClick={togglePlay}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", cursor:"pointer", position:"absolute", inset:0 }}
        loop playsInline
      />

      {!playing && (
        <div style={{ position:"absolute", width:"64px", height:"64px", borderRadius:"50%", background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", pointerEvents:"none" }}>▶</div>
      )}

      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"65%", background:"linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 65%, transparent 100%)", pointerEvents:"none" }}/>

      {/* STATUS BADGE */}
      <div style={{ position:"absolute", top:"72px", left:"14px", zIndex:10, display:"flex", gap:"6px" }}>
        {approved && juryStatus !== "pending" && <Bdg bg="rgba(16,185,129,0.9)"  color="#052e16" text="APPROVED ✓" />}
        {juryStatus === "approved"             && <Bdg bg="rgba(16,185,129,0.9)"  color="#052e16" text="JURY ✓ HONEST" />}
        {juryStatus === "rejected"             && <Bdg bg="rgba(239,68,68,0.9)"   color="#fff"    text="JURY ✗ FAKE" />}
        {juryStatus === "pending"              && <Bdg bg="rgba(245,166,35,0.9)"  color="#052e16" text={`⚖️ JURY ${votesIn}/${totalJurors}`} />}
        {!approved && !disputed && !juryStatus && <Bdg bg="rgba(5,46,22,0.8)"    color="#10b981" text="FORFEIT 💀" />}
      </div>

      {/* RIGHT SIDE BUTTONS */}
      <div style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", zIndex:10 }}>
        <SideBtn icon={liked ? "❤️" : "🤍"} count={likes}        label="Like"    onClick={handleLike} />
        <SideBtn icon="💬"                   count={commentCount} label="Comment" onClick={onCommentOpen} />
        <SideBtn icon="↗"                    count={null}         label="Share"   onClick={handleShare} />
        <SideBtn icon="⚔️"                   count={null}         label="Bet"     onClick={() => onNavigate("/create")} />
        {isOwner && (
          <SideBtn icon="🗑️" count={null} label="Delete" onClick={() => setShowDelete(true)} />
        )}
      </div>

      {/* BOTTOM INFO */}
      <div style={{ position:"absolute", bottom:"76px", left:"14px", right:"62px", zIndex:10 }}>
        {/* user row */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px", cursor:"pointer" }}
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
          {isOwner && !editingDesc && (
            <button type="button"
              onClick={e => { e.stopPropagation(); setEditingDesc(true); }}
              style={{ marginLeft:"auto", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"20px", padding:"4px 10px", fontSize:"11px", color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>
              ✏️ edit caption
            </button>
          )}
        </div>

        {/* Description */}
        {!editingDesc && video.description && (
          <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:"rgba(255,255,255,0.85)", lineHeight:"1.4", marginBottom:"10px", padding:"6px 10px", background:"rgba(0,0,0,0.35)", borderRadius:"8px", backdropFilter:"blur(4px)" }}>
            {video.description}
          </div>
        )}

        {/* Edit caption */}
        {editingDesc && (
          <div style={{ marginBottom:"10px" }}>
            <textarea
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              placeholder="Add a caption…"
              maxLength={200}
              rows={2}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ width:"100%", background:"rgba(0,0,0,0.6)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:"10px", padding:"10px 12px", color:"#fff", fontSize:"13px", fontFamily:"system-ui", outline:"none", resize:"none", lineHeight:"1.4", boxSizing:"border-box", backdropFilter:"blur(8px)" }}
            />
            <div style={{ display:"flex", gap:"6px", marginTop:"6px" }}>
              <button type="button" onClick={handleSaveDesc} disabled={savingDesc}
                style={{ flex:1, padding:"8px", background:"rgba(16,185,129,0.8)", border:"none", borderRadius:"8px", color:"#fff", fontSize:"12px", fontWeight:"700", cursor:"pointer" }}>
                {savingDesc ? "..." : "✓ Save"}
              </button>
              <button type="button" onClick={() => { setEditingDesc(false); setDescDraft(video.description||""); }}
                style={{ padding:"8px 14px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"8px", color:"#fff", fontSize:"12px", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── VERDICT AREA ── */}

        {/* Uploader sees "waiting" — NOT approve/dispute */}
        {isWaitingForOpponent && (
          <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"10px", padding:"10px 14px", fontFamily:T.fontBody, fontSize:"13px", color:"rgba(255,255,255,0.6)", textAlign:"center" }}>
            ⏳ Waiting for your opponent to review this…
          </div>
        )}

        {/* Opponent sees APPROVE / DISPUTE */}
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

        {/* Juror vote buttons */}
        {isJuror && (
          <div>
            <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:"rgba(245,166,35,0.9)", letterSpacing:"0.08em", marginBottom:"6px", textAlign:"center" }}>
              ⚖️ YOU'VE BEEN SELECTED AS A JUROR
            </div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.6)", fontFamily:T.fontBody, marginBottom:"8px", textAlign:"center" }}>
              Was this forfeit real? Vote honestly.
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <button type="button" onClick={() => handleJuryVote("approve")} disabled={approving}
                style={{ flex:1, padding:"12px", background:"rgba(16,185,129,0.9)", border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#052e16", cursor:"pointer", opacity:approving?0.5:1 }}>
                ✓ LEGIT
              </button>
              <button type="button" onClick={() => handleJuryVote("reject")} disabled={approving}
                style={{ flex:1, padding:"12px", background:"rgba(239,68,68,0.12)", border:"2px solid rgba(239,68,68,0.65)", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#ef4444", cursor:"pointer", opacity:approving?0.5:1 }}>
                ✗ FAKE
              </button>
            </div>
          </div>
        )}

        {/* Juror already voted */}
        {myJurorEntry && myJurorEntry.vote !== null && juryStatus === "pending" && (
          <div style={{ background:"rgba(245,166,35,0.15)", border:"1px solid rgba(245,166,35,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#f5a623", textAlign:"center" }}>
            ⚖️ You voted · waiting for {totalJurors - votesIn} more juror{totalJurors - votesIn !== 1 ? "s" : ""}
          </div>
        )}

        {/* Spectator sees jury in progress */}
        {juryStatus === "pending" && !isJuror && !myJurorEntry?.vote && (
          <div style={{ background:"rgba(245,166,35,0.12)", border:"1px solid rgba(245,166,35,0.3)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#f5a623" }}>
            ⚖️ Disputed — jury voting in progress ({votesIn}/{totalJurors} voted)
          </div>
        )}

        {/* Final verdicts */}
        {approved && juryStatus !== "pending" && (
          <div style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#10b981" }}>
            ✓ Forfeit approved! 🏆
          </div>
        )}
        {juryStatus === "approved" && (
          <div style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#10b981" }}>
            ⚖️ Jury verdict: LEGIT — honour restored ✓
          </div>
        )}
        {juryStatus === "rejected" && (
          <div style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"10px", padding:"8px 12px", fontFamily:T.fontBody, fontSize:"13px", color:"#ef4444" }}>
            ⚖️ Jury verdict: FAKE — Debt Dodger 💀 (-15 honour)
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION */}
      {showDelete && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.75)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={() => setShowDelete(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:"480px", background:"#1a1a1a", borderRadius:"20px 20px 0 0", padding:"20px 20px calc(20px + env(safe-area-inset-bottom, 0px))" }}>
            <div style={{ width:"36px", height:"4px", background:"rgba(255,255,255,0.2)", borderRadius:"2px", margin:"0 auto 20px" }}/>
            <div style={{ fontSize:"18px", fontWeight:"700", color:"#fff", marginBottom:"8px" }}>Delete Video?</div>
            <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.5)", marginBottom:"20px", lineHeight:"1.5" }}>
              This will remove the video from SweatDebt permanently. The forfeit record on your bet will remain, but the video won't be visible in the feed or on your profile.
            </div>
            <button type="button" onClick={handleDelete} disabled={deleting}
              style={{ width:"100%", padding:"14px", background:"rgba(239,68,68,0.9)", border:"none", borderRadius:"14px", color:"#fff", fontSize:"16px", fontWeight:"700", cursor:"pointer", marginBottom:"10px", opacity:deleting?0.5:1 }}>
              {deleting ? "Deleting..." : "🗑️ Yes, Delete Video"}
            </button>
            <button type="button" onClick={() => setShowDelete(false)}
              style={{ width:"100%", padding:"14px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"14px", color:"rgba(255,255,255,0.7)", fontSize:"16px", cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── helpers ─── */
function SideBtn({ icon, count, label, onClick }) {
  const [p, setP] = useState(false);
  return (
    <div
      onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)}
      onTouchStart={()=>setP(true)} onTouchEnd={()=>setP(false)}
      onClick={onClick}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:"2px",
        cursor:"pointer",
        transform:p?"scale(0.85)":"scale(1)",
        transition:"transform 0.12s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div style={{
        width:"36px", height:"36px", borderRadius:"50%",
        background:"rgba(0,0,0,0.45)",
        backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
        border:"1px solid rgba(255,255,255,0.18)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"16px",
      }}>
        {icon}
      </div>
      {count !== null && count !== undefined && (
        <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:"rgba(255,255,255,0.9)", fontWeight:"600" }}>{count}</div>
      )}
      <div style={{ fontFamily:T.fontMono, fontSize:"7px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.04em" }}>{label.toUpperCase()}</div>
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