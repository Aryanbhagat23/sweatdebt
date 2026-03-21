import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  coral:"#ff6b4a", green:"#00e676", red:"#ff4d6d",
  border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7",
};

const FORFEITS = [
  { key:"pushups", icon:"💪", name:"Push-ups", desc:"Upper body burn" },
  { key:"run", icon:"🏃", name:"Run", desc:"Cardio punishment" },
  { key:"burpees", icon:"🔥", name:"Burpees", desc:"Full body hell" },
  { key:"squats", icon:"🦵", name:"Squats", desc:"Leg day special" },
  { key:"plank", icon:"🧘", name:"Plank", desc:"Core torture" },
  { key:"custom", icon:"✏️", name:"Custom", desc:"Your own forfeit" },
];

const EXAMPLES = [
  "I'll hit the gym every day this week",
  "I can beat you in a 5k run",
  "I'll finish this project before Friday",
  "I won't eat junk food for 7 days",
  "I can do more pullups than you",
];

export default function CreateBet({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledOpponent = location.state?.opponent;

  const [step, setStep] = useState(1);
  const [betDesc, setBetDesc] = useState("");
  const [forfeit, setForfeit] = useState(null);
  const [reps, setReps] = useState("");
  const [opponentEmail, setOpponentEmail] = useState(prefilledOpponent?.email || "");
  const [opponentName, setOpponentName] = useState(prefilledOpponent?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentFriends, setRecentFriends] = useState([]);

  // Load friends for quick select
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db,"users",user.uid,"friends")).then(snap=>{
      setRecentFriends(snap.docs.map(d=>({id:d.id,...d.data()})).slice(0,5));
    }).catch(()=>{});
  }, [user]);

  const totalSteps = 3;
  const progress = (step/totalSteps)*100;

  const canNext = () => {
    if (step===1) return betDesc.trim().length>=5;
    if (step===2) return forfeit&&reps;
    if (step===3) return opponentEmail.trim().length>0;
    return false;
  };

  const handleSubmit = async () => {
    if (!opponentEmail.trim()) { setError("Please enter opponent email"); return; }
    setLoading(true);
    setError("");
    try {
      await addDoc(collection(db,"bets"),{
        description: betDesc.trim(),
        forfeit,
        reps,
        opponentEmail: opponentEmail.trim().toLowerCase(),
        opponentName: opponentName||opponentEmail.split("@")[0],
        createdBy: user.uid,
        createdByName: user.displayName,
        createdByEmail: user.email,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      navigate("/bets");
    } catch(e) {
      setError("Failed to create bet. Please try again.");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.back} onClick={()=>step>1?setStep(step-1):navigate("/bets")}>←</button>
        <div style={S.title}>New <span style={{color:C.cyan}}>Bet</span></div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"13px",color:C.muted}}>{step}/{totalSteps}</div>
      </div>

      {/* Progress bar */}
      <div style={S.progressWrap}>
        <div style={{...S.progressBar,width:`${progress}%`}}/>
      </div>

      <div style={S.content}>
        {/* STEP 1 — Bet description */}
        {step===1&&(
          <div>
            <div style={S.stepTitle}>What's <span style={{color:C.cyan}}>the bet?</span></div>
            <div style={S.stepSub}>Describe what you're betting on. Be specific!</div>
            <textarea
              style={S.textarea}
              value={betDesc}
              onChange={e=>setBetDesc(e.target.value)}
              placeholder="e.g. I'll run 5km under 25 minutes this Sunday..."
              rows={4}
              maxLength={200}
            />
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,textAlign:"right",marginTop:"6px"}}>
              {betDesc.length}/200
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"24px",marginBottom:"12px"}}>
              Quick ideas
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
              {EXAMPLES.map(ex=>(
                <div key={ex} style={{
                  background:C.bg2,border:`1px solid ${C.border1}`,
                  borderRadius:"20px",padding:"10px 16px",
                  fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.muted,
                  cursor:"pointer",transition:"all 0.2s",
                }} onClick={()=>setBetDesc(ex)}>{ex}</div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Forfeit */}
        {step===2&&(
          <div>
            <div style={S.stepTitle}>Choose the <span style={{color:C.coral}}>forfeit</span></div>
            <div style={S.stepSub}>What does the loser have to do?</div>
            <div style={S.forfeitGrid}>
              {FORFEITS.map(f=>(
                <div key={f.key} style={{
                  ...S.forfeitOpt,
                  border:forfeit===f.key?`2px solid ${C.cyan}`:`1px solid ${C.border1}`,
                  background:forfeit===f.key?C.cyanDim:C.bg2,
                  transform:forfeit===f.key?"scale(1.02)":"scale(1)",
                }} onClick={()=>setForfeit(f.key)}>
                  <div style={{fontSize:"32px",marginBottom:"8px"}}>{f.icon}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:forfeit===f.key?C.cyan:C.white,letterSpacing:"0.04em"}}>{f.name}</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",color:C.muted,marginTop:"3px"}}>{f.desc}</div>
                </div>
              ))}
            </div>

            {forfeit&&(
              <div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"10px"}}>
                  {forfeit==="run"?"DISTANCE (KM)":forfeit==="plank"?"DURATION (SEC)":"NUMBER OF REPS"}
                </div>
                <input
                  style={S.input}
                  type="number"
                  placeholder={forfeit==="run"?"e.g. 5":forfeit==="plank"?"e.g. 60":"e.g. 20"}
                  value={reps}
                  onChange={e=>setReps(e.target.value)}
                  min="1"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Opponent */}
        {step===3&&(
          <div>
            <div style={S.stepTitle}>Challenge <span style={{color:C.purple}}>someone</span></div>
            <div style={S.stepSub}>Who are you betting against?</div>

            {/* Find friends button */}
            <div style={{
              background:C.cyanDim,border:`1px solid ${C.cyanBorder}`,
              borderRadius:"14px",padding:"14px 16px",marginBottom:"16px",
              cursor:"pointer",display:"flex",alignItems:"center",gap:"12px",
            }} onClick={()=>navigate("/friends",{state:{returnTo:"/create",bet:{description:betDesc,forfeit,reps}}})}>
              <span style={{fontSize:"20px"}}>🔍</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"500",color:C.cyan}}>Search for a friend</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.muted,marginTop:"2px"}}>Find users by name or @username</div>
              </div>
              <div style={{color:C.cyan,fontSize:"18px"}}>›</div>
            </div>

            {/* Recent friends */}
            {recentFriends.length>0&&(
              <>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"10px"}}>
                  Recent Friends
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
                  {recentFriends.map(f=>(
                    <div key={f.id} style={{
                      display:"flex",alignItems:"center",gap:"14px",
                      background:opponentEmail===f.email?C.cyanDim:C.bg2,
                      border:opponentEmail===f.email?`1px solid ${C.cyanBorder}`:`1px solid ${C.border1}`,
                      borderRadius:"14px",padding:"14px",cursor:"pointer",
                    }} onClick={()=>{ setOpponentEmail(f.email); setOpponentName(f.displayName); }}>
                      {f.photoURL?(
                        <img src={f.photoURL} alt="" style={{width:"40px",height:"40px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.border2}`,flexShrink:0}}/>
                      ):(
                        <div style={{width:"40px",height:"40px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",color:"#000",flexShrink:0}}>
                          {f.displayName?.charAt(0)||"?"}
                        </div>
                      )}
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"500",color:C.white}}>{f.displayName}</div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted}}>{f.email}</div>
                      </div>
                      {opponentEmail===f.email&&<div style={{color:C.green,fontSize:"18px"}}>✓</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,textAlign:"center",marginBottom:"12px",letterSpacing:"0.06em"}}>
              — or enter email directly —
            </div>

            {/* Pre-filled from search */}
            {opponentName?(
              <div style={{background:C.bg2,border:`1px solid ${C.cyanBorder}`,borderRadius:"14px",padding:"14px 16px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"40px",height:"40px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",color:"#000",flexShrink:0}}>
                  {opponentName.charAt(0)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"500",color:C.white}}>{opponentName}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.muted}}>{opponentEmail}</div>
                </div>
                <div style={{color:C.green,fontSize:"20px"}}>✓</div>
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

            {/* Summary */}
            <div style={S.summary}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"14px"}}>BET SUMMARY</div>
              {[
                {label:"Bet",val:betDesc},
                {label:"Forfeit",val:`${FORFEITS.find(f=>f.key===forfeit)?.icon||""} ${reps} ${forfeit}`},
                {label:"Challenging",val:opponentName||opponentEmail||"—"},
              ].map(r=>(
                <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px",gap:"16px"}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:C.muted,flexShrink:0}}>{r.label}</div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:C.white,textAlign:"right",lineHeight:"1.4"}}>{r.val}</div>
                </div>
              ))}
            </div>

            {error&&(
              <div style={{background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.3)",borderRadius:"12px",padding:"12px 16px",fontFamily:"'DM Sans',sans-serif",color:C.red,fontSize:"14px",marginTop:"14px"}}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div style={S.bottomBtn}>
        {step<3?(
          <button
            style={{...S.btn, opacity:canNext()?1:0.4}}
            disabled={!canNext()}
            onClick={()=>setStep(step+1)}
          >
            NEXT →
          </button>
        ):(
          <button
            style={{...S.btn, opacity:loading||!canNext()?0.5:1}}
            disabled={loading||!canNext()}
            onClick={handleSubmit}
          >
            {loading?"SENDING...":`⚔️ SEND CHALLENGE`}
          </button>
        )}
      </div>
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:C.bg0, paddingBottom:"100px" },
  header:{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" },
  back:{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  title:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em", flex:1 },
  progressWrap:{ height:"3px", background:C.bg2, margin:"0 16px 28px", borderRadius:"2px" },
  progressBar:{ height:"100%", background:`linear-gradient(90deg,${C.cyan},${C.purple})`, borderRadius:"2px", transition:"width 0.4s ease" },
  content:{ padding:"0 16px" },
  stepTitle:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:C.white, letterSpacing:"0.03em", marginBottom:"8px" },
  stepSub:{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:C.muted, marginBottom:"24px", lineHeight:"1.5" },
  textarea:{ width:"100%", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"16px", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif", outline:"none", resize:"none", lineHeight:"1.6" },
  forfeitGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"24px" },
  forfeitOpt:{ background:C.bg2, borderRadius:"16px", padding:"18px", textAlign:"center", cursor:"pointer", transition:"all 0.2s", minHeight:"110px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
  input:{ width:"100%", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 16px", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif", outline:"none", minHeight:"52px" },
  summary:{ background:C.bg2, borderRadius:"20px", padding:"20px", marginTop:"20px", border:`1px solid ${C.border1}` },
  bottomBtn:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", padding:"16px", background:`rgba(7,13,26,0.97)`, borderTop:`1px solid ${C.border1}`, paddingBottom:"calc(16px + env(safe-area-inset-bottom))", zIndex:100 },
  btn:{ width:"100%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"18px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", minHeight:"58px" },
};