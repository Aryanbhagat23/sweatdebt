import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, deleteDoc, getDocs, addDoc,
} from "firebase/firestore";
import T from "../theme";
import DailyChallenge from "../components/DailyChallenge";
import LiveSportsFeed from "../components/LiveSportsFeed";
import NotificationBell from "../components/NotificationBell";
import NotificationCenter from "../components/NotificationCenter";
import { getPendingDebts, checkAndApplyPenalties } from "../utils/penaltySystem";

/* ── Send notification helper ────────────────────────────────── */
async function sendNotif({ toUid, fromUid, fromName, type, betId, text }) {
  if (!toUid || toUid === fromUid) return;
  try {
    await addDoc(collection(db, "notifications"), {
      toUserId:   toUid,
      fromUserId: fromUid,
      fromName,
      type,
      betId:      betId || null,
      message:    text,
      read:       false,
      createdAt:  serverTimestamp(),
    });
  } catch(e) { console.warn("Notif failed:", e); }
}

/* ── Countdown hook + pill ─────────────────────────────────── */
function useCountdown(ts) {
  const get = () => {
    if (!ts?.toDate) return null;
    const d = ts.toDate() - new Date();
    return d > 0 ? d : 0;
  };
  const [ms, setMs] = useState(get);
  useEffect(() => {
    if (!ts?.toDate) return;
    const t = setInterval(() => setMs(get()), 1000);
    return () => clearInterval(t);
  }, [ts]);
  if (ms === null) return null;
  if (ms === 0) return { label:"EXPIRED", urgent:true, expired:true };
  const s = Math.floor(ms/1000);
  const days  = Math.floor(s/86400);
  const hours = Math.floor((s%86400)/3600);
  const mins  = Math.floor((s%3600)/60);
  const secs  = s%60;
  return {
    label:   days>0 ? `${days}d ${hours}h` : hours>0 ? `${hours}h ${mins}m` : `${mins}m ${String(secs).padStart(2,"0")}s`,
    urgent:  ms < 2*3600000,
    warning: ms < 24*3600000,
    expired: false,
    ms,
  };
}

function CountdownPill({ ts }) {
  const cd = useCountdown(ts);
  if (!cd) return null;
  const color  = cd.expired||cd.urgent ? T.red       : cd.warning ? T.yellow      : T.green;
  const bg     = cd.expired||cd.urgent ? T.redLight  : cd.warning ? T.yellowLight  : T.greenLight;
  const border = cd.expired||cd.urgent ? T.redBorder : cd.warning ? T.yellowBorder : T.greenBorder;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"5px", background:bg, border:`1px solid ${border}`, borderRadius:T.rFull, padding:"3px 9px" }}>
      {!cd.expired && (
        <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:color, animation:cd.urgent?"pulse 0.8s ease-in-out infinite":"none" }}/>
      )}
      <span style={{ fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color }}>
        {cd.expired ? "TIME UP" : cd.label}
      </span>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────── */
async function pruneNotifs(uid) {
  try {
    const cutoff = new Date(Date.now() - 86400000);
    const snap = await getDocs(query(collection(db,"notifications"), where("toUserId","==",uid)));
    await Promise.all(
      snap.docs
        .filter(d => { const ts = d.data().createdAt?.toDate?.(); return ts && ts < cutoff && d.data().read; })
        .map(d => deleteDoc(doc(db,"notifications",d.id)))
    );
  } catch(e) {}
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 🌅";
  if (h < 17) return "Good afternoon ☀️";
  if (h < 21) return "Good evening 🌆";
  return "Good night 🌙";
}

