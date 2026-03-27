import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import T from "../theme";

/* ── colour shortcuts (light theme) ── */
const C = {
  page:     "#f0fdf4",   // mint page bg
  card:     "#ffffff",   // white cards
  cardAlt:  "#f8fffe",   // very slight tint for nested cards
  border:   "#d1fae5",   // light green border
  heading:  "#052e16",   // dark green text
  body:     "#374151",   // dark gray body text
  muted:    "#6b7280",   // muted gray
  accent:   "#10b981",   // emerald green
  gold:     "#f5a623",
  silver:   "#9ba8b0",
  bronze:   "#cd7f32",
};

function getSeasonName() {
  return new Date().toLocaleString("default", { month:"long", year:"numeric" });
}
function getPastSeasons() {
  const now = new Date();
  return [1,2,3].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      id:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      name: d.toLocaleString("default", { month:"long", year:"numeric" }),
    };
  });
}

const TIERS = [
  { min:0,   max:9,   name:"Bronze",   icon:"🥉", color:C.bronze  },
  { min:10,  max:24,  name:"Silver",   icon:"🥈", color:C.silver  },
  { min:25,  max:49,  name:"Gold",     icon:"🥇", color:C.gold    },
  { min:50,  max:99,  name:"Platinum", icon:"💎", color:"#4a9eff" },
  { min:100, max:999, name:"Legend",   icon:"👑", color:C.accent  },
];
const getTier = pts => TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0];

