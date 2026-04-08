import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  doc, getDoc, updateDoc, arrayUnion, increment,
} from "firebase/firestore";

const C = {
  page:"#f0fdf4", card:"#fff", border:"#d1fae5",
  heading:"#052e16", muted:"#6b7280",
  accent:"#10b981", chalkboard:"#2C4A3E",
  accentSoft:"#6EE7B7", danger:"#ef4444",
};

const CLOUD  = "daf3vs5n6";
const PRESET = "jrmodcfe";

async function sendNotif({ toUid, fromUid, fromName, type, betId, text }) {
  if (!toUid || toUid === fromUid) return;
  try {
    await addDoc(collection(db, "notifications"), {
      toUserId:   toUid,
      fromUserId: fromUid,
      fromName,
      type,
      betId:     betId || null,
      message:   text,
      read:      false,
      createdAt: serverTimestamp(),
    });
  } catch(e) { console.warn("Notification failed:", e); }
}

// Today's key for daily_challenges collection
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function UploadProof({ user }) {
  const navigate = useNavigate();
  const { betId }      = useParams();
  const [searchParams] = useSearchParams();

  // ── detect daily challenge mode ──────────────────────────────────────────────
  const isDailyChallenge = searchParams.get("type") === "daily";
  const dailyExercise    = searchParams.get("challenge") || "";
  const dailyReps        = searchParams.get("reps")      || "";

  // ── bet id — only relevant when NOT daily ────────────────────────────────────
  // If there's no betId at all, stay as null (don't fall back to "general"
  // which would try a Firestore lookup and silently fail)
  const paramBetId = betId || searchParams.get("betId") || null;

  const [bet,         setBet]         = useState(null);
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [description, setDescription] = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState("");

  // ── load bet info (only if we have a real betId) ─────────────────────────────
  useEffect(() => {
    if (!paramBetId || isDailyChallenge) return;
    getDoc(doc(db, "bets", paramBetId))
      .then(snap => { if (snap.exists()) setBet({ id:snap.id, ...snap.data() }); })
      .catch(() => {});
  }, [paramBetId, isDailyChallenge]);

  const handleFileChange = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { setError("Please select a video file."); return; }
    if (f.size > 100 * 1024 * 1024)  { setError("Video must be under 100 MB.");  return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const handleUpload = async () => {
    if (!file) { setError("Choose a video first."); return; }
    if (!user)  { setError("You must be logged in."); return; }
    setUploading(true);
    setError("");
    setProgress(10);

    try {
      // ── 1. Upload to Cloudinary ─────────────────────────────────────────────
      const form = new FormData();
      form.append("file",          file);
      form.append("upload_preset", PRESET);
      form.append("resource_type", "video");

      setProgress(30);
      const res  = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`,
        { method:"POST", body:form }
      );
      const data = await res.json();
      if (!data.secure_url) throw new Error("Cloudinary upload failed");
      setProgress(70);

      if (isDailyChallenge) {
        // ── DAILY CHALLENGE FLOW ──────────────────────────────────────────────
        // Save video tagged as daily challenge — no bet, no approve/dispute logic
        await addDoc(collection(db, "videos"), {
          videoUrl:       data.secure_url,
          uploadedBy:     user.uid,
          uploadedByName: user.displayName || "",
          uploaderPhoto:  user.photoURL    || null,
          betId:          null,
          description:    description.trim() ||
                          `Daily Challenge: ${dailyReps} ${dailyExercise} 💪`,
          type:           "daily_challenge",   // ← tagged so Feed skips approve/dispute
          exercise:       dailyExercise,
          reps:           dailyReps,
          // No opponentUid — daily challenges don't need approval
          opponentUid:    null,
          betCreatedBy:   null,
          opponentEmail:  null,
          createdAt:      serverTimestamp(),
          likes:          0,
          comments:       0,
          approved:       true,   // auto-approved — no opponent to verify
          disputed:       false,
          jurors:         [],
          juryStatus:     null,
          juryDeadline:   null,
        });
        setProgress(85);

        // Also mark the daily challenge as completed + increment honour
        try {
          const key = todayKey();
          await updateDoc(doc(db, "daily_challenges", key), {
            completedIds:   arrayUnion(user.uid),
            totalCompleted: increment(1),
          });
          await updateDoc(doc(db, "users", user.uid), {
            honour:                   increment(2),
            dailyChallengesCompleted: increment(1),
          });
        } catch(e) {
          // Non-critical — don't block the upload if this fails
          console.warn("Could not update daily challenge completion:", e);
        }

      } else {
        // ── NORMAL BET PROOF FLOW ─────────────────────────────────────────────
        const betData = bet || {};
        const uploaderIsCreator = betData.createdBy === user.uid;
        const opponentUid = uploaderIsCreator
          ? (betData.opponentUid || null)
          : (betData.createdBy   || null);

        await addDoc(collection(db, "videos"), {
          videoUrl:        data.secure_url,
          uploadedBy:      user.uid,
          uploadedByName:  user.displayName || "",
          uploaderPhoto:   user.photoURL    || null,
          betId:           paramBetId || null,
          description:     description.trim(),
          type:            "bet_proof",
          opponentUid,
          betCreatedBy:    betData.createdBy     || null,
          opponentEmail:   betData.opponentEmail || null,
          createdByEmail:  betData.createdByEmail|| user.email || null,
          createdAt:       serverTimestamp(),
          likes:           0,
          comments:        0,
          approved:        false,
          disputed:        false,
          jurors:          [],
          juryStatus:      null,
          juryDeadline:    null,
        });
        setProgress(85);

        // Mark bet as proof uploaded
        if (paramBetId && bet) {
          await updateDoc(doc(db, "bets", paramBetId), {
            proofUploaded:   true,
            proofUploadedAt: serverTimestamp(),
          });
        }
        setProgress(95);

        // Notify the opponent
        if (opponentUid) {
          await sendNotif({
            toUid:    opponentUid,
            fromUid:  user.uid,
            fromName: user.displayName || "Someone",
            type:     "proof_uploaded",
            betId:    paramBetId,
            text:     `${user.displayName || "Your opponent"} uploaded forfeit proof — go approve or dispute it!`,
          });
        }
      }

      setProgress(100);
      setDone(true);
      setTimeout(() => navigate("/feed"), 2000);

    } catch(e) {
      console.error(e);
      setError("Upload failed. Check your connection and try again.");
    }
    setUploading(false);
  };

  // ── page title/subtitle depending on mode ────────────────────────────────────
  const pageTitle    = isDailyChallenge
    ? `${dailyReps} ${dailyExercise}`
    : bet
      ? `${bet.reps || ""} ${bet.forfeit || "Forfeit"}`.trim()
      : "Post Forfeit Video";

  const pageSubtitle = isDailyChallenge ? "DAILY CHALLENGE PROOF" : "UPLOAD PROOF";

  return (
    <div style={{ minHeight:"100vh", background:C.page, paddingBottom:"60px" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background:C.chalkboard, padding:"52px 16px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button type="button" onClick={() => navigate(-1)}
            style={{ width:"40px", height:"40px", borderRadius:"50%", background:"rgba(110,231,183,0.15)", border:"1px solid rgba(110,231,183,0.3)", color:"#fff", fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ←
          </button>
          <div>
            <div style={{ fontFamily:"monospace", fontSize:"13px", color:C.accentSoft, letterSpacing:"0.1em" }}>
              {pageSubtitle}
            </div>
            <div style={{ fontSize:"20px", fontWeight:"700", color:"#fff", fontStyle:"italic", letterSpacing:"0.03em" }}>
              {pageTitle}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:"16px" }}>

        {/* Done state */}
        {done && (
          <div style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}40`, borderRadius:"16px", padding:"24px", textAlign:"center" }}>
            <div style={{ fontSize:"48px", marginBottom:"8px" }}>🎉</div>
            <div style={{ fontSize:"18px", fontWeight:"700", color:C.heading }}>
              {isDailyChallenge ? "Proof posted! +2 honour earned 💪" : "Video uploaded!"}
            </div>
            <div style={{ fontSize:"13px", color:C.muted, marginTop:"4px" }}>
              {isDailyChallenge
                ? "Your video is live on the feed 🔥"
                : "Your opponent has been notified 🔔"}
            </div>
            <div style={{ fontSize:"12px", color:C.muted, marginTop:"4px" }}>Heading to the feed…</div>
          </div>
        )}

        {!done && (
          <>
            {/* Daily challenge info card */}
            {isDailyChallenge && (
              <div style={{ background:C.chalkboard, borderRadius:"14px", padding:"14px 16px", display:"flex", gap:"12px", alignItems:"center" }}>
                <div style={{ fontSize:"28px" }}>⚡</div>
                <div>
                  <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.accentSoft, letterSpacing:"0.1em", marginBottom:"2px" }}>
                    TODAY'S CHALLENGE
                  </div>
                  <div style={{ fontSize:"16px", fontWeight:"700", color:"#fff" }}>
                    {dailyReps} {dailyExercise}
                  </div>
                  <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.5)", marginTop:"3px" }}>
                    Post your video proof to earn +2 honour
                  </div>
                </div>
              </div>
            )}

            {/* Bet info card (normal flow) */}
            {!isDailyChallenge && bet && (
              <div style={{ background:C.chalkboard, borderRadius:"14px", padding:"14px 16px", display:"flex", gap:"12px", alignItems:"center" }}>
                <div style={{ fontSize:"28px" }}>⚔️</div>
                <div>
                  <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.accentSoft, letterSpacing:"0.1em", marginBottom:"2px" }}>
                    UPLOADING FOR BET
                  </div>
                  <div style={{ fontSize:"14px", fontWeight:"600", color:"#fff" }}>
                    {bet.description || `${bet.reps || ""} ${bet.forfeit || "Forfeit"}`}
                  </div>
                  <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.5)", marginTop:"3px" }}>
                    vs {bet.opponentName || bet.opponentEmail || "opponent"}
                  </div>
                </div>
              </div>
            )}

            {/* Video picker */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", overflow:"hidden" }}>
              {preview
                ? <video src={preview} controls style={{ width:"100%", maxHeight:"300px", objectFit:"cover", display:"block" }}/>
                : (
                  <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"200px", cursor:"pointer", gap:"12px" }}>
                    <div style={{ fontSize:"48px" }}>🎥</div>
                    <div style={{ fontFamily:"monospace", fontSize:"13px", color:C.muted, letterSpacing:"0.06em" }}>TAP TO SELECT VIDEO</div>
                    <input type="file" accept="video/*" capture="environment" onChange={handleFileChange} style={{ display:"none" }}/>
                  </label>
                )
              }
              {preview && (
                <label style={{ display:"block", textAlign:"center", padding:"10px", fontFamily:"monospace", fontSize:"12px", color:C.accent, cursor:"pointer", borderTop:`1px solid ${C.border}` }}>
                  ↩ Change video
                  <input type="file" accept="video/*" onChange={handleFileChange} style={{ display:"none" }}/>
                </label>
              )}
            </div>

            {/* Caption */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"16px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.1em", marginBottom:"10px" }}>
                CAPTION <span style={{ fontWeight:"400" }}>(optional)</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={isDailyChallenge
                  ? `e.g. "Smashed ${dailyReps} ${dailyExercise}, no excuses 💀"`
                  : 'e.g. "100 burpees in the rain, as promised 💀"'}
                maxLength={200}
                rows={3}
                style={{ width:"100%", background:C.page, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"12px 14px", color:C.heading, fontSize:"14px", fontFamily:"system-ui", outline:"none", resize:"none", lineHeight:"1.5", boxSizing:"border-box" }}
              />
              <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, textAlign:"right", marginTop:"4px" }}>
                {description.length}/200
              </div>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"16px" }}>
                <div style={{ fontFamily:"monospace", fontSize:"11px", color:C.muted, marginBottom:"8px" }}>
                  UPLOADING… {progress}%
                </div>
                <div style={{ height:"8px", background:C.page, borderRadius:"4px", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${C.accent},#34d399)`, borderRadius:"4px", transition:"width 0.4s ease" }}/>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"12px", padding:"12px 16px", fontSize:"13px", color:C.danger }}>
                {error}
              </div>
            )}

            {/* Upload button */}
            <button type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                width:"100%", padding:"18px",
                background:(!file || uploading) ? C.page : C.chalkboard,
                border:`1px solid ${(!file || uploading) ? C.border : "transparent"}`,
                borderRadius:"16px",
                fontFamily:"monospace", fontSize:"18px", letterSpacing:"0.06em", fontWeight:"700",
                color:(!file || uploading) ? C.muted : C.accentSoft,
                cursor:(!file || uploading) ? "not-allowed" : "pointer",
                transition:"all 0.2s",
              }}>
              {uploading
                ? "⏳ UPLOADING..."
                : isDailyChallenge
                  ? "💪 POST PROOF"
                  : "💀 POST FORFEIT"}
            </button>

            <div style={{ textAlign:"center", fontSize:"11px", color:C.muted, fontFamily:"monospace" }}>
              {isDailyChallenge
                ? "Max 100 MB · Earns +2 honour 🏅"
                : "Max 100 MB · Your opponent will be notified to approve 🔔"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}