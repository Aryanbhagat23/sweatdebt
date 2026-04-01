import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp,
} from "firebase/firestore";

const CHALK  = "#2C4A3E";
const MINT   = "#f0fdf4";
const ACCENT = "#10b981";
const WHITE  = "#ffffff";
const MUTED  = "#6b7280";
const BORDER = "#d1fae5";
const DANGER = "#ef4444";

const SPORT_EMOJI = {
  football:"⚽", basketball:"🏀", cricket:"🏏", gaming:"🎮",
  mma:"🥊", running:"🏃", tennis:"🎾", chess:"♟️", custom:"🎯",
};

const FORFEITS = [
  { id:"pushups", icon:"💪", name:"Pushups" },
  { id:"run",     icon:"🏃", name:"Run"     },
  { id:"burpees", icon:"🔥", name:"Burpees" },
  { id:"squats",  icon:"🦵", name:"Squats"  },
  { id:"plank",   icon:"🧘", name:"Plank"   },
  { id:"custom",  icon:"✏️", name:"Custom"  },
];

export default function ChallengePage({ user }) {
  const { betId }  = useParams();
  const navigate   = useNavigate();

  const [bet,      setBet]      = useState(null);
  const [creator,  setCreator]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [action,   setAction]   = useState(null); // null | "accept" | "decline" | "counter"
  const [done,     setDone]     = useState(null); // "accepted" | "declined" | "countered"
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  // counter-bet state
  const [cForfeit, setCForfeit] = useState(null);
  const [cReps,    setCReps]    = useState("");

  useEffect(() => {
    if (!betId) return;
    getDoc(doc(db, "bets", betId)).then(async snap => {
      if (!snap.exists()) { setLoading(false); return; }
      const b = { id:snap.id, ...snap.data() };
      setBet(b);
      // load creator profile
      if (b.createdBy) {
        const uSnap = await getDoc(doc(db, "users", b.createdBy));
        if (uSnap.exists()) setCreator(uSnap.data());
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [betId]);

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!user) { navigate(`/login?redirect=/challenge/${betId}`); return; }
    setSaving(true);
    try {
      const dl = new Date(Date.now() + 48 * 3600000);
      await updateDoc(doc(db, "bets", betId), {
        status:       "accepted",
        opponentUid:  user.uid,
        opponentName: user.displayName || "Opponent",
        participants: [bet.createdBy, user.uid],
        deadline:     dl,
        acceptedAt:   serverTimestamp(),
      });
      // notify challenger
      await addDoc(collection(db, "notifications"), {
        toUserId:   bet.createdBy,
        fromUserId: user.uid,
        fromName:   user.displayName || "Someone",
        type:       "bet_accepted",
        betId,
        message:    `${user.displayName || "Someone"} accepted your challenge! It's on 🔥`,
        read:       false,
        createdAt:  serverTimestamp(),
      });
      setDone("accepted");
    } catch(e) { setError("Something went wrong. Try again."); }
    setSaving(false);
  };

  // ── Decline ───────────────────────────────────────────────────────────────
  const handleDecline = async () => {
    if (!user) { navigate(`/login?redirect=/challenge/${betId}`); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "bets", betId), { status:"declined" });
      await addDoc(collection(db, "notifications"), {
        toUserId:   bet.createdBy,
        fromUserId: user.uid,
        fromName:   user.displayName || "Someone",
        type:       "bet_declined",
        betId,
        message:    `${user.displayName || "Someone"} declined your challenge.`,
        read:       false,
        createdAt:  serverTimestamp(),
      });
      setDone("declined");
    } catch(e) { setError("Something went wrong. Try again."); }
    setSaving(false);
  };

  // ── Counter ───────────────────────────────────────────────────────────────
  const handleCounter = async () => {
    if (!user) { navigate(`/login?redirect=/challenge/${betId}`); return; }
    if (!cForfeit || !cReps) { setError("Pick a forfeit and enter reps."); return; }
    setSaving(true);
    try {
      // mark original as countered
      await updateDoc(doc(db, "bets", betId), { status:"countered" });
      // create new counter-bet
      const dl = new Date(Date.now() + 48 * 3600000);
      const newBet = await addDoc(collection(db, "bets"), {
        createdBy:       user.uid,
        createdByName:   user.displayName || "",
        createdByEmail:  user.email || "",
        opponentUid:     bet.createdBy,
        opponentEmail:   creator?.email || bet.createdByEmail || "",
        opponentName:    creator?.displayName || bet.createdByName || "Challenger",
        sport:           bet.sport || "custom",
        forfeit:         cForfeit,
        reps:            cReps,
        description:     `Counter to: ${bet.description || bet.reps + " " + bet.forfeit}`,
        deadline:        dl,
        status:          "pending",
        isCounter:       true,
        originalBetId:   betId,
        participants:    [user.uid, bet.createdBy],
        proofUploaded:   false,
        createdAt:       serverTimestamp(),
      });
      // notify original challenger
      await addDoc(collection(db, "notifications"), {
        toUserId:   bet.createdBy,
        fromUserId: user.uid,
        fromName:   user.displayName || "Someone",
        type:       "bet_challenge",
        betId:      newBet.id,
        message:    `${user.displayName || "Someone"} countered your bet! Check your challenges.`,
        read:       false,
        createdAt:  serverTimestamp(),
      });
      setDone("countered");
    } catch(e) { setError("Something went wrong. Try again."); }
    setSaving(false);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:"100vh", background:CHALK, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"monospace", color:ACCENT, fontSize:"14px" }}>Loading challenge…</div>
    </div>
  );

  if (!bet) return (
    <div style={{ minHeight:"100vh", background:MINT, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px", padding:"24px" }}>
      <div style={{ fontSize:"48px" }}>🔍</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:CHALK }}>Challenge not found</div>
      <div style={{ fontFamily:"system-ui", fontSize:"14px", color:MUTED, textAlign:"center" }}>This challenge link may have expired or already been responded to.</div>
      <button onClick={() => navigate("/")} style={{ padding:"12px 24px", background:CHALK, border:"none", borderRadius:"12px", color:ACCENT, fontFamily:"monospace", fontSize:"14px", cursor:"pointer" }}>
        Open SweatDebt
      </button>
    </div>
  );

  // ── Done states ───────────────────────────────────────────────────────────
  if (done) {
    const msgs = {
      accepted: { emoji:"🔥", title:"Challenge Accepted!", sub:"The bet is live. Don't lose!", color:ACCENT },
      declined: { emoji:"🚫", title:"Challenge Declined",  sub:"Maybe next time.",             color:MUTED  },
      countered:{ emoji:"⚔️", title:"Counter Sent!",       sub:"Ball's in their court now.",   color:"#f59e0b" },
    };
    const m = msgs[done];
    return (
      <div style={{ minHeight:"100vh", background:CHALK, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px", padding:"24px", textAlign:"center" }}>
        <div style={{ fontSize:"64px" }}>{m.emoji}</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color:WHITE, letterSpacing:"0.04em" }}>{m.title}</div>
        <div style={{ fontFamily:"system-ui", fontSize:"16px", color:"rgba(255,255,255,0.5)" }}>{m.sub}</div>
        <button onClick={() => navigate("/")} style={{
          marginTop:"16px", padding:"16px 32px",
          background:ACCENT, border:"none", borderRadius:"16px",
          fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px",
          letterSpacing:"0.06em", color:CHALK, cursor:"pointer",
        }}>
          OPEN APP ⚔️
        </button>
      </div>
    );
  }

  const sportEmoji = SPORT_EMOJI[bet.sport] || "🎯";

  // ── Main challenge view ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:MINT, paddingBottom:"40px" }}>

      {/* Header */}
      <div style={{ background:CHALK, padding:"48px 20px 28px", position:"relative", overflow:"hidden" }}>
        <div style={{
          position:"absolute", top:"-20px", right:"-20px",
          fontFamily:"'Bebas Neue',sans-serif", fontSize:"120px",
          color:"rgba(255,255,255,0.04)", letterSpacing:"0.04em",
          pointerEvents:"none",
        }}>⚔️</div>
        <div style={{ fontFamily:"monospace", fontSize:"11px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.12em", marginBottom:"6px" }}>
          YOU'VE BEEN CHALLENGED
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color:WHITE, letterSpacing:"0.04em", lineHeight:1 }}>
          {creator?.displayName || bet.createdByName || "Someone"}<br/>
          <span style={{ color:ACCENT }}>wants to bet.</span>
        </div>
      </div>

      <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"14px" }}>

        {/* Challenger card */}
        <div style={{ background:WHITE, borderRadius:"18px", border:`1px solid ${BORDER}`, padding:"18px", display:"flex", alignItems:"center", gap:"14px" }}>
          {creator?.photoURL
            ? <img src={creator.photoURL} alt="" style={{ width:"52px", height:"52px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${ACCENT}` }}/>
            : <div style={{ width:"52px", height:"52px", borderRadius:"50%", background:CHALK, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:ACCENT, flexShrink:0 }}>
                {(creator?.displayName || "?").charAt(0).toUpperCase()}
              </div>
          }
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:CHALK, letterSpacing:"0.04em" }}>
              {creator?.displayName || bet.createdByName}
            </div>
            <div style={{ fontFamily:"monospace", fontSize:"11px", color:MUTED, marginTop:"2px" }}>
              Honour: {creator?.honourScore || 0} · {creator?.wins || 0}W {creator?.losses || 0}L
            </div>
          </div>
          <div style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:"11px", color:ACCENT, background:`${ACCENT}15`, padding:"4px 10px", borderRadius:"20px", border:`1px solid ${ACCENT}30` }}>
            CHALLENGER
          </div>
        </div>

        {/* Bet details */}
        <div style={{ background:WHITE, borderRadius:"18px", border:`1px solid ${BORDER}`, padding:"18px" }}>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:MUTED, letterSpacing:"0.1em", marginBottom:"14px" }}>THE BET</div>
          {[
            { label:"Sport",   val:`${sportEmoji} ${bet.sport || "Custom"}` },
            { label:"Forfeit", val:`${FORFEITS.find(f=>f.id===bet.forfeit)?.icon||"💀"} ${bet.reps} ${bet.forfeit}` },
            { label:"Stakes",  val:"Loser films the forfeit 📹" },
          ].map(r => (
            <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${BORDER}` }}>
              <span style={{ fontFamily:"system-ui", fontSize:"13px", color:MUTED }}>{r.label}</span>
              <span style={{ fontFamily:"system-ui", fontSize:"13px", color:CHALK, fontWeight:"500" }}>{r.val}</span>
            </div>
          ))}
          {bet.description && (
            <div style={{ marginTop:"12px", fontFamily:"system-ui", fontSize:"13px", color:MUTED, fontStyle:"italic" }}>
              "{bet.description}"
            </div>
          )}
        </div>

        {/* Not logged in warning */}
        {!user && (
          <div style={{ background:`${ACCENT}10`, border:`1px solid ${ACCENT}30`, borderRadius:"14px", padding:"14px 16px", fontFamily:"system-ui", fontSize:"13px", color:CHALK, textAlign:"center" }}>
            You need to <strong>sign in</strong> to respond to this challenge.
            <button onClick={() => navigate(`/login?redirect=/challenge/${betId}`)} style={{
              display:"block", width:"100%", marginTop:"10px", padding:"12px",
              background:CHALK, border:"none", borderRadius:"10px",
              fontFamily:"monospace", fontSize:"14px", fontWeight:"700",
              color:ACCENT, cursor:"pointer", letterSpacing:"0.04em",
            }}>SIGN IN TO RESPOND</button>
          </div>
        )}

        {/* Counter forfeit picker */}
        {action === "counter" && (
          <div style={{ background:WHITE, borderRadius:"18px", border:`1px solid ${BORDER}`, padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:MUTED, letterSpacing:"0.1em", marginBottom:"14px" }}>YOUR COUNTER FORFEIT</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"14px" }}>
              {FORFEITS.map(f => (
                <button key={f.id} type="button" onClick={() => setCForfeit(f.id)} style={{
                  padding:"10px", display:"flex", alignItems:"center", gap:"8px",
                  background: cForfeit===f.id ? CHALK : MINT,
                  border:`1.5px solid ${cForfeit===f.id ? CHALK : BORDER}`,
                  borderRadius:"10px", cursor:"pointer",
                }}>
                  <span style={{ fontSize:"16px" }}>{f.icon}</span>
                  <span style={{ fontFamily:"monospace", fontSize:"12px", color: cForfeit===f.id ? ACCENT : CHALK }}>{f.name}</span>
                </button>
              ))}
            </div>
            {cForfeit && (
              <input
                value={cReps}
                onChange={e => setCReps(e.target.value)}
                placeholder={cForfeit==="run"?"e.g. 3km":cForfeit==="custom"?"Describe forfeit":"e.g. 50 reps"}
                style={{ width:"100%", padding:"12px 14px", background:MINT, border:`1.5px solid ${BORDER}`, borderRadius:"10px", fontFamily:"system-ui", fontSize:"14px", color:CHALK, outline:"none", boxSizing:"border-box" }}
              />
            )}
          </div>
        )}

        {error && (
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"12px", padding:"12px 16px", fontFamily:"system-ui", fontSize:"13px", color:DANGER }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        {user && bet.status === "pending" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {action === "counter" ? (
              <button onClick={handleCounter} disabled={saving} style={{
                width:"100%", padding:"16px", background:saving?"#e5e7eb":"#f59e0b",
                border:"none", borderRadius:"16px",
                fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px",
                letterSpacing:"0.06em", color:saving?MUTED:CHALK,
                cursor:saving?"not-allowed":"pointer",
              }}>
                {saving ? "SENDING…" : "⚔️ SEND COUNTER BET"}
              </button>
            ) : (
              <button onClick={handleAccept} disabled={saving} style={{
                width:"100%", padding:"16px", background:saving?"#e5e7eb":ACCENT,
                border:"none", borderRadius:"16px",
                fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px",
                letterSpacing:"0.06em", color:saving?MUTED:CHALK,
                cursor:saving?"not-allowed":"pointer",
                boxShadow:`0 4px 20px ${ACCENT}40`,
              }}>
                {saving ? "ACCEPTING…" : "✓ ACCEPT CHALLENGE"}
              </button>
            )}

            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setAction(action==="counter"?null:"counter")} style={{
                flex:1, padding:"14px",
                background:"#fff8e1", border:"1.5px solid #f59e0b",
                borderRadius:"14px",
                fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px",
                letterSpacing:"0.04em", color:"#92400e", cursor:"pointer",
              }}>
                {action==="counter" ? "✗ CANCEL" : "⚔️ COUNTER"}
              </button>
              <button onClick={handleDecline} disabled={saving} style={{
                flex:1, padding:"14px",
                background:"rgba(239,68,68,0.08)", border:`1.5px solid ${DANGER}`,
                borderRadius:"14px",
                fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px",
                letterSpacing:"0.04em", color:DANGER, cursor:"pointer",
              }}>
                ✗ DECLINE
              </button>
            </div>
          </div>
        )}

        {/* Already responded */}
        {bet.status !== "pending" && (
          <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:"14px", padding:"16px", textAlign:"center", fontFamily:"system-ui", fontSize:"14px", color:MUTED }}>
            This challenge has already been {bet.status}. <br/>
            <button onClick={() => navigate("/")} style={{ marginTop:"10px", padding:"10px 20px", background:CHALK, border:"none", borderRadius:"10px", color:ACCENT, fontFamily:"monospace", fontSize:"13px", cursor:"pointer" }}>
              Open App
            </button>
          </div>
        )}

        {/* SweatDebt branding */}
        <div style={{ textAlign:"center", padding:"8px 0" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", color:CHALK, letterSpacing:"0.04em" }}>
            Sweat<span style={{ color:ACCENT }}>Debt</span>
          </div>
          <div style={{ fontFamily:"monospace", fontSize:"11px", color:MUTED, marginTop:"2px" }}>
            Bet on yourself. Pay in sweat.
          </div>
        </div>
      </div>
    </div>
  );
}