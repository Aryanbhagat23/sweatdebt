import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  doc, setDoc, getDoc,
} from "firebase/firestore";
import T from "../theme";

const FORFEITS = [
  { id:"pushups", icon:"💪", name:"Pushups",  desc:"Upper body" },
  { id:"run",     icon:"🏃", name:"Run",       desc:"GPS tracked" },
  { id:"burpees", icon:"🔥", name:"Burpees",   desc:"Full body"  },
  { id:"squats",  icon:"🦵", name:"Squats",    desc:"Legs day"   },
  { id:"plank",   icon:"🧘", name:"Plank",     desc:"Core"       },
  { id:"custom",  icon:"✏️", name:"Custom",   desc:"Your choice" },
];

const DEADLINES = [
  { label:"24 hours", hours:24 },
  { label:"48 hours", hours:48 },
  { label:"72 hours", hours:72 },
  { label:"1 week",   hours:168 },
];

export default function CreateBet({ user }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const prefilled = location.state?.opponent;

  const [step,         setStep]         = useState(1);
  const [desc,         setDesc]         = useState("");
  const [forfeit,      setForfeit]      = useState(null);
  const [reps,         setReps]         = useState("");
  const [opponentEmail,setOpponentEmail]= useState(prefilled?.email||"");
  const [opponentName, setOpponentName] = useState(prefilled?.displayName||"");
  const [opponentUid,  setOpponentUid]  = useState(prefilled?.uid||"");
  const [deadlineHrs,  setDeadlineHrs]  = useState(48);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const canNext1 = desc.trim().length > 5;
  const canNext2 = forfeit && reps;
  const canSubmit = opponentEmail.includes("@");

  const QUICK = [
    "My team wins tonight",
    "I finish this workout",
    "I wake up before 7am",
    "I don't eat junk food today",
  ];

  /* ── Send a rich challenge message in chat ── */
  const sendChallengeMessage = async (betId) => {
    if (!opponentUid) return;
    try {
      const convoId = [user.uid, opponentUid].sort().join("_");
      const convoRef = doc(db,"conversations",convoId);
      const convoSnap = await getDoc(convoRef);

      // Create conversation if it doesn't exist
      if (!convoSnap.exists()) {
        await setDoc(convoRef, {
          participants:     [user.uid, opponentUid],
          participantNames: { [user.uid]:user.displayName, [opponentUid]:opponentName },
          participantPhotos:{ [user.uid]:user.photoURL||null },
          lastMessage:      "",
          lastMessageAt:    serverTimestamp(),
          unreadCount:      { [user.uid]:0, [opponentUid]:1 },
          createdAt:        serverTimestamp(),
        });
      }

      // Send the challenge card message
      const forfeitObj = FORFEITS.find(f=>f.id===forfeit);
      await addDoc(collection(db,"conversations",convoId,"messages"), {
        type:        "challenge",   // special type — renders as a card
        senderId:    user.uid,
        senderName:  user.displayName,
        senderPhoto: user.photoURL||null,
        betId,
        betDescription: desc.trim(),
        forfeitIcon:    forfeitObj?.icon||"💪",
        forfeitName:    forfeitObj?.name||forfeit,
        reps,
        deadlineHours:  deadlineHrs,
        text: `⚔️ ${user.displayName} challenged you to a bet!\n"${desc.trim()}"\nForfeit: ${forfeitObj?.icon} ${reps} ${forfeitObj?.name}`,
        createdAt:   serverTimestamp(),
        read:        false,
      });

      // Update conversation last message
      await setDoc(convoRef, {
        lastMessage:   `⚔️ ${user.displayName} challenged you!`,
        lastMessageAt: serverTimestamp(),
        unreadCount:   { [user.uid]:0, [opponentUid]:1 },
      }, { merge:true });

    } catch(e) { console.error("sendChallengeMessage error:", e); }
  };

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const deadline = new Date(Date.now() + deadlineHrs*3600000);
      const betRef = await addDoc(collection(db,"bets"), {
        description:    desc.trim(),
        forfeit,
        reps,
        createdBy:      user.uid,
        createdByName:  user.displayName,
        createdByEmail: user.email,
        betCreatedBy:   user.uid,
        opponentEmail,
        opponentUid:    opponentUid||null,
        status:         "pending",
        deadline:       deadline,
        createdAt:      serverTimestamp(),
        honourScore:    100,
      });

      // Auto-send challenge message in chat if opponent uid is known
      await sendChallengeMessage(betRef.id);

      navigate("/bets");
    } catch(e) {
      setError("Something went wrong. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"100px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" }}>
        <button type="button" onClick={()=>step>1?setStep(s=>s-1):navigate("/bets")}
          style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"50%", width:"44px", height:"44px", color:T.panel, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ←
        </button>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"26px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic", flex:1 }}>
          New Bet
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:T.textMuted }}>{step}/3</div>
      </div>

      {/* Progress bar */}
      <div style={{ height:"4px", background:T.border, margin:"0 16px 28px", borderRadius:"2px" }}>
        <div style={{ height:"100%", width:`${(step/3)*100}%`, background:T.accent, borderRadius:"2px", transition:"width 0.3s" }}/>
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* ── STEP 1 — The bet ── */}
        {step===1 && (
          <>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.panel, letterSpacing:"0.03em", marginBottom:"6px" }}>What's the bet?</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, marginBottom:"20px" }}>Be specific — make it clear who wins</div>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={4} maxLength={200}
              placeholder='e.g. "Lakers will beat Celtics by 10+ points"'
              style={{ width:"100%", background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"16px", padding:"16px", color:T.panel, fontSize:"16px", fontFamily:T.fontBody, outline:"none", resize:"none", lineHeight:"1.6" }}/>
            <div style={{ textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, marginTop:"6px" }}>{desc.length}/200</div>

            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", marginTop:"20px", marginBottom:"12px" }}>QUICK IDEAS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {QUICK.map(q=>(
                <div key={q} onClick={()=>setDesc(q)}
                  style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"20px", padding:"10px 16px", fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, cursor:"pointer" }}>
                  {q}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 2 — Forfeit ── */}
        {step===2 && (
          <>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.panel, letterSpacing:"0.03em", marginBottom:"6px" }}>Set the forfeit</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, marginBottom:"20px" }}>Loser films themselves doing this</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
              {FORFEITS.map(f=>(
                <div key={f.id} onClick={()=>setForfeit(f.id)}
                  style={{ background:forfeit===f.id?`${T.accent}15`:T.bg1, border:`${forfeit===f.id?2:1}px solid ${forfeit===f.id?T.accent:T.borderCard}`, borderRadius:"16px", padding:"18px", textAlign:"center", cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ fontSize:"32px", marginBottom:"8px" }}>{f.icon}</div>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:T.panel, letterSpacing:"0.04em" }}>{f.name}</div>
                  <div style={{ fontFamily:T.fontBody, fontSize:"12px", color:T.textMuted, marginTop:"3px" }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", marginBottom:"10px" }}>
              {forfeit==="run"?"DISTANCE (KM)":forfeit==="plank"?"DURATION (SECONDS)":"HOW MANY REPS?"}
            </div>
            <input type="number" value={reps} onChange={e=>setReps(e.target.value)} min="1"
              placeholder={forfeit==="run"?"e.g. 2":forfeit==="plank"?"e.g. 60":"e.g. 50"}
              style={{ width:"100%", background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"16px", padding:"16px", color:T.panel, fontSize:"16px", fontFamily:T.fontBody, outline:"none" }}/>
          </>
        )}

        {/* ── STEP 3 — Opponent + deadline ── */}
        {step===3 && (
          <>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.panel, letterSpacing:"0.03em", marginBottom:"6px" }}>Challenge someone</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, marginBottom:"20px" }}>
              They'll get a notification + a message in chat with all the details
            </div>

            {/* Find friends button */}
            <div onClick={()=>navigate("/friends",{state:{returnTo:"/create",betData:{desc,forfeit,reps,deadlineHrs}}})}
              style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}40`, borderRadius:"14px", padding:"14px 16px", marginBottom:"16px", cursor:"pointer", display:"flex", alignItems:"center", gap:"12px" }}>
              <span style={{ fontSize:"20px" }}>🔍</span>
              <div>
                <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.accent }}>Search for a friend</div>
                <div style={{ fontFamily:T.fontBody, fontSize:"12px", color:T.textMuted, marginTop:"2px" }}>Find by name or username</div>
              </div>
              <div style={{ marginLeft:"auto", color:T.accent, fontSize:"18px" }}>›</div>
            </div>

            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, textAlign:"center", marginBottom:"12px" }}>— or enter email directly —</div>

            {/* Pre-filled opponent */}
            {opponentName ? (
              <div style={{ background:T.bg1, border:`1px solid ${T.accent}60`, borderRadius:"14px", padding:"14px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:T.accent, flexShrink:0 }}>
                  {opponentName.charAt(0)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.panel }}>{opponentName}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:T.textMuted }}>{opponentEmail}</div>
                </div>
                <div style={{ color:"#10b981", fontSize:"20px" }}>✓</div>
              </div>
            ) : (
              <input type="email" value={opponentEmail} onChange={e=>setOpponentEmail(e.target.value)}
                placeholder="friend@gmail.com"
                style={{ width:"100%", background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"16px", padding:"16px", color:T.panel, fontSize:"16px", fontFamily:T.fontBody, outline:"none", marginBottom:"16px" }}/>
            )}

            {/* Deadline picker */}
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", marginBottom:"10px" }}>FORFEIT DEADLINE</div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
              {DEADLINES.map(d=>(
                <button key={d.hours} type="button" onClick={()=>setDeadlineHrs(d.hours)}
                  style={{ flex:1, padding:"10px 6px", background:deadlineHrs===d.hours?T.panel:"transparent", border:`1px solid ${deadlineHrs===d.hours?T.accent:T.borderCard}`, borderRadius:"12px", fontFamily:"'DM Mono',monospace", fontSize:"11px", color:deadlineHrs===d.hours?T.accent:T.textMuted, cursor:"pointer", transition:"all 0.2s" }}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div style={{ background:T.bg1, borderRadius:"20px", padding:"18px", border:`1px solid ${T.borderCard}`, marginBottom:"16px" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted, letterSpacing:"0.12em", marginBottom:"14px" }}>BET SUMMARY</div>
              {[
                { key:"The bet",   val:desc },
                { key:"Forfeit",   val:`${FORFEITS.find(f=>f.id===forfeit)?.icon||""} ${reps} ${forfeit||""}` },
                { key:"Deadline",  val:DEADLINES.find(d=>d.hours===deadlineHrs)?.label||"48 hours" },
                { key:"Stakes",    val:"Loser posts the proof 📹" },
              ].map(r=>(
                <div key={r.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px", gap:"16px" }}>
                  <span style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, flexShrink:0 }}>{r.key}</span>
                  <span style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.panel, textAlign:"right", lineHeight:"1.4" }}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Chat notice */}
            {opponentUid && (
              <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}30`, borderRadius:"12px", padding:"10px 14px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ fontSize:"16px" }}>💬</span>
                <span style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.accent }}>
                  A challenge card will be sent to <strong>{opponentName}</strong> in chat automatically
                </span>
              </div>
            )}

            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"12px", padding:"12px 16px", fontFamily:T.fontBody, color:"#ef4444", fontSize:"14px", marginBottom:"12px" }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom button */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", padding:"16px", background:`${T.bg0}f5`, borderTop:`1px solid ${T.border}`, paddingBottom:"calc(16px + env(safe-area-inset-bottom,0px))" }}>
        {step < 3 ? (
          <button type="button"
            disabled={step===1?!canNext1:!canNext2}
            onClick={()=>setStep(s=>s+1)}
            style={{ width:"100%", padding:"18px", background:T.accent, border:"none", borderRadius:"16px", fontFamily:T.fontDisplay, fontSize:"24px", letterSpacing:"0.06em", color:"#052e16", cursor:"pointer", opacity:(step===1?!canNext1:!canNext2)?0.4:1 }}>
            NEXT →
          </button>
        ) : (
          <button type="button"
            disabled={!canSubmit||loading}
            onClick={submit}
            style={{ width:"100%", padding:"18px", background:T.accent, border:"none", borderRadius:"16px", fontFamily:T.fontDisplay, fontSize:"24px", letterSpacing:"0.06em", color:"#052e16", cursor:"pointer", opacity:(!canSubmit||loading)?0.4:1 }}>
            {loading?"SENDING…":"SEND THE BET ⚔️"}
          </button>
        )}
      </div>
    </div>
  );
}