import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import DailyChallenge from "../components/DailyChallenge";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, addDoc,
} from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", coral:"#ff6b4a", green:"#00e676",
  red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a",
  purple:"#a855f7", amber:"#f59e0b",
};

// ── Countdown hook ──────────────────────────────────────────────
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

  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  let label;
  if (days > 0) label = `${days}d ${hours}h`;
  else if (hours > 0) label = `${hours}h ${mins}m`;
  else label = `${mins}m ${String(secs).padStart(2,"0")}s`;

  const urgent = ms < 2 * 60 * 60 * 1000; // < 2 hours = red
  const warning = ms < 24 * 60 * 60 * 1000; // < 24 hours = amber

  return { label, urgent, warning, expired: false, days, hours, mins, secs, ms };
}

// ── Countdown badge component ───────────────────────────────────
function CountdownBadge({ deadlineTs, small }) {
  const cd = useCountdown(deadlineTs);
  if (!cd) return null;

  const color = cd.expired || cd.urgent ? C.red : cd.warning ? C.amber : C.green;
  const bg = cd.expired || cd.urgent ? "rgba(255,77,109,0.12)" : cd.warning ? "rgba(245,158,11,0.12)" : "rgba(0,230,118,0.12)";
  const border = cd.expired || cd.urgent ? "rgba(255,77,109,0.4)" : cd.warning ? "rgba(245,158,11,0.4)" : "rgba(0,230,118,0.4)";

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"5px",
      background:bg, border:`1px solid ${border}`,
      borderRadius:"20px", padding: small ? "3px 8px" : "5px 12px",
    }}>
      {/* Pulsing dot */}
      {!cd.expired && (
        <div style={{
          width: small?"6px":"8px", height: small?"6px":"8px",
          borderRadius:"50%", background:color, flexShrink:0,
          animation: cd.urgent ? "pulse 0.8s ease-in-out infinite" : cd.warning ? "pulse 1.5s ease-in-out infinite" : "none",
        }} />
      )}
      {cd.expired && <span style={{ fontSize: small?"10px":"12px" }}>💀</span>}
      <span style={{
        fontFamily:"'DM Mono',monospace",
        fontSize: small ? "10px" : "13px",
        fontWeight:"600", color, letterSpacing:"0.05em",
      }}>
        {cd.expired ? "TIME UP" : cd.label}
      </span>
    </div>
  );
}

