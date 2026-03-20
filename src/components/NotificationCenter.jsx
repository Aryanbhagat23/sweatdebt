import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { SkeletonNotification } from "../components/Skeleton";

export default function NotificationCenter({ user, isOpen, onClose }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (isOpen) { setVisible(true); setTimeout(()=>setAnimIn(true),10); }
    else { setAnimIn(false); setTimeout(()=>setVisible(false),300); }
  }, [isOpen]);

  useEffect(() => {
    if (!user) return;
    // Use incoming bets as notifications
    const q = query(
      collection(db, "bets"),
      where("opponentEmail","==",user.email),
      orderBy("createdAt","desc")
    );
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return () => unsub();
  }, [user]);

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "just now";
    const s = Math.floor((new Date()-ts.toDate())/1000);
    if (s<60) return "just now";
    if (s<3600) return `${Math.floor(s/60)}m ago`;
    if (s<86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const statusInfo = (status) => {
    if (status==="pending") return {icon:"⚔️",text:"challenged you",color:"#d4ff00"};
    if (status==="proof_uploaded") return {icon:"📹",text:"uploaded proof",color:"#4a9eff"};
    if (status==="won") return {icon:"🏆",text:"bet settled - you won!",color:"#00e676"};
    if (status==="lost") return {icon:"💀",text:"bet settled - you lost",color:"#ff4444"};
    if (status==="disputed") return {icon:"⚠️",text:"disputed your proof",color:"#ff5c1a"};
    return {icon:"🔔",text:"bet update",color:"#888"};
  };

  if (!visible) return null;

  return (
    <>
      <div style={{
        position:"fixed",inset:0,zIndex:1900,
        background:animIn?"rgba(0,0,0,0.6)":"transparent",
        transition:"background 0.3s",
      }} onClick={onClose}/>

      <div style={{
        position:"fixed",
        top:0,left:"50%",
        width:"100%",maxWidth:"480px",
        background:"#1a1a1a",
        borderRadius:"0 0 24px 24px",
        maxHeight:"70vh",
        overflowY:"auto",
        zIndex:1901,
        transform:animIn
          ?"translateX(-50%) translateY(0)"
          :"translateX(-50%) translateY(-100%)",
        transition:"transform 0.35s cubic-bezier(0.32,0.72,0,1)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
        paddingTop:"env(safe-area-inset-top,0px)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px"}}>
          <div style={{fontSize:"18px",fontWeight:"700",color:"#f5f0e8"}}>Notifications</div>
          <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
            <div style={{fontSize:"12px",color:"#d4ff00",cursor:"pointer",fontFamily:"monospace"}}>Mark all read</div>
            <div style={{fontSize:"20px",color:"#555",cursor:"pointer"}} onClick={onClose}>✕</div>
          </div>
        </div>

       {notifications.length === 0 ? (
  // Check if we're still loading — show skeletons for first 1 second
  <div style={{padding:"0 16px 16px"}}>
    {[...Array(4)].map((_,i)=>(
      <SkeletonNotification key={i}/>
    ))}
  </div>
) : (
          <div style={{padding:"0 16px 16px"}}>
            {notifications.map(n => {
              const info = statusInfo(n.status);
              return (
                <div key={n.id} style={{
                  display:"flex",alignItems:"flex-start",gap:"12px",
                  padding:"14px",background:"#222",
                  borderRadius:"14px",marginBottom:"8px",
                  cursor:"pointer",border:`1px solid ${n.status==="pending"?"rgba(212,255,0,0.2)":"#2a2a2a"}`,
                }} onClick={()=>{onClose();navigate("/bets");}}>
                  <div style={{
                    width:"42px",height:"42px",borderRadius:"12px",
                    background:`${info.color}20`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"20px",flexShrink:0,
                  }}>{info.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"14px",fontWeight:"500",color:"#f5f0e8",marginBottom:"2px"}}>
                      <span style={{color:info.color}}>{n.createdByName}</span> {info.text}
                    </div>
                    <div style={{fontSize:"12px",color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"4px"}}>
                      "{n.description}"
                    </div>
                    <div style={{fontSize:"11px",color:"#444",fontFamily:"monospace"}}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  {n.status==="pending"&&(
                    <div style={{
                      background:"#d4ff00",color:"#000",
                      fontSize:"11px",fontWeight:"700",
                      padding:"4px 10px",borderRadius:"8px",
                      flexShrink:0,fontFamily:"monospace",
                    }}>NEW</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}