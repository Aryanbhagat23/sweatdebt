import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import T from "../theme";

const TABS = ["honour","wins","debts"];

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const [tab,     setTab]     = useState("honour");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get ALL users then sort in JS — avoids Firestore index errors
    // when honourScore field doesn't exist on some docs
    getDocs(collection(db,"users")).then(snap => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        honourScore: d.data().honourScore || 0,
        totalWins:   d.data().totalWins   || 0,
        totalLosses: d.data().totalLosses || 0,
      }));
      setPlayers(list);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  const sorted = [...players].sort((a,b) => {
    if (tab==="honour") return b.honourScore - a.honourScore;
    if (tab==="wins")   return b.totalWins   - a.totalWins;
    return b.totalLosses - a.totalLosses;
  }).slice(0, 50);

  const meIdx = sorted.findIndex(p => p.id === user?.uid);
  const me    = sorted[meIdx];

  return (
    <div style={{minHeight:"100vh",background:T.bg0,paddingBottom:"90px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{background:T.bg0,padding:"52px 16px 16px"}}>
        <div style={{fontFamily:T.fontDisplay,fontSize:"32px",color:T.panel,letterSpacing:"0.02em",fontStyle:"italic",marginBottom:"4px"}}>
          <span style={{color:T.accent}}>Sweat</span>Board
        </div>
        <div style={{fontFamily:T.fontBody,fontSize:"13px",color:T.textMuted}}>
          Who's sweating the most this season?
        </div>
      </div>

      {/* Your rank card */}
      {me && (
        <div style={{margin:"0 16px 16px",background:T.panel,borderRadius:T.r16,padding:"16px 20px",display:"flex",alignItems:"center",gap:"14px",boxShadow:"0 4px 20px rgba(5,46,22,0.2)"}}>
          <div style={{fontFamily:T.fontDisplay,fontSize:"36px",color:T.accent,width:"48px",textAlign:"center"}}>#{meIdx+1}</div>
          <div style={{width:"44px",height:"44px",borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2px solid ${T.accent}`}}>
            {me.photoURL
              ?<img src={me.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<div style={{width:"100%",height:"100%",background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"18px",color:"#fff"}}>{me.displayName?.charAt(0)||"?"}</div>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:T.fontBody,fontSize:"15px",fontWeight:"700",color:"#fff"}}>You — {me.displayName}</div>
            <div style={{fontFamily:T.fontMono,fontSize:"11px",color:"rgba(255,255,255,0.45)"}}>
              {me.honourScore} pts · {me.totalWins}W · {me.totalLosses}L
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",margin:"0 16px 16px",background:T.panel,borderRadius:T.r16,padding:"4px"}}>
        {TABS.map(t=>(
          <div key={t} style={{padding:"11px",textAlign:"center",borderRadius:"12px",cursor:"pointer",background:tab===t?T.accent:"transparent",fontFamily:T.fontMono,fontSize:"11px",fontWeight:"700",letterSpacing:"0.06em",color:tab===t?"#fff":"rgba(255,255,255,0.4)",transition:"all 0.2s",textTransform:"uppercase"}}
            onClick={()=>setTab(t)}>
            {t==="honour"?"🏆 Honour":t==="wins"?"✅ Wins":"💀 Debts"}
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:"40px"}}>
          <div style={{width:"32px",height:"32px",borderRadius:"50%",border:`3px solid ${T.border}`,borderTop:`3px solid ${T.accent}`,animation:"spin 0.8s linear infinite"}}/>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:"48px",marginBottom:"12px"}}>🏆</div>
          <div style={{fontFamily:T.fontDisplay,fontSize:"24px",color:T.textMuted,fontStyle:"italic",letterSpacing:"0.04em"}}>No players yet</div>
          <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.textMuted,marginTop:"8px"}}>Be the first to place a bet!</div>
        </div>
      ) : (
        <div style={{padding:"0 16px"}}>
          {/* Top 3 podium */}
          {sorted.length >= 1 && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"16px"}}>
              {[sorted[1]||null, sorted[0], sorted[2]||null].map((p,i)=>{
                if(!p) return <div key={i}/>;
                const rank = i===1?1:i===0?2:3;
                const medals = ["🥇","🥈","🥉"];
                const medal = medals[rank-1];
                const isSelf = p.id===user?.uid;
                const val = tab==="honour"?p.honourScore:tab==="wins"?p.totalWins:p.totalLosses;
                const vl  = tab==="honour"?"pts":tab==="wins"?"W":"L";
                return(
                  <div key={p.id} style={{background:isSelf?T.panel:T.bg1,border:`1.5px solid ${isSelf?T.accent:T.borderCard}`,borderRadius:T.r16,padding:"12px 8px",textAlign:"center",cursor:"pointer",boxShadow:T.shadowCard,position:"relative"}}
                    onClick={()=>navigate(`/profile/${p.id}`)}>
                    {rank===1&&<div style={{position:"absolute",top:"-8px",left:"50%",transform:"translateX(-50%)",background:T.accent,borderRadius:T.rFull,padding:"2px 8px",fontFamily:T.fontMono,fontSize:"9px",fontWeight:"800",color:"#fff",whiteSpace:"nowrap"}}>👑 TOP</div>}
                    <div style={{fontSize:"24px",marginBottom:"6px"}}>{medal}</div>
                    <div style={{width:"44px",height:"44px",borderRadius:"50%",overflow:"hidden",margin:"0 auto 6px",border:`2px solid ${isSelf?T.accent:T.borderCard}`}}>
                      {p.photoURL?<img src={p.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",background:isSelf?T.accentLight:T.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"18px",color:isSelf?T.accent:T.panel}}>{p.displayName?.charAt(0)||"?"}</div>}
                    </div>
                    <div style={{fontFamily:T.fontBody,fontSize:"12px",fontWeight:"700",color:isSelf?T.accent:T.panel,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"2px"}}>{p.displayName?.split(" ")[0]}</div>
                    <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:isSelf?T.accent:T.panel}}>{val}<span style={{fontSize:"11px",color:T.textMuted}}>{vl}</span></div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Rest of list */}
          {sorted.slice(3).map((p,i)=>{
            const isSelf = p.id===user?.uid;
            const val = tab==="honour"?p.honourScore:tab==="wins"?p.totalWins:p.totalLosses;
            const vl  = tab==="honour"?"pts":tab==="wins"?"W":"L";
            return(
              <div key={p.id} style={{background:isSelf?T.accentLight:T.bg1,border:`1px solid ${isSelf?T.accent:T.borderCard}`,borderRadius:T.r14,padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px",cursor:"pointer",boxShadow:T.shadowSm}}
                onClick={()=>navigate(`/profile/${p.id}`)}>
                <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:T.textMuted,width:"28px",textAlign:"center"}}>{i+4}</div>
                <div style={{width:"40px",height:"40px",borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`1.5px solid ${isSelf?T.accent:T.border}`}}>
                  {p.photoURL?<img src={p.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",background:T.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"16px",color:T.panel}}>{p.displayName?.charAt(0)||"?"}</div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:T.fontBody,fontSize:"14px",fontWeight:"700",color:T.panel,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.displayName}{isSelf?" (You)":""}</div>
                  <div style={{fontFamily:T.fontMono,fontSize:"11px",color:T.textMuted}}>@{p.username||"—"} · H:{p.honourScore}</div>
                </div>
                <div style={{fontFamily:T.fontDisplay,fontSize:"24px",color:T.panel}}>{val}<span style={{fontFamily:T.fontMono,fontSize:"11px",color:T.textMuted}}>{vl}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}