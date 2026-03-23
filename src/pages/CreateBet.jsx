import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", coral:"#ff6b4a", green:"#00e676",
  red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a",
  purple:"#a855f7",
};

const QUICK_BETS = [
  { label:"20 Push-ups",    forfeit:"Push-ups",    reps:20,  icon:"💪" },
  { label:"10 Burpees",     forfeit:"Burpees",     reps:10,  icon:"🔥" },
  { label:"50 Squats",      forfeit:"Squats",      reps:50,  icon:"🦵" },
  { label:"1 Min Plank",    forfeit:"Plank",       reps:1,   icon:"⏱" },
  { label:"30 Sit-ups",     forfeit:"Sit-ups",     reps:30,  icon:"🎯" },
  { label:"100 Jump Jacks", forfeit:"Jumping Jacks", reps:100, icon:"⚡" },
];

const DEADLINE_OPTIONS = [
  { label:"24 hours",  hours:24  },
  { label:"48 hours",  hours:48  },
  { label:"72 hours",  hours:72  },
  { label:"1 week",    hours:168 },
];

export default function CreateBet({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilled = location.state?.opponent;

  const [step, setStep] = useState(1);
  const [betDesc, setBetDesc] = useState("");
  const [forfeit, setForfeit] = useState("");
  const [reps, setReps] = useState("");
  const [opponentEmail, setOpponentEmail] = useState(prefilled?.email || "");
  const [opponentName, setOpponentName] = useState(prefilled?.displayName || "");
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [friends, setFriends] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "friends")).then(snap => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const pickQuick = (q) => {
    setForfeit(q.forfeit);
    setReps(String(q.reps));
    setBetDesc(`I bet you can't do ${q.reps} ${q.forfeit}!`);
    setStep(2);
  };

  const submit = async () => {
    if (!opponentEmail.trim()) { setError("Please enter your opponent's email"); return; }
    if (!betDesc.trim()) { setError("Please describe the bet"); return; }
    if (!forfeit.trim()) { setError("Please set a forfeit"); return; }
    setSubmitting(true); setError("");
    try {
      // Deadline = now + chosen hours
      const deadlineDate = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

      await addDoc(collection(db, "bets"), {
        description: betDesc.trim(),
        forfeit,
        reps: reps ? parseInt(reps) : null,
        opponentEmail: opponentEmail.trim().toLowerCase(),
        opponentName: opponentName || opponentEmail.split("@")[0],
        createdBy: user.uid,
        createdByName: user.displayName,
        createdByEmail: user.email,
        betCreatedBy: user.uid,
        status: "pending",
        deadline: deadlineDate, // ← saves as JS Date, Firestore converts to Timestamp
        deadlineHours,
        createdAt: serverTimestamp(),
      });
      navigate("/");
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const progress = (step / 3) * 100;

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, paddingBottom:"40px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" }}>
        <button style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
          onClick={() => step > 1 ? setStep(s=>s-1) : navigate(-1)}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em" }}>
            New <span style={{ color:C.cyan }}>Bet</span>
          </div>
          <div style={{ height:"4px", background:C.bg2, borderRadius:"2px", marginTop:"6px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${C.cyan},${C.purple})`, borderRadius:"2px", transition:"width 0.3s" }} />
          </div>
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:C.muted }}>{step}/3</div>
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* Step 1 — Quick bets or custom */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"26px", color:C.white, letterSpacing:"0.03em", marginBottom:"6px" }}>Choose a forfeit</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"20px" }}>Quick pick or write your own</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"16px" }}>
              {QUICK_BETS.map(q => (
                <div key={q.label} style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"16px 14px", cursor:"pointer", transition:"all 0.15s" }}
                  onClick={() => pickQuick(q)}>
                  <div style={{ fontSize:"28px", marginBottom:"8px" }}>{q.icon}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:"600", color:C.white }}>{q.label}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted, marginTop:"3px" }}>Quick pick</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Or write your own</div>

            <div style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"16px", marginBottom:"12px" }}>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.08em", display:"block", marginBottom:"8px" }}>BET DESCRIPTION</label>
              <textarea value={betDesc} onChange={e => setBetDesc(e.target.value)} placeholder="I bet you can't do 30 days of no junk food..." rows={3} maxLength={200}
                style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:C.white, fontSize:"15px", fontFamily:"'DM Sans',sans-serif", resize:"none", lineHeight:"1.5" }} />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"10px", marginBottom:"16px" }}>
              <div style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"14px 16px" }}>
                <label style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.08em", display:"block", marginBottom:"8px" }}>FORFEIT</label>
                <input value={forfeit} onChange={e => setForfeit(e.target.value)} placeholder="e.g. Push-ups" style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:C.white, fontSize:"15px", fontFamily:"'DM Sans',sans-serif" }} />
              </div>
              <div style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"14px 16px" }}>
                <label style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.08em", display:"block", marginBottom:"8px" }}>REPS</label>
                <input value={reps} onChange={e => setReps(e.target.value)} placeholder="20" type="number" style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:C.white, fontSize:"15px", fontFamily:"'DM Mono',monospace" }} />
              </div>
            </div>

            {error && <div style={{ background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:"12px", padding:"12px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.red, marginBottom:"12px" }}>{error}</div>}

            <button style={{ width:"100%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", opacity: !forfeit.trim()||!betDesc.trim()?0.4:1 }}
              disabled={!forfeit.trim()||!betDesc.trim()} onClick={() => { setError(""); setStep(2); }}>
              Next →
            </button>
          </div>
        )}

        {/* Step 2 — Choose opponent */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"26px", color:C.white, letterSpacing:"0.03em", marginBottom:"6px" }}>Who's the challenge?</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"20px" }}>Pick a friend or enter their email</div>

            {/* Friends list */}
            {friends.length > 0 && (
              <>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Your Friends</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
                  {friends.map(f => {
                    const selected = opponentEmail === (f.email || "");
                    return (
                      <div key={f.id} style={{ display:"flex", alignItems:"center", gap:"12px", background: selected ? "rgba(0,212,255,0.1)" : C.bg2, border:`1px solid ${selected ? "rgba(0,212,255,0.4)" : C.border1}`, borderRadius:"16px", padding:"14px", cursor:"pointer", transition:"all 0.15s" }}
                        onClick={() => { setOpponentEmail(f.email||""); setOpponentName(f.displayName||""); }}>
                        {f.photoURL
                          ? <img src={f.photoURL} alt="" style={{ width:"42px", height:"42px", borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                          : <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", color:"#000", flexShrink:0 }}>{f.displayName?.charAt(0)||"?"}</div>
                        }
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", fontWeight:"600", color: selected?C.cyan:C.white }}>{f.displayName}</div>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted }}>@{f.username||f.email}</div>
                        </div>
                        {selected && <div style={{ fontSize:"18px" }}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Or enter email</div>
            <div style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"14px 16px", marginBottom:"16px" }}>
              <input value={opponentEmail} onChange={e => setOpponentEmail(e.target.value)} placeholder="friend@example.com" type="email"
                style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:C.white, fontSize:"15px", fontFamily:"'DM Sans',sans-serif" }} />
            </div>

            {error && <div style={{ background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:"12px", padding:"12px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.red, marginBottom:"12px" }}>{error}</div>}

            <button style={{ width:"100%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", opacity:!opponentEmail.trim()?0.4:1 }}
              disabled={!opponentEmail.trim()} onClick={() => { setError(""); setStep(3); }}>
              Next →
            </button>
          </div>
        )}

        {/* Step 3 — Set deadline + confirm */}
        {step === 3 && (
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"26px", color:C.white, letterSpacing:"0.03em", marginBottom:"6px" }}>Set the deadline</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"20px" }}>How long do they have to complete the forfeit?</div>

            {/* Deadline picker */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
              {DEADLINE_OPTIONS.map(d => (
                <div key={d.hours} style={{ background: deadlineHours===d.hours ? "rgba(0,212,255,0.12)" : C.bg2, border:`1px solid ${deadlineHours===d.hours ? "rgba(0,212,255,0.4)" : C.border1}`, borderRadius:"14px", padding:"16px", textAlign:"center", cursor:"pointer", transition:"all 0.15s" }}
                  onClick={() => setDeadlineHours(d.hours)}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color: deadlineHours===d.hours ? C.cyan : C.white, letterSpacing:"0.03em" }}>{d.label}</div>
                  {deadlineHours===d.hours && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.cyan, marginTop:"4px" }}>✓ Selected</div>}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"16px", marginBottom:"16px" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", marginBottom:"12px" }}>BET SUMMARY</div>
              {[
                { label:"Bet",      val:`"${betDesc}"` },
                { label:"Forfeit",  val:`${reps ? reps+"x " : ""}${forfeit}` },
                { label:"Against",  val:opponentName || opponentEmail },
                { label:"Deadline", val:`${DEADLINE_OPTIONS.find(d=>d.hours===deadlineHours)?.label} after acceptance` },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", gap:"12px", marginBottom:"8px" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, width:"70px", flexShrink:0 }}>{row.label}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.white, flex:1 }}>{row.val}</div>
                </div>
              ))}
            </div>

            {error && <div style={{ background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:"12px", padding:"12px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.red, marginBottom:"12px" }}>{error}</div>}

            <button style={{ width:"100%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"18px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", opacity:submitting?0.5:1 }}
              disabled={submitting} onClick={submit}>
              {submitting ? "Sending..." : "⚔️ SEND CHALLENGE"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}