function timeAgo(ts) {
  if (!ts?.toDate) return "";
  const s = Math.floor((new Date() - ts.toDate()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

const SPORT_EMOJI = {
  cricket:"🏏", football:"⚽", gaming:"🎮", basketball:"🏀",
  chess:"♟️", custom:"🎯", nba:"🏀", nfl:"🏈", soccer:"⚽",
  nhl:"🏒", mlb:"⚾", mma:"🥊",
};

/* ── Main component ────────────────────────────────────────── */
export default function Bets({ user }) {
  const navigate = useNavigate();

  const [tab,        setTab]       = useState("challenges");
  const [challenges, setChallenges]= useState([]);
  const [myBets,     setMyBets]    = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [expanded,   setExpanded]  = useState(null);
  const [showSports, setShowSports]= useState(true);
  const [notifOpen,  setNotifOpen] = useState(false);
  const [debts,      setDebts]     = useState([]);
  const [debtOpen,   setDebtOpen]  = useState(false);

  useEffect(() => { if (user) pruneNotifs(user.uid); }, [user]);

  useEffect(() => {
    if (!user) return;
    checkAndApplyPenalties(user.uid);
    getPendingDebts(user.uid).then(setDebts).catch(()=>{});
  }, [user]);

  /* load challenges (incoming — where opponentEmail matches OR opponentUid matches) */
  useEffect(() => {
    if (!user) return;

    // Listen by email
    const u1 = onSnapshot(
      query(collection(db,"bets"), where("opponentEmail","==",user.email)),
      snap => {
        const d = snap.docs.map(x=>({id:x.id,...x.data()}));
        d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
        setChallenges(d);
        setLoading(false);
      },
      () => setLoading(false)
    );

    // Load my bets
    const u2 = onSnapshot(
      query(collection(db,"bets"), where("createdBy","==",user.uid)),
      snap => {
        const d = snap.docs.map(x=>({id:x.id,...x.data()}));
        d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
        setMyBets(d);
      },
      () => {}
    );

    return () => { u1(); u2(); };
  }, [user]);

  const allBets  = [...myBets, ...challenges];
  const stats = {
    won:    allBets.filter(b => b.status === "won"  || b.status === "approved").length,
    lost:   allBets.filter(b => b.status === "lost" || b.status === "disputed").length,
    active: allBets.filter(b => ["pending","accepted"].includes(b.status)).length,
  };
  const pending = challenges.filter(b => b.status === "pending");
  const list    = tab === "challenges" ? challenges : myBets;

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:T.bg0, padding:"52px 16px 16px" }}>

        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"4px" }}>
          <div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted }}>{greeting()}</div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:T.panel, letterSpacing:"0.02em", lineHeight:1, fontStyle:"italic" }}>
              {user?.displayName?.split(" ")[0]}'s <span style={{ color:T.accent }}>Bets</span>
            </div>
          </div>
          <NotificationBell user={user} onClick={() => setNotifOpen(true)} />
        </div>

        {/* 4-TILE STAT BAR */}
        <div style={{ display:"flex", background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:"14px", overflow:"hidden", marginTop:"14px", marginBottom:debts.length>0?"8px":"0" }}>
          {[
            { label:"WON",  val:stats.won,    color:T.accent },
            { label:"LOST", val:stats.lost,   color:T.yellow||"#f5a623" },
            { label:"LIVE", val:stats.active, color:T.panel },
          ].map((s, i) => (
            <div key={s.label} style={{ flex:1, padding:"12px 0", textAlign:"center", borderRight:`1px solid ${T.borderCard}` }}>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", fontWeight:"700", color:s.color, fontStyle:"italic" }}>{s.val}</div>
              <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:T.textMuted, letterSpacing:"0.08em", marginTop:"2px" }}>{s.label}</div>
            </div>
          ))}
          <div
            onClick={() => debts.length>0 && setDebtOpen(o=>!o)}
            style={{ flex:1, padding:"12px 0", textAlign:"center", background:debts.length>0?"#fef2f2":T.bg0, borderLeft:`2px solid ${debts.length>0?"#ef4444":T.borderCard}`, cursor:debts.length>0?"pointer":"default" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", fontWeight:"700", color:debts.length>0?"#ef4444":T.textMuted, fontStyle:"italic" }}>{debts.length}</div>
            <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:debts.length>0?"#ef4444":T.textMuted, letterSpacing:"0.08em", marginTop:"2px" }}>
              DEBTS{debts.length>0?(debtOpen?" ↑":" ↓"):""}
            </div>
          </div>
        </div>

        {/* DEBT PANEL */}
        {debtOpen && debts.length>0 && (
          <div style={{ background:T.bg1, border:"1.5px solid #ef4444", borderRadius:"12px", overflow:"hidden", marginBottom:"10px", animation:"slideDown 0.2s ease" }}>
            <div style={{ padding:"8px 14px", background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:"10px", color:"#ef4444", fontFamily:T.fontMono, letterSpacing:"0.1em", fontWeight:"700" }}>
                💀 PENDING FORFEITS — {debts.length} owed
              </span>
              <span style={{ fontSize:"10px", color:"#ef4444", fontFamily:T.fontMono }}>24h window</span>
            </div>
            {debts.map((debt, i) => (
              <div key={debt.id} style={{ padding:"12px 14px", borderBottom:i<debts.length-1?"1px solid #fde8e8":"none", display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:debt.expired?"#ef4444":debt.urgent?"#f5a623":T.accent, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"13px", fontWeight:"600", color:T.panel, fontFamily:T.fontBody }}>{debt.reps} {debt.forfeit}</div>
                  <div style={{ fontSize:"11px", color:debt.expired?"#ef4444":debt.urgent?"#f5a623":T.textMuted, fontFamily:T.fontMono, marginTop:"2px" }}>
                    vs {debt.opponentName||debt.opponentEmail||"opponent"} · {debt.timeLabel}
                  </div>
                </div>
                <button type="button" onClick={() => navigate(`/upload/${debt.id}`)}
                  style={{ padding:"7px 14px", background:debt.expired?"#ef4444":debt.urgent?"#f5a623":T.panel, border:"none", borderRadius:"20px", fontSize:"11px", fontFamily:T.fontMono, fontWeight:"700", color:"#fff", cursor:"pointer", flexShrink:0 }}>
                  UPLOAD
                </button>
              </div>
            ))}
            <div style={{ padding:"8px 14px", background:"#fef9c3", display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ fontSize:"12px" }}>⚠️</span>
              <span style={{ fontSize:"11px", color:"#92400e", fontFamily:T.fontMono }}>Miss the window → -15 honour + "Debt Dodger" badge</span>
            </div>
          </div>
        )}

        {/* Chalkboard bars */}
        <div style={{ background:T.bg1, borderRadius:T.r16, padding:"16px", marginTop:"12px", border:`1px solid ${T.borderCard}`, boxShadow:T.shadowCard }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:T.accentLight, border:`1.5px solid ${T.accent}`, borderRadius:T.rFull, padding:"3px 10px", fontFamily:T.fontMono, fontSize:"9px", fontWeight:"800", color:T.accentDark, letterSpacing:"0.08em", marginBottom:"12px" }}>
            ✦ CHALKBOARD
          </div>
          {[
            { label:"WON",  val:stats.won,    color:T.green },
            { label:"LOST", val:stats.lost,   color:T.red   },
            { label:"LIVE", val:stats.active, color:T.textMuted },
          ].map((s, i) => (
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:i<2?"8px":"0" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"9px", fontWeight:"700", color:s.color, width:"32px", textAlign:"right", letterSpacing:"0.06em" }}>{s.label}</div>
              <div style={{ flex:1, height:"7px", background:`${s.color}18`, borderRadius:"4px", overflow:"hidden" }}>
                <div style={{ width:`${Math.max((s.val/Math.max(stats.won+stats.lost+stats.active,1))*100,0)}%`, height:"100%", background:s.color, borderRadius:"4px", transition:"width 0.8s ease", minWidth:s.val>0?"10px":"0" }}/>
              </div>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:s.color, width:"20px" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display:"flex", gap:"10px", marginTop:"12px" }}>
          <button type="button" onClick={() => navigate("/create")}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", background:T.panel, border:"none", borderRadius:T.rFull, padding:"12px 16px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer", boxShadow:T.shadowMd }}>
            ⚔️ NEW BET
          </button>
          <button type="button" onClick={() => navigate("/group-bets")}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"12px 16px", background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:T.rFull, fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:T.panel, cursor:"pointer" }}>
            👥 GROUP
          </button>
          <button type="button" onClick={() => navigate("/friends")}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", background:T.bg1, border:`1.5px solid ${T.borderMid}`, borderRadius:T.rFull, padding:"12px 16px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.panel, cursor:"pointer" }}>
            👥 FRIENDS
          </button>
        </div>
      </div>

      <NotificationCenter user={user} isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <DailyChallenge user={user} />

      {/* Live sports toggle */}
      <div style={{ margin:"0 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:T.red, animation:"livePulse 1s ease-in-out infinite" }}/>
          <span style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Live Sports Bets</span>
        </div>
        <button type="button" style={{ background:"transparent", border:"none", fontFamily:T.fontMono, fontSize:"11px", color:T.accent, cursor:"pointer" }} onClick={() => setShowSports(p=>!p)}>
          {showSports ? "Hide ▲" : "Show ▼"}
        </button>
      </div>
      {showSports && <LiveSportsFeed user={user} />}

      <div style={{ height:"1px", background:T.border, margin:"8px 16px 16px" }}/>

      {/* Pending challenges banner */}
      {pending.length>0 && (
        <div style={{ margin:"0 16px 12px", background:T.accentLight, border:`1.5px solid ${T.accent}`, borderRadius:T.r16, padding:"14px 16px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}
          onClick={() => setTab("challenges")}>
          <span style={{ fontSize:"20px" }}>⚔️</span>
          <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"700", color:T.panel }}>
            {pending.length} friend{pending.length>1?"s":""} challenged you!
          </div>
          <div style={{ marginLeft:"auto", fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>TAP →</div>
        </div>
      )}

      <div style={{ padding:"0 16px 10px" }}>
        <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.12em", textTransform:"uppercase" }}>Active Bets</div>
      </div>

      {/* Tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", margin:"0 16px 12px", background:T.panel, borderRadius:T.r16, padding:"4px" }}>
        {[
          { key:"challenges", label:`Challenges (${challenges.length})` },
          { key:"mybets",     label:`My Bets (${myBets.length})` },
        ].map(t => (
          <div key={t.key}
            style={{ padding:"12px", textAlign:"center", borderRadius:"12px", cursor:"pointer", background:tab===t.key?T.accent:"transparent", fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:tab===t.key?"#fff":"rgba(255,255,255,0.4)", transition:"all 0.2s" }}
            onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Bet list */}
      {loading
        ? <div style={{ display:"flex", justifyContent:"center", padding:"32px" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"spin 0.8s linear infinite" }}/>
          </div>
        : list.length===0
          ? <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:"40px", marginBottom:"10px" }}>⚔️</div>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.textMuted, letterSpacing:"0.04em", fontStyle:"italic" }}>
                {tab==="challenges" ? "No challenges yet" : "No bets placed yet"}
              </div>
              <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, marginTop:"6px" }}>
                Tap NEW BET to challenge a friend!
              </div>
            </div>
          : <div style={{ padding:"0 16px" }}>
              {list.map(b => (
                <BetCard
                  key={b.id}
                  bet={b}
                  user={user}
                  expanded={expanded===b.id}
                  onToggle={() => setExpanded(expanded===b.id?null:b.id)}
                  navigate={navigate}
                  isChallenge={tab==="challenges"}
                />
              ))}
            </div>
      }
    </div>
  );
}

