import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import T from "../theme";

/* light colour shortcuts */
const C = {
  page:   "#f0fdf4",
  card:   "#ffffff",
  border: "#d1fae5",
  heading:"#052e16",
  body:   "#374151",
  muted:  "#6b7280",
  accent: "#10b981",
  gold:   "#f5a623",
  silver: "#9ba8b0",
  bronze: "#cd7f32",
};

export default function Leaderboard({ user }) {
  const navigate  = useNavigate();
  const [tab,      setTab]      = useState("honour");
  const [rankings, setRankings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let betsData  = [];
    let usersData = [];
    let betsReady = false;
    let usersReady = false;

    const build = () => {
      if (!betsReady || !usersReady) return;

      // seed map from users collection first
      const map = {};
      usersData.forEach(u => {
        map[u.id] = {
          uid:      u.id,
          name:     u.displayName || u.name || "Unknown",
          username: u.username    || "",
          photo:    u.photoURL    || u.photo || null,
          honour:   typeof u.honour === "number" ? u.honour : 100,
          wins:     0,
          losses:   0,
          total:    0,
        };
      });

      // also seed any users only seen in bets
      betsData.forEach(b => {
        if (b.createdBy && !map[b.createdBy]) {
          map[b.createdBy] = {
            uid:      b.createdBy,
            name:     b.createdByName  || "Unknown",
            username: "",
            photo:    null,
            honour:   100,
            wins:     0,
            losses:   0,
            total:    0,
          };
        }
      });

      // tally bets
      betsData.forEach(b => {
        const u = map[b.createdBy];
        if (!u) return;
        u.total++;
        if (b.status === "won")  u.wins++;
        if (b.status === "lost") u.losses++;
      });

      const ranked = Object.values(map)
        .map(u => ({
          ...u,
          winRate: u.total > 0 ? Math.round((u.wins/u.total)*100) : 0,
        }))
        .filter(u => u.total > 0 || u.honour !== 100);

      setRankings(ranked);
      setLoading(false);
    };

    const unsubBets = onSnapshot(collection(db,"bets"), snap => {
      betsData  = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      betsReady = true;
      build();
    });
    const unsubUsers = onSnapshot(collection(db,"users"), snap => {
      usersData  = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      usersReady = true;
      build();
    });

    return () => { unsubBets(); unsubUsers(); };
  }, [user]);

  const sorted = [...rankings].sort((a,b) => {
    if (tab === "honour") return b.honour  - a.honour;
    if (tab === "wins")   return b.wins    - a.wins;
    if (tab === "debts")  return b.losses  - a.losses;
    return 0;
  });

  const myEntry   = sorted.find(r => r.uid === user.uid);
  const myRankNum = myEntry ? sorted.indexOf(myEntry) + 1 : null;
  const medals    = ["🥇","🥈","🥉"];

  const val = r => tab==="honour" ? r.honour : tab==="wins" ? r.wins : r.losses;
  const valLabel = tab==="honour" ? "honour" : tab==="wins" ? "wins" : "debts";

  return (
    <div style={{ minHeight:"100vh", background:C.page, paddingBottom:"90px" }}>

      {/* header */}
      <div style={{ padding:"52px 16px 16px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px" }}>
          <div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"36px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>
              Sweat<span style={{ color:C.accent }}>Board</span>
            </div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:C.muted, marginTop:"2px" }}>
              Who's sweating the most this season?
            </div>
          </div>
          {/* Season button */}
          <button type="button" onClick={() => navigate("/seasons")}
            style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 16px", background:C.heading, border:`2px solid ${C.accent}`, borderRadius:"20px", fontFamily:T.fontDisplay, fontSize:"15px", letterSpacing:"0.06em", color:C.accent, cursor:"pointer", flexShrink:0, boxShadow:`0 0 12px ${C.accent}25` }}>
            🏆 SEASON
          </button>
        </div>
      </div>

      {/* my card — white with green border */}
      {myEntry && (
        <div style={{ margin:"0 16px 16px", background:C.card, border:`2px solid ${C.accent}`, borderRadius:"18px", padding:"16px", boxShadow:`0 2px 12px ${C.accent}15`, display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"36px", color:C.accent, letterSpacing:"0.04em", flexShrink:0, minWidth:"52px" }}>
            #{myRankNum || "–"}
          </div>
          {myEntry.photo
            ? <img src={myEntry.photo} alt="" style={{ width:"48px", height:"48px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.accent}`, flexShrink:0 }}/>
            : <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:`${C.accent}15`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"20px", color:C.accent, border:`2px solid ${C.accent}`, flexShrink:0 }}>
                {(myEntry.name||"?").charAt(0)}
              </div>
          }
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:C.heading }}>
              You — {myEntry.name}
            </div>
            <div style={{ fontFamily:T.fontMono, fontSize:"12px", color:C.muted, marginTop:"2px" }}>
              {myEntry.wins}W · {myEntry.losses}L · {myEntry.winRate}% win rate
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:C.accent, letterSpacing:"0.04em" }}>
              {val(myEntry)}
            </div>
            <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
              {valLabel}
            </div>
          </div>
        </div>
      )}

      {/* tabs */}
      <div style={{ display:"flex", margin:"0 16px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"4px" }}>
        {[
          { key:"honour", icon:"🏅", label:"Honour" },
          { key:"wins",   icon:"✅", label:"Wins"   },
          { key:"debts",  icon:"💀", label:"Debts"  },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ flex:1, padding:"10px 6px", borderRadius:"10px", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"500", cursor:"pointer", background:tab===t.key ? C.heading : "transparent", color:tab===t.key ? C.accent : C.muted, border:"none", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px" }}>
            <span style={{ fontSize:"14px" }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"48px" }}>
          <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, animation:"_sp 0.8s linear infinite" }}/>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 16px", gap:"12px" }}>
          <div style={{ fontSize:"40px" }}>🏆</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>No rankings yet</div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:C.muted, textAlign:"center" }}>Place bets to appear on the board</div>
        </div>
      ) : (
        <div style={{ padding:"0 16px" }}>

          {/* podium */}
          {sorted.length >= 3 && (
            <div style={{ display:"flex", alignItems:"flex-end", gap:"8px", marginBottom:"20px" }}>
              <Podium u={sorted[1]} rank={2} height="70px"  color={C.silver} val={val(sorted[1])} label={valLabel} />
              <Podium u={sorted[0]} rank={1} height="100px" color={C.gold}   val={val(sorted[0])} label={valLabel} isTop />
              <Podium u={sorted[2]} rank={3} height="50px"  color={C.bronze} val={val(sorted[2])} label={valLabel} />
            </div>
          )}

          {/* full list */}
          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>
            All players
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {sorted.map((r, i) => {
              const isMe = r.uid === user.uid;
              return (
                <div key={r.uid} style={{
                  display:"flex", alignItems:"center", gap:"12px",
                  background: isMe ? C.heading : C.card,
                  border:`1.5px solid ${isMe ? C.accent : C.border}`,
                  borderRadius:"16px", padding:"12px 14px",
                  boxShadow: isMe ? `0 2px 8px ${C.accent}20` : "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", width:"32px", textAlign:"center", flexShrink:0, color:i===0?C.gold:i===1?C.silver:i===2?C.bronze:C.muted }}>
                    {i < 3 ? medals[i] : i+1}
                  </div>
                  {r.photo
                    ? <img src={r.photo} alt="" style={{ width:"40px", height:"40px", borderRadius:"50%", objectFit:"cover", flexShrink:0, border:`1.5px solid ${isMe?C.accent:C.border}` }}/>
                    : <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:isMe?`${C.accent}20`:C.page, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:isMe?C.accent:C.heading, border:`1.5px solid ${isMe?C.accent:C.border}`, flexShrink:0 }}>
                        {(r.name||"?").charAt(0)}
                      </div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:isMe?"#fff":C.heading }}>
                      {isMe ? "You" : r.name}
                      {isMe && <span style={{ fontFamily:T.fontMono, fontSize:"10px", color:C.accent, marginLeft:"6px", letterSpacing:"0.06em" }}>YOU</span>}
                    </div>
                    <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:isMe?`${C.accent}bb`:C.muted, marginTop:"2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      @{r.username||r.name?.toLowerCase().replace(/\s/g,"")} · {r.wins}W {r.losses}L · {r.winRate}%
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:isMe?C.accent:C.heading, letterSpacing:"0.04em" }}>
                      {val(r)}
                    </div>
                    <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:isMe?`${C.accent}99`:C.muted }}>
                      {valLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Podium({ u, rank, height, color, val, label, isTop }) {
  const sz = isTop ? "52px" : "40px";
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
      {isTop && (
        <div style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}40`, borderRadius:"12px", padding:"2px 10px", fontFamily:T.fontMono, fontSize:"10px", color:C.accent, letterSpacing:"0.06em", marginBottom:"2px" }}>TOP</div>
      )}
      <div style={{ fontSize:isTop?"22px":"18px" }}>{rank===1?"🥇":rank===2?"🥈":"🥉"}</div>
      {u.photo
        ? <img src={u.photo} alt="" style={{ width:sz, height:sz, borderRadius:"50%", objectFit:"cover", border:`2px solid ${color}` }}/>
        : <div style={{ width:sz, height:sz, borderRadius:"50%", background:C.card, border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:isTop?"22px":"16px", color:C.heading }}>
            {(u.name||"?").charAt(0)}
          </div>
      }
      <div style={{ fontFamily:T.fontBody, fontSize:"12px", fontWeight:"600", color:C.heading, maxWidth:"70px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"center" }}>
        {u.name?.split(" ")[0]}
      </div>
      <div style={{ fontFamily:T.fontDisplay, fontSize:"15px", color:C.accent, letterSpacing:"0.04em" }}>
        {val}{label==="wins"?"W":label==="debts"?"L":""}
      </div>
      <div style={{ width:"100%", height, background:C.heading, borderRadius:"8px 8px 0 0", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:"8px" }}>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:C.accent, letterSpacing:"0.04em" }}>#{rank}</div>
      </div>
    </div>
  );
}