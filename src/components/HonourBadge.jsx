import React from "react";
import T from "../theme";

export function getHonourInfo(score) {
  if (score >= 90) return { label:"Trusted",  color:"#10b981", bg:"rgba(16,185,129,0.12)",  border:"rgba(16,185,129,0.35)", icon:"🛡️" };
  if (score >= 70) return { label:"Reliable", color:"#3b82f6", bg:"rgba(59,130,246,0.12)",  border:"rgba(59,130,246,0.35)", icon:"✅" };
  if (score >= 50) return { label:"Average",  color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.35)", icon:"⚠️" };
  if (score >= 30) return { label:"Risky",    color:"#f97316", bg:"rgba(249,115,22,0.12)",  border:"rgba(249,115,22,0.35)", icon:"⚡" };
  return               { label:"Avoid",    color:"#ef4444", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.35)",  icon:"💀" };
}

export default function HonourBadge({ score=100, size="sm" }) {
  const info = getHonourInfo(score);
  const s = size==="lg"
    ? {p:"8px 14px",fs:"15px",is:"16px",gap:"6px",r:"12px"}
    : size==="md"
    ? {p:"5px 10px",fs:"13px",is:"14px",gap:"5px",r:"10px"}
    : {p:"3px 8px", fs:"11px",is:"12px",gap:"4px",r:"8px"};
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:s.gap,background:info.bg,border:`1px solid ${info.border}`,borderRadius:s.r,padding:s.p}}>
      <span style={{fontSize:s.is,lineHeight:1}}>{info.icon}</span>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:s.fs,fontWeight:"600",color:info.color}}>{score}</span>
      <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:s.fs,color:info.color,opacity:0.85}}>{info.label}</span>
    </div>
  );
}

export function HonourDot({ score=100 }) {
  const info = getHonourInfo(score);
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:"4px"}}>
      <div style={{width:"7px",height:"7px",borderRadius:"50%",background:info.color,boxShadow:`0 0 5px ${info.color}60`,flexShrink:0}}/>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"600",color:info.color}}>{score}</span>
    </div>
  );
}