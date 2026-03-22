import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  coral:"#ff6b4a", green:"#00e676", red:"#ff4d6d",
  border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7",
};

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("winRate");
  const [lastUpdated, setLastUpdated] = useState(null);

  // REAL TIME scores
  useEffect(() => {
    const unsub = onSnapshot(collection(db,"users"), snap=>{
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      setUsers(data);
      setLastUpdated(new Date());
      setLoading(false);
    }, err=>{ console.error(err); setLoading(false); });
    return ()=>unsub();
  }, []);

  const filters = [
    {key:"winRate", label:"Win Rate"},
    {key:"wins", label:"Most Wins"},
    {key:"honour", label:"Honour"},
    {key:"active", label:"Most Active"},
  ];

  // Sort: active players first (have bets), then by selected filter
  // Players with zero bets go to bottom
  const sorted = [...users].sort((a,b)=>{
    const aT=(a.wins||0)+(a.losses||0);
    const bT=(b.wins||0)+(b.losses||0);

    // Anyone with bets ranks above those with zero
    if (aT===0 && bT>0) return 1;
    if (bT===0 && aT>0) return -1;
    // Both have zero — sort by honour
    if (aT===0 && bT===0) return (b.honour??100)-(a.honour??100);

    if (activeFilter==="winRate") {
      const aR=aT>0?(a.wins||0)/aT:0;
      const bR=bT>0?(b.wins||0)/bT:0;
      if (Math.abs(aR-bR)>0.001) return bR-aR;
      return bT-aT; // tiebreak: more bets wins
    }
    if (activeFilter==="wins") return (b.wins||0)-(a.wins||0);
    if (activeFilter==="honour") return (b.honour??100)-(a.honour??100);
    if (activeFilter==="active") return bT-aT;
    return 0;
  });

  const getScore = (u) => {
    const t=(u.wins||0)+(u.losses||0);
    if (activeFilter==="winRate") return t>0?`${Math.round((u.wins||0)/t*100)}%`:"—";
    if (activeFilter==="wins") return `${u.wins||0}`;
    if (activeFilter==="honour") return `${Math.max(0,u.honour??100)}`;
    return `${t}`;
  };

  const getScoreLabel = (u) => {
    const t=(u.wins||0)+(u.losses||0);
    if (t===0) return "NO BETS YET";
    if (activeFilter==="winRate") return "WIN RATE";
    if (activeFilter==="wins") return "WINS";
    if (activeFilter==="honour") return "HONOUR";
    return "BETS";
  };

  // Podium — only show top 3 who have played
  const podiumUsers = sorted.filter(u=>(u.wins||0)+(u.losses||0)>0).slice(0,3);
  const podiumOrder=[1,0,2]; // silver, gold, bronze positions
  const podiumHeights=[56,80,44];
  const podiumColors=[
    `linear-gradient(135deg,${C.cyan},${C.purple})`,
    `linear-gradient(135deg,#ffd700,#ffa500)`,
    `linear-gradient(135deg,#cd7f32,#8b4513)`,
  ];

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"36px",height:"36px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg0,paddingBottom:"90px"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Header */}
      <div style={{padding:"52px 16px 12px",display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",color:C.white,letterSpacing:"0.03em"}}>
          Leader<span style={{color:C.cyan}}>board</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"2px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.green}}>LIVE</span>
          </div>
          {lastUpdated&&(
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.dim}}>
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:"8px",padding:"0 16px",marginBottom:"20px",flexWrap:"wrap"}}>
        {filters.map(f=>(
          <div key={f.key} style={{padding:"8px 16px",borderRadius:"20px",fontFamily:"'DM Mono',monospace",fontSize:"12px",fontWeight:"500",cursor:"pointer",transition:"all 0.2s",minHeight:"40px",display:"flex",alignItems:"center",letterSpacing:"0.04em",background:activeFilter===f.key?`linear-gradient(135deg,${C.cyan},${C.purple})`:"transparent",color:activeFilter===f.key?"#000":C.muted,border:activeFilter===f.key?"none":`1px solid ${C.border1}`}} onClick={()=>setActiveFilter(f.key)}>
            {f.label}
          </div>
        ))}
      </div>

      {sorted.length===0 ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"50vh",gap:"16px"}}>
          <div style={{fontSize:"56px"}}>🏆</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:C.muted,letterSpacing:"0.04em"}}>No players yet</div>
        </div>
      ):(
        <>
          {/* Podium — only shows players who have completed bets */}
          {podiumUsers.length>=2&&(
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"12px",padding:"20px 16px 28px"}}>
              {podiumOrder.slice(0,podiumUsers.length).map((pos,i)=>{
                const u=podiumUsers[pos]; if(!u)return null;
                const isYou=u.id===user?.uid;
                const t=(u.wins||0)+(u.losses||0);
                return(
                  <div key={pos} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,maxWidth:"110px",cursor:"pointer"}}
                    onClick={()=>navigate(`/profile/${u.id}`)}>
                    <div style={{fontSize:"22px",marginBottom:"4px"}}>{pos===0?"🥇":pos===1?"🥈":"🥉"}</div>
                    {u.photoURL?(
                      <img src={u.photoURL} alt="" style={{width:pos===0?"60px":"48px",height:pos===0?"60px":"48px",borderRadius:"50%",objectFit:"cover",border:`3px solid ${pos===0?C.cyan:pos===1?"#ffd700":"#cd7f32"}`,marginBottom:"6px"}}/>
                    ):(
                      <div style={{width:pos===0?"60px":"48px",height:pos===0?"60px":"48px",borderRadius:"50%",background:podiumColors[pos],display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:pos===0?"24px":"18px",color:"#000",marginBottom:"6px",border:`3px solid ${pos===0?C.cyan:pos===1?"#ffd700":"#cd7f32"}`}}>
                        {u.displayName?.charAt(0)||"?"}
                      </div>
                    )}
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",fontWeight:"600",color:isYou?C.cyan:C.white,marginBottom:"2px",textAlign:"center",maxWidth:"80px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {isYou?"You":u.displayName?.split(" ")[0]}
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.cyan,marginBottom:"6px"}}>{getScore(u)}</div>
                    <div style={{width:"100%",height:`${podiumHeights[pos]}px`,background:podiumColors[pos],borderRadius:"6px 6px 0 0",opacity:0.8}}/>
                  </div>
                );
              })}
            </div>
          )}

          {/* Separator if there are inactive players */}
          <div style={{padding:"0 16px"}}>
            {/* Active players section */}
            {sorted.filter(u=>(u.wins||0)+(u.losses||0)>0).length>0&&(
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",marginBottom:"10px",textTransform:"uppercase"}}>
                🏅 Ranked Players
              </div>
            )}
            {sorted.filter(u=>(u.wins||0)+(u.losses||0)>0).map((u,i)=>{
              const isYou=u.id===user?.uid;
              const t=(u.wins||0)+(u.losses||0);
              // Find actual rank in full sorted list
              const rank=sorted.findIndex(s=>s.id===u.id);
              return(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",background:isYou?C.cyanDim:C.bg2,borderRadius:"16px",marginBottom:"8px",border:isYou?`1px solid ${C.cyanBorder}`:`1px solid ${C.border1}`,cursor:"pointer"}}
                  onClick={()=>navigate(`/profile/${u.id}`)}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",color:rank<3?C.cyan:C.muted,width:"28px",textAlign:"center",flexShrink:0}}>
                    {rank===0?"🥇":rank===1?"🥈":rank===2?"🥉":rank+1}
                  </div>
                  {u.photoURL?(
                    <img src={u.photoURL} alt="" style={{width:"46px",height:"46px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${isYou?C.cyan:C.border2}`,flexShrink:0}}/>
                  ):(
                    <div style={{width:"46px",height:"46px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#000",flexShrink:0}}>
                      {u.displayName?.charAt(0)||"?"}
                    </div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"16px",fontWeight:"500",color:isYou?C.cyan:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {isYou?`You (${u.displayName})`:u.displayName}
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,marginTop:"2px"}}>
                      {u.wins||0}W · {u.losses||0}L · {t} bets · ⭐{Math.max(0,u.honour??100)}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",color:C.cyan}}>{getScore(u)}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted}}>{getScoreLabel(u)}</div>
                  </div>
                </div>
              );
            })}

            {/* Unranked players */}
            {sorted.filter(u=>(u.wins||0)+(u.losses||0)===0).length>0&&(
              <>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.dim,letterSpacing:"0.1em",marginBottom:"10px",marginTop:"16px",textTransform:"uppercase"}}>
                  🆕 Not ranked yet
                </div>
                {sorted.filter(u=>(u.wins||0)+(u.losses||0)===0).map((u)=>{
                  const isYou=u.id===user?.uid;
                  return(
                    <div key={u.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",background:isYou?C.cyanDim:"rgba(17,31,56,0.5)",borderRadius:"16px",marginBottom:"8px",border:isYou?`1px solid ${C.cyanBorder}`:`1px solid rgba(30,58,95,0.5)`,cursor:"pointer",opacity:0.7}}
                      onClick={()=>navigate(`/profile/${u.id}`)}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:C.dim,width:"28px",textAlign:"center",flexShrink:0}}>—</div>
                      {u.photoURL?(
                        <img src={u.photoURL} alt="" style={{width:"40px",height:"40px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.border1}`,flexShrink:0}}/>
                      ):(
                        <div style={{width:"40px",height:"40px",borderRadius:"50%",background:`linear-gradient(135deg,${C.border1},${C.bg3})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",color:C.muted,flexShrink:0}}>
                          {u.displayName?.charAt(0)||"?"}
                        </div>
                      )}
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"500",color:isYou?C.cyan:C.muted}}>
                          {isYou?`You (${u.displayName})`:u.displayName}
                        </div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.dim,marginTop:"2px"}}>
                          No bets placed yet
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:C.dim}}>—</div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.dim}}>NO BETS</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}