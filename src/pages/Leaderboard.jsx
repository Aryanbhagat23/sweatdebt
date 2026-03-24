import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T, { gradientText } from "../theme";

const TABS = [
  { key:"honour",   label:"Honour",   field:"honour"              },
  { key:"winrate",  label:"Win Rate",  field:"winRate"             },
  { key:"wins",     label:"Wins",      field:"wins"                },
  { key:"streak",   label:"🔥 Streak", field:"bestWinStreak"       },
];

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("honour");

  useEffect(() => {
    const u = onSnapshot(collection(db,"users"), snap=>{
      const d = snap.docs.map(x=>{
        const p = x.data();
        const total = (p.wins||0)+(p.losses||0);
        return { id:x.id, ...p, winRate: total>0?Math.round((p.wins/total)*100):0, honour: p.honour||100 };
      });
      setPlayers(d); setLoading(false);
    }, ()=>setLoading(false));
    return ()=>u();
  }, []);

  const sorted = [...players].sort((a,b)=>(b[TABS.find(t=>t.key===tab)?.field]||0)-(a[TABS.find(t=>t.key===tab)?.field]||0));
  const top3 = sorted.slice(0,3);
  const rest = sorted.slice(3);
  const podiumColors = [T.orange, T.white, "#cd7f32"];
  const podiumSizes = ["56px","48px","44px"];
  const podiumOrder = [1,0,2]; // 2nd, 1st, 3rd

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ padding:"52px 16px 20px" }}>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"44px", color:T.white, letterSpacing:"0.02em", lineHeight:1 }}>
          <span style={gradientText}>Rank</span>ings
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"8px", padding:"0 16px 20px", overflowX:"auto" }}>
        {TABS.map(t=>(
          <button key={t.key} style={{ background:tab===t.key?T.gradPrimary:T.bg2, border:`1px solid ${tab===t.key?"transparent":T.border}`, borderRadius:T.rFull, padding:"8px 16px", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"600", color:tab===t.key?"#fff":T.muted, cursor:"pointer", flexShrink:0, transition:"all 0.2s" }} onClick={()=>setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"40px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.bg3}`, borderTop:`3px solid ${T.pink}`, animation:"spin 0.8s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div style={{ padding:"0 16px 24px" }}>
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:"12px", marginBottom:"16px" }}>
                {podiumOrder.map(pi => {
                  const p = top3[pi];
                  if (!p) return <div key={pi} style={{ flex:1 }} />;
                  const isFirst = pi===0;
                  const col = podiumColors[pi];
                  return (
                    <div key={p.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer" }} onClick={()=>navigate(`/profile/${p.id}`)}>
                      {isFirst && <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", marginBottom:"4px" }}>👑</div>}
                      {p.photoURL
                        ? <img src={p.photoURL} alt="" style={{ width:podiumSizes[pi], height:podiumSizes[pi], borderRadius:"50%", objectFit:"cover", border:`3px solid ${col}`, marginBottom:"6px" }} />
                        : <div style={{ width:podiumSizes[pi], height:podiumSizes[pi], borderRadius:"50%", background:T.gradPrimary, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"22px", color:"#fff", border:`3px solid ${col}`, marginBottom:"6px" }}>{p.displayName?.charAt(0)||"?"}</div>
                      }
                      <div style={{ fontFamily:T.fontBody, fontSize:"12px", fontWeight:"700", color:col, textAlign:"center", marginBottom:"2px" }}>{p.displayName?.split(" ")[0]}</div>
                      <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:col }}>{p[TABS.find(t=>t.key===tab)?.field]||0}{tab==="winrate"?"%":""}</div>
                      {/* Podium bar */}
                      <div style={{ width:"100%", background:`${col}20`, border:`1px solid ${col}40`, borderRadius:"8px 8px 0 0", height: isFirst?"56px":pi===1?"40px":"32px", marginTop:"8px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:col }}>#{pi+1}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rest of list */}
          <div style={{ padding:"0 16px" }}>
            {rest.map((p, i) => {
              const val = p[TABS.find(t=>t.key===tab)?.field]||0;
              const isMe = p.id === user?.uid;
              return (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:"12px", background: isMe?T.pinkDim:T.bg1, border:`1px solid ${isMe?T.pinkBorder:T.border}`, borderRadius:T.r16, padding:"14px", marginBottom:"8px", cursor:"pointer", transition:"all 0.15s" }} onClick={()=>navigate(`/profile/${p.id}`)}>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.muted, width:"28px", textAlign:"center" }}>#{i+4}</div>
                  {p.photoURL
                    ? <img src={p.photoURL} alt="" style={{ width:"42px", height:"42px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${isMe?T.pink:T.border}`, flexShrink:0 }} />
                    : <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:T.gradPrimary, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"16px", color:"#fff", flexShrink:0 }}>{p.displayName?.charAt(0)||"?"}</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color: isMe?T.pink:T.white }}>{p.displayName}{isMe?" (you)":""}</div>
                    <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.muted }}>@{p.username||""}</div>
                  </div>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color: isMe?T.pink:T.orange }}>{val}{tab==="winrate"?"%":""}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}