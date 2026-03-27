import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import T from "../theme";

export default function GroupBetRoom({ user }) {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [bet,     setBet]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "group_bets", id), snap => {
      if (snap.exists()) setBet({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading || !bet) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"_sp 0.8s linear infinite" }}/>
    </div>
  );

  const myMember  = bet.members?.find(m => m.uid === user.uid);
  const isCreator = bet.createdBy === user.uid;
  const accepted  = bet.members?.filter(m => m.status === "accepted") || [];
  const pending   = bet.members?.filter(m => m.status === "invited")  || [];
  const isActive  = bet.status === "active";
  const isPending = bet.status === "pending";

  const RULE_LABELS = {
    all_lose:   "All losers do the forfeit",
    last_loses: "Last to finish loses",
    most_votes: "Group votes on the loser",
    elimination:"Elimination — worst each round",
  };

  const timeLeft = () => {
    if (!bet.deadline?.toDate) return null;
    const ms = bet.deadline.toDate() - new Date();
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleAccept = async () => {
    setActing(true);
    try {
      const updatedMembers = bet.members.map(m =>
        m.uid === user.uid ? { ...m, status:"accepted" } : m
      );
      await updateDoc(doc(db,"group_bets",id), { members: updatedMembers });

      // if enough accepted, set to active
      const nowAccepted = updatedMembers.filter(m => m.status==="accepted").length;
      if (nowAccepted >= (bet.minMembers || 2)) {
        await updateDoc(doc(db,"group_bets",id), { status:"active" });
      }
    } catch(e) { console.error(e); }
    setActing(false);
  };

  const handleDecline = async () => {
    setActing(true);
    try {
      const updatedMembers = bet.members.map(m =>
        m.uid === user.uid ? { ...m, status:"declined" } : m
      );
      await updateDoc(doc(db,"group_bets",id), { members: updatedMembers });
      navigate("/group-bets");
    } catch(e) { console.error(e); }
    setActing(false);
  };

  const handleMarkWon = async () => {
    setActing(true);
    try {
      const updatedMembers = bet.members.map(m =>
        m.uid === user.uid ? { ...m, result:"won" } : m
      );
      await updateDoc(doc(db,"group_bets",id), { members: updatedMembers });

      // check if all have submitted results
      const allDone = updatedMembers.every(m => m.result !== null && m.status==="accepted");
      if (allDone) {
        await updateDoc(doc(db,"group_bets",id), { status:"completed" });
      }
    } catch(e) { console.error(e); }
    setActing(false);
  };

  const handleMarkLost = async () => {
    setActing(true);
    try {
      const updatedMembers = bet.members.map(m =>
        m.uid === user.uid ? { ...m, result:"lost" } : m
      );
      await updateDoc(doc(db,"group_bets",id), { members: updatedMembers });
      navigate(`/upload`); // go upload forfeit proof
    } catch(e) { console.error(e); }
    setActing(false);
  };

  const resultColors = { won:"#10b981", lost:"#ef4444", pending: T.textMuted };
  const resultLabels = { won:"✓ Won", lost:"✗ Lost", pending:"Pending" };

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"40px" }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 16px" }}>
        <button type="button" onClick={() => navigate("/group-bets")}
          style={{ width:"44px", height:"44px", borderRadius:"50%", background:T.bg1, border:`1px solid ${T.border}`, color:T.panel, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ←
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>{bet.name}</div>
          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>by {isCreator ? "You" : bet.createdByName}</div>
        </div>
        {/* 2× badge */}
        <div style={{ background:`${T.accent}20`, border:`1px solid ${T.accent}60`, borderRadius:"20px", padding:"4px 12px", fontFamily:T.fontMono, fontSize:"11px", color:T.accent }}>2× honour</div>
      </div>

      <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:"12px" }}>

        {/* status + countdown */}
        <div style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"16px", padding:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color: isActive?"#10b981": isPending?"#f5a623":"#6b7280", letterSpacing:"0.04em", fontStyle:"italic" }}>
              {isActive?"🟢 LIVE":isPending?"🟡 WAITING":"✅ COMPLETED"}
            </div>
            {timeLeft() && (
              <div style={{ fontFamily:T.fontDisplay, fontSize:"20px", color: bet.status==="completed" ? "#6b7280" : T.panel, letterSpacing:"0.04em" }}>
                {timeLeft()}
              </div>
            )}
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, lineHeight:"1.5" }}>
            "{bet.description}"
          </div>
        </div>

        {/* bet details */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
          {[
            { label:"Forfeit",  val:`${bet.reps} ${bet.forfeit}` },
            { label:"Rule",     val: RULE_LABELS[bet.rule] || bet.rule },
            { label:"Members",  val:`${accepted.length}/${bet.members?.length} accepted` },
            { label:"Min to start", val:`${bet.minMembers} people` },
          ].map(item => (
            <div key={item.label} style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"12px", padding:"12px" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>{item.label}</div>
              <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.panel, fontWeight:"500" }}>{item.val}</div>
            </div>
          ))}
        </div>

        {/* my action — accept/decline if invited */}
        {myMember?.status === "invited" && (
          <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}40`, borderRadius:"16px", padding:"16px" }}>
            <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.panel, marginBottom:"4px" }}>
              You've been invited!
            </div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, marginBottom:"14px" }}>
              Do you accept the challenge? Losers must complete {bet.reps} {bet.forfeit} and post proof.
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <button type="button" onClick={handleAccept} disabled={acting}
                style={{ flex:1, padding:"14px", background:T.panel, border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:T.accent, cursor:"pointer", opacity:acting?0.5:1 }}>
                ✓ ACCEPT
              </button>
              <button type="button" onClick={handleDecline} disabled={acting}
                style={{ flex:1, padding:"14px", background:"transparent", border:"2px solid #ef4444", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:"#ef4444", cursor:"pointer", opacity:acting?0.5:1 }}>
                ✗ DECLINE
              </button>
            </div>
          </div>
        )}

        {/* my result — submit if active and not yet submitted */}
        {myMember?.status === "accepted" && isActive && myMember.result === null && (
          <div style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"16px", padding:"16px" }}>
            <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color:T.panel, marginBottom:"4px" }}>
              Submit your result
            </div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, marginBottom:"14px" }}>
              Did you win or lose? Losers must upload proof.
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <button type="button" onClick={handleMarkWon} disabled={acting}
                style={{ flex:1, padding:"14px", background:"rgba(16,185,129,0.9)", border:"none", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:"#052e16", cursor:"pointer", opacity:acting?0.5:1 }}>
                🏆 I WON
              </button>
              <button type="button" onClick={handleMarkLost} disabled={acting}
                style={{ flex:1, padding:"14px", background:"rgba(239,68,68,0.12)", border:"2px solid rgba(239,68,68,0.65)", borderRadius:"12px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.04em", color:"#ef4444", cursor:"pointer", opacity:acting?0.5:1 }}>
                💀 I LOST
              </button>
            </div>
          </div>
        )}

        {/* members list */}
        <div>
          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Members ({bet.members?.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {bet.members?.map(m => {
              const statusColor = m.status==="accepted" ? "#10b981" : m.status==="declined" ? "#ef4444" : "#f5a623";
              const statusLabel = m.status==="accepted" ? "accepted" : m.status==="declined" ? "declined" : "invited";
              const resultColor = m.result ? resultColors[m.result] : T.textMuted;
              const resultLabel = m.result ? resultLabels[m.result] : "No result yet";

              return (
                <div key={m.uid} style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px", display:"flex", alignItems:"center", gap:"12px" }}>
                  {m.photo
                    ? <img src={m.photo} alt="" style={{ width:"42px", height:"42px", borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
                    : <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:T.accent, flexShrink:0 }}>
                        {(m.name||"?").charAt(0)}
                      </div>
                  }
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:T.panel }}>
                        {m.uid === user.uid ? "You" : m.name}
                      </div>
                      {m.uid === bet.createdBy && (
                        <div style={{ background:`${T.accent}20`, color:T.accent, fontSize:"10px", fontFamily:T.fontMono, padding:"2px 8px", borderRadius:"10px" }}>CREATOR</div>
                      )}
                    </div>
                    <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:statusColor, marginTop:"2px" }}>
                      {statusLabel}
                    </div>
                  </div>
                  {m.status === "accepted" && (
                    <div style={{ fontFamily:T.fontMono, fontSize:"12px", color:resultColor, fontWeight:"500" }}>
                      {resultLabel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* pending members waiting */}
        {isPending && pending.length > 0 && (
          <div style={{ background:`rgba(245,166,35,0.1)`, border:`1px solid rgba(245,166,35,0.3)`, borderRadius:"14px", padding:"14px", fontFamily:T.fontBody, fontSize:"13px", color:"#f5a623" }}>
            ⏳ Waiting for {pending.length} more person{pending.length!==1?"s":""} to accept before the bet goes live
          </div>
        )}

        {/* proof videos if any */}
        {bet.proofVideos?.length > 0 && (
          <div>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Forfeit proofs</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {bet.proofVideos.map((v,i) => (
                <video key={i} src={v} style={{ width:"100%", borderRadius:"10px", background:"#000" }} controls preload="metadata"/>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}