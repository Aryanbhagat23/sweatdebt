import React, { useState, useEffect } from "react";
import { BADGES, getBadgeInfo } from "../utils/streaks";
import T from "../theme";

export default function BadgeDisplay({ earnedBadgeIds = [], compact = false }) {
  const earned = new Set(earnedBadgeIds);
  const all = Object.values(BADGES);
  if (compact) {
    const e = all.filter(b=>earned.has(b.id));
    if (e.length===0) return null;
    return (
      <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
        {e.map(b=>(
          <div key={b.id} title={`${b.label} — ${b.desc}`} style={{ background:T.pinkDim,border:`1px solid ${T.pinkBorder}`,borderRadius:T.rFull,padding:"4px 10px",display:"flex",alignItems:"center",gap:"5px" }}>
            <span style={{ fontSize:"14px" }}>{b.icon}</span>
            <span style={{ fontFamily:T.fontMono,fontSize:"10px",color:T.pink,letterSpacing:"0.05em" }}>{b.label}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontFamily:T.fontMono,fontSize:"11px",color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px" }}>
        Badges ({earnedBadgeIds.length}/{all.length})
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px" }}>
        {all.map(b=>{
          const e=earned.has(b.id);
          return(
            <div key={b.id} style={{ background:e?T.pinkDim:T.bg2,border:`1px solid ${e?T.pinkBorder:T.border}`,borderRadius:T.r16,padding:"12px 10px",textAlign:"center",opacity:e?1:0.4 }}>
              <div style={{ fontSize:"28px",marginBottom:"6px",filter:e?"none":"grayscale(100%)" }}>{b.icon}</div>
              <div style={{ fontFamily:T.fontMono,fontSize:"10px",fontWeight:"700",color:e?T.pink:T.muted,letterSpacing:"0.05em",marginBottom:"3px" }}>{b.label}</div>
              <div style={{ fontFamily:T.fontBody,fontSize:"11px",color:T.dim,lineHeight:"1.4" }}>{b.desc}</div>
              {e&&<div style={{ marginTop:"6px",width:"6px",height:"6px",borderRadius:"50%",background:T.pink,margin:"6px auto 0",boxShadow:`0 0 6px ${T.pink}` }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BadgeToast({ badgeId, onClose }) {
  const badge = getBadgeInfo(badgeId);
  const [vis, setVis] = useState(false);
  useEffect(()=>{
    setTimeout(()=>setVis(true),50);
    const t=setTimeout(()=>{setVis(false);setTimeout(onClose,400);},4000);
    return()=>clearTimeout(t);
  },[]);
  if(!badge)return null;
  return(
    <>
      <style>{`@keyframes badgeIn{from{transform:translateX(-50%) translateY(-80px) scale(0.8);opacity:0}to{transform:translateX(-50%) translateY(0) scale(1);opacity:1}} @keyframes badgeOut{from{transform:translateX(-50%) translateY(0) scale(1);opacity:1}to{transform:translateX(-50%) translateY(-80px) scale(0.8);opacity:0}}`}</style>
      <div style={{ position:"fixed",top:"60px",left:"50%",zIndex:9999,animation:vis?"badgeIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)":"badgeOut 0.4s ease",width:"100%",maxWidth:"340px",padding:"0 20px" }}>
        <div style={{ background:"rgba(10,10,15,0.95)",border:`1px solid ${T.pinkBorder}`,borderRadius:T.r20,padding:"16px 20px",display:"flex",alignItems:"center",gap:"14px",backdropFilter:"blur(20px)",boxShadow:`0 8px 32px rgba(255,45,85,0.25)` }}>
          <div style={{ fontSize:"40px",flexShrink:0 }}>{badge.icon}</div>
          <div>
            <div style={{ fontFamily:T.fontMono,fontSize:"11px",color:T.pink,letterSpacing:"0.1em",marginBottom:"3px" }}>BADGE UNLOCKED</div>
            <div style={{ fontFamily:T.fontDisplay,fontSize:"22px",color:T.white,letterSpacing:"0.04em",lineHeight:1,marginBottom:"3px" }}>{badge.label}</div>
            <div style={{ fontFamily:T.fontBody,fontSize:"13px",color:T.muted }}>{badge.desc}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function StreakBadge({ streak, size="normal" }) {
  if(!streak||streak<1)return null;
  const cfg = streak>=10?{icon:"👑",color:T.orange,bg:T.orangeDim,border:T.orangeBorder}:streak>=5?{icon:"⚡",color:T.pink,bg:T.pinkDim,border:T.pinkBorder}:streak>=3?{icon:"🔥",color:T.orange,bg:T.orangeDim,border:T.orangeBorder}:{icon:"💪",color:T.muted,bg:T.bg3,border:T.border};
  const sm=size==="small";
  return(
    <div style={{ display:"inline-flex",alignItems:"center",gap:"5px",background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:T.rFull,padding:sm?"3px 8px":"5px 12px" }}>
      <span style={{ fontSize:sm?"12px":"16px" }}>{cfg.icon}</span>
      <span style={{ fontFamily:T.fontDisplay,fontSize:sm?"13px":"18px",color:cfg.color,letterSpacing:"0.04em" }}>{streak} STREAK</span>
    </div>
  );
}