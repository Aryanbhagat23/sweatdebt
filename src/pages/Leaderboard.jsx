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

  // REAL TIME — updates immediately when scores change
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

  const sorted = [...users].sort((a,b)=>{
    const aT=(a.wins||0)+(a.losses||0);
    const bT=(b.wins||0)+(b.losses||0);
    if (activeFilter==="winRate") {
      const aR=aT>0?(a.wins||0)/aT:0;
      const bR=bT>0?(b.wins||0)/bT:0;
      return bR-aR;
    }
    if (activeFilter==="wins") return (b.wins||0)-(a.wins||0);
    if (activeFilter==="honour") return (b.honour??100)-(a.honour??100);
    if (activeFilter==="active") return bT-aT;
    return 0;
  });

  const getScore = (u) => {
    const t=(u.wins||0)+(u.losses||0);
    if (activeFilter==="winRate") return t>0?`${Math.round((u.wins||0)/t*100)}%`:"0%";
    if (activeFilter==="wins") return `${u.wins||0}W`;
    if (activeFilter==="honour") return `${Math.max(0,u.honour??100)}`;
    return `${t}`;
  };

  const podiumColors=[
    `linear-gradient(135deg,${C.cyan},${C.purple})`,
    `linear-gradient(135deg,#ffd700,#ffa500)`,
    `linear-gradient(135deg,#cd7f32,#8b4513)`,
  ];
  const podiumOrder=[1,0,2];
  const podiumHeights=[56,80,44];

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"36px",height:"36px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.muted}}>Loading scores...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg0,paddingBottom:"90px"}}>
      <div style={{padding:"52px 16px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",color:C.white,letterSpacing:"0.03em"}}>
            Leader<span style={{color:C.cyan}}>board</span>
          </div>
          {/* Live indicator */}
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.green}}>LIVE</span>
          </div>
        </div>
        {lastUpdated&&(
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.dim,marginTop:"4px"}}>
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

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
          {/* Podium */}
          {sorted.length>=3&&(
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"12px",padding:"20px 16px 28px"}}>
              {podiumOrder.map((pos,i)=>{
                const u=sorted[pos]; if(!u)return null;
                const isYou=u.id===user?.uid;
                return(
                  <div key={pos} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,maxWidth:"110px",cursor:"pointer"}} onClick={()=>navigate(`/profile/${u.id}`)}>
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

          {/* List */}
          <div style={{padding:"0 16px"}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",marginBottom:"12px",textTransform:"uppercase"}}>All Players</div>
            {sorted.map((u,i)=>{
              const isYou=u.id===user?.uid;
              const t=(u.wins||0)+(u.losses||0);
              return(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",background:isYou?C.cyanDim:C.bg2,borderRadius:"16px",marginBottom:"8px",border:isYou?`1px solid ${C.cyanBorder}`:`1px solid ${C.border1}`,cursor:"pointer",transition:"opacity 0.2s"}}
                  onClick={()=>navigate(`/profile/${u.id}`)}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",color:i<3?C.cyan:C.muted,width:"28px",textAlign:"center",flexShrink:0}}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                  </div>
                  {u.photoURL?(
                    <img src={u.photoURL} alt="" style={{width:"46px",height:"46px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${isYou?C.cyan:C.border2}`,flexShrink:0}}/>
                  ):(
                    <div style={{width:"46px",height:"46px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#000",flexShrink:0}}>
                      {u.displayName?.charAt(0)||"?"}
                    </div>
                  )}
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"16px",fontWeight:"500",color:isYou?C.cyan:C.white}}>
                      {isYou?`You (${u.displayName})`:u.displayName}
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,marginTop:"2px"}}>
                      {u.wins||0}W · {u.losses||0}L · ⭐{Math.max(0,u.honour??100)}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",color:C.cyan}}>{getScore(u)}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted}}>
                      {activeFilter==="winRate"?"WIN RATE":activeFilter==="wins"?"WINS":activeFilter==="honour"?"HONOUR":"BETS"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}