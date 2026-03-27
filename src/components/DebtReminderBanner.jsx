import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import T from "../theme";

/*
  DebtReminderBanner
  Shows a red pulsing banner when you have bets overdue > 24h.
  Place at the top of the Bets page.

  <DebtReminderBanner bets={incomingBets} />
*/
export default function DebtReminderBanner({ bets = [] }) {
  const navigate  = useNavigate();
  const [overdue, setOverdue] = useState([]);
  const [urgent,  setUrgent]  = useState([]);

  useEffect(() => {
    const now = new Date();
    const od = [], ur = [];
    bets.forEach(bet => {
      if (bet.status !== "pending") return;
      const deadline = bet.deadline?.toDate?.();
      if (!deadline) return;
      const diff = deadline - now;
      if (diff < 0)         od.push(bet);
      else if (diff < 21600000) ur.push(bet); // < 6h
    });
    setOverdue(od);
    setUrgent(ur);
  }, [bets]);

  if (overdue.length === 0 && urgent.length === 0) return null;

  return (
    <>
      <style>{`@keyframes _pulse{0%,100%{opacity:1}50%{opacity:0.7}}`}</style>
      <div style={{ margin:"0 16px 12px" }}>

        {/* Overdue bets */}
        {overdue.length > 0 && (
          <div
            onClick={() => navigate(`/upload/${overdue[0].id}`)}
            style={{
              background:"rgba(239,68,68,0.12)",
              border:"1px solid rgba(239,68,68,0.4)",
              borderRadius:"14px",
              padding:"12px 16px",
              display:"flex",
              alignItems:"center",
              gap:"12px",
              cursor:"pointer",
              marginBottom:"8px",
              animation:"_pulse 2s ease infinite",
            }}
          >
            <div style={{ fontSize:"24px", flexShrink:0 }}>🚨</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:"#ef4444", letterSpacing:"0.04em" }}>
                {overdue.length} DEBT{overdue.length>1?"S":""} OVERDUE
              </div>
              <div style={{ fontFamily:T.fontBody, fontSize:"12px", color:"rgba(239,68,68,0.75)", marginTop:"2px" }}>
                {overdue.length===1
                  ? `"${overdue[0].description?.slice(0,40)}..." — tap to upload proof now`
                  : `${overdue.length} bets past deadline — tap to complete them`
                }
              </div>
            </div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"14px", color:"#ef4444", flexShrink:0 }}>→</div>
          </div>
        )}

        {/* Urgent bets (< 6h left) */}
        {urgent.length > 0 && (
          <div
            onClick={() => navigate(`/upload/${urgent[0].id}`)}
            style={{
              background:"rgba(245,158,11,0.1)",
              border:"1px solid rgba(245,158,11,0.35)",
              borderRadius:"14px",
              padding:"12px 16px",
              display:"flex",
              alignItems:"center",
              gap:"12px",
              cursor:"pointer",
            }}
          >
            <div style={{ fontSize:"24px", flexShrink:0 }}>⏰</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:"#f59e0b", letterSpacing:"0.04em" }}>
                {urgent.length} BET{urgent.length>1?"S":""} DUE SOON
              </div>
              <div style={{ fontFamily:T.fontBody, fontSize:"12px", color:"rgba(245,158,11,0.75)", marginTop:"2px" }}>
                Under 6 hours left — get moving!
              </div>
            </div>
            <CountdownPill bet={urgent[0]} />
          </div>
        )}
      </div>
    </>
  );
}

function CountdownPill({ bet }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = bet.deadline?.toDate?.() - new Date();
      if (diff <= 0) { setText("NOW!"); return; }
      const h = Math.floor(diff/3600000);
      const m = Math.floor((diff%3600000)/60000);
      const s = Math.floor((diff%60000)/1000);
      setText(h>0?`${h}h ${m}m`:`${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [bet]);

  return (
    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"14px", fontWeight:"700", color:"#f59e0b", flexShrink:0 }}>
      {text}
    </div>
  );
}