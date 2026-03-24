import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, deleteDoc, getDocs,
} from "firebase/firestore";
import T, { gradientText } from "../theme";
import DailyChallenge from "../components/DailyChallenge";
import LiveSportsFeed from "../components/LiveSportsFeed";
import NotificationBell from "../components/NotificationBell";
import NotificationCenter from "../components/NotificationCenter";

// ── Countdown hook ────────────────────────────────────────────
function useCountdown(deadlineTs) {
  const getLeft = () => {
    if (!deadlineTs?.toDate) return null;
    const diff = deadlineTs.toDate() - new Date();
    return diff > 0 ? diff : 0;
  };
  const [ms, setMs] = useState(getLeft);
  useEffect(() => {
    if (!deadlineTs?.toDate) return;
    const tick = setInterval(() => setMs(getLeft()), 1000);
    return () => clearInterval(tick);
  }, [deadlineTs]);
  if (ms === null) return null;
  if (ms === 0) return { label: "EXPIRED", urgent: true, expired: true };
  const s = Math.floor(ms / 1000);
  const days  = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const secs  = s % 60;
  const label = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${String(secs).padStart(2,"0")}s`;
  return { label, urgent: ms < 2*3600000, warning: ms < 24*3600000, expired: false, ms };
}

function CountdownBadge({ deadlineTs }) {
  const cd = useCountdown(deadlineTs);
  if (!cd) return null;
  const color  = cd.expired||cd.urgent ? T.red    : cd.warning ? T.orange    : T.green;
  const bg     = cd.expired||cd.urgent ? T.redDim : cd.warning ? T.orangeDim : T.greenDim;
  const border = cd.expired||cd.urgent ? T.redBorder : cd.warning ? T.orangeBorder : T.greenBorder;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"5px", background:bg, border:`1px solid ${border}`, borderRadius:T.rFull, padding:"3px 8px" }}>
      {!cd.expired && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:color, flexShrink:0, animation:cd.urgent?"pulse 0.8s ease-in-out infinite":"none" }} />}
      {cd.expired  && <span style={{ fontSize:"10px" }}>💀</span>}
      <span style={{ fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color, letterSpacing:"0.05em" }}>
        {cd.expired ? "TIME UP" : cd.label}
      </span>
    </div>
  );
}

async function pruneOldNotifications(userId) {
  try {
    const cutoff = new Date(Date.now() - 24*60*60*1000);
    const snap = await getDocs(query(collection(db,"notifications"), where("toUserId","==",userId)));
    await Promise.all(
      snap.docs
        .filter(d => { const ts = d.data().createdAt?.toDate?.(); return ts && ts < cutoff && d.data().read; })
        .map(d => deleteDoc(doc(db,"notifications",d.id)))
    );
  } catch(e) { console.error(e); }
}

export default function Bets({ user }) {
  const navigate = useNavigate();
  const [tab,        setTab]        = useState("challenges");
  const [challenges, setChallenges] = useState([]);
  const [myBets,     setMyBets]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState(null);
  const [showSports, setShowSports] = useState(true);
  const [notifOpen,  setNotifOpen]  = useState(false);

  useEffect(() => { if (user) pruneOldNotifications(user.uid); }, [user]);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      query(collection(db,"bets"), where("opponentEmail","==",user.email)),
      snap => { const d=snap.docs.map(x=>({id:x.id,...x.data()})); d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0)); setChallenges(d); setLoading(false); },
      () => setLoading(false)
    );
    const u2 = onSnapshot(
      query(collection(db,"bets"), where("createdBy","==",user.uid)),
      snap => { const d=snap.docs.map(x=>({id:x.id,...x.data()})); d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0)); setMyBets(d); },
      () => {}
    );
    return () => { u1(); u2(); };
  }, [user]);

  const stats = {
    won:    myBets.filter(b => b.status==="won"||(b.createdBy===user?.uid&&b.status==="lost")).length,
    lost:   myBets.filter(b => b.status==="lost"&&b.createdBy!==user?.uid).length + challenges.filter(b => b.status==="lost").length,
    active: [...myBets,...challenges].filter(b => ["pending","accepted"].includes(b.status)).length,
  };

  const pending = challenges.filter(b => b.status==="pending");
  const list    = tab==="challenges" ? challenges : myBets;

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding:"52px 16px 14px" }}>

        {/* Row 1: Title + Bell */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"44px", color:T.white, letterSpacing:"0.02em", lineHeight:1 }}>
            My <span style={gradientText}>Bets</span>
          </div>
          <NotificationBell user={user} onClick={() => setNotifOpen(true)} />
        </div>

        {/* Row 2: Action pill buttons */}
        <div style={{ display:"flex", gap:"10px" }}>
          {/* ⚔️ New Bet — gradient pill */}
          <button
            onClick={() => navigate("/create")}
            style={{
              flex: 1,
              display: "flex", alignItems:"center", justifyContent:"center", gap:"8px",
              background: T.gradPrimary,
              border: "none",
              borderRadius: T.rFull,
              padding: "12px 16px",
              fontFamily: T.fontDisplay,
              fontSize: "18px",
              letterSpacing: "0.05em",
              color: "#fff",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            <span style={{ fontSize:"16px" }}>⚔️</span>
            NEW BET
          </button>

          {/* 👥 Friends — outline pill */}
          <button
            onClick={() => navigate("/friends")}
            style={{
              flex: 1,
              display: "flex", alignItems:"center", justifyContent:"center", gap:"8px",
              background: T.bg2,
              border: `1px solid ${T.borderMid}`,
              borderRadius: T.rFull,
              padding: "12px 16px",
              fontFamily: T.fontDisplay,
              fontSize: "18px",
              letterSpacing: "0.05em",
              color: T.white,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize:"16px" }}>👥</span>
            FRIENDS
          </button>
        </div>
      </div>

      {/* Notification panel */}
      <NotificationCenter user={user} isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* ── STATS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", padding:"0 16px 20px" }}>
        {[
          { val:stats.won,    label:"WON",    color:T.green  },
          { val:stats.lost,   label:"LOST",   color:T.red    },
          { val:stats.active, label:"ACTIVE", color:T.orange },
        ].map(s => (
          <div key={s.label} style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:T.r16, padding:"16px 12px", textAlign:"center" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"38px", color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.muted, marginTop:"4px", letterSpacing:"0.1em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── DAILY CHALLENGE ── */}
      <DailyChallenge user={user} />

      {/* ── LIVE SPORTS ── */}
      <div style={{ margin:"0 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:T.red, animation:"livePulse 1s ease-in-out infinite" }} />
          <span style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Live Sports Bets</span>
        </div>
        <button
          style={{ background:"transparent", border:"none", fontFamily:T.fontMono, fontSize:"11px", color:T.pink, cursor:"pointer" }}
          onClick={() => setShowSports(p => !p)}>
          {showSports ? "Hide ▲" : "Show ▼"}
        </button>
      </div>
      {showSports && <LiveSportsFeed user={user} />}

      <div style={{ height:"1px", background:T.border, margin:"8px 16px 16px" }} />

      {/* ── PENDING CHALLENGE BANNER ── */}
      {pending.length > 0 && (
        <div
          style={{ margin:"0 16px 12px", background:T.pinkDim, border:`1px solid ${T.pinkBorder}`, borderRadius:T.r16, padding:"14px 16px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}
          onClick={() => setTab("challenges")}
        >
          <span style={{ fontSize:"20px" }}>⚔️</span>
          <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.pink }}>
            {pending.length} friend{pending.length>1?"s":""} challenged you!
          </div>
          <div style={{ marginLeft:"auto", fontFamily:T.fontMono, fontSize:"11px", color:T.muted }}>TAP →</div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", margin:"0 16px 12px", background:T.bg1, borderRadius:T.r16, padding:"4px", border:`1px solid ${T.border}` }}>
        {[
          { key:"challenges", label:`Challenges (${challenges.length})` },
          { key:"mybets",     label:`My Bets (${myBets.length})`        },
        ].map(t => (
          <div
            key={t.key}
            style={{ padding:"12px", textAlign:"center", borderRadius:"12px", cursor:"pointer", background:tab===t.key?T.gradPrimary:"transparent", fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:tab===t.key?"#fff":T.muted, transition:"all 0.2s" }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* ── BET LIST ── */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"32px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.bg3}`, borderTop:`3px solid ${T.pink}`, animation:"spin 0.8s linear infinite" }} />
        </div>
      ) : list.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px 20px" }}>
          <div style={{ fontSize:"40px", marginBottom:"10px" }}>⚔️</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.muted, letterSpacing:"0.04em" }}>
            {tab==="challenges" ? "No challenges yet" : "No bets placed yet"}
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.dim, marginTop:"6px" }}>
            {tab==="challenges" ? "Share your link and dare someone!" : "Tap NEW BET above to start"}
          </div>
        </div>
      ) : (
        <div style={{ padding:"0 16px" }}>
          {list.map(bet => (
            <BetCard
              key={bet.id}
              bet={bet}
              user={user}
              expanded={expanded===bet.id}
              onToggle={() => setExpanded(expanded===bet.id ? null : bet.id)}
              navigate={navigate}
              isChallenge={tab==="challenges"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── BetCard ───────────────────────────────────────────────────
function BetCard({ bet, user, expanded, onToggle, navigate, isChallenge }) {
  const st = T.status[bet.status] || T.status.pending;
  const isLost   = bet.status === "lost";
  const isActive = ["pending","accepted"].includes(bet.status);

  const timeAgo = ts => {
    if (!ts?.toDate) return "";
    const s = Math.floor((new Date()-ts.toDate())/1000);
    if (s<60) return "just now";
    if (s<3600) return `${Math.floor(s/60)}m ago`;
    if (s<86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div style={{ background:T.bg1, border:`1px solid ${isLost?"rgba(255,69,58,0.3)":T.border}`, borderRadius:T.r20, marginBottom:"10px", overflow:"hidden" }}>

      {/* Lost banner */}
      {isLost && (
        <div style={{ background:T.redDim, padding:"10px 16px", display:"flex", alignItems:"center", gap:"8px", borderBottom:`1px solid ${T.redBorder}` }}>
          <span style={{ fontSize:"16px" }}>💀</span>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:T.red, letterSpacing:"0.04em" }}>YOU LOST — TIME TO SWEAT</div>
        </div>
      )}

      {/* Sport tag */}
      {bet.gameName && (
        <div style={{ background:T.pinkDim, padding:"6px 14px", borderBottom:`1px solid ${T.border}` }}>
          <span style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.pink }}>🏟️ {bet.gameName}</span>
        </div>
      )}

      {/* Main row */}
      <div style={{ padding:"16px", cursor:"pointer" }} onClick={onToggle}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>

          {/* Avatar */}
          <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:T.gradPrimary, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:"#fff", flexShrink:0 }}>
            {(isChallenge ? bet.createdByName : bet.opponentName)?.charAt(0)?.toUpperCase() || "?"}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px", flexWrap:"wrap" }}>
              <span style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"700", color:T.pink }}>
                {isChallenge ? bet.createdByName : bet.opponentName || bet.opponentEmail}
              </span>
              <span style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.muted }}>
                {isChallenge ? "challenged you!" : "you challenged"}
              </span>
              <span style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.dim, marginLeft:"auto" }}>
                {timeAgo(bet.createdAt)}
              </span>
            </div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:"rgba(255,255,255,0.75)", marginBottom:"8px", lineHeight:"1.4" }}>
              "{bet.description}"
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:T.rFull, padding:"4px 10px", fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:st.color, letterSpacing:"0.06em" }}>
                {st.label}
              </div>
              {isActive && bet.deadline && <CountdownBadge deadlineTs={bet.deadline} />}
            </div>
          </div>

          <div style={{ color:T.muted, fontSize:"18px", flexShrink:0, transition:"transform 0.2s", transform:expanded?"rotate(180deg)":"none" }}>▾</div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"16px" }}>
          {bet.forfeit && (
            <div style={{ background:T.bg3, borderRadius:T.r12, padding:"12px 14px", marginBottom:"12px" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.muted, letterSpacing:"0.1em", marginBottom:"4px" }}>FORFEIT IF YOU LOSE</div>
              <div style={{ fontFamily:T.fontBody, fontSize:"15px", color:T.orange }}>
                💪 {bet.reps && `${bet.reps}x `}{bet.forfeit}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:"10px" }}>
            {isLost && (
              <button
                style={{ flex:1, background:T.gradFire, border:"none", borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.06em", color:"#fff", cursor:"pointer" }}
                onClick={() => navigate(`/upload/${bet.id}`)}>
                📹 UPLOAD PROOF
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button
                style={{ flex:1, background:T.gradPrimary, border:"none", borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.06em", color:"#fff", cursor:"pointer" }}
                onClick={async () => {
                  const dl = new Date(Date.now() + 48*3600000);
                  await updateDoc(doc(db,"bets",bet.id), { status:"accepted", deadline:dl, acceptedAt:serverTimestamp() });
                }}>
                ✓ ACCEPT
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button
                style={{ flex:1, background:"transparent", border:`1px solid ${T.borderMid}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.06em", color:T.muted, cursor:"pointer" }}
                onClick={async () => await updateDoc(doc(db,"bets",bet.id), { status:"declined" })}>
                ✗ DECLINE
              </button>
            )}
            {bet.status==="accepted" && !isChallenge && (
              <button
                style={{ flex:1, background:"transparent", border:`1px solid ${T.borderMid}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", color:T.orange, cursor:"pointer" }}
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