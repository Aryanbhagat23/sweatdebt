import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";

const ICON={friend_request:"👋",friend_accepted:"🤝",bet_challenge:"⚔️",comment_like:"❤️",comment_reply:"💬",bet_approved:"✅",bet_disputed:"⚠️",direct_message:"💬",badge_earned:"🏅"};

export default function NotificationCenter({ user, isOpen, onClose }) {
  const nav=useNavigate();
  const [notifs,setNotifs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [vis,setVis]=useState(false);
  const [animIn,setAnimIn]=useState(false);

  useEffect(()=>{if(isOpen){setVis(true);setTimeout(()=>setAnimIn(true),10);}else{setAnimIn(false);setTimeout(()=>setVis(false),300);}},[isOpen]);
  useEffect(()=>{
    if(!user)return;
    const u=onSnapshot(query(collection(db,"notifications"),where("toUserId","==",user.uid)),snap=>{
      const d=snap.docs.map(x=>({id:x.id,...x.data()}));
      d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setNotifs(d);setLoading(false);
    },()=>setLoading(false));
    return()=>u();
  },[user]);

  const markAll=async()=>{const b=writeBatch(db);notifs.filter(n=>!n.read).forEach(n=>b.update(doc(db,"notifications",n.id),{read:true}));await b.commit();};
  const handleClick=async n=>{
    await updateDoc(doc(db,"notifications",n.id),{read:true});onClose();
    if(n.link)nav(n.link);
    else if(n.type==="friend_request")nav(`/profile/${n.fromUserId}`);
    else if(n.type==="bet_challenge")nav("/");
    else if(["comment_reply","comment_like"].includes(n.type))nav("/feed");
    else if(n.type==="friend_accepted")nav(`/profile/${n.fromUserId}`);
    else if(n.type==="direct_message")nav(n.link||"/inbox");
  };
  const acceptFriend=async(n,e)=>{
    e.stopPropagation();
    try{
      await setDoc(doc(db,"users",user.uid,"friends",n.fromUserId),{uid:n.fromUserId,displayName:n.fromName,photoURL:n.fromPhoto||null,addedAt:serverTimestamp()});
      await setDoc(doc(db,"users",n.fromUserId,"friends",user.uid),{uid:user.uid,displayName:user.displayName,photoURL:user.photoURL||null,addedAt:serverTimestamp()});
      await deleteDoc(doc(db,"notifications",n.id));
    }catch(e){console.error(e);}
  };
  const declineFriend=async(n,e)=>{e.stopPropagation();await deleteDoc(doc(db,"notifications",n.id));};
  const timeAgo=ts=>{if(!ts?.toDate)return"just now";const s=Math.floor((new Date()-ts.toDate())/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};
  const unread=notifs.filter(n=>!n.read).length;

  if(!vis)return null;
  return(
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{position:"fixed",inset:0,zIndex:1900,background:animIn?"rgba(5,46,22,0.3)":"transparent",transition:"background 0.3s"}} onClick={onClose}/>
      <div style={{position:"fixed",top:0,left:"50%",width:"100%",maxWidth:"480px",background:T.bg1,borderRadius:"0 0 24px 24px",maxHeight:"72vh",overflowY:"auto",zIndex:1901,transform:animIn?"translateX(-50%) translateY(0)":"translateX(-50%) translateY(-100%)",transition:"transform 0.35s cubic-bezier(0.32,0.72,0,1)",boxShadow:"0 8px 40px rgba(5,46,22,0.15)",paddingTop:"env(safe-area-inset-top,0)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:T.panel,letterSpacing:"0.04em",fontStyle:"italic"}}>Notifications</div>
            {unread>0&&<div style={{background:T.accent,color:"#fff",fontFamily:T.fontMono,fontSize:"11px",fontWeight:"700",padding:"3px 8px",borderRadius:T.rFull}}>{unread} new</div>}
          </div>
          <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
            {unread>0&&<div style={{fontFamily:T.fontMono,fontSize:"12px",color:T.accent,cursor:"pointer"}} onClick={markAll}>Mark all read</div>}
            <div style={{fontSize:"20px",color:T.textMuted,cursor:"pointer"}} onClick={onClose}>✕</div>
          </div>
        </div>
        {loading
          ?<div style={{display:"flex",justifyContent:"center",padding:"32px"}}><div style={{width:"24px",height:"24px",borderRadius:"50%",border:`2px solid ${T.border}`,borderTop:`2px solid ${T.accent}`,animation:"spin 0.8s linear infinite"}}/></div>
          :notifs.length===0
            ?<div style={{padding:"48px 20px",textAlign:"center"}}><div style={{fontSize:"40px",marginBottom:"12px"}}>🔔</div><div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:T.textMuted,letterSpacing:"0.04em",fontStyle:"italic"}}>No notifications yet</div></div>
            :<div style={{padding:"0 16px 16px"}}>
              {notifs.map(n=>(
                <div key={n.id} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"14px",background:n.read?T.bg0:T.accentLight,borderRadius:T.r16,marginBottom:"8px",cursor:"pointer",border:`1px solid ${n.read?T.border:T.accentBorder}`,transition:"all 0.15s"}} onClick={()=>handleClick(n)}>
                  <div style={{position:"relative",flexShrink:0}}>
                    {n.fromPhoto?<img src={n.fromPhoto} alt="" style={{width:"42px",height:"42px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.border}`}}/>
                      :<div style={{width:"42px",height:"42px",borderRadius:"50%",background:T.panel,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"16px",color:T.accent}}>{n.fromName?.charAt(0)||"?"}</div>}
                    <div style={{position:"absolute",bottom:"-2px",right:"-2px",width:"18px",height:"18px",borderRadius:"50%",background:T.bg1,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px"}}>{ICON[n.type]||"🔔"}</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.textDark,marginBottom:"3px",lineHeight:"1.4"}}>{n.message}</div>
                    <div style={{fontFamily:T.fontMono,fontSize:"11px",color:T.textMuted}}>{timeAgo(n.createdAt)}</div>
                    {n.type==="friend_request"&&(
                      <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
                        <button style={{flex:1,padding:"8px",background:T.accent,border:"none",borderRadius:T.r12,fontFamily:T.fontDisplay,fontSize:"14px",color:"#fff",cursor:"pointer"}} onClick={e=>acceptFriend(n,e)}>Accept</button>
                        <button style={{flex:1,padding:"8px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:T.r12,fontFamily:T.fontBody,fontSize:"13px",color:T.textMuted,cursor:"pointer"}} onClick={e=>declineFriend(n,e)}>Decline</button>
                      </div>
                    )}
                  </div>
                  {!n.read&&<div style={{width:"8px",height:"8px",borderRadius:"50%",background:T.accent,flexShrink:0,marginTop:"6px"}}/>}
                </div>
              ))}
            </div>
        }
      </div>
    </>
  );
}