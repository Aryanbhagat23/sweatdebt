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

import { useLocation } from "react-router-dom";

export default function CreateBet({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledOpponent = location.state?.opponent;

  const [step, setStep] = useState(prefilledOpponent ? 2 : 1);
  const [betDesc, setBetDesc] = useState("");
  const [forfeit, setForfeit] = useState(null);
  const [reps, setReps] = useState("");
  const [opponentEmail, setOpponentEmail] = useState(prefilledOpponent?.email || "");
  const [opponentName, setOpponentName] = useState(prefilledOpponent?.displayName || "");

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
      {/* STEP 3 — Opponent */}
{step === 3 && (
  <div style={S.stepWrap}>
    <div style={S.stepTitle}>Challenge someone</div>
    <div style={S.stepSub}>Enter their email or search for friends</div>

    {/* Find friends button */}
    <div style={{
      background:"rgba(212,255,0,0.08)",
      border:"1px solid rgba(212,255,0,0.3)",
      borderRadius:"14px",padding:"14px 16px",
      marginBottom:"16px",cursor:"pointer",
      display:"flex",alignItems:"center",gap:"12px",
    }} onClick={()=>navigate("/friends")}>
      <span style={{fontSize:"20px"}}>🔍</span>
      <div>
        <div style={{fontSize:"15px",fontWeight:"500",color:"#d4ff00"}}>Search for a friend</div>
        <div style={{fontSize:"12px",color:"#666",marginTop:"2px"}}>Find users by name or username</div>
      </div>
      <div style={{marginLeft:"auto",color:"#d4ff00",fontSize:"18px"}}>›</div>
    </div>

    <div style={{fontSize:"12px",color:"#555",textAlign:"center",margin:"0 0 12px",fontFamily:"monospace"}}>— or enter email directly —</div>

    {/* Pre-filled opponent card */}
    {opponentName ? (
      <div style={{background:"#1a1a1a",border:"1px solid rgba(212,255,0,0.4)",borderRadius:"14px",padding:"14px 16px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",fontWeight:"700",color:"#000"}}>
          {opponentName.charAt(0)}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:"15px",fontWeight:"500",color:"#f5f0e8"}}>{opponentName}</div>
          <div style={{fontSize:"12px",color:"#666",fontFamily:"monospace"}}>{opponentEmail}</div>
        </div>
        <div style={{color:"#00e676",fontSize:"18px"}}>✓</div>
      </div>
    ):(
      <input
        style={S.input}
        type="email"
        placeholder="friend@gmail.com"
        value={opponentEmail}
        onChange={e=>setOpponentEmail(e.target.value)}
      />
    )}

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
  header:{display:"flex",alignItems:"center",gap:"12px",padding:"52px 16px 20px"},
  back:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"50%",width:"44px",height:"44px",color:"#f5f0e8",fontSize:"20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  title:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:"#f5f0e8",letterSpacing:"0.04em",flex:1},
  stepCount:{fontFamily:"'DM Mono',monospace",fontSize:"13px",color:"#555"},
  progressWrap:{height:"4px",background:"#222",margin:"0 16px 28px",borderRadius:"2px"},
  progressBar:{height:"100%",background:"#d4ff00",borderRadius:"2px",transition:"width 0.3s"},
  stepWrap:{padding:"0 16px"},
  stepTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:"#f5f0e8",letterSpacing:"0.03em",marginBottom:"8px"},
  stepSub:{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:"#666",marginBottom:"24px",lineHeight:"1.5"},
  textarea:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"16px",padding:"16px",color:"#f5f0e8",fontSize:"16px",fontFamily:"'DM Sans',sans-serif",outline:"none",resize:"none",lineHeight:"1.6"},
  charCount:{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#444",textAlign:"right",marginTop:"6px"},
  examplesLabel:{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"24px",marginBottom:"12px"},
  examples:{display:"flex",flexWrap:"wrap",gap:"8px"},
  examplePill:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"20px",padding:"10px 16px",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:"#888",cursor:"pointer",minHeight:"44px",display:"flex",alignItems:"center"},
  forfeitGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"24px"},
  forfeitOpt:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"16px",padding:"18px",textAlign:"center",cursor:"pointer",transition:"all 0.2s",minHeight:"100px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},
  forfeitSelected:{border:"2px solid #d4ff00",background:"rgba(212,255,0,0.05)"},
  forfeitIcon:{fontSize:"32px",marginBottom:"8px"},
  forfeitName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#f5f0e8",letterSpacing:"0.04em"},
  forfeitDesc:{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:"#666",marginTop:"3px"},
  repsLabel:{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"10px"},
  input:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"16px",padding:"16px",color:"#f5f0e8",fontSize:"16px",fontFamily:"'DM Sans',sans-serif",outline:"none",minHeight:"54px"},
  summary:{background:"#1a1a1a",borderRadius:"20px",padding:"20px",marginTop:"24px",border:"1px solid #333"},
  summaryLabel:{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:"#555",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"14px"},
  summaryRow:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px",gap:"16px"},
  summaryKey:{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:"#666",flexShrink:0},
  summaryVal:{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:"#f5f0e8",textAlign:"right",lineHeight:"1.4"},
  error:{background:"rgba(255,68,68,0.1)",border:"1px solid rgba(255,68,68,0.3)",borderRadius:"12px",padding:"12px 16px",fontFamily:"'DM Sans',sans-serif",color:"#ff4444",fontSize:"14px",marginTop:"14px"},
  bottomBtn:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",padding:"16px",background:"rgba(17,17,17,0.97)",borderTop:"1px solid #222",paddingBottom:"calc(16px + env(safe-area-inset-bottom))"},
  btn:{width:"100%",background:"#d4ff00",border:"none",borderRadius:"16px",padding:"18px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",letterSpacing:"0.06em",color:"#000",cursor:"pointer",minHeight:"58px"},
  friendList:{display:"flex",flexDirection:"column",gap:"10px"},
  friendItem:{display:"flex",alignItems:"center",gap:"14px",background:"#1a1a1a",border:"1px solid #333",borderRadius:"16px",padding:"16px",cursor:"pointer",transition:"border-color 0.2s",minHeight:"72px"},
  friendAv:{width:"46px",height:"46px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#000",flexShrink:0},
  friendName:{fontFamily:"'DM Sans',sans-serif",fontSize:"16px",fontWeight:"500",color:"#f5f0e8",flex:1},
  friendRecord:{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:"#555"},
  friendCheck:{width:"26px",height:"26px",borderRadius:"50%",border:"2px solid #444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"},
};