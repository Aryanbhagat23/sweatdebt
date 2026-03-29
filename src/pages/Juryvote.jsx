/**
 * JuryVote.jsx
 * Route: /jury/:videoId
 *
 * When a bet is disputed, 3 of the uploader's friends are picked as jurors.
 * This page lets them watch the video and cast their vote.
 * Auto-resolves when majority is reached.
 */
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, getDoc, updateDoc, onSnapshot,
} from "firebase/firestore";

const C = {
  page:"#000", card:"rgba(255,255,255,0.05)",
  border:"rgba(255,255,255,0.12)", accent:"#10b981",
  gold:"#f5a623", danger:"#ef4444",
  muted:"rgba(255,255,255,0.5)", heading:"#fff",
};

export default function JuryVote({ user }) {
  const navigate = useNavigate();
  const { videoId } = useParams();

  const [video,   setVideo]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting,  setVoting]  = useState(false);
  const [playing, setPlaying] = useState(false);
  const [done,    setDone]    = useState(false);
  const [verdict, setVerdict] = useState(null); // "legit" | "fake"
  const vidRef = useRef(null);

  /* real-time listener on the video doc */
  useEffect(() => {
    if (!videoId) return;
    const unsub = onSnapshot(doc(db, "videos", videoId), snap => {
      if (snap.exists()) {
        setVideo({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [videoId]);

  const togglePlay = () => {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(()=>{}); setPlaying(true); }
    else           { v.pause(); setPlaying(false); }
  };

  /* ── derived state ── */
  const jurors = video?.jurors || [];
  const myEntry = user ? jurors.find(j => j.uid === user.uid) : null;
  const alreadyVoted = myEntry?.vote !== null && myEntry?.vote !== undefined;
  const isJuror = !!myEntry;
  const juryStatus = video?.juryStatus;
  const votesIn = jurors.filter(j => j.vote !== null).length;

  /* ── Cast vote ── */
  const castVote = async (voteValue) => {
    if (!user || voting || alreadyVoted) return;
    setVoting(true);
    try {
      const updatedJurors = jurors.map(j =>
        j.uid === user.uid ? { ...j, vote: voteValue } : j
      );
      const approveCount = updatedJurors.filter(j => j.vote === "approve").length;
      const rejectCount  = updatedJurors.filter(j => j.vote === "reject").length;
      const majority     = Math.ceil(updatedJurors.length / 2);

      const updates = { jurors: updatedJurors };

      if (approveCount >= majority) {
        updates.approved   = true;
        updates.disputed   = false;
        updates.juryStatus = "approved";
        if (video.betId && video.betId !== "general") {
          await updateDoc(doc(db,"bets",video.betId), { status:"lost" });
        }
        // Honour: uploader +5
        try {
          const uRef  = doc(db,"users",video.uploadedBy);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            const h = uSnap.data().honour ?? 100;
            await updateDoc(uRef, { honour: Math.min(100, h + 5) });
          }
        } catch(e){}
      } else if (rejectCount >= majority) {
        updates.juryStatus = "rejected";
        updates.approved   = false;
        if (video.betId && video.betId !== "general") {
          await updateDoc(doc(db,"bets",video.betId), { status:"disputed" });
        }
        // Honour: uploader -15
        try {
          const uRef  = doc(db,"users",video.uploadedBy);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            const h = uSnap.data().honour ?? 100;
            await updateDoc(uRef, { honour: Math.max(0, h - 15) });
          }
        } catch(e){}
      }

      await updateDoc(doc(db,"videos",videoId), updates);
      setVerdict(voteValue === "approve" ? "legit" : "fake");
      setDone(true);
    } catch(e){ console.error("Jury vote error:", e); }
    setVoting(false);
  };

  /* ── Render states ── */
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"3px solid #333", borderTop:`3px solid ${C.accent}`, animation:"_sp 0.8s linear infinite" }}/>
    </div>
  );

  if (!video) return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontFamily:"monospace" }}>
      Video not found
    </div>
  );

  if (!user) return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px", padding:"24px" }}>
      <div style={{ fontSize:"48px" }}>⚖️</div>
      <div style={{ fontSize:"18px", fontWeight:"700", color:C.heading }}>Jury Access Required</div>
      <div style={{ fontSize:"14px", color:C.muted, textAlign:"center" }}>Log in to cast your jury vote.</div>
    </div>
  );

  if (!isJuror) return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px", padding:"24px" }}>
      <div style={{ fontSize:"48px" }}>🔒</div>
      <div style={{ fontSize:"18px", fontWeight:"700", color:C.heading }}>Not a Juror</div>
      <div style={{ fontSize:"14px", color:C.muted, textAlign:"center", maxWidth:"300px" }}>
        You weren't selected as a juror for this dispute. Only the 3 selected friends can vote.
      </div>
      <button type="button" onClick={() => navigate("/feed")}
        style={{ padding:"12px 28px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"20px", color:C.heading, fontSize:"14px", cursor:"pointer" }}>
        Go to Feed
      </button>
    </div>
  );

  /* ── Already resolved ── */
  const resolved = juryStatus === "approved" || juryStatus === "rejected";

  return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding:"env(safe-area-inset-top, 16px) 16px 16px", background:"rgba(5,46,22,0.9)", borderBottom:"1px solid rgba(110,231,183,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button type="button" onClick={() => navigate(-1)}
            style={{ width:"40px", height:"40px", borderRadius:"50%", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", color:"#fff", fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ←
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"rgba(110,231,183,0.7)", letterSpacing:"0.1em", marginBottom:"2px" }}>JURY DUTY</div>
            <div style={{ fontSize:"16px", fontWeight:"700", color:"#fff" }}>
              {(video.uploadedByName || "Someone") + "'s forfeit"}
            </div>
          </div>
          {/* Jury progress */}
          <div style={{ background:"rgba(245,166,35,0.15)", border:"1px solid rgba(245,166,35,0.3)", borderRadius:"20px", padding:"4px 12px", fontFamily:"monospace", fontSize:"11px", color:C.gold }}>
            {votesIn}/{jurors.length} voted
          </div>
        </div>
      </div>

      {/* Video */}
      <div style={{ flex:1, position:"relative", background:"#000", cursor:"pointer" }} onClick={togglePlay}>
        <video
          ref={vidRef}
          src={video.videoUrl}
          style={{ width:"100%", maxHeight:"55vh", objectFit:"contain", display:"block" }}
          loop playsInline
        />
        {!playing && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px" }}>▶</div>
          </div>
        )}
      </div>

      {/* Context panel */}
      <div style={{ padding:"16px 16px 0", animation:"fadein 0.4s ease" }}>

        {/* Context: what's the bet */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", padding:"14px", marginBottom:"12px" }}>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.1em", marginBottom:"8px" }}>THE BET CONTEXT</div>
          <div style={{ fontSize:"14px", color:C.heading, marginBottom:"4px" }}>
            <span style={{ color:C.accent }}>@{(video.uploadedByName||"?").toLowerCase()}</span> was supposed to complete their forfeit.
          </div>
          {video.description && (
            <div style={{ fontSize:"13px", color:C.muted, fontStyle:"italic", marginTop:"6px" }}>
              "{video.description}"
            </div>
          )}
        </div>

        {/* Your job */}
        <div style={{ background:"rgba(245,166,35,0.08)", border:"1px solid rgba(245,166,35,0.25)", borderRadius:"14px", padding:"14px", marginBottom:"16px" }}>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.gold, letterSpacing:"0.1em", marginBottom:"6px" }}>YOUR JOB AS JUROR</div>
          <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.8)", lineHeight:"1.6" }}>
            Watch the video carefully. Was this a genuine attempt at the forfeit? Vote honestly — your vote affects their honour score.
          </div>
        </div>

        {/* Already voted */}
        {alreadyVoted && !resolved && (
          <div style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:"14px", padding:"16px", textAlign:"center", marginBottom:"16px" }}>
            <div style={{ fontSize:"24px", marginBottom:"6px" }}>{myEntry.vote === "approve" ? "✅" : "❌"}</div>
            <div style={{ fontSize:"15px", fontWeight:"700", color:C.heading, marginBottom:"4px" }}>
              You voted: {myEntry.vote === "approve" ? "LEGIT" : "FAKE"}
            </div>
            <div style={{ fontSize:"12px", color:C.muted }}>
              Waiting for {jurors.length - votesIn} more vote{jurors.length - votesIn !== 1 ? "s" : ""}…
            </div>
            {/* Other jurors */}
            <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginTop:"12px" }}>
              {jurors.map((j, i) => (
                <div key={j.uid} style={{ textAlign:"center" }}>
                  <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:j.vote?"rgba(16,185,129,0.3)":"rgba(255,255,255,0.1)", border:`2px solid ${j.vote?"#10b981":"rgba(255,255,255,0.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", margin:"0 auto 4px" }}>
                    {j.vote ? (j.vote === "approve" ? "✓" : "✗") : "?"}
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:"9px", color:C.muted }}>J{i+1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final verdict display */}
        {resolved && (
          <div style={{ background: juryStatus === "approved" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border:`1px solid ${juryStatus==="approved"?"rgba(16,185,129,0.4)":"rgba(239,68,68,0.4)"}`, borderRadius:"14px", padding:"20px", textAlign:"center", marginBottom:"16px" }}>
            <div style={{ fontSize:"40px", marginBottom:"8px" }}>{juryStatus === "approved" ? "⚖️✓" : "⚖️✗"}</div>
            <div style={{ fontSize:"18px", fontWeight:"700", color:juryStatus==="approved"?C.accent:C.danger }}>
              {juryStatus === "approved" ? "JURY VERDICT: LEGIT" : "JURY VERDICT: FAKE"}
            </div>
            <div style={{ fontSize:"13px", color:C.muted, marginTop:"6px" }}>
              {juryStatus === "approved"
                ? "The forfeit was genuine. Honour restored. 🏆"
                : "The forfeit was faked. -15 honour for Debt Dodger. 💀"
              }
            </div>
          </div>
        )}

        {/* Vote buttons */}
        {!alreadyVoted && !resolved && (
          <div style={{ display:"flex", gap:"10px", marginBottom:"16px", animation:"fadein 0.5s ease 0.1s both" }}>
            <button type="button" onClick={() => castVote("approve")} disabled={voting}
              style={{ flex:1, padding:"16px", background:"rgba(16,185,129,0.9)", border:"none", borderRadius:"14px", fontFamily:"monospace", fontSize:"16px", fontWeight:"700", color:"#052e16", cursor:"pointer", opacity:voting?0.5:1, letterSpacing:"0.04em" }}>
              ✓ LEGIT
            </button>
            <button type="button" onClick={() => castVote("reject")} disabled={voting}
              style={{ flex:1, padding:"16px", background:"rgba(239,68,68,0.12)", border:"2px solid rgba(239,68,68,0.7)", borderRadius:"14px", fontFamily:"monospace", fontSize:"16px", fontWeight:"700", color:C.danger, cursor:"pointer", opacity:voting?0.5:1, letterSpacing:"0.04em" }}>
              ✗ FAKE
            </button>
          </div>
        )}

        {/* Done / navigate away */}
        {(done || resolved || alreadyVoted) && (
          <button type="button" onClick={() => navigate("/feed")}
            style={{ width:"100%", padding:"14px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"14px", color:C.heading, fontSize:"14px", fontFamily:"monospace", cursor:"pointer", marginBottom:"env(safe-area-inset-bottom, 20px)", letterSpacing:"0.04em" }}>
            BACK TO FEED
          </button>
        )}
      </div>
    </div>
  );
}