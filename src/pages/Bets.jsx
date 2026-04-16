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
import { notifyBetAccepted, notifyBetDeclined } from "../utils/pushNotification";

// ── Chalkboard palette (same as ME page) ──────────────────────────────────────
const CHALK  = "#2C4A3E";
const ACCENT = "#10b981";
const MINT   = "#f0fdf4";
const BORDER = "#d1fae5";
const WHITE  = "#ffffff";
const MUTED  = "#6b7280";

/* ── Send notification helper ─────────────────────────────────────────────── */
async function sendNotif({ toUid, fromUid, fromName, type, betId, text }) {
  if (!toUid || toUid === fromUid) return;
  try {
    await addDoc(collection(db, "notifications"), {
      toUserId: toUid, fromUserId: fromUid, fromName,
      type, betId: betId || null, message: text, read: false, createdAt: serverTimestamp(),
    });
  } catch(e) { console.warn("Notif failed:", e); }
}

/* ── Countdown ────────────────────────────────────────────────────────────── */
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
  const days = Math.floor(s/86400), hours = Math.floor((s%86400)/3600);
  const mins = Math.floor((s%3600)/60), secs = s%60;
  return {
    label:   days>0 ? `${days}d ${hours}h` : hours>0 ? `${hours}h ${mins}m` : `${mins}m ${String(secs).padStart(2,"0")}s`,
    urgent:  ms < 2*3600000, warning: ms < 24*3600000, expired: false, ms,
  };
}

function CountdownPill({ ts }) {
  const cd = useCountdown(ts);
  if (!cd) return null;
  const color  = cd.expired||cd.urgent ? T.red       : cd.warning ? T.yellow      : ACCENT;
  const bg     = cd.expired||cd.urgent ? T.redLight  : cd.warning ? T.yellowLight  : T.greenLight;
  const border = cd.expired||cd.urgent ? T.redBorder : cd.warning ? T.yellowBorder : BORDER;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"5px", background:bg, border:`1px solid ${border}`, borderRadius:T.rFull, padding:"3px 9px" }}>
      {!cd.expired && <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:color, animation:cd.urgent?"pulse 0.8s ease-in-out infinite":"none" }}/>}
      <span style={{ fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color }}>
        {cd.expired ? "TIME UP" : cd.label}
      </span>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
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

