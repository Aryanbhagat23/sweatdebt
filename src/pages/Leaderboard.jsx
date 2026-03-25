import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import T from "../theme";

const MEDALS = ["🥇","🥈","🥉"];
const TABS   = ["honour","wins","debts"];

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const [tab,     setTab]     = useState("honour");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db,"users"), orderBy("honourScore","desc"), limit(50))).then(snap => {
      setPlayers(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sorted = [...players].sort((a,b) => {
    if (tab==="honour") return (b.honourScore||0) - (a.honourScore||0);
    if (tab==="wins")   return (b.totalWins||0)   - (a.totalWins||0);
    return (b.totalLosses||0) - (a.totalLosses||0);
  });

  const meRank = sorted.findIndex(p => p.id === user?.uid) + 1;
  const me     = sorted.find(p => p.id === user?.uid);

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background:T.bg0, padding:"52px 16px 16px" }}>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:T.panel, letterSpacing:"0.02em", fontStyle:"italic", marginBottom:"4px" }}>
          <span style={{ color:T.accent }}>Sweat</span>Board
        </div>
        <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted }}>Who's sweating the most this season?</div>
      </div>

      {/* Your rank */}
      {me && (
        <div style={{ margin:"0 16px 16px", background:T.panel, borderRadius:T.r16, padding:"16px 20px", display:"flex", alignItems:"center", gap:"14px", boxShadow:"0 4px 20px rgba(5,46,22,0.2)" }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"36px", color:T.accent, width:"40px", textAlign:"center" }}>#{meRank}</div>
          <div style={{ width:"44px", height:"44px", borderRadius:"50%", overflow:"hidden", flexShrink:0, border:`2px solid ${T.accent}` }}>
            {me.photoURL ? <img src={me.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ width:"100%", height:"100%", background:T.accent, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:"#fff" }}>{me.displayName?.charAt(0)||"?"}</div>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"700", color:"#fff" }}>You — {me.displayName}</div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:"rgba(255,255,255,0.45)" }}>{me.honourScore||0} pts · {me.totalWins||0}W · {me.totalLosses||0}L</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", margin:"0 16px 16px", background:T.panel, borderRadius:T.r16, padding:"4px" }}>
        {TABS.map(t => (
          <div key={t} style={{ padding:"11px", textAlign:"center", borderRadius:"12px", cursor:"pointer", background:tab===t?T.accent:"transparent", fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", letterSpacing:"0.06em", color:tab===t?"#fff":"rgba(255,255,255,0.4)", transition:"all 0.2s", textTransform:"uppercase" }} onClick={() => setTab(t)}>
            {t==="honour"?"🏆 Honour":t==="wins"?"✅ Wins":"💀 Debts"}
          </div>
        ))}
      </div>

      {loading
        ? <div style={{ display:"flex", justifyContent:"center", padding:"40px" }}><div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"spin 0.8s linear infinite" }} /></div>
        : (
          <div style={{ padding:"0 16px" }}>
            {/* Top 3 podium */}
            {sorted.length >= 2 && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"16px" }}>
                {[sorted[1], sorted[0], sorted[2]].map((p, i) => p && (
                  <PodiumCard key={p.id} player={p} rank={i===1?1:i===0?2:3} medal={MEDALS[i===1?0:i===0?1:2]} isSelf={p.id===user?.uid} navigate={navigate} tab={tab} />
                ))}
              </div>
            )}
            {/* Rest */}
            {sorted.slice(3).map((p, i) => (
              <RowCard key={p.id} player={p} rank={i+4} isSelf={p.id===user?.uid} navigate={navigate} tab={tab} />
            ))}
          </div>
        )
      }
    </div>
  );
}

function PodiumCard({ player, rank, medal, isSelf, navigate, tab }) {
  const val = tab==="honour"?player.honourScore||0:tab==="wins"?player.totalWins||0:player.totalLosses||0;
  const vl  = tab==="honour"?"pts":tab==="wins"?"W":"L";
  return (
    <div style={{ background:isSelf?T.panel:T.bg1, border:`1.5px solid ${isSelf?T.accent:T.borderCard}`, borderRadius:T.r16, padding:"12px 8px", textAlign:"center", cursor:"pointer", boxShadow:T.shadowCard, position:"relative" }} onClick={() => navigate(`/profile/${player.id}`)}>
      {rank===1 && <div style={{ position:"absolute", top:"-8px", left:"50%", transform:"translateX(-50%)", background:T.accent, borderRadius:T.rFull, padding:"2px 8px", fontFamily:T.fontMono, fontSize:"9px", fontWeight:"800", color:"#fff", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>👑 TOP</div>}
      <div style={{ fontSize:"24px", marginBottom:"6px" }}>{medal}</div>
      <div style={{ width:"44px", height:"44px", borderRadius:"50%", overflow:"hidden", margin:"0 auto 6px", border:`2px solid ${isSelf?T.accent:T.borderCard}` }}>
        {player.photoURL ? <img src={player.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ width:"100%", height:"100%", background:isSelf?T.accentLight:T.bg3, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:isSelf?T.accent:T.panel }}>{player.displayName?.charAt(0)||"?"}</div>}
      </div>
      <div style={{ fontFamily:T.fontBody, fontSize:"12px", fontWeight:"700", color:isSelf?T.accent:T.panel, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"2px" }}>{player.displayName?.split(" ")[0]}</div>
      <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:isSelf?T.accent:T.panel }}>{val}<span style={{ fontSize:"11px", color:T.textMuted }}>{vl}</span></div>
    </div>
  );
}

function RowCard({ player, rank, isSelf, navigate, tab }) {
  const val = tab==="honour"?player.honourScore||0:tab==="wins"?player.totalWins||0:player.totalLosses||0;
  const vl  = tab==="honour"?"pts":tab==="wins"?"W":"L";
  return (
    <div style={{ background:isSelf?T.accentLight:T.bg1, border:`1px solid ${isSelf?T.accent:T.borderCard}`, borderRadius:T.r14, padding:"14px 16px", display:"flex", alignItems:"center", gap:"12px", marginBottom:"8px", cursor:"pointer", boxShadow:T.shadowSm }} onClick={() => navigate(`/profile/${player.id}`)}>
      <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:T.textMuted, width:"28px", textAlign:"center" }}>{rank}</div>
      <div style={{ width:"40px", height:"40px", borderRadius:"50%", overflow:"hidden", flexShrink:0, border:`1.5px solid ${isSelf?T.accent:T.border}` }}>
        {player.photoURL ? <img src={player.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ width:"100%", height:"100%", background:T.bg3, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"16px", color:T.panel }}>{player.displayName?.charAt(0)||"?"}</div>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"700", color:T.panel, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{player.displayName}{isSelf?" (You)":""}</div>
        <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>@{player.username||"—"} · H:{player.honourScore||0}</div>
      </div>
      <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:T.panel }}>{val}<span style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>{vl}</span></div>
    </div>
  );
}