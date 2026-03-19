import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const forfeits = [
  { id:"pushups", icon:"💪", name:"Pushups", desc:"Upper body" },
  { id:"run", icon:"🏃", name:"Run", desc:"GPS tracked" },
  { id:"burpees", icon:"🔥", name:"Burpees", desc:"Full body" },
  { id:"squats", icon:"🦵", name:"Squats", desc:"Legs day" },
  { id:"plank", icon:"🧘", name:"Plank", desc:"Core strength" },
  { id:"custom", icon:"✏️", name:"Custom", desc:"Your choice" },
];

export default function CreateBet({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [betDesc, setBetDesc] = useState("");
  const [forfeit, setForfeit] = useState(null);
  const [reps, setReps] = useState("");
  const [opponentEmail, setOpponentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canNext1 = betDesc.trim().length > 5;
  const canNext2 = forfeit && reps;
  const canSubmit = opponentEmail.includes("@");

  const submitBet = async () => {
    setLoading(true);
    setError("");
    try {
      await addDoc(collection(db, "bets"), {
        description: betDesc,
        forfeit: forfeit,
        reps: reps,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdByEmail: user.email,
        opponentEmail: opponentEmail,
        status: "pending",
        createdAt: serverTimestamp(),
        honourScore: 100,
      });
      navigate("/bets");
    } catch (e) {
      setError("Something went wrong. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.back} onClick={() => step > 1 ? setStep(step-1) : navigate("/bets")}>←</button>
        <div style={S.title}>New Bet</div>
        <div style={S.stepCount}>{step}/3</div>
      </div>

      {/* Progress bar */}
      <div style={S.progressWrap}>
        <div style={{...S.progressBar, width:`${(step/3)*100}%`}}/>
      </div>

      {/* STEP 1 — The bet */}
      {step === 1 && (
        <div style={S.stepWrap}>
          <div style={S.stepTitle}>What's the bet?</div>
          <div style={S.stepSub}>Be specific — "Liverpool will beat Man City" not just "football"</div>
          <textarea
            style={S.textarea}
            placeholder="e.g. 'Lakers will beat the Celtics by more than 10 points this Friday'"
            value={betDesc}
            onChange={e => setBetDesc(e.target.value)}
            rows={4}
          />
          <div style={S.charCount}>{betDesc.length} / 200</div>

          <div style={S.examplesLabel}>Quick ideas</div>
          <div style={S.examples}>
            {["My team wins tonight","I finish this workout","I wake up before 7am","I don't eat junk food today"].map(ex => (
              <div key={ex} style={S.examplePill} onClick={() => setBetDesc(ex)}>{ex}</div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — Forfeit */}
      {step === 2 && (
        <div style={S.stepWrap}>
          <div style={S.stepTitle}>Set the forfeit</div>
          <div style={S.stepSub}>Loser has to do this — on camera</div>

          <div style={S.forfeitGrid}>
            {forfeits.map(f => (
              <div
                key={f.id}
                style={{...S.forfeitOpt, ...(forfeit===f.id ? S.forfeitSelected : {})}}
                onClick={() => setForfeit(f.id)}
              >
                <div style={S.forfeitIcon}>{f.icon}</div>
                <div style={S.forfeitName}>{f.name}</div>
                <div style={S.forfeitDesc}>{f.desc}</div>
              </div>
            ))}
          </div>

          <div style={S.repsLabel}>
            {forfeit === "run" ? "Distance (km)" : forfeit === "plank" ? "Duration (seconds)" : "How many reps?"}
          </div>
          <input
            style={S.input}
            type="number"
            placeholder={forfeit === "run" ? "e.g. 2" : "e.g. 50"}
            value={reps}
            onChange={e => setReps(e.target.value)}
            min="1"
          />

          {forfeit === "custom" && (
            <input
              style={{...S.input, marginTop:"8px"}}
              placeholder="Describe the custom forfeit..."
              value={reps}
              onChange={e => setReps(e.target.value)}
            />
          )}
        </div>
      )}

      {/* STEP 3 — Opponent */}
      {step === 3 && (
        <div style={S.stepWrap}>
          <div style={S.stepTitle}>Challenge someone</div>
          <div style={S.stepSub}>Enter their email — they'll get a notification</div>

          <input
            style={S.input}
            type="email"
            placeholder="friend@gmail.com"
            value={opponentEmail}
            onChange={e => setOpponentEmail(e.target.value)}
          />

          {/* Bet summary */}
          <div style={S.summary}>
            <div style={S.summaryLabel}>BET SUMMARY</div>
            <div style={S.summaryRow}>
              <span style={S.summaryKey}>The bet</span>
              <span style={S.summaryVal}>{betDesc}</span>
            </div>
            <div style={S.summaryRow}>
              <span style={S.summaryKey}>Forfeit</span>
              <span style={S.summaryVal}>
                {forfeits.find(f=>f.id===forfeit)?.icon} {reps} {forfeits.find(f=>f.id===forfeit)?.name}
              </span>
            </div>
            <div style={S.summaryRow}>
              <span style={S.summaryKey}>Stakes</span>
              <span style={{...S.summaryVal, color:"#ff5c1a"}}>Loser posts the proof 📹</span>
            </div>
          </div>

          {error && <div style={S.error}>{error}</div>}
        </div>
      )}

      {/* Bottom button */}
      <div style={S.bottomBtn}>
        {step < 3 ? (
          <button
            style={{...S.btn, opacity: (step===1 ? canNext1 : canNext2) ? 1 : 0.4}}
            disabled={step===1 ? !canNext1 : !canNext2}
            onClick={() => setStep(step+1)}
          >
            NEXT →
          </button>
        ) : (
          <button
            style={{...S.btn, opacity: canSubmit && !loading ? 1 : 0.4}}
            disabled={!canSubmit || loading}
            onClick={submitBet}
          >
            {loading ? "SENDING..." : "SEND THE BET ⚔️"}
          </button>
        )}
      </div>
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"100px"},
  header:{display:"flex",alignItems:"center",gap:"12px",padding:"20px 20px 16px"},
  back:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"50%",width:"36px",height:"36px",color:"#f5f0e8",fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  title:{fontFamily:"sans-serif",fontSize:"22px",fontWeight:"700",color:"#f5f0e8",flex:1},
  stepCount:{fontFamily:"monospace",fontSize:"12px",color:"#555"},
  progressWrap:{height:"3px",background:"#222",margin:"0 20px 24px"},
  progressBar:{height:"100%",background:"#d4ff00",borderRadius:"2px",transition:"width 0.3s"},
  stepWrap:{padding:"0 20px"},
  stepTitle:{fontSize:"22px",fontWeight:"700",color:"#f5f0e8",marginBottom:"6px"},
  stepSub:{fontSize:"13px",color:"#666",marginBottom:"20px",lineHeight:"1.5"},
  textarea:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"12px",padding:"14px 16px",color:"#f5f0e8",fontSize:"15px",fontFamily:"sans-serif",outline:"none",resize:"none",lineHeight:"1.6"},
  charCount:{fontSize:"11px",color:"#444",textAlign:"right",marginTop:"6px",fontFamily:"monospace"},
  examplesLabel:{fontSize:"11px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"20px",marginBottom:"10px"},
  examples:{display:"flex",flexWrap:"wrap",gap:"8px"},
  examplePill:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"20px",padding:"8px 14px",fontSize:"12px",color:"#888",cursor:"pointer"},
  forfeitGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"20px"},
  forfeitOpt:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"12px",padding:"14px",textAlign:"center",cursor:"pointer",transition:"all 0.2s"},
  forfeitSelected:{border:"1px solid #d4ff00",background:"rgba(212,255,0,0.05)"},
  forfeitIcon:{fontSize:"26px",marginBottom:"6px"},
  forfeitName:{fontSize:"13px",fontWeight:"600",color:"#f5f0e8"},
  forfeitDesc:{fontSize:"11px",color:"#666",marginTop:"2px"},
  repsLabel:{fontSize:"11px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"},
  input:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"12px",padding:"14px 16px",color:"#f5f0e8",fontSize:"15px",fontFamily:"sans-serif",outline:"none"},
  summary:{background:"#1a1a1a",borderRadius:"16px",padding:"16px",marginTop:"20px",border:"1px solid #333"},
  summaryLabel:{fontSize:"10px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px",fontFamily:"monospace"},
  summaryRow:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px",gap:"12px"},
  summaryKey:{fontSize:"12px",color:"#666",flexShrink:0},
  summaryVal:{fontSize:"13px",color:"#f5f0e8",textAlign:"right",lineHeight:"1.4"},
  error:{background:"rgba(255,68,68,0.1)",border:"1px solid rgba(255,68,68,0.3)",borderRadius:"8px",padding:"10px 14px",color:"#ff4444",fontSize:"13px",marginTop:"12px"},
  bottomBtn:{position:"fixed",bottom:"0",left:"0",right:"0",padding:"16px 20px",background:"rgba(17,17,17,0.95)",borderTop:"1px solid #222"},
  btn:{width:"100%",background:"#d4ff00",border:"none",borderRadius:"12px",padding:"16px",fontSize:"18px",fontWeight:"700",color:"#000",cursor:"pointer"},
};