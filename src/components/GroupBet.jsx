import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, onSnapshot, query, where,
  doc, updateDoc, arrayUnion, serverTimestamp, getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";

const FORFEITS = [
  { id:"pushups", icon:"💪", name:"Pushups" },
  { id:"run",     icon:"🏃", name:"Run"     },
  { id:"burpees", icon:"🔥", name:"Burpees" },
  { id:"squats",  icon:"🦵", name:"Squats"  },
  { id:"plank",   icon:"🧘", name:"Plank"   },
  { id:"custom",  icon:"✏️", name:"Custom"  },
];

/* ── CreateGroupBet — full screen flow ── */
export function CreateGroupBet({ user, onClose }) {
  const navigate = useNavigate();
  const [step,      setStep]      = useState(1);
  const [desc,      setDesc]      = useState("");
  const [forfeit,   setForfeit]   = useState(null);
  const [reps,      setReps]      = useState("");
  const [friends,   setFriends]   = useState([]);
  const [selected,  setSelected]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db,"users",user.uid,"friends"));
        setFriends(snap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){}
      setLoading(false);
    };
    load();
  }, [user.uid]);

  const toggleFriend = id => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  };

  const create = async () => {
    if (!desc.trim()||!forfeit||!reps||selected.length<2) return;
    setSaving(true);
    try {
      const selectedFriends = friends.filter(f=>selected.includes(f.id));
      await addDoc(collection(db,"groupBets"), {
        description:   desc.trim(),
        forfeit,
        reps,
        createdBy:     user.uid,
        createdByName: user.displayName,
        createdByEmail:user.email,
        participants:  [
          { uid:user.uid, name:user.displayName, email:user.email, status:"accepted" },
          ...selectedFriends.map(f=>({ uid:f.uid||f.id, name:f.displayName, email:f.email, status:"pending" })),
        ],
        lastCompleted: null,
        winner:        null,
        status:        "active",
        createdAt:     serverTimestamp(),
      });
      onClose();
      navigate("/bets");
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  return (
    <>
      <style>{`@keyframes _gsu{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:3000}} onClick={onClose}/>
      <div style={{position:"fixed",bottom:0,left:"50%",width:"100%",maxWidth:"480px",background:T.bg0,borderRadius:"24px 24px 0 0",zIndex:3001,animation:"_gsu 0.35s cubic-bezier(0.32,0.72,0,1) forwards",maxHeight:"90vh",overflowY:"auto",paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:"36px",height:"4px",background:T.border,borderRadius:"2px",margin:"12px auto 0"}}/>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px 8px"}}>
          <div style={{fontFamily:T.fontDisplay,fontSize:"24px",color:T.panel,letterSpacing:"0.04em",fontStyle:"italic"}}>
            Group Bet <span style={{color:T.accent}}>{step}/3</span>
          </div>
          <button type="button" onClick={onClose} style={{background:T.bg1,border:"none",borderRadius:"50%",width:"32px",height:"32px",color:T.textMuted,fontSize:"14px",cursor:"pointer"}}>✕</button>
        </div>

        {/* Progress */}
        <div style={{height:"3px",background:T.border,margin:"0 20px 20px"}}>
          <div style={{height:"100%",width:`${(step/3)*100}%`,background:T.accent,borderRadius:"2px",transition:"width 0.3s"}}/>
        </div>

        <div style={{padding:"0 20px"}}>
          {/* Step 1 — Description */}
          {step===1 && (
            <>
              <div style={{fontFamily:T.fontDisplay,fontSize:"24px",color:T.panel,letterSpacing:"0.03em",marginBottom:"6px"}}>What's the bet?</div>
              <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.textMuted,marginBottom:"16px"}}>Last person to complete loses and owes everyone</div>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder='e.g. "Who finishes 100 pushups last?"' maxLength={200}
                style={{width:"100%",background:T.bg1,border:`1px solid ${T.borderCard}`,borderRadius:"14px",padding:"14px",color:T.panel,fontSize:"16px",fontFamily:T.fontBody,outline:"none",resize:"none",lineHeight:"1.5",minHeight:"100px"}}/>
              <div style={{textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:"11px",color:T.textMuted,marginTop:"4px"}}>{desc.length}/200</div>
            </>
          )}

          {/* Step 2 — Forfeit */}
          {step===2 && (
            <>
              <div style={{fontFamily:T.fontDisplay,fontSize:"24px",color:T.panel,letterSpacing:"0.03em",marginBottom:"6px"}}>Set the forfeit</div>
              <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.textMuted,marginBottom:"16px"}}>Last to finish owes this to everyone else</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"16px"}}>
                {FORFEITS.map(f=>(
                  <div key={f.id} onClick={()=>setForfeit(f.id)}
                    style={{background:forfeit===f.id?`${T.accent}15`:T.bg1,border:`${forfeit===f.id?2:1}px solid ${forfeit===f.id?T.accent:T.borderCard}`,borderRadius:"14px",padding:"16px",textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}>
                    <div style={{fontSize:"28px",marginBottom:"6px"}}>{f.icon}</div>
                    <div style={{fontFamily:T.fontDisplay,fontSize:"16px",color:T.panel,letterSpacing:"0.04em"}}>{f.name}</div>
                  </div>
                ))}
              </div>
              <input type="number" value={reps} onChange={e=>setReps(e.target.value)} placeholder="How many reps?" min="1"
                style={{width:"100%",background:T.bg1,border:`1px solid ${T.borderCard}`,borderRadius:"14px",padding:"14px",color:T.panel,fontSize:"16px",fontFamily:T.fontBody,outline:"none"}}/>
            </>
          )}

          {/* Step 3 — Pick friends */}
          {step===3 && (
            <>
              <div style={{fontFamily:T.fontDisplay,fontSize:"24px",color:T.panel,letterSpacing:"0.03em",marginBottom:"6px"}}>Pick your group</div>
              <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.textMuted,marginBottom:"16px"}}>Need at least 2 friends (3+ total including you)</div>
              {loading ? (
                <div style={{textAlign:"center",padding:"24px",color:T.textMuted}}>Loading friends…</div>
              ) : friends.length===0 ? (
                <div style={{textAlign:"center",padding:"24px",color:T.textMuted}}>Add friends first to create group bets</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
                  {friends.map(f=>{
                    const sel = selected.includes(f.id);
                    return (
                      <div key={f.id} onClick={()=>toggleFriend(f.id)}
                        style={{display:"flex",alignItems:"center",gap:"14px",background:sel?`${T.accent}10`:T.bg1,border:`1px solid ${sel?T.accent:T.borderCard}`,borderRadius:"16px",padding:"14px",cursor:"pointer",transition:"all 0.2s"}}>
                        {f.photoURL
                          ? <img src={f.photoURL} alt="" style={{width:"42px",height:"42px",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                          : <div style={{width:"42px",height:"42px",borderRadius:"50%",background:T.panel,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"18px",color:T.accent,flexShrink:0}}>{f.displayName?.charAt(0)||"?"}</div>
                        }
                        <div style={{flex:1}}>
                          <div style={{fontFamily:T.fontBody,fontSize:"15px",fontWeight:"600",color:T.panel}}>{f.displayName}</div>
                          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:T.textMuted}}>@{f.username||f.displayName?.toLowerCase().replace(/\s/g,"")}</div>
                        </div>
                        <div style={{width:"26px",height:"26px",borderRadius:"50%",background:sel?T.accent:"transparent",border:`2px solid ${sel?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:"#052e16",flexShrink:0}}>
                          {sel?"✓":""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{background:T.bg1,borderRadius:"14px",padding:"14px",marginBottom:"16px",border:`1px solid ${T.borderCard}`}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:T.textMuted,letterSpacing:"0.1em",marginBottom:"10px"}}>GROUP SUMMARY</div>
                <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.panel,marginBottom:"6px"}}>"{desc}"</div>
                <div style={{fontFamily:T.fontDisplay,fontSize:"16px",color:"#f97316"}}>
                  {FORFEITS.find(f=>f.id===forfeit)?.icon} {reps} {forfeit}
                </div>
                <div style={{fontFamily:T.fontBody,fontSize:"13px",color:T.textMuted,marginTop:"6px"}}>
                  {1+selected.length} participants · last to finish loses
                </div>
              </div>
            </>
          )}

          {/* Bottom button */}
          <div style={{paddingBottom:"8px"}}>
            {step<3 ? (
              <button type="button"
                disabled={step===1?!desc.trim():!(forfeit&&reps)}
                onClick={()=>setStep(s=>s+1)}
                style={{width:"100%",padding:"16px",background:T.accent,border:"none",borderRadius:"14px",fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.06em",color:"#052e16",cursor:"pointer",opacity:(step===1?!desc.trim():!(forfeit&&reps))?0.4:1}}>
                NEXT →
              </button>
            ):(
              <button type="button"
                disabled={selected.length<2||saving}
                onClick={create}
                style={{width:"100%",padding:"16px",background:T.accent,border:"none",borderRadius:"14px",fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.06em",color:"#052e16",cursor:"pointer",opacity:(selected.length<2||saving)?0.4:1}}>
                {saving?"CREATING…":"🤝 CREATE GROUP BET"}
              </button>
            )}
            {step>1&&<button type="button" onClick={()=>setStep(s=>s-1)} style={{width:"100%",marginTop:"8px",padding:"12px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:"14px",fontFamily:T.fontBody,fontSize:"15px",color:T.textMuted,cursor:"pointer"}}>← Back</button>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── GroupBetCard — shows a group bet in the bets list ── */
export function GroupBetCard({ bet, currentUser }) {
  const navigate  = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const me = bet.participants?.find(p=>p.uid===currentUser?.uid);
  const completed = bet.participants?.filter(p=>p.status==="completed")||[];
  const pending   = bet.participants?.filter(p=>p.status!=="completed"&&p.status!=="lost")||[];

  const handleComplete = async () => {
    try {
      const updated = bet.participants.map(p =>
        p.uid===currentUser.uid ? {...p,status:"completed",completedAt:new Date()} : p
      );
      // last one to complete loses
      const stillPending = updated.filter(p=>p.status!=="completed");
      await updateDoc(doc(db,"groupBets",bet.id),{
        participants: updated,
        ...(stillPending.length===1 ? { lastCompleted:currentUser.uid, status:"finished" } : {}),
      });
    } catch(e){ console.error(e); }
  };

  return (
    <div style={{marginBottom:"10px",background:T.bg1,borderRadius:"20px",border:`1px solid ${T.borderCard}`,overflow:"hidden"}}>
      {/* Group badge */}
      <div style={{background:`${T.accent}20`,borderBottom:`1px solid ${T.accent}30`,padding:"5px 16px",display:"flex",alignItems:"center",gap:"6px"}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",fontWeight:"700",color:T.accent,letterSpacing:"0.1em"}}>👥 GROUP BET · {bet.participants?.length||0} PEOPLE</span>
      </div>

      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
        <div style={{fontFamily:T.fontBody,fontSize:"15px",color:T.panel,fontWeight:"600",marginBottom:"8px"}}>"{bet.description}"</div>

        {/* Participant avatars */}
        <div style={{display:"flex",alignItems:"center",gap:"0",marginBottom:"10px"}}>
          {bet.participants?.slice(0,5).map((p,i)=>(
            <div key={p.uid} style={{width:"32px",height:"32px",borderRadius:"50%",background:p.status==="completed"?T.accent:T.panel,border:`2px solid ${T.bg1}`,marginLeft:i?"-8px":0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"13px",color:p.status==="completed"?"#052e16":T.accent,zIndex:10-i,position:"relative"}}>
              {p.status==="completed"?"✓":p.name?.charAt(0)||"?"}
            </div>
          ))}
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:T.textMuted,marginLeft:"10px"}}>
            {completed.length}/{bet.participants?.length||0} done
          </span>
        </div>

        {/* Forfeit */}
        <div style={{background:T.bg0,borderRadius:"10px",padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:T.textMuted,letterSpacing:"0.08em"}}>LOSER'S FORFEIT</span>
          <span style={{fontFamily:T.fontDisplay,fontSize:"16px",color:"#f97316"}}>
            {bet.reps} {bet.forfeit}
          </span>
        </div>
      </div>

      {/* My action */}
      {me && me.status==="accepted" && (
        <div style={{padding:"0 16px 14px"}}>
          <button type="button" onClick={()=>navigate(`/upload/${bet.id}`)}
            style={{width:"100%",padding:"12px",background:T.accent,border:"none",borderRadius:"12px",fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.04em",color:"#052e16",cursor:"pointer"}}>
            📹 MARK AS COMPLETE
          </button>
        </div>
      )}
      {me && me.status==="completed" && (
        <div style={{padding:"0 16px 14px",fontFamily:T.fontBody,fontSize:"13px",color:"#10b981",textAlign:"center"}}>✓ You completed this — waiting for others</div>
      )}
    </div>
  );
}

/* ── GroupBetsList — load and show all group bets ── */
export function GroupBetsList({ user }) {
  const [groupBets, setGroupBets] = useState([]);
  useEffect(()=>{
    const q = query(collection(db,"groupBets"),where("participants","array-contains",{uid:user.uid,name:user.displayName,email:user.email,status:"accepted"}));
    // Simpler: just get all and filter client-side since array-contains with objects is tricky
    const unsub = onSnapshot(collection(db,"groupBets"), snap=>{
      const all = snap.docs.map(d=>({id:d.id,...d.data()}));
      setGroupBets(all.filter(b=>b.participants?.some(p=>p.uid===user.uid)));
    });
    return ()=>unsub();
  },[user.uid]);

  if (!groupBets.length) return null;
  return (
    <div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:T.textMuted,letterSpacing:"0.1em",padding:"0 0 10px"}}>GROUP BETS</div>
      {groupBets.map(bet=><GroupBetCard key={bet.id} bet={bet} currentUser={user}/>)}
    </div>
  );
}