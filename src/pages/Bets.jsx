import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, deleteDoc, getDocs } from "firebase/firestore";
import T from "../theme";
import DailyChallenge from "../components/DailyChallenge";
import LiveSportsFeed from "../components/LiveSportsFeed";
import NotificationBell from "../components/NotificationBell";
import NotificationCenter from "../components/NotificationCenter";
import ChallengesBanner from "../components/ChallengesBanner";
import DebtReminderBanner from "../components/DebtReminderBanner";
import { GroupBetsList, CreateGroupBet } from "../components/GroupBet";

// ── Countdown ────────────────────────────────────────────────
function useCountdown(ts) {
  const get = () => { if (!ts?.toDate) return null; const d = ts.toDate() - new Date(); return d > 0 ? d : 0; };
  const [ms, setMs] = useState(get);
  useEffect(() => { if (!ts?.toDate) return; const t = setInterval(() => setMs(get()), 1000); return () => clearInterval(t); }, [ts]);
  if (ms === null) return null;
  if (ms === 0) return { label: "EXPIRED", urgent: true, expired: true };
  const s = Math.floor(ms / 1000), days = Math.floor(s / 86400), hours = Math.floor((s % 86400) / 3600), mins = Math.floor((s % 3600) / 60), secs = s % 60;
  return { label: days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${String(secs).padStart(2,"0")}s`, urgent: ms < 2 * 3600000, warning: ms < 24 * 3600000, expired: false, ms };
}
function CountdownPill({ ts }) {
  const cd = useCountdown(ts); if (!cd) return null;
  const color  = cd.expired||cd.urgent ? T.red   : cd.warning ? T.yellow   : T.green;
  const bg     = cd.expired||cd.urgent ? T.redLight : cd.warning ? T.yellowLight : T.greenLight;
  const border = cd.expired||cd.urgent ? T.redBorder : cd.warning ? T.yellowBorder : T.greenBorder;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"5px", background:bg, border:`1px solid ${border}`, borderRadius:T.rFull, padding:"3px 9px" }}>
      {!cd.expired && <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:color, animation: cd.urgent ? "pulse 0.8s ease-in-out infinite" : "none" }} />}
      <span style={{ fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color }}>{cd.expired ? "TIME UP" : cd.label}</span>
    </div>
  );
}

async function pruneNotifs(uid) {
  try {
    const cutoff = new Date(Date.now() - 86400000);
    const snap = await getDocs(query(collection(db,"notifications"), where("toUserId","==",uid)));
    await Promise.all(snap.docs.filter(d => { const ts = d.data().createdAt?.toDate?.(); return ts && ts < cutoff && d.data().read; }).map(d => deleteDoc(doc(db,"notifications",d.id))));
  } catch(e) {}
}

const SPORT_EMOJI = { cricket:"🏏", football:"⚽", gaming:"🎮", basketball:"🏀", chess:"♟️", custom:"🎯", nba:"🏀", nfl:"🏈", soccer:"⚽", nhl:"🏒", mlb:"⚾", mma:"🥊" };

export default function Bets({ user }) {
  const navigate = useNavigate();
  const [tab,        setTab]       = useState("challenges");
  const [challenges, setChallenges]= useState([]);
  const [myBets,     setMyBets]    = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [expanded,   setExpanded]  = useState(null);
  const [showSports, setShowSports]= useState(true);
  const [notifOpen,  setNotifOpen] = useState(false);

  useEffect(() => { if (user) pruneNotifs(user.uid); }, [user]);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(query(collection(db,"bets"), where("opponentEmail","==",user.email)), snap => {
      const d = snap.docs.map(x => ({ id:x.id, ...x.data() }));
      d.sort((a,b) => (b.createdAt?.toDate?.()||0) - (a.createdAt?.toDate?.()||0));
      setChallenges(d); setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(query(collection(db,"bets"), where("createdBy","==",user.uid)), snap => {
      const d = snap.docs.map(x => ({ id:x.id, ...x.data() }));
      d.sort((a,b) => (b.createdAt?.toDate?.()||0) - (a.createdAt?.toDate?.()||0));
      setMyBets(d);
    }, () => {});
    return () => { u1(); u2(); };
  }, [user]);

  const allBets  = [...myBets, ...challenges];
  const totalLost = allBets.filter(b => b.status === "lost");
  const totalReps = totalLost.reduce((a,b) => a + (b.reps||0), 0);
  const stats = {
    won:    allBets.filter(b => b.status === "won").length,
    lost:   totalLost.length,
    active: allBets.filter(b => ["pending","accepted"].includes(b.status)).length,
  };
  const pending = challenges.filter(b => b.status === "pending");
  const list    = tab === "challenges" ? challenges : myBets;

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ background:T.bg0, padding:"52px 16px 16px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"4px" }}>
          <div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted }}>Good morning 👋</div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:T.panel, letterSpacing:"0.02em", lineHeight:1, fontStyle:"italic" }}>
              {user?.displayName?.split(" ")[0]}'s <span style={{ color:T.accent }}>Bets</span>
            </div>
          </div>
          <NotificationBell user={user} onClick={() => setNotifOpen(true)} />
            <DebtReminderBanner bets={incomingBets} />
    <ChallengesBanner user={user} />
    <GroupBetsList user={user} />
        </div>

        {/* ── SWEAT DEBT OWED card ── */}
        {totalReps > 0 && (
          <div style={{ background:T.accent, borderRadius:T.r16, padding:"16px 20px", marginTop:"16px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(16,185,129,0.35)" }}>
            <div>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", fontWeight:"800", color:"rgba(255,255,255,0.75)", letterSpacing:"0.1em", marginBottom:"4px" }}>SWEAT DEBT OWED</div>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"48px", color:"#fff", lineHeight:1, letterSpacing:"0.02em" }}>{totalReps}</div>
              <div style={{ fontFamily:T.fontBody, fontSize:"12px", color:"rgba(255,255,255,0.8)", marginTop:"4px" }}>
                {totalLost.map(b => b.forfeit).filter(Boolean).slice(0,2).join(" · ")} · {totalLost.length} bet{totalLost.length!==1?"s":""} lost
              </div>
            </div>
            <button onClick={() => navigate("/upload")} style={{ background:"#fff", border:"none", borderRadius:T.r12, padding:"12px 20px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:T.accent, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.12)" }}>Pay Now</button>
          </div>
        )}

        {/* ── Chalkboard stat bars ── */}
        <div style={{ background:T.bg1, borderRadius:T.r16, padding:"16px", marginTop:"12px", border:`1px solid ${T.borderCard}`, boxShadow:T.shadowCard }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:T.accentLight, border:`1.5px solid ${T.accent}`, borderRadius:T.rFull, padding:"3px 10px", fontFamily:T.fontMono, fontSize:"9px", fontWeight:"800", color:T.accentDark, letterSpacing:"0.08em", marginBottom:"12px" }}>✦ CHALKBOARD</div>
          {[
            { label:"WON",  val:stats.won,    color:T.green },
            { label:"LOST", val:stats.lost,   color:T.red   },
            { label:"LIVE", val:stats.active, color:T.textMuted },
          ].map((s, i) => (
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom: i < 2 ? "8px" : "0" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"9px", fontWeight:"700", color:s.color, width:"32px", textAlign:"right", letterSpacing:"0.06em" }}>{s.label}</div>
              <div style={{ flex:1, height:"7px", background:`${s.color}18`, borderRadius:"4px", overflow:"hidden" }}>
                <div style={{ width:`${Math.max((s.val / Math.max(stats.won+stats.lost+stats.active,1))*100,0)}%`, height:"100%", background:s.color, borderRadius:"4px", transition:"width 0.8s ease", minWidth:s.val>0?"10px":"0" }} />
              </div>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:s.color, width:"20px" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display:"flex", gap:"10px", marginTop:"12px" }}>
          <button onClick={() => navigate("/create")} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", background:T.panel, border:"none", borderRadius:T.rFull, padding:"12px 16px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer", boxShadow:T.shadowMd }}>
            ⚔️ NEW BET
          </button>
          <button onClick={() => navigate("/friends")} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", background:T.bg1, border:`1.5px solid ${T.borderMid}`, borderRadius:T.rFull, padding:"12px 16px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.panel, cursor:"pointer", boxShadow:T.shadowSm }}>
            👥 FRIENDS
          </button>
        </div>
      </div>

      <NotificationCenter user={user} isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Daily challenge */}
      <DailyChallenge user={user} />

      {/* Live sports toggle */}
      <div style={{ margin:"0 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:T.red, animation:"livePulse 1s ease-in-out infinite" }} />
          <span style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Live Sports Bets</span>
        </div>
        <button style={{ background:"transparent", border:"none", fontFamily:T.fontMono, fontSize:"11px", color:T.accent, cursor:"pointer" }} onClick={() => setShowSports(p => !p)}>
          {showSports ? "Hide ▲" : "Show ▼"}
        </button>
      </div>
      {showSports && <LiveSportsFeed user={user} />}
      <div style={{ height:"1px", background:T.border, margin:"8px 16px 16px" }} />

      {/* Pending banner */}
      {pending.length > 0 && (
        <div style={{ margin:"0 16px 12px", background:T.accentLight, border:`1.5px solid ${T.accent}`, borderRadius:T.r16, padding:"14px 16px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }} onClick={() => setTab("challenges")}>
          <span style={{ fontSize:"20px" }}>⚔️</span>
          <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"700", color:T.panel }}>{pending.length} friend{pending.length>1?"s":""} challenged you!</div>
          <div style={{ marginLeft:"auto", fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>TAP →</div>
        </div>
      )}

      {/* Active bets label */}
      <div style={{ padding:"0 16px 10px" }}>
        <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.12em", textTransform:"uppercase" }}>Active Bets</div>
      </div>

      {/* Tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", margin:"0 16px 12px", background:T.panel, borderRadius:T.r16, padding:"4px" }}>
        {[{key:"challenges",label:`Challenges (${challenges.length})`},{key:"mybets",label:`My Bets (${myBets.length})`}].map(t => (
          <div key={t.key} style={{ padding:"12px", textAlign:"center", borderRadius:"12px", cursor:"pointer", background:tab===t.key?T.accent:"transparent", fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:tab===t.key?"#fff":"rgba(255,255,255,0.4)", transition:"all 0.2s" }} onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Bet list */}
      {loading
        ? <div style={{ display:"flex", justifyContent:"center", padding:"32px" }}><div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"spin 0.8s linear infinite" }} /></div>
        : list.length === 0
          ? <div style={{ textAlign:"center", padding:"32px 20px" }}><div style={{ fontSize:"40px", marginBottom:"10px" }}>⚔️</div><div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.textMuted, letterSpacing:"0.04em", fontStyle:"italic" }}>{tab==="challenges"?"No challenges yet":"No bets placed yet"}</div><div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, marginTop:"6px" }}>Tap NEW BET to challenge a friend!</div></div>
          : <div style={{ padding:"0 16px" }}>{list.map(b => <BetCard key={b.id} bet={b} user={user} expanded={expanded===b.id} onToggle={() => setExpanded(expanded===b.id?null:b.id)} navigate={navigate} isChallenge={tab==="challenges"} />)}</div>
      }
    </div>
  );
}

function BetCard({ bet, user, expanded, onToggle, navigate, isChallenge }) {
  const st     = T.status[bet.status] || T.status.pending;
  const isLost = bet.status === "lost";
  const isActive = ["pending","accepted"].includes(bet.status);
  const timeAgo = ts => { if (!ts?.toDate) return ""; const s = Math.floor((new Date() - ts.toDate()) / 1000); if (s<60) return "just now"; if (s<3600) return `${Math.floor(s/60)}m ago`; if (s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };
  const sport = bet.sport || "custom";
  const emoji = SPORT_EMOJI[sport] || "🎯";

  return (
    <div style={{ background:T.bg1, border:`1px solid ${isLost?T.redBorder:T.borderCard}`, borderRadius:T.r20, marginBottom:"10px", overflow:"hidden", boxShadow:T.shadowCard }}>
      {/* Sport tag + status */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"5px", background:T.bg3, borderRadius:T.rFull, padding:"3px 10px" }}>
          <span style={{ fontSize:"12px" }}>{emoji}</span>
          <span style={{ fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color:T.textMid, letterSpacing:"0.06em", textTransform:"uppercase" }}>{sport}</span>
        </div>
        {isActive
          ? <div style={{ background:T.accentLight, border:`1px solid ${T.accent}`, borderRadius:T.rFull, padding:"2px 8px", fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color:T.accent, letterSpacing:"0.06em", marginLeft:"auto" }}>● LIVE</div>
          : <div style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:T.rFull, padding:"2px 8px", fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color:st.color, letterSpacing:"0.06em", marginLeft:"auto" }}>{st.label}</div>
        }
      </div>

      {/* Main content */}
      <div style={{ padding:"10px 16px 14px", cursor:"pointer" }} onClick={onToggle}>
        <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.panel, lineHeight:"1.4", marginBottom:"10px" }}>
          {bet.description || `${isChallenge?bet.createdByName:bet.opponentName||bet.opponentEmail} · Loser does ${bet.reps||"?"} ${bet.forfeit||"exercise"}`}
        </div>

        {/* Players + forfeit pill */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"13px", color:T.accent, flexShrink:0 }}>
            {(isChallenge?bet.createdByName:user?.displayName)?.charAt(0)?.toUpperCase()||"A"}
          </div>
          <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted }}>vs</div>
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:T.greenLight, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"13px", color:T.panel, flexShrink:0 }}>
            {(isChallenge?user?.displayName:bet.opponentName||bet.opponentEmail)?.charAt(0)?.toUpperCase()||"?"}
          </div>
          {bet.forfeit && (
            <div style={{ background:T.accentLight, border:`1px solid ${T.accentBorder}`, borderRadius:T.rFull, padding:"4px 10px", fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.accentDark }}>
              {bet.reps ? `${bet.reps} ${bet.forfeit}` : bet.forfeit}
            </div>
          )}
          {isActive && bet.deadline && <div style={{ marginLeft:"auto" }}><CountdownPill ts={bet.deadline} /></div>}
          {!isActive && <div style={{ marginLeft:"auto", fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted }}>{timeAgo(bet.createdAt)}</div>}
        </div>

        {/* Lost debt bar */}
        {isLost && (
          <div style={{ background:T.redLight, border:`1px solid ${T.redBorder}`, borderRadius:T.r12, padding:"10px 14px", marginTop:"8px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"14px", color:T.red, letterSpacing:"0.04em" }}>💀 DEBT DUE — {bet.reps&&`${bet.reps}x `}{bet.forfeit}</div>
          </div>
        )}
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"14px 16px" }}>
          <div style={{ display:"flex", gap:"10px" }}>
            {isLost && <button style={{ flex:1, background:T.panel, border:"none", borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer" }} onClick={() => navigate(`/upload/${bet.id}`)}>📹 PAY DEBT</button>}
            {bet.status==="pending" && isChallenge && (
              <button style={{ flex:1, background:T.accent, border:"none", borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:"#fff", cursor:"pointer", boxShadow:"0 4px 14px rgba(16,185,129,0.35)" }} onClick={async () => { const dl = new Date(Date.now()+48*3600000); await updateDoc(doc(db,"bets",bet.id),{status:"accepted",deadline:dl,acceptedAt:serverTimestamp()}); }}>✓ ACCEPT</button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button style={{ flex:1, background:"transparent", border:`1.5px solid ${T.borderMid}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.textMuted, cursor:"pointer" }} onClick={async () => await updateDoc(doc(db,"bets",bet.id),{status:"declined"})}>✗ DECLINE</button>
            )}
            {bet.status==="accepted" && !isChallenge && (
              <button style={{ flex:1, background:"transparent", border:`1.5px solid ${T.accent}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", color:T.accent, cursor:"pointer" }} onClick={() => navigate(`/upload/${bet.id}`)}>📹 Submit Proof</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}