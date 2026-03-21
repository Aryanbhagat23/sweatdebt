import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847", bg4:"#1e3560",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  coral:"#ff6b4a", coralDim:"rgba(255,107,74,0.12)", coralBorder:"rgba(255,107,74,0.3)",
  green:"#00e676", greenDim:"rgba(0,230,118,0.12)", greenBorder:"rgba(0,230,118,0.3)",
  red:"#ff4d6d", redDim:"rgba(255,77,109,0.12)", redBorder:"rgba(255,77,109,0.3)",
  blue:"#4a9eff", blueDim:"rgba(74,158,255,0.12)",
  border0:"#1a2d4a", border1:"#1e3a5f", border2:"#2a4f7a",
  purple:"#a855f7",
};

export default function Bets({ user }) {
  const navigate = useNavigate();
  const [myBets, setMyBets] = useState([]);
  const [incomingBets, setIncomingBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");

  useEffect(() => {
    const q1 = query(collection(db,"bets"), where("createdBy","==",user.uid));
    const unsub1 = onSnapshot(q1, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setMyBets(data); setLoading(false);
    }, err=>{ console.error(err); setLoading(false); });

    const q2 = query(collection(db,"bets"), where("opponentEmail","==",user.email));
    const unsub2 = onSnapshot(q2, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setIncomingBets(data);
    }, err=>console.error(err));

    return ()=>{ unsub1(); unsub2(); };
  }, [user.uid, user.email]);

  const allBets = activeTab==="incoming" ? incomingBets : myBets;
  const won = myBets.filter(b=>b.status==="won").length;
  const lost = myBets.filter(b=>b.status==="lost").length;
  const active = [...myBets,...incomingBets].filter(b=>b.status==="pending"||b.status==="active").length;

  const forfeitIcons = { pushups:"💪", run:"🏃", burpees:"🔥", squats:"🦵", plank:"🧘", custom:"✏️" };

  const statusStyle = (status) => {
    if (status==="pending") return { background:C.coralDim, color:C.coral, border:`1px solid ${C.coralBorder}` };
    if (status==="active") return { background:C.cyanDim, color:C.cyan, border:`1px solid ${C.cyanBorder}` };
    if (status==="won") return { background:C.greenDim, color:C.green, border:`1px solid ${C.greenBorder}` };
    if (status==="lost") return { background:C.redDim, color:C.red, border:`1px solid ${C.redBorder}` };
    if (status==="proof_uploaded") return { background:C.blueDim, color:C.blue, border:`1px solid rgba(74,158,255,0.3)` };
    if (status==="disputed") return { background:C.redDim, color:C.red, border:`1px solid ${C.redBorder}` };
    return {};
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"36px",height:"36px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.muted}}>Loading bets...</div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>My <span style={{color:C.cyan}}>Bets</span></div>
      </div>

      {/* Stats */}
      <div style={S.stats}>
        {[
          {val:won, color:C.green, label:"WON"},
          {val:lost, color:C.red, label:"LOST"},
          {val:active, color:C.cyan, label:"ACTIVE"},
        ].map(s=>(
          <div key={s.label} style={S.stat}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",color:s.color,lineHeight:1}}>{s.val}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted,marginTop:"4px",letterSpacing:"0.1em"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <button style={S.primaryBtn} onClick={()=>navigate("/create")}>
        + PLACE NEW BET
      </button>
      <button style={S.secondaryBtn} onClick={()=>navigate("/friends")}>
        🔍 FIND FRIENDS
      </button>

      {/* Tabs */}
      <div style={S.tabRow}>
        <div style={{...S.tab,...(activeTab==="incoming"?S.tabActive:{})}} onClick={()=>setActiveTab("incoming")}>
          Challenges ({incomingBets.length})
        </div>
        <div style={{...S.tab,...(activeTab==="mine"?S.tabActive:{})}} onClick={()=>setActiveTab("mine")}>
          My Bets ({myBets.length})
        </div>
      </div>

      {activeTab==="incoming"&&incomingBets.length>0&&(
        <div style={S.notice}>
          ⚔️ {incomingBets.length} friend{incomingBets.length>1?"s have":" has"} challenged you!
        </div>
      )}

      {allBets.length===0 ? (
        <div style={S.empty}>
          <div style={{fontSize:"52px",marginBottom:"16px"}}>{activeTab==="incoming"?"📩":"⚔️"}</div>
          <div style={S.emptyTitle}>{activeTab==="incoming"?"No challenges yet":"No bets placed yet"}</div>
          <div style={S.emptySub}>{activeTab==="incoming"?"When friends challenge you, they appear here":"Challenge a friend to get started"}</div>
        </div>
      ) : (
        <div>
          {allBets.filter(b=>!["won","lost"].includes(b.status)).map(bet=>(
            <BetCard key={bet.id} bet={bet} user={user} forfeitIcons={forfeitIcons} statusStyle={statusStyle} isIncoming={activeTab==="incoming"}/>
          ))}
          {allBets.filter(b=>["won","lost"].includes(b.status)).length>0&&(
            <div style={S.sectionLabel}>Completed</div>
          )}
          {allBets.filter(b=>["won","lost"].includes(b.status)).map(bet=>(
            <BetCard key={bet.id} bet={bet} user={user} forfeitIcons={forfeitIcons} statusStyle={statusStyle} isIncoming={activeTab==="incoming"}/>
          ))}
        </div>
      )}
    </div>
  );
}

function BetCard({ bet, user, forfeitIcons, statusStyle, isIncoming }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const timeAgo = (ts) => {
    if (!ts) return "just now";
    const s = Math.floor((new Date()-ts.toDate())/1000);
    if (s<60) return "just now";
    if (s<3600) return `${Math.floor(s/60)}m ago`;
    if (s<86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const isHighlight = isIncoming && bet.status==="pending";
  const isWon = bet.status==="won";
  const isLost = bet.status==="lost";

  return (
    <div style={{
      margin:"0 16px 10px",
      background: isWon ? `${C.greenDim}` : isLost ? `${C.redDim}` : C.bg2,
      borderRadius:"20px",
      border: isHighlight ? `1px solid ${C.cyanBorder}` : isWon ? `1px solid ${C.greenBorder}` : isLost ? `1px solid ${C.redBorder}` : `1px solid ${C.border1}`,
      overflow:"hidden",
      transition:"transform 0.2s",
    }}>
      {/* Won/Lost banner */}
      {isWon&&<div style={{background:C.greenDim,padding:"8px 18px",borderBottom:`1px solid ${C.greenBorder}`}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",color:C.green,letterSpacing:"0.06em"}}>🏆 YOU WON THIS BET</span>
      </div>}
      {isLost&&<div style={{background:C.redDim,padding:"8px 18px",borderBottom:`1px solid ${C.redBorder}`}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",color:C.red,letterSpacing:"0.06em"}}>💀 YOU LOST — TIME TO SWEAT</span>
      </div>}

      <div style={{padding:"18px",cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
        {/* Top row */}
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px"}}>
          <div style={{
            width:"46px",height:"46px",borderRadius:"50%",
            background:`linear-gradient(135deg,${C.cyan},${C.purple})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:"#000",flexShrink:0,
          }}>
            {isIncoming ? bet.createdByName?.charAt(0).toUpperCase() : bet.opponentEmail?.charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"500",color:C.white}}>
              {isIncoming
                ? <><span style={{color:C.cyan,fontWeight:"700"}}>{bet.createdByName}</span> challenged you!</>
                : `vs ${bet.opponentEmail}`}
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,marginTop:"2px"}}>{timeAgo(bet.createdAt)}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{...statusStyle(bet.status),fontFamily:"'DM Mono',monospace",fontSize:"10px",fontWeight:"500",padding:"5px 10px",borderRadius:"20px",letterSpacing:"0.06em"}}>
              {bet.status==="proof_uploaded"?"PROOF SENT":bet.status?.toUpperCase()}
            </div>
            <div style={{fontSize:"12px",color:C.muted,transform:expanded?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s"}}>▼</div>
          </div>
        </div>

        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:"rgba(224,242,254,0.65)",lineHeight:"1.5",marginBottom:"12px"}}>
          "{bet.description}"
        </div>

        <div style={{background:C.bg3,borderRadius:"12px",padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted,letterSpacing:"0.1em"}}>FORFEIT IF YOU LOSE</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:C.coral,letterSpacing:"0.03em"}}>
            {forfeitIcons[bet.forfeit]||"💪"} {bet.reps} {bet.forfeit}
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded&&(
        <div style={{borderTop:`1px solid ${C.border1}`,padding:"14px 18px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px"}}>
            {[
              {label:"Created by",val:bet.createdByName||"You"},
              {label:"Opponent",val:bet.opponentEmail?.split("@")[0]},
              {label:"Activity",val:bet.forfeit},
              {label:"Reps",val:bet.reps},
            ].map(item=>(
              <div key={item.label} style={{background:C.bg3,borderRadius:"10px",padding:"10px 12px"}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted,letterSpacing:"0.08em",marginBottom:"3px"}}>{item.label.toUpperCase()}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:C.white,fontWeight:"500"}}>{item.val}</div>
              </div>
            ))}
          </div>

          {isIncoming&&bet.status==="pending"&&(
            <button style={{
              width:"100%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,
              border:"none",borderRadius:"12px",padding:"16px",
              fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.06em",
              color:"#000",cursor:"pointer",marginBottom:"8px",
            }} onClick={()=>navigate(`/upload/${bet.id}`)}>
              📹 UPLOAD FORFEIT PROOF
            </button>
          )}

          {bet.status==="proof_uploaded"&&!isIncoming&&(
            <div style={{background:C.blueDim,border:`1px solid rgba(74,158,255,0.3)`,borderRadius:"12px",padding:"12px 16px",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:C.blue,textAlign:"center"}}>
              ⏳ Waiting for opponent to approve...
            </div>
          )}

          {bet.proofUrl&&(
            <button style={{
              width:"100%",marginTop:"8px",background:"transparent",
              border:`1px solid ${C.border2}`,borderRadius:"12px",padding:"12px",
              fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.04em",
              color:C.muted,cursor:"pointer",
            }} onClick={()=>window.open(bet.proofUrl,"_blank")}>
              ▶ VIEW PROOF VIDEO
            </button>
          )}

          {(isWon||isLost)&&(
            <button style={{
              width:"100%",marginTop:"8px",background:"transparent",
              border:`1px solid ${C.cyanBorder}`,borderRadius:"12px",padding:"12px",
              fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.04em",
              color:C.cyan,cursor:"pointer",
            }} onClick={()=>navigate("/create")}>
              ⚔️ REMATCH
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:C.bg0, paddingBottom:"90px" },
  header:{ padding:"52px 16px 16px" },
  title:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color:C.white, letterSpacing:"0.03em" },
  stats:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", padding:"0 16px", marginBottom:"16px" },
  stat:{ background:C.bg2, borderRadius:"16px", padding:"16px", textAlign:"center", border:`1px solid ${C.border1}` },
  primaryBtn:{ margin:"0 16px 10px", width:"calc(100% - 32px)", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"18px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", minHeight:"58px" },
  secondaryBtn:{ margin:"0 16px 14px", width:"calc(100% - 32px)", background:"transparent", border:`1px solid ${C.border2}`, borderRadius:"16px", padding:"16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:C.cyan, cursor:"pointer", minHeight:"52px" },
  tabRow:{ display:"flex", margin:"0 16px 14px", background:C.bg2, borderRadius:"12px", padding:"4px", border:`1px solid ${C.border1}` },
  tab:{ flex:1, padding:"10px", textAlign:"center", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:"500", color:C.muted, borderRadius:"10px", cursor:"pointer", transition:"all 0.2s" },
  tabActive:{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, color:"#000" },
  notice:{ margin:"0 16px 12px", background:C.cyanDim, border:`1px solid ${C.cyanBorder}`, borderRadius:"12px", padding:"12px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.cyan, textAlign:"center" },
  sectionLabel:{ padding:"0 16px 10px 16px", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" },
  empty:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"56px 16px", textAlign:"center" },
  emptyTitle:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"26px", color:C.muted, letterSpacing:"0.04em", marginBottom:"8px" },
  emptySub:{ fontFamily:"'DM Sans',sans-serif", color:C.dim, fontSize:"14px", lineHeight:"1.5" },
};