/* ── BET CARD ── */
function BetCard({ bet, user, expanded, onToggle, navigate, isChallenge }) {
  const [actioning, setActioning] = useState(false);
  const st       = T.status[bet.status] || T.status.pending;
  const isLost   = bet.status==="lost";
  const isActive = ["pending","accepted"].includes(bet.status);
  const sport    = bet.sport || "custom";
  const emoji    = SPORT_EMOJI[sport] || "🎯";

  const handleAccept = async () => {
    setActioning(true);
    try {
      const dl = new Date(Date.now() + 48*3600000);
      await updateDoc(doc(db,"bets",bet.id), {
        status:      "accepted",
        deadline:    dl,
        acceptedAt:  serverTimestamp(),
        // ✅ make sure opponentUid is set so Feed can identify the opponent
        opponentUid: user.uid,
        participants: [bet.createdBy, user.uid],
      });
      // ✅ notify the challenger that their bet was accepted
      await sendNotif({
        toUid:    bet.createdBy,
        fromUid:  user.uid,
        fromName: user.displayName || "Your opponent",
        type:     "bet_accepted",
        betId:    bet.id,
        text:     `${user.displayName || "Your opponent"} accepted your challenge! The bet is live 🔥`,
      });
    } catch(e) { console.error(e); }
    setActioning(false);
  };

  const handleDecline = async () => {
    setActioning(true);
    try {
      await updateDoc(doc(db,"bets",bet.id), { status:"declined" });
      // notify challenger
      await sendNotif({
        toUid:    bet.createdBy,
        fromUid:  user.uid,
        fromName: user.displayName || "Your opponent",
        type:     "bet_declined",
        betId:    bet.id,
        text:     `${user.displayName || "Your opponent"} declined your challenge.`,
      });
    } catch(e) { console.error(e); }
    setActioning(false);
  };

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
          {bet.description || `${isChallenge ? bet.createdByName : bet.opponentName||bet.opponentEmail} · Loser does ${bet.reps||"?"} ${bet.forfeit||"exercise"}`}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"13px", color:T.accent, flexShrink:0 }}>
            {(isChallenge ? bet.createdByName : user?.displayName)?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted }}>vs</div>
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:T.greenLight, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"13px", color:T.panel, flexShrink:0 }}>
            {(isChallenge ? user?.displayName : bet.opponentName||bet.opponentEmail)?.charAt(0)?.toUpperCase() || "?"}
          </div>
          {bet.forfeit && (
            <div style={{ background:T.accentLight, border:`1px solid ${T.accentBorder}`, borderRadius:T.rFull, padding:"4px 10px", fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.accentDark }}>
              {bet.reps ? `${bet.reps} ${bet.forfeit}` : bet.forfeit}
            </div>
          )}
          {isActive && bet.deadline
            ? <div style={{ marginLeft:"auto" }}><CountdownPill ts={bet.deadline}/></div>
            : <div style={{ marginLeft:"auto", fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted }}>{timeAgo(bet.createdAt)}</div>
          }
        </div>

        {isLost && (
          <div style={{ background:T.redLight, border:`1px solid ${T.redBorder}`, borderRadius:T.r12, padding:"10px 14px", marginTop:"8px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"14px", color:T.red, letterSpacing:"0.04em" }}>
              💀 DEBT DUE — {bet.reps && `${bet.reps}x `}{bet.forfeit}
            </div>
          </div>
        )}
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"14px 16px" }}>
          <div style={{ display:"flex", gap:"10px" }}>
            {isLost && (
              <button type="button"
                style={{ flex:1, background:T.panel, border:"none", borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer" }}
                onClick={() => navigate(`/upload/${bet.id}`)}>
                📹 PAY DEBT
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button type="button"
                disabled={actioning}
                style={{ flex:1, background:actioning?"#e5e7eb":T.accent, border:"none", borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:"#fff", cursor:actioning?"not-allowed":"pointer", boxShadow:"0 4px 14px rgba(16,185,129,0.35)", opacity:actioning?0.7:1 }}
                onClick={handleAccept}>
                {actioning ? "..." : "✓ ACCEPT"}
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button type="button"
                disabled={actioning}
                style={{ flex:1, background:"transparent", border:`1.5px solid ${T.borderMid}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.textMuted, cursor:actioning?"not-allowed":"pointer", opacity:actioning?0.7:1 }}
                onClick={handleDecline}>
                {actioning ? "..." : "✗ DECLINE"}
              </button>
            )}
            {bet.status==="accepted" && !isChallenge && (
              <button type="button"
                style={{ flex:1, background:"transparent", border:`1.5px solid ${T.accent}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", color:T.accent, cursor:"pointer" }}
                onClick={() => navigate(`/upload/${bet.id}`)}>
                📹 Submit Proof
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}