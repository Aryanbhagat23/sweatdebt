import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot, doc, getDoc,
} from "firebase/firestore";
import T from "../theme";
import NotificationBell from "../components/NotificationBell";
import ChallengesBanner from "../components/ChallengesBanner";
import DebtReminderBanner from "../components/DebtReminderBanner";
import { GroupBetsList, CreateGroupBet } from "../components/GroupBet";
import HonourBadge, { HonourDot } from "../components/HonourBadge";

export default function Bets({ user, onBellClick }) {
  const navigate = useNavigate();

  const [myBets,       setMyBets]       = useState([]);
  const [incomingBets, setIncomingBets] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("incoming");
  const [showGroupBet, setShowGroupBet] = useState(false);

  useEffect(() => {
    const q1 = query(collection(db, "bets"), where("createdBy", "==", user.uid));
    const unsub1 = onSnapshot(q1, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setMyBets(data);
      setLoading(false);
    }, () => setLoading(false));

    const q2 = query(collection(db, "bets"), where("opponentEmail", "==", user.email));
    const unsub2 = onSnapshot(q2, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setIncomingBets(data);
    });

    return () => { unsub1(); unsub2(); };
  }, [user.uid, user.email]);

  const won    = myBets.filter(b => b.status === "won").length;
  const lost   = myBets.filter(b => b.status === "lost").length;
  const active = [...myBets, ...incomingBets].filter(b =>
    b.status === "pending" || b.status === "active"
  ).length;

  const allBets      = activeTab === "incoming" ? incomingBets : myBets;
  const pendingCount = incomingBets.filter(b => b.status === "pending").length;

  const forfeitIcons = {
    pushups:"💪", run:"🏃", burpees:"🔥",
    squats:"🦵", plank:"🧘", custom:"✏️",
  };

  const statusStyle = status => {
    if (status === "pending")        return { bg:"rgba(245,158,11,0.12)",  color:"#f59e0b", border:"rgba(245,158,11,0.35)"  };
    if (status === "active")         return { bg:`${T.accent}15`,          color:T.accent,  border:`${T.accent}40`          };
    if (status === "won")            return { bg:"rgba(16,185,129,0.12)",  color:"#10b981", border:"rgba(16,185,129,0.35)"  };
    if (status === "lost")           return { bg:"rgba(239,68,68,0.12)",   color:"#ef4444", border:"rgba(239,68,68,0.35)"   };
    if (status === "proof_uploaded") return { bg:"rgba(59,130,246,0.12)",  color:"#3b82f6", border:"rgba(59,130,246,0.35)"  };
    if (status === "disputed")       return { bg:"rgba(239,68,68,0.12)",   color:"#ef4444", border:"rgba(239,68,68,0.35)"   };
    return { bg:T.bg1, color:T.textMuted, border:T.border };
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ background:T.panel, padding:"52px 16px 16px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:T.accent, letterSpacing:"0.04em", fontStyle:"italic" }}>
            My Bets
          </div>
          <div onClick={e => e.stopPropagation()}>
            <NotificationBell user={user} onClick={onBellClick} light />
          </div>
        </div>

        {/* CTA pills */}
        <div style={{ display:"flex", gap:"10px" }}>
          <button type="button" onClick={() => navigate("/create")}
            style={{ flex:1, padding:"13px", background:T.accent, border:"none", borderRadius:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.06em", color:"#052e16", cursor:"pointer" }}>
            ⚔️ NEW BET
          </button>
          <button type="button" onClick={() => navigate("/friends")}
            style={{ flex:1, padding:"13px", background:"transparent", border:`1px solid ${T.accent}`, borderRadius:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.06em", color:T.accent, cursor:"pointer" }}>
            👥 FRIENDS
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", padding:"16px 16px 0" }}>
        {[
          { val:won,    color:"#10b981", label:"WON"    },
          { val:lost,   color:"#ef4444", label:"LOST"   },
          { val:active, color:T.accent,  label:"ACTIVE" },
        ].map(s => (
          <div key={s.label} style={{ background:T.bg1, borderRadius:"14px", padding:"14px", textAlign:"center", border:`1px solid ${T.borderCard}` }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted, marginTop:"4px", letterSpacing:"0.1em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── DEBT REMINDER BANNER ── */}
      <div style={{ padding:"16px 0 0" }}>
        <DebtReminderBanner bets={incomingBets} />
      </div>

      {/* ── CHALLENGES BANNER ── */}
      <ChallengesBanner user={user} />

      {/* ── GROUP BETS ── */}
      <div style={{ padding:"0 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em" }}>GROUP BETS</div>
          <button type="button" onClick={() => setShowGroupBet(true)}
            style={{ background:`${T.accent}15`, border:`1px solid ${T.accent}40`, borderRadius:"10px", padding:"6px 12px", fontFamily:T.fontDisplay, fontSize:"13px", letterSpacing:"0.04em", color:T.accent, cursor:"pointer" }}>
            + GROUP BET
          </button>
        </div>
        <GroupBetsList user={user} />
      </div>

      {/* ── TABS ── */}
      <div style={{ display:"flex", margin:"16px 16px 12px", background:T.bg1, borderRadius:"12px", padding:"4px", border:`1px solid ${T.borderCard}` }}>
        {[
          { key:"incoming", label:`Challenges${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          { key:"mine",     label:`My Bets (${myBets.length})`                                },
        ].map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ flex:1, padding:"10px", textAlign:"center", fontFamily:T.fontBody, fontSize:"14px", fontWeight:"500", cursor:"pointer", borderRadius:"10px", transition:"all 0.2s",
              background: activeTab === t.key ? T.panel : "transparent",
              color:       activeTab === t.key ? T.accent : T.textMuted,
            }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ── BET LIST ── */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"48px" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"_spin 0.8s linear infinite" }}/>
        </div>
      ) : allBets.length === 0 ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 20px", gap:"12px" }}>
          <div style={{ fontSize:"40px" }}>{activeTab === "incoming" ? "📩" : "⚔️"}</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>
            {activeTab === "incoming" ? "No challenges yet" : "No bets placed yet"}
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, textAlign:"center" }}>
            {activeTab === "incoming" ? "When friends challenge you, they appear here" : "Tap NEW BET to challenge someone"}
          </div>
        </div>
      ) : (
        <div style={{ padding:"0 16px" }}>
          {allBets.map(bet => (
            <BetCard
              key={bet.id}
              bet={bet}
              user={user}
              forfeitIcons={forfeitIcons}
              statusStyle={statusStyle}
              isIncoming={activeTab === "incoming"}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Group bet creator modal */}
      {showGroupBet && (
        <CreateGroupBet user={user} onClose={() => setShowGroupBet(false)} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   BET CARD with honour score + countdown
───────────────────────────────────────── */
function BetCard({ bet, user, forfeitIcons, statusStyle, isIncoming, navigate }) {
  const [expanded,       setExpanded]       = useState(false);
  const [opponentHonour, setOpponentHonour] = useState(null);
  const [countdown,      setCountdown]      = useState("");
  const timerRef = useRef(null);

  // Fetch opponent honour score
  useEffect(() => {
    const fetchHonour = async () => {
      try {
        const uid = isIncoming ? bet.createdBy : bet.opponentUid;
        if (!uid) return;
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) setOpponentHonour(snap.data().honour ?? 100);
      } catch(e) {}
    };
    fetchHonour();
  }, [bet.id, isIncoming, bet.createdBy, bet.opponentUid]);

  // Live countdown
  useEffect(() => {
    if (!bet.deadline) return;
    const update = () => {
      const diff = bet.deadline.toDate() - new Date();
      if (diff <= 0) { setCountdown("OVERDUE"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 48)  setCountdown(`${Math.floor(h/24)}d ${h%24}h`);
      else if (h > 0) setCountdown(`${h}h ${m}m`);
      else setCountdown(`${m}m ${s}s`);
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [bet.deadline]);

  const ss        = statusStyle(bet.status);
  const isOverdue = countdown === "OVERDUE";
  const isUrgent  = countdown && !isOverdue && !countdown.includes("h") && !countdown.includes("d");

  const timeAgo = ts => {
    if (!ts?.toDate) return "just now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60)    return "just now";
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div style={{
      marginBottom:"10px",
      background: T.bg1,
      borderRadius:"20px",
      border:`1px solid ${isIncoming && bet.status==="pending" ? `${T.accent}50` : T.borderCard}`,
      overflow:"hidden",
      transition:"all 0.2s",
    }}>
      {/* Overdue banner */}
      {isOverdue && (
        <div style={{ background:"rgba(239,68,68,0.15)", borderBottom:"1px solid rgba(239,68,68,0.3)", padding:"6px 16px", display:"flex", alignItems:"center", gap:"6px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#ef4444" }}/>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", fontWeight:"700", color:"#ef4444", letterSpacing:"0.08em" }}>
            OVERDUE — UPLOAD YOUR PROOF NOW
          </span>
        </div>
      )}

      {/* Main tappable area */}
      <div style={{ padding:"16px", cursor:"pointer" }} onClick={() => setExpanded(!expanded)}>

        {/* Top row */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:T.accent, flexShrink:0, border:`2px solid ${T.accent}40` }}>
            {isIncoming
              ? (bet.createdByName || "?").charAt(0).toUpperCase()
              : (bet.opponentEmail || "?").charAt(0).toUpperCase()
            }
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.panel, marginBottom:"2px" }}>
              {isIncoming
                ? <><span style={{ color:T.accent }}>{bet.createdByName}</span> challenged you!</>
                : `vs ${bet.opponentEmail}`
              }
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted }}>
              {timeAgo(bet.createdAt)}
            </div>

            {/* Honour + countdown row */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"6px", flexWrap:"wrap" }}>
              {opponentHonour !== null && (
                <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted, letterSpacing:"0.06em" }}>
                    {isIncoming ? "THEIR" : "OPP"} HONOUR
                  </span>
                  <HonourDot score={opponentHonour} />
                </div>
              )}
              {countdown && countdown !== "OVERDUE" && (
                <div style={{ display:"flex", alignItems:"center", gap:"4px", background: isUrgent?"rgba(239,68,68,0.12)":"rgba(245,158,11,0.1)", border:`1px solid ${isUrgent?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.3)"}`, borderRadius:"8px", padding:"2px 8px" }}>
                  <span style={{ fontSize:"10px" }}>{isUrgent ? "⚡" : "⏱"}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color: isUrgent?"#ef4444":"#f59e0b", fontWeight:"600" }}>
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status + chevron */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px", flexShrink:0 }}>
            <div style={{ background:ss.bg, border:`1px solid ${ss.border}`, borderRadius:"20px", padding:"4px 10px", fontFamily:"'DM Mono',monospace", fontSize:"10px", fontWeight:"600", color:ss.color, letterSpacing:"0.06em", whiteSpace:"nowrap" }}>
              {bet.status === "proof_uploaded" ? "PROOF SENT" : (bet.status || "pending").toUpperCase()}
            </div>
            <div style={{ fontSize:"12px", color:T.textMuted, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.3s" }}>▼</div>
          </div>
        </div>

        {/* Bet description */}
        <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.panel, opacity:0.8, lineHeight:"1.5", marginBottom:"10px" }}>
          "{bet.description}"
        </div>

        {/* Forfeit row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:T.bg0, borderRadius:"10px", padding:"10px 14px" }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em" }}>FORFEIT IF LOST</span>
          <span style={{ fontFamily:T.fontDisplay, fontSize:"17px", color:"#f97316", letterSpacing:"0.04em" }}>
            {forfeitIcons[bet.forfeit] || "💪"} {bet.reps} {bet.forfeit}
          </span>
        </div>
      </div>

      {/* ── EXPANDED SECTION ── */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"14px 16px" }}>

          {/* Full honour badge */}
          {opponentHonour !== null && (
            <div style={{ marginBottom:"12px", display:"flex", alignItems:"center", gap:"10px", background:T.bg0, borderRadius:"12px", padding:"10px 14px" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:T.textMuted, letterSpacing:"0.06em" }}>
                {isIncoming ? "CHALLENGER" : "OPPONENT"} HONOUR
              </div>
              <HonourBadge score={opponentHonour} size="sm" />
              {opponentHonour < 50 && (
                <span style={{ fontFamily:T.fontBody, fontSize:"11px", color:"#ef4444" }}>
                  ⚠ Low — may not complete forfeits
                </span>
              )}
              {opponentHonour >= 90 && (
                <span style={{ fontFamily:T.fontBody, fontSize:"11px", color:"#10b981" }}>
                  Always follows through ✓
                </span>
              )}
            </div>
          )}

          {/* Details grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px" }}>
            {[
              { label:"Created by", val: isIncoming ? bet.createdByName : "You"                      },
              { label:"Opponent",   val: isIncoming ? "You" : bet.opponentEmail?.split("@")[0]        },
              { label:"Activity",   val: bet.forfeit                                                  },
              { label:"Reps",       val: String(bet.reps)                                             },
            ].map(item => (
              <div key={item.label} style={{ background:T.bg0, borderRadius:"10px", padding:"10px 12px" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em", marginBottom:"4px" }}>
                  {item.label.toUpperCase()}
                </div>
                <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.panel, fontWeight:"500" }}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          {/* Upload proof */}
          {isIncoming && bet.status === "pending" && (
            <button type="button" onClick={() => navigate(`/upload/${bet.id}`)}
              style={{ width:"100%", padding:"14px", background:T.accent, border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.06em", color:"#052e16", cursor:"pointer", marginBottom:"8px" }}>
              📹 UPLOAD YOUR FORFEIT
            </button>
          )}

          {/* Waiting */}
          {bet.status === "proof_uploaded" && !isIncoming && (
            <div style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:"12px", padding:"12px 16px", fontFamily:T.fontBody, fontSize:"14px", color:"#3b82f6", textAlign:"center", marginBottom:"8px" }}>
              ⏳ Waiting for opponent to approve...
            </div>
          )}

          {/* View proof */}
          {bet.proofUrl && (
            <button type="button" onClick={() => window.open(bet.proofUrl, "_blank")}
              style={{ width:"100%", padding:"12px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:T.textMuted, cursor:"pointer", marginBottom:"8px" }}>
              ▶ VIEW PROOF VIDEO
            </button>
          )}

          {/* Rematch */}
          {(bet.status === "won" || bet.status === "lost") && (
            <button type="button" onClick={() => navigate("/create")}
              style={{ width:"100%", padding:"12px", background:"transparent", border:`1px solid ${T.accent}`, borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:T.accent, cursor:"pointer" }}>
              ⚔️ REMATCH
            </button>
          )}
        </div>
      )}
    </div>
  );
}