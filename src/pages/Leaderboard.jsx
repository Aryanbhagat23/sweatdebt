import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

export default function Leaderboard({ user }) {
  const [bets, setBets] = useState([]);
  const [activeTab, setActiveTab] = useState("friends");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bets"), snap => {
      setBets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Build leaderboard from bets
  const userMap = {};
  bets.forEach(bet => {
    if (!userMap[bet.createdBy]) {
      userMap[bet.createdBy] = { name: bet.createdByName, won: 0, lost: 0, total: 0 };
    }
    userMap[bet.createdBy].total++;
    if (bet.status === "won") userMap[bet.createdBy].won++;
    if (bet.status === "lost") userMap[bet.createdBy].lost++;
  });

  const rankings = Object.entries(userMap)
    .map(([uid, data]) => ({
      uid,
      name: data.name,
      won: data.won,
      lost: data.lost,
      total: data.total,
      winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
      honour: Math.max(0, 100 - data.lost * 5),
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const tabs = ["friends","global","pushups","running"];
  const medals = ["🥇","🥈","🥉"];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>Leader<span style={{color:"#d4ff00"}}>board</span></div>
      </div>

      <div style={S.tabs}>
        {tabs.map(tab => (
          <div key={tab} style={{...S.tab, background:activeTab===tab?"#d4ff00":"#1a1a1a", color:activeTab===tab?"#000":"#666", border:activeTab===tab?"1px solid #d4ff00":"1px solid #333"}} onClick={()=>setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase()+tab.slice(1)}
          </div>
        ))}
      </div>

      {rankings.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>🏆</div>
          <div style={S.emptyText}>No rankings yet</div>
          <div style={S.emptySub}>Place and complete bets to appear here</div>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {rankings.length >= 2 && (
            <div style={S.podium}>
              {[1,0,2].map(i => rankings[i] && (
                <div key={i} style={{...S.podiumItem, order:i===0?2:i===1?1:3}}>
                  <div style={S.podiumMedal}>{medals[i]||""}</div>
                  <div style={{...S.podiumAvatar, width:i===0?"64px":"52px", height:i===0?"64px":"52px", border:i===0?"3px solid #d4ff00":"2px solid #333"}}>
                    {rankings[i]?.name?.charAt(0)||"?"}
                  </div>
                  <div style={S.podiumName}>{rankings[i]?.name?.split(" ")[0]}</div>
                  <div style={S.podiumScore}>{rankings[i]?.winRate}%</div>
                  <div style={{...S.podiumBase, height:i===0?"56px":i===1?"40px":"28px", background:i===0?"rgba(212,255,0,0.15)":"rgba(255,255,255,0.03)"}}/>
                </div>
              ))}
            </div>
          )}

          {/* Full list */}
          <div style={S.list}>
            {rankings.map((r, i) => (
              <div key={r.uid} style={{...S.row, background:r.uid===user.uid?"rgba(212,255,0,0.05)":"transparent", border:r.uid===user.uid?"1px solid rgba(212,255,0,0.2)":"1px solid transparent"}}>
                <div style={{...S.rank, color:i===0?"#d4ff00":i===1?"#aaa":i===2?"#ff5c1a":"#555"}}>{i+1}</div>
                <div style={S.rowAvatar}>{r.name?.charAt(0)||"?"}</div>
                <div style={S.rowInfo}>
                  <div style={S.rowName}>
                    {r.name}
                    {r.uid === user.uid && <span style={S.youTag}> YOU</span>}
                  </div>
                  <div style={S.rowDetail}>{r.won}W · {r.lost}L · Honour {r.honour}</div>
                </div>
                <div style={S.rowRight}>
                  <div style={S.rowPct}>{r.winRate}%</div>
                  <div style={S.rowLabel}>win rate</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"90px"},
  header:{padding:"20px 20px 16px"},
  title:{fontFamily:"sans-serif",fontSize:"28px",fontWeight:"700",color:"#f5f0e8"},
  tabs:{display:"flex",gap:"6px",padding:"0 20px",marginBottom:"20px",flexWrap:"wrap"},
  tab:{padding:"6px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:"500",cursor:"pointer",transition:"all 0.2s",fontFamily:"monospace"},
  empty:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:"12px"},
  emptyIcon:{fontSize:"48px"},
  emptyText:{color:"#666",fontSize:"16px",fontWeight:"500"},
  emptySub:{color:"#444",fontSize:"13px"},
  podium:{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"12px",padding:"20px 20px 24px"},
  podiumItem:{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",flex:1,maxWidth:"100px"},
  podiumMedal:{fontSize:"20px"},
  podiumAvatar:{borderRadius:"50%",background:"#2a2a2a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",fontWeight:"700",color:"#f5f0e8"},
  podiumName:{fontSize:"12px",fontWeight:"500",color:"#f5f0e8"},
  podiumScore:{fontSize:"11px",color:"#d4ff00",fontFamily:"monospace"},
  podiumBase:{width:"100%",borderRadius:"4px 4px 0 0"},
  list:{padding:"0 20px"},
  row:{display:"flex",alignItems:"center",gap:"12px",padding:"12px",borderRadius:"12px",marginBottom:"6px",cursor:"pointer"},
  rank:{fontFamily:"sans-serif",fontSize:"18px",fontWeight:"700",width:"24px",textAlign:"center"},
  rowAvatar:{width:"40px",height:"40px",borderRadius:"50%",background:"#2a2a2a",border:"1px solid #444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:"600",color:"#f5f0e8",flexShrink:0},
  rowInfo:{flex:1},
  rowName:{fontSize:"14px",fontWeight:"500",color:"#f5f0e8"},
  youTag:{fontSize:"10px",color:"#d4ff00",fontFamily:"monospace",letterSpacing:"0.05em"},
  rowDetail:{fontSize:"11px",color:"#555",fontFamily:"monospace",marginTop:"2px"},
  rowRight:{textAlign:"right"},
  rowPct:{fontSize:"14px",fontWeight:"500",color:"#d4ff00",fontFamily:"monospace"},
  rowLabel:{fontSize:"10px",color:"#555"},
};