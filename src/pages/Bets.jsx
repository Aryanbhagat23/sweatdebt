import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

export default function Bets({ user }) {
  const navigate = useNavigate();
  const [myBets, setMyBets] = useState([]);
  const [incomingBets, setIncomingBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");

  useEffect(() => {
    // Bets I created
    const q1 = query(
      collection(db, "bets"),
      where("createdBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub1 = onSnapshot(q1, snap => {
      setMyBets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Bets sent TO me (by email)
    const q2 = query(
      collection(db, "bets"),
      where("opponentEmail", "==", user.email),
      orderBy("createdAt", "desc")
    );
    const unsub2 = onSnapshot(q2, snap => {
      setIncomingBets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub1(); unsub2(); };
  }, [user.uid, user.email]);

  const allBets = activeTab === "incoming" ? incomingBets : myBets;
  const won = myBets.filter(b => b.status === "won").length;
  const lost = myBets.filter(b => b.status === "lost").length;
  const active = [...myBets, ...incomingBets].filter(b =>
    b.status === "pending" || b.status === "active"
  ).length;

  const forfeitIcons = {
    pushups:"💪", run:"🏃", burpees:"🔥",
    squats:"🦵", plank:"🧘", custom:"✏️"
  };

  const statusStyle = (status) => {
    if (status === "pending") return { background:"rgba(255,92,26,0.15)", color:"#ff5c1a", border:"1px solid rgba(255,92,26,0.3)" };
    if (status === "active") return { background:"rgba(212,255,0,0.15)", color:"#d4ff00", border:"1px solid rgba(212,255,0,0.3)" };
    if (status === "won") return { background:"rgba(0,230,118,0.15)", color:"#00e676", border:"1px solid rgba(0,230,118,0.3)" };
    if (status === "lost") return { background:"rgba(255,68,68,0.15)", color:"#ff4444", border:"1px solid rgba(255,68,68,0.3)" };
    if (status === "proof_uploaded") return { background:"rgba(74,158,255,0.15)", color:"#4a9eff", border:"1px solid rgba(74,158,255,0.3)" };
    if (status === "disputed") return { background:"rgba(255,68,68,0.15)", color:"#ff4444", border:"1px solid rgba(255,68,68,0.3)" };
    return {};
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>My <span style={{color:"#d4ff00"}}>Bets</span></div>
      </div>

      {/* Stats row */}
      <div style={S.stats}>
        <div style={S.stat}>
          <div style={{...S.num, color:"#00e676"}}>{won}</div>
          <div style={S.label}>WON</div>
        </div>
        <div style={S.stat}>
          <div style={{...S.num, color:"#ff4444"}}>{lost}</div>
          <div style={S.label}>LOST</div>
        </div>
        <div style={S.stat}>
          <div style={{...S.num, color:"#d4ff00"}}>{active}</div>
          <div style={S.label}>ACTIVE</div>
        </div>
      </div>

      <button style={S.btn} onClick={() => navigate("/create")}>
        + PLACE NEW BET
      </button>

      {/* Tabs */}
      <div style={S.tabRow}>
        <div
          style={{...S.tab, ...(activeTab==="incoming" ? S.tabActive : {})}}
          onClick={() => setActiveTab("incoming")}
        >
          Challenges ({incomingBets.length})
        </div>
        <div
          style={{...S.tab, ...(activeTab==="mine" ? S.tabActive : {})}}
          onClick={() => setActiveTab("mine")}
        >
          My Bets ({myBets.length})
        </div>
      </div>

      {/* Incoming bets notice */}
      {activeTab === "incoming" && incomingBets.length > 0 && (
        <div style={S.notice}>
          ⚔️ {incomingBets.length} friend{incomingBets.length>1?"s have":"has"} challenged you!
        </div>
      )}

      {loading ? (
        <div style={S.center}><div style={S.loadingText}>Loading...</div></div>
      ) : allBets.length === 0 ? (
        <div style={S.center}>
          <div style={S.emptyIcon}>{activeTab==="incoming" ? "📩" : "⚔️"}</div>
          <div style={S.emptyText}>
            {activeTab==="incoming" ? "No challenges yet" : "No bets placed yet"}
          </div>
          <div style={S.emptySubText}>
            {activeTab==="incoming" ? "When friends challenge you, they appear here" : "Challenge a friend to get started"}
          </div>
        </div>
      ) : (
        <div>
          {allBets.map(bet => (
            <BetCard
              key={bet.id}
              bet={bet}
              user={user}
              forfeitIcons={forfeitIcons}
              statusStyle={statusStyle}
              isIncoming={activeTab === "incoming"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BetCard({ bet, user, forfeitIcons, statusStyle, isIncoming }) {
  const navigate = useNavigate();

  const timeAgo = (ts) => {
    if (!ts) return "just now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const needsProof = isIncoming && bet.status === "pending";
  const proofUploaded = bet.status === "proof_uploaded";

  return (
    <div style={{...S.card, ...(isIncoming && bet.status==="pending" ? S.cardHighlight : {})}}>
      <div style={S.cardTop}>
        <div style={S.cardAvatar}>
          {isIncoming
            ? bet.createdByName?.charAt(0).toUpperCase()
            : bet.opponentEmail?.charAt(0).toUpperCase()
          }
        </div>
        <div style={S.cardUser}>
          <div style={S.cardName}>
            {isIncoming
              ? `${bet.createdByName} challenged you!`
              : `vs ${bet.opponentEmail}`
            }
          </div>
          <div style={S.cardTime}>{timeAgo(bet.createdAt)}</div>
        </div>
        <div style={{...S.statusBadge, ...statusStyle(bet.status)}}>
          {bet.status === "proof_uploaded" ? "PROOF SENT" : bet.status?.toUpperCase()}
        </div>
      </div>

      <div style={S.cardDesc}>"{bet.description}"</div>

      <div style={S.forfeitRow}>
        <div style={S.forfeitLabel}>FORFEIT IF YOU LOSE</div>
        <div style={S.forfeitVal}>
          {forfeitIcons[bet.forfeit] || "💪"} {bet.reps} {bet.forfeit}
        </div>
      </div>

      {/* Accept challenge */}
      {isIncoming && bet.status === "pending" && (
        <div style={S.actionBtns}>
          <button
            style={S.acceptBtn}
            onClick={() => navigate(`/upload/${bet.id}`)}
          >
            📹 UPLOAD YOUR FORFEIT
          </button>
          <div style={S.acceptNote}>
            Accept the challenge — film your forfeit and upload proof
          </div>
        </div>
      )}

      {proofUploaded && !isIncoming && (
        <div style={S.waitingMsg}>
          ⏳ Waiting for opponent to approve...
        </div>
      )}

      {bet.proofUrl && (
        <button
          style={S.viewProofBtn}
          onClick={() => window.open(bet.proofUrl, "_blank")}
        >
          ▶ VIEW PROOF VIDEO
        </button>
      )}
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"90px"},
  header:{padding:"52px 16px 16px"},
  title:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:"#f5f0e8",marginBottom:"4px"},
  stats:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",padding:"0 16px",marginBottom:"16px"},
  stat:{background:"#1a1a1a",borderRadius:"16px",padding:"16px",textAlign:"center",border:"1px solid #222"},
  num:{fontSize:"32px",fontWeight:"700"},
  label:{fontSize:"11px",color:"#666",marginTop:"2px",letterSpacing:"0.08em"},
  btn:{margin:"0 16px 16px",width:"calc(100% - 32px)",background:"#d4ff00",border:"none",borderRadius:"16px",padding:"18px",fontSize:"20px",fontWeight:"700",color:"#000",cursor:"pointer",minHeight:"58px"},
  tabRow:{display:"flex",margin:"0 16px 16px",background:"#1a1a1a",borderRadius:"12px",padding:"4px",border:"1px solid #222"},
  tab:{flex:1,padding:"10px",textAlign:"center",fontSize:"14px",fontWeight:"500",color:"#555",borderRadius:"10px",cursor:"pointer",transition:"all 0.2s"},
  tabActive:{background:"#d4ff00",color:"#000"},
  notice:{margin:"0 16px 12px",background:"rgba(212,255,0,0.1)",border:"1px solid rgba(212,255,0,0.3)",borderRadius:"12px",padding:"12px 16px",fontSize:"14px",color:"#d4ff00",textAlign:"center"},
  card:{margin:"0 16px 10px",background:"#1a1a1a",borderRadius:"20px",padding:"18px",border:"1px solid #222"},
  cardHighlight:{border:"1px solid rgba(212,255,0,0.4)",background:"rgba(212,255,0,0.03)"},
  cardTop:{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px"},
  cardAvatar:{width:"46px",height:"46px",borderRadius:"50%",background:"#2a2a2a",border:"1px solid #444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",fontWeight:"600",color:"#f5f0e8",flexShrink:0},
  cardUser:{flex:1},
  cardName:{fontSize:"15px",fontWeight:"500",color:"#f5f0e8"},
  cardTime:{fontSize:"12px",color:"#555",fontFamily:"monospace",marginTop:"2px"},
  statusBadge:{fontSize:"11px",fontWeight:"500",padding:"6px 12px",borderRadius:"20px",fontFamily:"monospace",letterSpacing:"0.05em"},
  cardDesc:{fontSize:"15px",color:"rgba(245,240,232,0.7)",lineHeight:"1.5",marginBottom:"14px"},
  forfeitRow:{background:"#222",borderRadius:"12px",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"},
  forfeitLabel:{fontSize:"11px",color:"#555",letterSpacing:"0.08em",fontFamily:"monospace"},
  forfeitVal:{fontSize:"15px",fontWeight:"500",color:"#ff5c1a"},
  actionBtns:{display:"flex",flexDirection:"column",gap:"8px"},
  acceptBtn:{width:"100%",background:"#d4ff00",border:"none",borderRadius:"12px",padding:"16px",fontSize:"16px",fontWeight:"700",color:"#000",cursor:"pointer",minHeight:"52px"},
  acceptNote:{fontSize:"12px",color:"#555",textAlign:"center"},
  waitingMsg:{background:"rgba(74,158,255,0.1)",border:"1px solid rgba(74,158,255,0.2)",borderRadius:"12px",padding:"12px 16px",fontSize:"14px",color:"#4a9eff",textAlign:"center"},
  viewProofBtn:{width:"100%",marginTop:"8px",background:"transparent",border:"1px solid #444",borderRadius:"12px",padding:"12px",fontSize:"14px",color:"#888",cursor:"pointer",minHeight:"48px"},
  center:{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 16px",gap:"12px"},
  loadingText:{color:"#555",fontSize:"14px",fontFamily:"monospace"},
  emptyIcon:{fontSize:"48px"},
  emptyText:{color:"#666",fontSize:"16px",fontWeight:"500"},
  emptySubText:{color:"#444",fontSize:"14px",textAlign:"center",lineHeight:"1.5"},
};