import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import T from "../theme";

const ICONS = { bet_challenge:"⚔️", bet_accepted:"✅", proof_uploaded:"📹", proof_approved:"🏆", proof_disputed:"⚠️", comment:"💬", like:"❤️", friend_request:"👋", friend_accepted:"🤝", debt_reminder:"⏰" };

export default function PushToast({ toast, onClose }) {
  const navigate = useNavigate();
  const [visible,  setVisible]  = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const timerRef = useRef(null);

  useEffect(()=>{
    if (!toast) return;
    setExiting(false);
    requestAnimationFrame(()=>setVisible(true));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, 5000);
    return ()=>clearTimeout(timerRef.current);
  },[toast]);

  const dismiss = () => { setExiting(true); setTimeout(()=>{ setVisible(false); onClose?.(); },350); };
  const handleTap = () => { dismiss(); if(toast?.data?.path) navigate(toast.data.path); };

  if (!toast||!visible) return null;
  const icon = ICONS[toast.data?.type]||"🔔";

  return (
    <>
      <style>{`@keyframes _tin{from{transform:translateX(-50%) translateY(-110%);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}} @keyframes _tout{from{transform:translateX(-50%) translateY(0);opacity:1}to{transform:translateX(-50%) translateY(-110%);opacity:0}} @keyframes _shrink{from{width:100%}to{width:0%}}`}</style>
      <div onClick={handleTap} style={{position:"fixed",top:"calc(env(safe-area-inset-top,0px) + 8px)",left:"50%",width:"calc(100% - 32px)",maxWidth:"448px",zIndex:9999,animation:exiting?"_tout 0.35s ease forwards":"_tin 0.4s cubic-bezier(0.32,0.72,0,1) forwards",cursor:"pointer"}}>
        <div style={{background:T.bg1,border:`1px solid ${T.borderCard}`,borderRadius:"18px",padding:"12px 16px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}>
          <div style={{width:"42px",height:"42px",borderRadius:"12px",background:`${T.accent}20`,border:`1px solid ${T.accent}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:T.fontBody,fontSize:"14px",fontWeight:"600",color:T.panel,marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toast.title}</div>
            <div style={{fontFamily:T.fontBody,fontSize:"12px",color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toast.body}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px",flexShrink:0}}>
            <div onClick={e=>{e.stopPropagation();dismiss();}} style={{fontSize:"12px",color:T.textMuted,padding:"4px",cursor:"pointer"}}>✕</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"9px",color:T.accent,letterSpacing:"0.05em"}}>SD</div>
          </div>
        </div>
        {!exiting && (
          <div style={{height:"3px",background:T.border,borderRadius:"2px",margin:"4px 4px 0",overflow:"hidden"}}>
            <div style={{height:"100%",background:T.accent,borderRadius:"2px",animation:"_shrink 5s linear forwards"}}/>
          </div>
        )}
      </div>
    </>
  );
}