export default function Seasons({ user }) {
  const navigate = useNavigate();
  const [tab,          setTab]          = useState("current");
  const [rankings,     setRankings]     = useState([]);
  const [myPoints,     setMyPoints]     = useState(0);
  const [myRank,       setMyRank]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [countdown,    setCountdown]    = useState("");
  const [pastSeason,   setPastSeason]   = useState(getPastSeasons()[0]);
  const [pastRankings, setPastRankings] = useState([]);
  const [pastLoading,  setPastLoading]  = useState(false);

  // countdown timer
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth()+1, 1);
      const ms  = end - now;
      const d = Math.floor(ms/86400000);
      const h = Math.floor((ms%86400000)/3600000);
      const m = Math.floor((ms%3600000)/60000);
      const s = Math.floor((ms%60000)/1000);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // load rankings from bets this month
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bets"), snap => {
      const allBets = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthBets  = allBets.filter(b => {
        const t = b.createdAt?.toDate?.();
        return t && t >= monthStart;
      });

      const map = {};
      monthBets.forEach(b => {
        if (!map[b.createdBy]) {
          map[b.createdBy] = { uid:b.createdBy, name:b.createdByName||"Unknown", photo:null, wins:0, losses:0, total:0 };
        }
        map[b.createdBy].total++;
        if (b.status==="won")  map[b.createdBy].wins++;
        if (b.status==="lost") map[b.createdBy].losses++;
      });

      const ranked = Object.values(map).map(u => ({
        ...u,
        points: u.wins*3 + u.losses*1,
        winRate: u.total>0 ? Math.round((u.wins/u.total)*100) : 0,
      })).sort((a,b) => b.points - a.points);

      setRankings(ranked);
      const me = ranked.find(r => r.uid===user.uid);
      setMyPoints(me?.points || 0);
      setMyRank(me ? ranked.indexOf(me)+1 : null);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // load past season
  useEffect(() => {
    if (tab !== "history") return;
    setPastLoading(true);
    getDocs(collection(db, "seasons", pastSeason.id, "rankings"))
      .then(snap => {
        const data = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.points-a.points);
        setPastRankings(data);
      })
      .catch(() => setPastRankings([]))
      .finally(() => setPastLoading(false));
  }, [tab, pastSeason]);

  const myTier   = getTier(myPoints);
  const nextTier = TIERS[TIERS.indexOf(myTier)+1];
  const ptsToNext = nextTier ? nextTier.min - myPoints : 0;
  const pct = nextTier
    ? Math.min(100, ((myPoints - myTier.min) / (nextTier.min - myTier.min)) * 100)
    : 100;

  const medals = ["🥇","🥈","🥉"];

  return (
    <div style={{ minHeight:"100vh", background:C.page, paddingBottom:"90px" }}>

      {/* header */}
      <div style={{ padding:"52px 16px 16px", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"36px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>Season</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:C.accent, letterSpacing:"0.04em", fontStyle:"italic" }}>{getSeasonName()}</div>
        </div>
        <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:"14px", padding:"10px 14px", textAlign:"right", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:C.muted, letterSpacing:"0.08em", marginBottom:"3px" }}>ENDS IN</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:C.heading, letterSpacing:"0.04em" }}>{countdown}</div>
        </div>
      </div>

      {/* MY SEASON CARD — white card, dark text */}
      <div style={{ margin:"0 16px 16px", background:C.card, border:`1.5px solid ${C.border}`, borderRadius:"20px", padding:"18px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"14px" }}>
          <div style={{ fontSize:"40px" }}>{myTier.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:myTier.color, letterSpacing:"0.04em" }}>{myTier.name}</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:C.muted }}>{myRank ? `#${myRank} this season` : "Not ranked yet"}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"36px", color:C.accent, letterSpacing:"0.04em" }}>{myPoints}</div>
            <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:C.muted, letterSpacing:"0.08em" }}>POINTS</div>
          </div>
        </div>

        {/* progress bar */}
        {nextTier && (
          <div style={{ marginBottom:"14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
              <span style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted }}>{myTier.icon} {myTier.name}</span>
              <span style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted }}>{ptsToNext} pts to {nextTier.icon} {nextTier.name}</span>
            </div>
            <div style={{ height:"8px", background:C.page, borderRadius:"4px", border:`1px solid ${C.border}` }}>
              <div style={{ height:"100%", width:`${pct}%`, background:C.accent, borderRadius:"4px", transition:"width 0.6s ease" }}/>
            </div>
          </div>
        )}

        {/* points key */}
        <div style={{ display:"flex", gap:"8px" }}>
          {[
            { label:"Win a bet",        pts:"+3 pts", color:"#10b981" },
            { label:"Complete forfeit", pts:"+1 pt",  color:C.gold   },
            { label:"Group bet",        pts:"2×",     color:"#4a9eff" },
          ].map(item => (
            <div key={item.label} style={{ flex:1, background:C.page, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"10px 6px", textAlign:"center" }}>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:item.color, letterSpacing:"0.04em" }}>{item.pts}</div>
              <div style={{ fontFamily:T.fontBody, fontSize:"11px", color:C.muted, marginTop:"3px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div style={{ display:"flex", margin:"0 16px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"4px" }}>
        {[["current","This Season"],["history","Past Seasons"]].map(([key,label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{ flex:1, padding:"10px", borderRadius:"10px", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"500", cursor:"pointer", background:tab===key ? C.heading : "transparent", color:tab===key ? C.accent : C.muted, border:"none", transition:"all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CURRENT SEASON ── */}
      {tab === "current" && (
        loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"48px" }}>
            <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
            <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, animation:"_sp 0.8s linear infinite" }}/>
          </div>
        ) : rankings.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 16px", gap:"12px" }}>
            <div style={{ fontSize:"40px" }}>🏆</div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>No rankings yet</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:C.muted, textAlign:"center" }}>Place bets this month to appear on the board</div>
          </div>
        ) : (
          <div style={{ padding:"0 16px" }}>
            {/* podium */}
            {rankings.length >= 3 && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:"8px", marginBottom:"20px" }}>
                <PodiumCard u={rankings[1]} rank={2} height="70px"  color={C.silver} />
                <PodiumCard u={rankings[0]} rank={1} height="100px" color={C.gold}   isTop />
                <PodiumCard u={rankings[2]} rank={3} height="50px"  color={C.bronze} />
              </div>
            )}

            {/* full list */}
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Full rankings</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {rankings.map((r, i) => {
                const isMe = r.uid === user.uid;
                return (
                  <div key={r.uid} style={{
                    display:"flex", alignItems:"center", gap:"12px",
                    background: isMe ? C.heading : C.card,
                    border:`1.5px solid ${isMe ? C.accent : C.border}`,
                    borderRadius:"16px", padding:"12px 14px",
                    boxShadow: isMe ? "0 2px 8px rgba(16,185,129,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", width:"32px", textAlign:"center", flexShrink:0, color:i===0?C.gold:i===1?C.silver:i===2?C.bronze:C.muted }}>
                      {i<3 ? medals[i] : i+1}
                    </div>
                    {r.photo
                      ? <img src={r.photo} alt="" style={{ width:"40px", height:"40px", borderRadius:"50%", objectFit:"cover", flexShrink:0, border:`1.5px solid ${isMe?C.accent:C.border}` }}/>
                      : <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:isMe?`${C.accent}20`:C.page, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:isMe?C.accent:C.heading, border:`1.5px solid ${isMe?C.accent:C.border}`, flexShrink:0 }}>
                          {(r.name||"?").charAt(0)}
                        </div>
                    }
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:isMe?"#fff":C.heading }}>
                        {isMe ? "You" : r.name}
                      </div>
                      <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:isMe?`${C.accent}cc`:C.muted, marginTop:"2px" }}>
                        {r.wins}W · {r.losses}L · {r.winRate}% win rate
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:isMe?C.accent:C.heading, letterSpacing:"0.04em" }}>{r.points}</div>
                      <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:isMe?`${C.accent}99`:C.muted }}>pts</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* rewards */}
            <div style={{ marginTop:"20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"16px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>Season rewards</div>
              {[
                { place:"🥇 1st place", reward:"Legend badge + Season Champion title" },
                { place:"🥈 2nd place", reward:"Veteran badge + 50 bonus honour"      },
                { place:"🥉 3rd place", reward:"Competitor badge + 25 bonus honour"    },
                { place:"Top 10%",      reward:"Season Survivor badge"                 },
              ].map(item => (
                <div key={item.place} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px", gap:"12px" }}>
                  <div style={{ fontFamily:T.fontBody, fontSize:"13px", fontWeight:"600", color:C.heading, flexShrink:0 }}>{item.place}</div>
                  <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:C.muted, textAlign:"right" }}>{item.reward}</div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── PAST SEASONS ── */}
      {tab === "history" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ display:"flex", gap:"8px", marginBottom:"16px", overflowX:"auto", paddingBottom:"4px" }}>
            {getPastSeasons().map(s => (
              <button key={s.id} type="button" onClick={() => setPastSeason(s)}
                style={{ padding:"8px 16px", borderRadius:"20px", fontFamily:T.fontBody, fontSize:"13px", cursor:"pointer", flexShrink:0, background:pastSeason.id===s.id?C.heading:C.card, color:pastSeason.id===s.id?C.accent:C.muted, border:`1px solid ${pastSeason.id===s.id?C.accent:C.border}`, transition:"all 0.2s" }}>
                {s.name}
              </button>
            ))}
          </div>
          {pastLoading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"48px" }}>
              <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, animation:"_sp 0.8s linear infinite" }}/>
            </div>
          ) : pastRankings.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 16px", gap:"12px" }}>
              <div style={{ fontSize:"40px" }}>📅</div>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>No data yet</div>
              <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:C.muted, textAlign:"center" }}>Past season results appear here once the season ends</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {pastRankings.map((r,i) => (
                <div key={r.uid} style={{ display:"flex", alignItems:"center", gap:"12px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"12px 14px" }}>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", width:"32px", textAlign:"center", color:C.muted }}>{i<3?medals[i]:i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:C.heading }}>{r.name}</div>
                    <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted }}>{r.wins}W · {r.losses}L</div>
                  </div>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading, letterSpacing:"0.04em" }}>{r.points} pts</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PodiumCard({ u, rank, height, color, isTop }) {
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
      <div style={{ fontFamily:T.fontDisplay, fontSize:"15px", color:C.accent, letterSpacing:"0.04em" }}>{u.points}pts</div>
      <div style={{ width:"100%", height, background:C.heading, borderRadius:"8px 8px 0 0", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:"8px" }}>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:C.accent, letterSpacing:"0.04em" }}>#{rank}</div>
      </div>
    </div>
  );
}