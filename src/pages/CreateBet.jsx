import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import T from "../theme";

const SPORTS = [
  { key:"cricket",    label:"Cricket",    emoji:"🏏" },
  { key:"football",   label:"Football",   emoji:"⚽" },
  { key:"gaming",     label:"Gaming",     emoji:"🎮" },
  { key:"basketball", label:"Basketball", emoji:"🏀" },
  { key:"custom",     label:"Custom",     emoji:"🎯" },
  { key:"chess",      label:"Chess",      emoji:"♟️" },
];

const QUICK_FORFEITS = [
  { label:"Push-ups",   emoji:"💪", reps:20 },
  { label:"Squats",     emoji:"🦵", reps:50 },
  { label:"Burpees",    emoji:"🔥", reps:10 },
  { label:"Run 2km",    emoji:"🏃", reps:1  },
  { label:"Sit-ups",    emoji:"🎯", reps:30 },
  { label:"Plank 2min", emoji:"⏱", reps:1  },
];

const DEADLINES = [
  { label:"24 hours", hours:24  },
  { label:"48 hours", hours:48  },
  { label:"72 hours", hours:72  },
  { label:"1 week",   hours:168 },
];

export default function CreateBet({ user }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const prefilled = location.state?.opponent;

  const [step,          setStep]         = useState(1);
  const [sport,         setSport]        = useState("");
  const [betDesc,       setBetDesc]      = useState(location.state?.prefillDesc||"");
  const [forfeit,       setForfeit]      = useState(location.state?.prefillForfeit||"");
  const [reps,          setReps]         = useState("");
  const [opponentEmail, setOpponentEmail]= useState(prefilled?.email||"");
  const [opponentName,  setOpponentName] = useState(prefilled?.displayName||"");
  const [deadlineHours, setDeadlineHours]= useState(48);
  const [friends,       setFriends]      = useState([]);
  const [submitting,    setSubmitting]   = useState(false);
  const [error,         setError]        = useState("");

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db,"users",user.uid,"friends")).then(snap => {
      setFriends(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    });
  }, [user]);

  const progress = (step / 3) * 100;

  const submit = async () => {
    if (!opponentEmail.trim()) { setError("Please enter your opponent's email"); return; }
    if (!betDesc.trim())       { setError("Please describe the bet");             return; }
    if (!forfeit.trim())       { setError("Please set a forfeit");                return; }
    setSubmitting(true); setError("");
    try {
      const deadlineDate = new Date(Date.now() + deadlineHours * 3600000);
      await addDoc(collection(db,"bets"), {
        description: betDesc.trim(), forfeit, reps: reps ? parseInt(reps) : null,
        opponentEmail: opponentEmail.trim().toLowerCase(),
        opponentName:  opponentName || opponentEmail.split("@")[0],
        createdBy:     user.uid,  createdByName:  user.displayName,
        createdByEmail:user.email, betCreatedBy:   user.uid,
        sport: sport || "custom", status: "pending",
        deadline: deadlineDate,   deadlineHours,
        createdAt: serverTimestamp(),
        gameName: location.state?.gameName || null,
      });
      navigate("/");
    } catch(e) { console.error(e); setError("Something went wrong."); }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" }}>
        <button onClick={() => step > 1 ? setStep(s => s-1) : navigate(-1)} style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"50%", width:"44px", height:"44px", color:T.panel, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:T.shadowSm }}>←</button>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic", flex:1 }}>New <span style={{ color:T.accent }}>Bet</span></div>
        <div style={{ fontFamily:T.fontMono, fontSize:"12px", color:T.textMuted }}>{step}/3</div>
      </div>

      {/* Progress bar */}
      <div style={{ height:"4px", background:T.border, margin:"0 16px 24px", borderRadius:"2px" }}>
        <div style={{ height:"100%", width:`${progress}%`, background:T.accent, borderRadius:"2px", transition:"width 0.35s ease" }} />
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* ── STEP 1: Sport + forfeit ── */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px" }}>Pick a Sport / Game</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"20px" }}>
              {SPORTS.map(s => (
                <div key={s.key} style={{ background:sport===s.key?T.panel:T.bg1, border:`1.5px solid ${sport===s.key?T.accent:T.border}`, borderRadius:T.r16, padding:"16px 12px", textAlign:"center", cursor:"pointer", transition:"all 0.15s", boxShadow:T.shadowSm }} onClick={() => setSport(s.key)}>
                  <div style={{ fontSize:"28px", marginBottom:"6px" }}>{s.emoji}</div>
                  <div style={{ fontFamily:T.fontBody, fontSize:"13px", fontWeight:"600", color:sport===s.key?T.accent:T.panel }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px" }}>Loser Does...</div>

            {/* Quick forfeits */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px" }}>
              {QUICK_FORFEITS.map(f => (
                <div key={f.label} style={{ background:forfeit===f.label?T.panel:T.bg1, border:`1.5px solid ${forfeit===f.label?T.accent:T.border}`, borderRadius:T.r14, padding:"12px 14px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", transition:"all 0.15s", boxShadow:T.shadowSm }} onClick={() => { setForfeit(f.label); setReps(String(f.reps)); }}>
                  <span style={{ fontSize:"22px" }}>{f.emoji}</span>
                  <div>
                    <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:forfeit===f.label?T.accent:T.panel }}>{f.label}</div>
                    <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>{f.reps} reps</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom + reps counter (like screenshot) */}
            <div style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:T.r16, padding:"14px", marginBottom:"12px", boxShadow:T.shadowSm }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em", marginBottom:"8px" }}>CUSTOM FORFEIT</div>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                <input value={forfeit} onChange={e => setForfeit(e.target.value)} placeholder="e.g. Push-ups" style={{ flex:1, background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.r12, padding:"12px 14px", color:T.textDark, fontSize:"15px", fontFamily:T.fontBody, outline:"none", caretColor:T.accent }} />
              </div>
              {/* Reps counter with +/- buttons like screenshot */}
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"20px" }}>💪</span>
                  <span style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.panel }}>{forfeit||"Pushups"}</span>
                </div>
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px" }}>
                  <button onClick={() => setReps(r => String(Math.max(0,(parseInt(r)||0)-5)))} style={{ width:"32px", height:"32px", borderRadius:"50%", background:T.bg3, border:`1px solid ${T.border}`, fontFamily:T.fontDisplay, fontSize:"18px", color:T.panel, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:T.panel, minWidth:"36px", textAlign:"center" }}>{reps||"0"}</span>
                  <button onClick={() => setReps(r => String((parseInt(r)||0)+5))} style={{ width:"32px", height:"32px", borderRadius:"50%", background:T.panel, border:"none", fontFamily:T.fontDisplay, fontSize:"18px", color:T.accent, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
              </div>
            </div>

            {/* Bet description */}
            <div style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:T.r16, padding:"14px", marginBottom:"16px", boxShadow:T.shadowSm }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em", marginBottom:"8px" }}>BET DESCRIPTION</div>
              <textarea value={betDesc} onChange={e => setBetDesc(e.target.value)} placeholder="India vs Aus · Whoever's team loses does 50 squats" rows={2} maxLength={200} style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:T.textDark, fontSize:"14px", fontFamily:T.fontBody, resize:"none", lineHeight:"1.5", caretColor:T.accent }} />
            </div>

            <button style={{ width:"100%", background:T.panel, border:"none", borderRadius:T.r16, padding:"15px 24px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer", boxShadow:"0 4px 14px rgba(5,46,22,0.2)", opacity:!forfeit.trim()||!betDesc.trim()?0.4:1 }} disabled={!forfeit.trim()||!betDesc.trim()} onClick={() => { setError(""); setStep(2); }}>Next →</button>
          </div>
        )}

        {/* ── STEP 2: Opponent ── */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px" }}>Challenge</div>

            {friends.length > 0 && (
              <>
                <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, marginBottom:"10px" }}>Your friends</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
                  {friends.map(f => {
                    const sel = opponentEmail === (f.email||"");
                    return (
                      <div key={f.id} style={{ display:"flex", alignItems:"center", gap:"12px", background:sel?T.panel:T.bg1, border:`1.5px solid ${sel?T.accent:T.border}`, borderRadius:T.r16, padding:"14px", cursor:"pointer", transition:"all 0.15s", boxShadow:T.shadowSm }} onClick={() => { setOpponentEmail(f.email||""); setOpponentName(f.displayName||""); }}>
                        <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:sel?"rgba(16,185,129,0.2)":T.bg3, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"16px", color:sel?T.accent:T.panel, flexShrink:0, border:`2px solid ${sel?T.accent:T.border}` }}>
                          {f.displayName?.charAt(0)||"?"}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:sel?T.accent:T.panel }}>{f.displayName}</div>
                          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>@{f.username||f.email}</div>
                        </div>
                        {sel && <div style={{ color:T.accent, fontSize:"20px" }}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:T.r16, padding:"14px", marginBottom:"16px", boxShadow:T.shadowSm }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em", marginBottom:"8px" }}>OR ENTER EMAIL</div>
              <input value={opponentEmail} onChange={e => setOpponentEmail(e.target.value)} placeholder="friend@example.com" type="email" style={{ width:"100%", background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.r12, padding:"12px 14px", color:T.textDark, fontSize:"15px", fontFamily:T.fontBody, outline:"none", caretColor:T.accent }} />
            </div>

            {error && <div style={{ background:T.redLight, border:`1px solid ${T.redBorder}`, borderRadius:T.r12, padding:"12px 16px", fontFamily:T.fontBody, fontSize:"14px", color:T.red, marginBottom:"12px" }}>{error}</div>}
            <button style={{ width:"100%", background:T.panel, border:"none", borderRadius:T.r16, padding:"15px 24px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer", boxShadow:"0 4px 14px rgba(5,46,22,0.2)", opacity:!opponentEmail.trim()?0.4:1 }} disabled={!opponentEmail.trim()} onClick={() => { setError(""); setStep(3); }}>Next →</button>
          </div>
        )}

        {/* ── STEP 3: Deadline + confirm ── */}
        {step === 3 && (
          <div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px" }}>Set Deadline</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
              {DEADLINES.map(d => (
                <div key={d.hours} style={{ background:deadlineHours===d.hours?T.panel:T.bg1, border:`1.5px solid ${deadlineHours===d.hours?T.accent:T.border}`, borderRadius:T.r14, padding:"16px", textAlign:"center", cursor:"pointer", transition:"all 0.15s", boxShadow:T.shadowSm }} onClick={() => setDeadlineHours(d.hours)}>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:deadlineHours===d.hours?T.accent:T.panel, letterSpacing:"0.03em" }}>{d.label}</div>
                  {deadlineHours===d.hours && <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.accent, marginTop:"4px" }}>✓ Selected</div>}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ background:T.panel, borderRadius:T.r16, padding:"16px", marginBottom:"16px" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", marginBottom:"12px" }}>BET SUMMARY</div>
              {[
                { label:"Sport",    val: SPORTS.find(s=>s.key===sport)?.label||"Custom" },
                { label:"Bet",      val: `"${betDesc}"` },
                { label:"Forfeit",  val: `${reps?reps+"x ":""}${forfeit}` },
                { label:"Against",  val: opponentName||opponentEmail },
                { label:"Deadline", val: `${DEADLINES.find(d=>d.hours===deadlineHours)?.label} after acceptance` },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", gap:"12px", marginBottom:"8px" }}>
                  <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:"rgba(255,255,255,0.4)", width:"60px", flexShrink:0 }}>{row.label}</div>
                  <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:"#fff", flex:1 }}>{row.val}</div>
                </div>
              ))}
            </div>

            {error && <div style={{ background:T.redLight, border:`1px solid ${T.redBorder}`, borderRadius:T.r12, padding:"12px 16px", fontFamily:T.fontBody, fontSize:"14px", color:T.red, marginBottom:"12px" }}>{error}</div>}
            <button style={{ width:"100%", background:T.accent, border:"none", borderRadius:T.r16, padding:"16px 24px", fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.06em", color:"#fff", cursor:"pointer", boxShadow:"0 4px 14px rgba(16,185,129,0.35)", opacity:submitting?0.5:1 }} disabled={submitting} onClick={submit}>
              {submitting ? "Sending..." : "Send Challenge 🔥"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}