/* ── Main component ───────────────────────────────────────────────────────── */
export default function Bets({ user }) {
  const navigate = useNavigate();

  const [tab,          setTab]         = useState("challenges");
  const [challenges,   setChallenges]  = useState([]);
  const [myBets,       setMyBets]      = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [expanded,     setExpanded]    = useState(null);
  const [showSports,   setShowSports]  = useState(true);
  const [notifOpen,    setNotifOpen]   = useState(false);
  const [debts,        setDebts]       = useState([]);
  const [debtOpen,     setDebtOpen]    = useState(false);
  const [groupInvites, setGroupInvites]= useState([]);

  useEffect(() => { if (user) pruneNotifs(user.uid); }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db,"group_bets"), where("invitedUids","array-contains",user.uid));
    const unsub = onSnapshot(q, snap => {
      const invites = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(g => g.members?.find(m => m.uid === user.uid)?.status === "invited");
      setGroupInvites(invites);
    }, () => {});
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    checkAndApplyPenalties(user.uid);
    getPendingDebts(user.uid).then(setDebts).catch(()=>{});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      query(collection(db,"bets"), where("opponentEmail","==",user.email)),
      snap => {
        const d = snap.docs.map(x=>({id:x.id,...x.data()}));
        d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
        setChallenges(d); setLoading(false);
      },
      () => setLoading(false)
    );
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

  const allBets = [...myBets, ...challenges];
  const stats = {
    won:    allBets.filter(b => b.status==="won"  || b.status==="approved").length,
    lost:   allBets.filter(b => b.status==="lost" || b.status==="disputed").length,
    active: allBets.filter(b => ["pending","accepted"].includes(b.status)).length,
  };
  const pending = challenges.filter(b => b.status === "pending");
  const list    = tab === "challenges" ? challenges : myBets;
  const firstName = user?.displayName?.split(" ")[0] || "Athlete";

  return (
    <div style={{ minHeight:"100vh", background:MINT, paddingBottom:"90px" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── CHALKBOARD HERO HEADER ── */}
      <div style={{ background:CHALK, paddingTop:"max(env(safe-area-inset-top, 0px), 48px)", paddingBottom:"0", position:"relative", overflow:"hidden" }}>

        {/* Subtle ring decoration — matches ME page */}
        <div style={{ position:"absolute", top:"-10px", right:"-10px", width:"120px", height:"120px", opacity:0.06, pointerEvents:"none" }}>
          <svg viewBox="0 0 120 120" fill="none" width="120" height="120">
            <circle cx="120" cy="0" r="55"  stroke="white" strokeWidth="1"/>
            <circle cx="120" cy="0" r="75"  stroke="white" strokeWidth="1"/>
            <circle cx="120" cy="0" r="95"  stroke="white" strokeWidth="1"/>
            <circle cx="120" cy="0" r="115" stroke="white" strokeWidth="1"/>
          </svg>
        </div>

        {/* Top row — greeting + bell */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"0 16px 14px" }}>
          <div>
            <div style={{ fontFamily:T.fontBody, fontSize:"12px", color:"rgba(255,255,255,0.45)", marginBottom:"3px" }}>
              {greeting()}
            </div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"30px", color:WHITE, letterSpacing:"0.02em", lineHeight:1, fontStyle:"italic" }}>
              {firstName}'s <span style={{ color:ACCENT }}>Bets</span>
            </div>
          </div>
          <NotificationBell user={user} onClick={() => setNotifOpen(true)} light />
        </div>

        {/* 4-stat row — same structure as ME page */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          {[
            { label:"WON",   val:stats.won,    color:ACCENT },
            { label:"LOST",  val:stats.lost,   color:"#6ee7b7" },
            { label:"LIVE",  val:stats.active, color:WHITE },
            { label:"DEBTS", val:debts.length, color:debts.length>0?"#ef4444":WHITE, danger:debts.length>0 },
          ].map((s,i)=>(
            <div key={s.label}
              onClick={s.label==="DEBTS" && debts.length>0 ? ()=>setDebtOpen(o=>!o) : undefined}
              style={{
                padding:"10px 4px", textAlign:"center",
                borderRight:i<3?"1px solid rgba(255,255,255,0.06)":"none",
                background:s.danger?"rgba(239,68,68,0.1)":"rgba(255,255,255,0.02)",
                cursor:s.label==="DEBTS" && debts.length>0?"pointer":"default",
              }}>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color:s.color, fontStyle:"italic" }}>{s.val}</div>
              <div style={{ fontFamily:"monospace", fontSize:"8px", color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", marginTop:"2px" }}>
                {s.label}{s.label==="DEBTS"&&debts.length>0?(debtOpen?" ↑":" ↓"):""}
              </div>
            </div>
          ))}
        </div>

        {/* Chalkboard bar chart strip */}
        <div style={{ padding:"10px 16px 14px", background:"rgba(0,0,0,0.12)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:"20px", padding:"2px 8px", fontFamily:"monospace", fontSize:"8px", fontWeight:"800", color:ACCENT, letterSpacing:"0.08em" }}>
              ✦ CHALKBOARD
            </div>
          </div>
          {[
            { label:"WON",  val:stats.won,    color:ACCENT },
            { label:"LOST", val:stats.lost,   color:"#ef4444" },
            { label:"LIVE", val:stats.active, color:"rgba(255,255,255,0.4)" },
          ].map((s,i)=>(
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:i<2?"6px":"0" }}>
              <div style={{ fontFamily:"monospace", fontSize:"8px", fontWeight:"700", color:s.color, width:"28px", textAlign:"right", letterSpacing:"0.06em" }}>{s.label}</div>
              <div style={{ flex:1, height:"6px", background:"rgba(255,255,255,0.08)", borderRadius:"3px", overflow:"hidden" }}>
                <div style={{ width:`${Math.max((s.val/Math.max(stats.won+stats.lost+stats.active,1))*100,0)}%`, height:"100%", background:s.color, borderRadius:"3px", transition:"width 0.8s ease", minWidth:s.val>0?"8px":"0" }}/>
              </div>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:s.color, width:"18px", fontStyle:"italic" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display:"flex", gap:"8px", padding:"0 16px 16px" }}>
          <button type="button" onClick={() => navigate("/create")}
            style={{ flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", background:ACCENT, border:"none", borderRadius:"20px", padding:"12px 16px", fontFamily:T.fontDisplay, fontSize:"17px", letterSpacing:"0.05em", color:"#052e16", cursor:"pointer", fontWeight:"700" }}>
            ⚔️ NEW BET
          </button>
          <button type="button" onClick={() => navigate("/group-bets")}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"12px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"20px", fontFamily:T.fontDisplay, fontSize:"15px", color:WHITE, cursor:"pointer" }}>
            👥 Group
          </button>
          <button type="button" onClick={() => navigate("/friends")}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"12px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"20px", fontFamily:T.fontDisplay, fontSize:"15px", color:WHITE, cursor:"pointer" }}>
            🤝 Friends
          </button>
        </div>
      </div>

      <NotificationCenter user={user} isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* ── DEBT PANEL ── */}
      {debtOpen && debts.length>0 && (
        <div style={{ background:WHITE, border:"1.5px solid #ef4444", borderRadius:"12px", overflow:"hidden", margin:"10px 16px 0", animation:"slideDown 0.2s ease" }}>
          <div style={{ padding:"8px 14px", background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:"10px", color:"#ef4444", fontFamily:"monospace", letterSpacing:"0.1em", fontWeight:"700" }}>💀 PENDING FORFEITS — {debts.length} owed</span>
            <span style={{ fontSize:"10px", color:"#ef4444", fontFamily:"monospace" }}>24h window</span>
          </div>
          {debts.map((debt,i) => (
            <div key={debt.id} style={{ padding:"12px 14px", borderBottom:i<debts.length-1?"1px solid #fde8e8":"none", display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:debt.expired?"#ef4444":debt.urgent?"#f5a623":ACCENT, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"13px", fontWeight:"600", color:"#052e16", fontFamily:T.fontBody }}>{debt.reps} {debt.forfeit}</div>
                <div style={{ fontSize:"11px", color:debt.expired?"#ef4444":debt.urgent?"#f5a623":MUTED, fontFamily:"monospace", marginTop:"2px" }}>
                  vs {debt.opponentName||debt.opponentEmail||"opponent"} · {debt.timeLabel}
                </div>
              </div>
              <button type="button" onClick={() => navigate(`/upload/${debt.id}`)}
                style={{ padding:"7px 14px", background:debt.expired?"#ef4444":debt.urgent?"#f5a623":CHALK, border:"none", borderRadius:"20px", fontSize:"11px", fontFamily:"monospace", fontWeight:"700", color:WHITE, cursor:"pointer", flexShrink:0 }}>
                UPLOAD
              </button>
            </div>
          ))}
          <div style={{ padding:"8px 14px", background:"#fef9c3", display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"12px" }}>⚠️</span>
            <span style={{ fontSize:"11px", color:"#92400e", fontFamily:"monospace" }}>Miss the window → -15 honour + "Debt Dodger" badge</span>
          </div>
        </div>
      )}

      {/* ── DAILY CHALLENGE ── */}
      <div style={{ marginTop:"12px" }}>
        <DailyChallenge user={user} />
      </div>

      {/* ── LIVE SPORTS ── */}
      <div style={{ margin:"0 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#ef4444", animation:"livePulse 1s ease-in-out infinite" }}/>
          <span style={{ fontFamily:"monospace", fontSize:"11px", color:MUTED, letterSpacing:"0.1em", textTransform:"uppercase" }}>Live Sports Bets</span>
        </div>
        <button type="button" style={{ background:"transparent", border:"none", fontFamily:"monospace", fontSize:"11px", color:ACCENT, cursor:"pointer" }} onClick={() => setShowSports(p=>!p)}>
          {showSports ? "Hide ▲" : "Show ▼"}
        </button>
      </div>
      {showSports && <LiveSportsFeed user={user} />}

      <div style={{ height:"1px", background:BORDER, margin:"8px 16px 12px" }}/>

      {/* ── BANNERS ── */}
      {groupInvites.length > 0 && (
        <div style={{ margin:"0 16px 8px", background:"rgba(139,92,246,0.1)", border:"1.5px solid #8b5cf6", borderRadius:"16px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}
          onClick={() => navigate("/group-bets")}>
          <span style={{ fontSize:"20px" }}>👥</span>
          <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"700", color:"#052e16" }}>
            {groupInvites.length} group bet invite{groupInvites.length>1?"s":""}!
          </div>
          <button type="button" onClick={e=>{ e.stopPropagation(); navigate("/group-bets"); }}
            style={{ marginLeft:"auto", background:"#8b5cf6", border:"none", borderRadius:"20px", padding:"6px 14px", fontFamily:"monospace", fontSize:"11px", fontWeight:"700", color:WHITE, cursor:"pointer" }}>
            VIEW →
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ margin:"0 16px 12px", background:"#d1fae5", border:`1.5px solid ${ACCENT}`, borderRadius:"16px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"20px" }}>⚔️</span>
          <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"700", color:"#052e16" }}>
            {pending.length} friend{pending.length>1?"s":""} challenged you!
          </div>
          <button type="button" onClick={() => setTab("challenges")}
            style={{ marginLeft:"auto", background:CHALK, border:"none", borderRadius:"20px", padding:"6px 14px", fontFamily:"monospace", fontSize:"11px", fontWeight:"700", color:ACCENT, cursor:"pointer" }}>
            TAP →
          </button>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ padding:"0 16px 10px" }}>
        <div style={{ fontFamily:"monospace", fontSize:"10px", fontWeight:"700", color:MUTED, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"8px" }}>
          Active Bets
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", background:CHALK, borderRadius:"16px", padding:"4px" }}>
          {[
            { key:"challenges", label:`Challenges (${challenges.length})` },
            { key:"mybets",     label:`My Bets (${myBets.length})` },
          ].map(t => (
            <div key={t.key}
              style={{ padding:"11px", textAlign:"center", borderRadius:"12px", cursor:"pointer", background:tab===t.key?ACCENT:"transparent", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"600", color:tab===t.key?"#052e16":"rgba(255,255,255,0.45)", transition:"all 0.2s" }}
              onClick={() => setTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── BET LIST ── */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"32px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${BORDER}`, borderTop:`3px solid ${ACCENT}`, animation:"spin 0.8s linear infinite" }}/>
        </div>
      ) : list.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px 20px" }}>
          <div style={{ fontSize:"40px", marginBottom:"10px" }}>⚔️</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:MUTED, letterSpacing:"0.04em", fontStyle:"italic" }}>
            {tab==="challenges" ? "No challenges yet" : "No bets placed yet"}
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:MUTED, marginTop:"6px" }}>
            Tap NEW BET to challenge a friend!
          </div>
        </div>
      ) : (
        <div style={{ padding:"0 16px" }}>
          {list.map(b => (
            <BetCard
              key={b.id} bet={b} user={user}
              expanded={expanded===b.id}
              onToggle={() => setExpanded(expanded===b.id?null:b.id)}
              navigate={navigate}
              isChallenge={tab==="challenges"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── BET CARD ─────────────────────────────────────────────────────────────── */
function BetCard({ bet, user, expanded, onToggle, navigate, isChallenge }) {
  const [actioning, setActioning] = useState(false);
  const st       = T.status[bet.status] || T.status.pending;
  const isLost   = bet.status === "lost";
  const isActive = ["pending","accepted"].includes(bet.status);
  const sport    = bet.sport || "custom";
  const emoji    = SPORT_EMOJI[sport] || "🎯";

  const handleAccept = async () => {
    setActioning(true);
    try {
      await updateDoc(doc(db,"bets",bet.id), {
        status:"accepted", deadline:new Date(Date.now()+48*3600000),
        acceptedAt:serverTimestamp(), opponentUid:user.uid,
        participants:[bet.createdBy, user.uid],
      });
      await notifyBetAccepted({
        toUserId:bet.createdBy, fromUserId:user.uid,
        fromName:user.displayName||"Your opponent",
        fromPhoto:user.photoURL||null, betId:bet.id,
      });
    } catch(e) { console.error(e); }
    setActioning(false);
  };

  const handleDecline = async () => {
    setActioning(true);
    try {
      await updateDoc(doc(db,"bets",bet.id), { status:"declined" });
      await notifyBetDeclined({
        toUserId:bet.createdBy, fromUserId:user.uid,
        fromName:user.displayName||"Your opponent", betId:bet.id,
      });
    } catch(e) { console.error(e); }
    setActioning(false);
  };

  return (
    <div style={{ background:WHITE, border:`1px solid ${isLost?"#fecaca":BORDER}`, borderRadius:"20px", marginBottom:"10px", overflow:"hidden" }}>

      {/* Sport tag + status */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"5px", background:MINT, borderRadius:"20px", padding:"3px 10px", border:`1px solid ${BORDER}` }}>
          <span style={{ fontSize:"12px" }}>{emoji}</span>
          <span style={{ fontFamily:"monospace", fontSize:"10px", fontWeight:"700", color:"#065f46", letterSpacing:"0.06em", textTransform:"uppercase" }}>{sport}</span>
        </div>
        {isActive
          ? <div style={{ background:"#d1fae5", border:`1px solid ${ACCENT}`, borderRadius:"20px", padding:"2px 8px", fontFamily:"monospace", fontSize:"10px", fontWeight:"700", color:ACCENT, letterSpacing:"0.06em", marginLeft:"auto" }}>● LIVE</div>
          : <div style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:"20px", padding:"2px 8px", fontFamily:"monospace", fontSize:"10px", fontWeight:"700", color:st.color, letterSpacing:"0.06em", marginLeft:"auto" }}>{st.label}</div>
        }
      </div>

      {/* Main content */}
      <div style={{ padding:"10px 16px 14px", cursor:"pointer" }} onClick={onToggle}>
        <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:"#052e16", lineHeight:"1.4", marginBottom:"10px" }}>
          {bet.description || `${isChallenge ? bet.createdByName : bet.opponentName||bet.opponentEmail} · Loser does ${bet.reps||"?"} ${bet.forfeit||"exercise"}`}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:CHALK, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"13px", color:ACCENT, flexShrink:0 }}>
            {(isChallenge ? bet.createdByName : user?.displayName)?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:MUTED }}>vs</div>
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:MINT, border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"13px", color:"#052e16", flexShrink:0 }}>
            {(isChallenge ? user?.displayName : bet.opponentName||bet.opponentEmail)?.charAt(0)?.toUpperCase() || "?"}
          </div>
          {bet.forfeit && (
            <div style={{ background:MINT, border:`1px solid ${BORDER}`, borderRadius:"20px", padding:"4px 10px", fontFamily:"monospace", fontSize:"11px", fontWeight:"700", color:"#065f46" }}>
              {bet.reps ? `${bet.reps} ${bet.forfeit}` : bet.forfeit}
            </div>
          )}
          {isActive && bet.deadline
            ? <div style={{ marginLeft:"auto" }}><CountdownPill ts={bet.deadline}/></div>
            : <div style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:"10px", color:MUTED }}>{timeAgo(bet.createdAt)}</div>
          }
        </div>

        {isLost && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"12px", padding:"10px 14px", marginTop:"8px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"14px", color:"#ef4444", letterSpacing:"0.04em" }}>
              💀 DEBT DUE — {bet.reps && `${bet.reps}x `}{bet.forfeit}
            </div>
          </div>
        )}
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${BORDER}`, padding:"14px 16px" }}>
          <div style={{ display:"flex", gap:"10px" }}>
            {isLost && (
              <button type="button"
                style={{ flex:1, background:CHALK, border:"none", borderRadius:"16px", padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:ACCENT, cursor:"pointer" }}
                onClick={() => navigate(`/upload/${bet.id}`)}>
                📹 PAY DEBT
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button type="button" disabled={actioning}
                style={{ flex:1, background:actioning?"#e5e7eb":ACCENT, border:"none", borderRadius:"16px", padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:"#052e16", cursor:actioning?"not-allowed":"pointer", opacity:actioning?0.7:1 }}
                onClick={handleAccept}>
                {actioning ? "..." : "✓ ACCEPT"}
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button type="button" disabled={actioning}
                style={{ flex:1, background:"transparent", border:`1.5px solid ${BORDER}`, borderRadius:"16px", padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:MUTED, cursor:actioning?"not-allowed":"pointer", opacity:actioning?0.7:1 }}
                onClick={handleDecline}>
                {actioning ? "..." : "✗ DECLINE"}
              </button>
            )}
            {bet.status==="accepted" && !isChallenge && (
              <button type="button"
                style={{ flex:1, background:"transparent", border:`1.5px solid ${ACCENT}`, borderRadius:"16px", padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", color:ACCENT, cursor:"pointer" }}
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