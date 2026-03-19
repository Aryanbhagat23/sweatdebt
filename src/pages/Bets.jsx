import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

export default function Bets({ user }) {
  const navigate = useNavigate();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "bets"),
      where("createdBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setBets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  const won = bets.filter(b => b.status === "won").length;
  const lost = bets.filter(b => b.status === "lost").length;
  const active = bets.filter(b => b.status === "pending" || b.status === "active").length;

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
    return {};
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>My <span style={{color:"#d4ff00"}}>Bets</span></div>
        <div style={S.sub}>Track your wins, losses and debts</div>
      </div>

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

      {loading ? (
        <div style={S.center}>
          <div style={S.loadingText}>Loading bets...</div>
        </div>
      ) : bets.length === 0 ? (
        <div style={S.center}>
          <div style={S.emptyIcon}>⚔️</div>
          <div style={S.emptyText}>No bets yet</div>
          <div style={S.emptySubText}>Challenge a friend to get started</div>
        </div>
      ) : (
        <div>
          {active > 0 && (
            <div style={S.sectionTitle}>Active bets</div>
          )}
          {bets
            .filter(b => b.status === "pending" || b.status === "active" || b.status === "proof_uploaded")
            .map(bet => (
              <BetCard
                key={bet.id}
                bet={bet}
                user={user}
                forfeitIcons={forfeitIcons}
                statusStyle={statusStyle}
              />
            ))
          }

          {(won > 0 || lost > 0) && (
            <div style={S.sectionTitle}>Completed</div>
          )}
          {bets
            .filter(b => b.status === "won" || b.status === "lost")
            .map(bet => (
              <BetCard
                key={bet.id}
                bet={bet}
                user={user}
                forfeitIcons={forfeitIcons}
                statusStyle={statusStyle}
              />
            ))
          }
        </div>
      )}
    </div>
  );
}

function BetCard({ bet, user, forfeitIcons, statusStyle }) {
  const navigate = useNavigate();

  const timeAgo = (ts) => {
    if (!ts) return "just now";
    const seconds = Math.floor((new Date() - ts.toDate()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isMyForfeit = bet.opponentEmail === user?.email && bet.status === "pending";
  const iProof = bet.status === "proof_uploaded" && bet.createdBy === user?.uid;

  return (
    <div style={S.card}>
      <div style={S.cardTop}>
        <div style={S.cardAvatar}>
          {bet.opponentEmail?.charAt(0).toUpperCase() || "?"}
        </div>
        <div style={S.cardUser}>
          <div style={S.cardName}>vs {bet.opponentEmail}</div>
          <div style={S.cardTime}>{timeAgo(bet.createdAt)}</div>
        </div>
        <div style={{...S.statusBadge, ...statusStyle(bet.status)}}>
          {bet.status === "proof_uploaded" ? "PROOF SENT" : bet.status?.toUpperCase()}
        </div>
      </div>

      <div style={S.cardDesc}>"{bet.description}"</div>

      <div style={S.forfeitRow}>
        <div style={S.forfeitLabel}>FORFEIT</div>
        <div style={S.forfeitVal}>
          {forfeitIcons[bet.forfeit] || "💪"} {bet.reps} {bet.forfeit}
        </div>
      </div>

      {/* Upload proof button — shown to loser when bet is pending */}
      {isMyForfeit && (
        <button
          style={S.uploadBtn}
          onClick={() => navigate(`/upload/${bet.id}`)}
        >
          📹 UPLOAD FORFEIT PROOF
        </button>
      )}

      {/* Waiting message — shown to bet creator after proof uploaded */}
      {iProof && (
        <div style={S.waitingMsg}>
          ⏳ Waiting for opponent to approve the proof...
        </div>
      )}

      {/* View proof button if video uploaded */}
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
  sub:{color:"#666",fontSize:"14px"},
  stats:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",padding:"0 16px",marginBottom:"16px"},
  stat:{background:"#1a1a1a",borderRadius:"16px",padding:"16px",textAlign:"center",border:"1px solid #222"},
  num:{fontSize:"32px",fontWeight:"700"},
  label:{fontSize:"11px",color:"#666",marginTop:"2px",letterSpacing:"0.08em"},
  btn:{margin:"0 16px 20px",width:"calc(100% - 32px)",background:"#d4ff00",border:"none",borderRadius:"16px",padding:"18px",fontSize:"20px",fontWeight:"700",color:"#000",cursor:"pointer",minHeight:"58px"},
  sectionTitle:{padding:"0 16px",marginBottom:"10px",fontSize:"11px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace"},
  card:{margin:"0 16px 10px",background:"#1a1a1a",borderRadius:"20px",padding:"18px",border:"1px solid #222"},
  cardTop:{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px"},
  cardAvatar:{width:"46px",height:"46px",borderRadius:"50%",background:"#2a2a2a",border:"1px solid #444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",fontWeight:"600",color:"#f5f0e8",flexShrink:0},
  cardUser:{flex:1},
  cardName:{fontSize:"16px",fontWeight:"500",color:"#f5f0e8"},
  cardTime:{fontSize:"12px",color:"#555",fontFamily:"monospace",marginTop:"2px"},
  statusBadge:{fontSize:"11px",fontWeight:"500",padding:"6px 12px",borderRadius:"20px",fontFamily:"monospace",letterSpacing:"0.05em"},
  cardDesc:{fontSize:"15px",color:"rgba(245,240,232,0.7)",lineHeight:"1.5",marginBottom:"14px"},
  forfeitRow:{background:"#222",borderRadius:"12px",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  forfeitLabel:{fontSize:"11px",color:"#555",letterSpacing:"0.08em",fontFamily:"monospace"},
  forfeitVal:{fontSize:"15px",fontWeight:"500",color:"#ff5c1a"},
  uploadBtn:{width:"100%",marginTop:"12px",background:"#ff5c1a",border:"none",borderRadius:"12px",padding:"16px",fontSize:"16px",fontWeight:"700",color:"#fff",cursor:"pointer",minHeight:"52px"},
  waitingMsg:{marginTop:"12px",background:"rgba(74,158,255,0.1)",border:"1px solid rgba(74,158,255,0.2)",borderRadius:"12px",padding:"12px 16px",fontSize:"14px",color:"#4a9eff",textAlign:"center"},
  viewProofBtn:{width:"100%",marginTop:"10px",background:"transparent",border:"1px solid #444",borderRadius:"12px",padding:"12px",fontSize:"14px",color:"#888",cursor:"pointer",minHeight:"48px"},
  center:{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 16px",gap:"12px"},
  loadingText:{color:"#555",fontSize:"14px",fontFamily:"monospace"},
  emptyIcon:{fontSize:"48px"},
  emptyText:{color:"#666",fontSize:"16px",fontWeight:"500"},
  emptySubText:{color:"#444",fontSize:"14px"},
};