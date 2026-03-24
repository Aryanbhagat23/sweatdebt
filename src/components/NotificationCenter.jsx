import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";

const TYPE_ICON  = { friend_request:"👋", friend_accepted:"🤝", bet_challenge:"⚔️", comment_like:"❤️", comment_reply:"💬", bet_approved:"✅", bet_disputed:"⚠️", direct_message:"💬" };

export default function NotificationCenter({ user, isOpen, onClose }) {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(()=>{ if(isOpen){setVisible(true);setTimeout(()=>setAnimIn(true),10);}else{setAnimIn(false);setTimeout(()=>setVisible(false),300);} },[isOpen]);

  useEffect(()=>{
    if(!user)return;
    const u=onSnapshot(query(collection(db,"notifications"),where("toUserId","==",user.uid)),snap=>{
      const d=snap.docs.map(x=>({id:x.id,...x.data()}));
      d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setNotifs(d); setLoading(false);
    },err=>{console.error(err);setLoading(false);});
    return()=>u();
  },[user]);

  const markAll=async()=>{ const b=writeBatch(db); notifs.filter(n=>!n.read).forEach(n=>b.update(doc(db,"notifications",n.id),{read:true})); await b.commit(); };

  const handleClick=async(n)=>{
    await updateDoc(doc(db,"notifications",n.id),{read:true}); onClose();
    if(n.link)navigate(n.link);
    else if(n.type==="friend_request")navigate(`/profile/${n.fromUserId}`);
    else if(n.type==="bet_challenge")navigate("/");
    else if(["comment_reply","comment_like"].includes(n.type))navigate("/feed");
    else if(n.type==="friend_accepted")navigate(`/profile/${n.fromUserId}`);
    else if(n.type==="direct_message")navigate(n.link||"/inbox");
  };

  const acceptFriend=async(n,e)=>{ e.stopPropagation();
    try{
      await setDoc(doc(db,"users",user.uid,"friends",n.fromUserId),{uid:n.fromUserId,displayName:n.fromName,photoURL:n.fromPhoto||null,addedAt:serverTimestamp()});
      await setDoc(doc(db,"users",n.fromUserId,"friends",user.uid),{uid:user.uid,displayName:user.displayName,photoURL:user.photoURL||null,addedAt:serverTimestamp()});
      await deleteDoc(doc(db,"notifications",n.id));
      await setDoc(doc(db,"notifications",`${n.fromUserId}_friend_accepted_${user.uid}_${Date.now()}`),{toUserId:n.fromUserId,fromUserId:user.uid,fromName:user.displayName,fromPhoto:user.photoURL||null,type:"friend_accepted",message:`${user.displayName} accepted your friend request`,read:false,createdAt:serverTimestamp()});
    }catch(e){console.error(e);}
  };
  const declineFriend=async(n,e)=>{e.stopPropagation(); await deleteDoc(doc(db,"notifications",n.id));};

  const timeAgo=ts=>{if(!ts?.toDate)return"just now";const s=Math.floor((new Date()-ts.toDate())/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;if(s<604800)return`${Math.floor(s/86400)}d ago`;return`${Math.floor(s/604800)}w ago`;};
  const unread = notifs.filter(n=>!n.read).length;
  if(!visible)return null;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position:"fixed",inset:0,zIndex:1900,background:animIn?"rgba(0,0,0,0.7)":"transparent",transition:"background 0.3s" }} onClick={onClose}/>
      <div style={{ position:"fixed",top:0,left:"50%",width:"100%",maxWidth:"480px",background:T.bg1,borderRadius:"0 0 24px 24px",maxHeight:"72vh",overflowY:"auto",zIndex:1901,transform:animIn?"translateX(-50%) translateY(0)":"translateX(-50%) translateY(-100%)",transition:"transform 0.35s cubic-bezier(0.32,0.72,0,1)",boxShadow:"0 8px 40px rgba(0,0,0,0.6)",paddingTop:"env(safe-area-inset-top,0)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
            <div style={{ fontFamily:T.fontDisplay,fontSize:"22px",color:T.white,letterSpacing:"0.04em" }}>Notifications</div>
            {unread>0&&<div style={{ background:T.gradPrimary,color:"#fff",fontFamily:T.fontMono,fontSize:"11px",fontWeight:"700",padding:"3px 8px",borderRadius:T.rFull }}>{unread} new</div>}
          </div>
          <div style={{ display:"flex",gap:"12px",alignItems:"center" }}>
            {unread>0&&<div style={{ fontFamily:T.fontMono,fontSize:"12px",color:T.pink,cursor:"pointer" }} onClick={markAll}>Mark all read</div>}
            <div style={{ fontSize:"20px",color:T.muted,cursor:"pointer" }} onClick={onClose}>✕</div>
          </div>
        </div>
        {loading?(
          <div style={{ display:"flex",justifyContent:"center",padding:"32px" }}><div style={{ width:"24px",height:"24px",borderRadius:"50%",border:`2px solid ${T.bg3}`,borderTop:`2px solid ${T.pink}`,animation:"spin 0.8s linear infinite" }}/></div>
        ):notifs.length===0?(
          <div style={{ padding:"48px 20px",textAlign:"center" }}>
            <div style={{ fontSize:"40px",marginBottom:"12px" }}>🔔</div>
            <div style={{ fontFamily:T.fontDisplay,fontSize:"22px",color:T.muted,letterSpacing:"0.04em" }}>No notifications yet</div>
            <div style={{ fontFamily:T.fontBody,fontSize:"13px",color:T.dim,marginTop:"4px" }}>Challenges, likes and friend requests will appear here</div>
          </div>
        ):(
          <div style={{ padding:"0 16px 16px" }}>
            {notifs.map(n=>(
              <div key={n.id} style={{ display:"flex",alignItems:"flex-start",gap:"12px",padding:"14px",background:n.read?T.bg2:T.pinkDim,borderRadius:T.r16,marginBottom:"8px",cursor:"pointer",border:`1px solid ${n.read?T.border:T.pinkBorder}`,transition:"all 0.15s" }} onClick={()=>handleClick(n)}>
                <div style={{ position:"relative",flexShrink:0 }}>
                  {n.fromPhoto?<img src={n.fromPhoto} alt="" style={{ width:"42px",height:"42px",borderRadius:"50%",objectFit:"cover" }}/>
                    :<div style={{ width:"42px",height:"42px",borderRadius:"50%",background:T.gradPrimary,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"16px",color:"#fff" }}>{n.fromName?.charAt(0)||"?"}</div>}
                  <div style={{ position:"absolute",bottom:"-2px",right:"-2px",width:"18px",height:"18px",borderRadius:"50%",background:T.bg2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px" }}>{TYPE_ICON[n.type]||"🔔"}</div>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.white,marginBottom:"3px",lineHeight:"1.4" }}>{n.message}</div>
                  <div style={{ fontFamily:T.fontMono,fontSize:"11px",color:T.muted }}>{timeAgo(n.createdAt)}</div>
                  {n.type==="friend_request"&&(
                    <div style={{ display:"flex",gap:"8px",marginTop:"10px" }}>
                      <button style={{ flex:1,padding:"8px",background:T.gradPrimary,border:"none",borderRadius:T.r12,fontFamily:T.fontDisplay,fontSize:"14px",color:"#fff",cursor:"pointer",letterSpacing:"0.04em" }} onClick={e=>acceptFriend(n,e)}>Accept</button>
                      <button style={{ flex:1,padding:"8px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:T.r12,fontFamily:T.fontBody,fontSize:"13px",color:T.muted,cursor:"pointer" }} onClick={e=>declineFriend(n,e)}>Decline</button>
                    </div>
                  )}
                </div>
                {!n.read&&<div style={{ width:"8px",height:"8px",borderRadius:"50%",background:T.pink,flexShrink:0,marginTop:"6px",boxShadow:`0 0 8px ${T.pink}` }}/>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}