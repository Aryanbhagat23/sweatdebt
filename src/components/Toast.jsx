import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Toast({ toast, onClose }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      setExiting(false);
      const timer = setTimeout(() => dismiss(), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 300);
  };

  const handleTap = () => {
    dismiss();
    if (toast?.data?.path) navigate(toast.data.path);
    else navigate("/bets");
  };

  if (!toast || !visible) return null;

  const icons = {
    challenge: "⚔️",
    approved: "✅",
    disputed: "⚠️",
    proof: "📹",
    won: "🏆",
    default: "🔔",
  };

  const icon = icons[toast.data?.type] || icons.default;

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%) translateX(-50%); opacity: 0; }
          to { transform: translateY(0) translateX(-50%); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(0) translateX(-50%); opacity: 1; }
          to { transform: translateY(-100%) translateX(-50%); opacity: 0; }
        }
      `}</style>
      <div style={{
        position:"fixed",
        top:"env(safe-area-inset-top, 0px)",
        left:"50%",
        width:"calc(100% - 32px)",
        maxWidth:"448px",
        zIndex:9999,
        animation: exiting
          ? "slideUp 0.3s ease forwards"
          : "slideDown 0.4s cubic-bezier(0.32,0.72,0,1) forwards",
      }}>
        <div style={{
          background:"#1a1a1a",
          border:"1px solid #333",
          borderRadius:"18px",
          padding:"14px 16px",
          display:"flex",
          alignItems:"center",
          gap:"12px",
          cursor:"pointer",
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          margin:"8px",
        }} onClick={handleTap}>
          {/* Icon */}
          <div style={{
            width:"42px",height:"42px",borderRadius:"12px",
            background:"rgba(212,255,0,0.1)",
            border:"1px solid rgba(212,255,0,0.2)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"20px",flexShrink:0,
          }}>{icon}</div>

          {/* Text */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"14px",fontWeight:"600",color:"#f5f0e8",marginBottom:"2px"}}>
              {toast.title}
            </div>
            <div style={{fontSize:"13px",color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {toast.body}
            </div>
          </div>

          {/* SweatDebt brand */}
          <div style={{
            fontSize:"10px",color:"#d4ff00",
            fontFamily:"monospace",letterSpacing:"0.05em",flexShrink:0,
          }}>SD</div>

          {/* Dismiss */}
          <div style={{
            position:"absolute",top:"8px",right:"12px",
            fontSize:"12px",color:"#444",cursor:"pointer",padding:"4px",
          }} onClick={e=>{e.stopPropagation();dismiss();}}>✕</div>
        </div>

        {/* Progress bar */}
        <div style={{
          height:"2px",background:"#333",borderRadius:"1px",
          margin:"0 8px",overflow:"hidden",
        }}>
          <div style={{
            height:"100%",background:"#d4ff00",borderRadius:"1px",
            animation:"shrink 5s linear forwards",
          }}/>
        </div>
        <style>{`@keyframes shrink{from{width:100%}to{width:0%}}`}</style>
      </div>
    </>
  );
}