export default function Bets({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("challenges");
  const [challenges, setChallenges] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    // Bets where I am the opponent (challenges TO me)
    const q1 = query(collection(db,"bets"), where("opponentEmail","==",user.email));
    const unsub1 = onSnapshot(q1, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setChallenges(data); setLoading(false);
    }, ()=>setLoading(false));

    // Bets I created
    const q2 = query(collection(db,"bets"), where("createdBy","==",user.uid));
    const unsub2 = onSnapshot(q2, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setMyBets(data); setLoading(false);
    }, ()=>{});

    return () => { unsub1(); unsub2(); };
  }, [user]);

  const stats = {
    won: myBets.filter(b => b.status==="won" || (b.createdBy===user?.uid && b.status==="lost")).length,
    lost: myBets.filter(b => b.status==="lost" && b.createdBy!==user?.uid).length + challenges.filter(b=>b.status==="lost").length,
    active: [...myBets,...challenges].filter(b=>["pending","accepted"].includes(b.status)).length,
  };

  const pendingChallenges = challenges.filter(b => b.status === "pending");

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, paddingBottom:"90px" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes slideDown{from{max-height:0;opacity:0}to{max-height:600px;opacity:1}}
      `}</style>

      {/* Header */}
      <div style={{ padding:"52px 16px 20px" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"40px", color:C.white, letterSpacing:"0.04em", lineHeight:1 }}>
          My <span style={{ color:C.cyan }}>Bets</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", padding:"0 16px 20px" }}>
        {[
          { val:stats.won,    label:"Won",    color:C.green },
          { val:stats.lost,   label:"Lost",   color:C.red   },
          { val:stats.active, label:"Active", color:C.cyan  },
        ].map(s => (
          <div key={s.label} style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"16px 12px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted, marginTop:"4px", letterSpacing:"0.1em" }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Daily Challenge */}
      <DailyChallenge user={user} />

      {/* Action buttons */}
      <div style={{ padding:"0 16px 20px", display:"flex", flexDirection:"column", gap:"10px" }}>
        <button style={{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"18px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"0.06em", color:"#000", cursor:"pointer" }}
          onClick={() => navigate("/create")}>
          + PLACE NEW BET
        </button>
        <button style={{ background:"transparent", border:`1px solid ${C.border2}`, borderRadius:"16px", padding:"14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:C.cyan, cursor:"pointer" }}
          onClick={() => navigate("/friends")}>
          🔍 FIND FRIENDS
        </button>
      </div>

      {/* Pending challenges banner */}
      {pendingChallenges.length > 0 && (
        <div style={{ margin:"0 16px 16px", background:"rgba(0,212,255,0.08)", border:`1px solid rgba(0,212,255,0.3)`, borderRadius:"14px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}
          onClick={() => setActiveTab("challenges")}>
          <span style={{ fontSize:"20px" }}>⚔️</span>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", fontWeight:"600", color:C.cyan }}>
            {pendingChallenges.length} friend{pendingChallenges.length>1?"s":""} challenged you!
          </div>
          <div style={{ marginLeft:"auto", fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted }}>TAP →</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0", margin:"0 16px 16px", background:C.bg2, borderRadius:"14px", padding:"4px", border:`1px solid ${C.border1}` }}>
        {[
          { key:"challenges", label:`Challenges (${challenges.length})` },
          { key:"mybets",     label:`My Bets (${myBets.length})` },
        ].map(t => (
          <div key={t.key} style={{
            padding:"12px", textAlign:"center", borderRadius:"10px", cursor:"pointer",
            background: activeTab===t.key ? `linear-gradient(135deg,${C.cyan},${C.purple})` : "transparent",
            fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:"600",
            color: activeTab===t.key ? "#000" : C.muted,
            transition:"all 0.2s",
          }} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Bet list */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"40px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${C.border1}`, borderTop:`3px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
        </div>
      ) : (
        <div style={{ padding:"0 16px" }}>
          {(activeTab==="challenges" ? challenges : myBets).length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 20px" }}>
              <div style={{ fontSize:"48px", marginBottom:"12px" }}>⚔️</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:C.muted, letterSpacing:"0.04em", marginBottom:"8px" }}>
                {activeTab==="challenges" ? "No challenges yet" : "No bets placed yet"}
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.dim }}>
                {activeTab==="challenges" ? "Ask friends to challenge you!" : "Place your first bet above"}
              </div>
            </div>
          ) : (
            (activeTab==="challenges" ? challenges : myBets).map(bet => (
              <BetCard
                key={bet.id}
                bet={bet}
                user={user}
                expanded={expandedId === bet.id}
                onToggle={() => setExpandedId(expandedId===bet.id ? null : bet.id)}
                navigate={navigate}
                isChallenge={activeTab==="challenges"}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BetCard({ bet, user, expanded, onToggle, navigate, isChallenge }) {
  const statusConfig = {
    pending:   { label:"PENDING",   color:C.amber,  bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.4)"  },
    accepted:  { label:"ACTIVE",    color:C.cyan,   bg:"rgba(0,212,255,0.12)",   border:"rgba(0,212,255,0.4)"   },
    lost:      { label:"LOST",      color:C.red,    bg:"rgba(255,77,109,0.12)",  border:"rgba(255,77,109,0.4)"  },
    won:       { label:"WON",       color:C.green,  bg:"rgba(0,230,118,0.12)",   border:"rgba(0,230,118,0.4)"   },
    completed: { label:"DONE",      color:C.green,  bg:"rgba(0,230,118,0.12)",   border:"rgba(0,230,118,0.4)"   },
    disputed:  { label:"DISPUTED",  color:C.coral,  bg:"rgba(255,107,74,0.12)",  border:"rgba(255,107,74,0.4)"  },
  };
  const st = statusConfig[bet.status] || statusConfig.pending;
  const isLost = bet.status==="lost";
  const isActive = ["pending","accepted"].includes(bet.status);

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "";
    const s = Math.floor((new Date() - ts.toDate())/1000);
    if (s<60) return "just now";
    if (s<3600) return `${Math.floor(s/60)}m ago`;
    if (s<86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div style={{ background:C.bg2, border:`1px solid ${isLost?"rgba(255,77,109,0.3)":C.border1}`, borderRadius:"20px", marginBottom:"12px", overflow:"hidden", transition:"all 0.2s" }}>

      {/* Lost banner */}
      {isLost && (
        <div style={{ background:"rgba(255,77,109,0.15)", padding:"10px 16px", display:"flex", alignItems:"center", gap:"8px", borderBottom:`1px solid rgba(255,77,109,0.2)` }}>
          <span style={{ fontSize:"16px" }}>💀</span>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", color:C.red, letterSpacing:"0.04em" }}>YOU LOST — TIME TO SWEAT</div>
        </div>
      )}

      {/* Main row */}
      <div style={{ padding:"16px", cursor:"pointer" }} onClick={onToggle}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
          {/* Avatar */}
          <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"17px", color:"#000", flexShrink:0 }}>
            {(isChallenge ? bet.createdByName : bet.opponentName)?.charAt(0)?.toUpperCase()||"?"}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            {/* Name + time */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px", flexWrap:"wrap" }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", fontWeight:"600", color:C.cyan }}>
                {isChallenge ? bet.createdByName : bet.opponentName || bet.opponentEmail}
              </span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted }}>
                {isChallenge ? "challenged you!" : "you challenged"}
              </span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.dim, marginLeft:"auto" }}>
                {timeAgo(bet.createdAt)}
              </span>
            </div>

            {/* Bet description */}
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:"rgba(224,242,254,0.8)", marginBottom:"8px", lineHeight:"1.4" }}>
              "{bet.description}"
            </div>

            {/* Status + countdown */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:"20px", padding:"4px 10px", fontFamily:"'DM Mono',monospace", fontSize:"11px", fontWeight:"700", color:st.color, letterSpacing:"0.06em" }}>
                {st.label}
              </div>

              {/* LIVE COUNTDOWN — show on active/pending bets */}
              {isActive && bet.deadline && (
                <CountdownBadge deadlineTs={bet.deadline} small />
              )}

              {/* No deadline warning */}
              {isActive && !bet.deadline && (
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.dim }}>No deadline set</div>
              )}
            </div>
          </div>

          <div style={{ color:C.muted, fontSize:"18px", flexShrink:0, transition:"transform 0.2s", transform: expanded?"rotate(180deg)":"rotate(0deg)" }}>▾</div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${C.border1}`, padding:"16px", animation:"slideDown 0.2s ease" }}>

          {/* Forfeit */}
          {bet.forfeit && (
            <div style={{ background:C.bg3, borderRadius:"12px", padding:"12px 14px", marginBottom:"12px" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.1em", marginBottom:"4px" }}>FORFEIT IF YOU LOSE</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:C.coral }}>
                💪 {bet.reps && `${bet.reps}x `}{bet.forfeit}
              </div>
            </div>
          )}

          {/* Full countdown timer */}
          {isActive && bet.deadline && (
            <FullCountdown deadlineTs={bet.deadline} />
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:"10px", marginTop:"4px" }}>
            {isLost && (
              <button style={{ flex:1, background:`linear-gradient(135deg,${C.coral},${C.red})`, border:"none", borderRadius:"14px", padding:"14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:"#fff", cursor:"pointer" }}
                onClick={() => navigate(`/upload/${bet.id}`)}>
                📹 UPLOAD PROOF
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button style={{ flex:1, background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"14px", padding:"14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:"#000", cursor:"pointer" }}
                onClick={async () => {
                  // Accept — set 48h deadline from now
                  const deadline = new Date(Date.now() + 48*60*60*1000);
                  await updateDoc(doc(db,"bets",bet.id), {
                    status:"accepted",
                    deadline: deadline,
                    acceptedAt: serverTimestamp(),
                  });
                }}>
                ✓ ACCEPT
              </button>
            )}
            {bet.status==="pending" && isChallenge && (
              <button style={{ flex:1, background:"transparent", border:`1px solid ${C.border2}`, borderRadius:"14px", padding:"14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:C.muted, cursor:"pointer" }}
                onClick={async () => { await updateDoc(doc(db,"bets",bet.id), { status:"declined" }); }}>
                ✗ DECLINE
              </button>
            )}
            {bet.status==="accepted" && !isChallenge && (
              <button style={{ flex:1, background:"transparent", border:`1px solid ${C.border2}`, borderRadius:"14px", padding:"14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", letterSpacing:"0.04em", color:C.cyan, cursor:"pointer" }}
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

// Big dramatic countdown for expanded view
function FullCountdown({ deadlineTs }) {
  const cd = useCountdown(deadlineTs);
  if (!cd) return null;

  const color = cd.expired || cd.urgent ? C.red : cd.warning ? C.amber : C.green;
  const bg = cd.expired || cd.urgent ? "rgba(255,77,109,0.08)" : cd.warning ? "rgba(245,158,11,0.08)" : "rgba(0,230,118,0.08)";

  if (cd.expired) return (
    <div style={{ background:"rgba(255,77,109,0.1)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:"14px", padding:"16px", textAlign:"center", marginBottom:"12px" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.red, letterSpacing:"0.04em" }}>💀 TIME'S UP</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted, marginTop:"4px" }}>The deadline has passed</div>
    </div>
  );

  return (
    <div style={{ background:bg, border:`1px solid ${color}40`, borderRadius:"14px", padding:"16px", marginBottom:"12px", textAlign:"center" }}>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", marginBottom:"10px" }}>TIME REMAINING</div>
      <div style={{ display:"flex", justifyContent:"center", gap:"8px", alignItems:"center" }}>
        {cd.days > 0 && <TimeUnit val={cd.days} label="DAYS" color={color} />}
        <TimeUnit val={cd.hours} label="HRS" color={color} />
        <Sep color={color} />
        <TimeUnit val={cd.mins} label="MIN" color={color} />
        <Sep color={color} />
        <TimeUnit val={cd.secs} label="SEC" color={color} animate={cd.urgent} />
      </div>
      {cd.urgent && (
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.red, marginTop:"10px", fontWeight:"600" }}>
          ⚠️ Less than 2 hours left — get moving!
        </div>
      )}
      {cd.warning && !cd.urgent && (
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.amber, marginTop:"10px" }}>
          ⏰ Less than 24 hours — don't forget!
        </div>
      )}
    </div>
  );
}

function TimeUnit({ val, label, color, animate }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{
        fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color, lineHeight:1,
        animation: animate ? "pulse 0.8s ease-in-out infinite" : "none",
      }}>
        {String(val).padStart(2,"0")}
      </div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:C.muted, letterSpacing:"0.1em", marginTop:"2px" }}>{label}</div>
    </div>
  );
}

function Sep({ color }) {
  return <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color, opacity:0.5, paddingBottom:"14px" }}>:</div>;
}