import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import T from "../theme";

export default function InboxScreen({user}){
  const nav=useNavigate();
  const [convos,setConvos]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!user)return;
    const u=onSnapshot(query(collection(db,"conversations"),where("participants","array-contains",user.uid)),snap=>{const d=snap.docs.map(x=>({id:x.id,...x.data()}));d.sort((a,b)=>(b.lastMessageAt?.toDate?.()||0)-(a.lastMessageAt?.toDate?.()||0));setConvos(d);setLoading(false);},()=>setLoading(false));
    return()=>u();
  },[user]);

  const timeAgo=ts=>{if(!ts?.toDate)return"";const s=Math.floor((new Date()-ts.toDate())/1000);if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;};

  return(
    <div style={{minHeight:"100vh",background:T.bg0,paddingBottom:"90px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"52px 16px 20px"}}>
        <div style={{fontFamily:T.fontDisplay,fontSize:"36px",color:T.panel,letterSpacing:"0.02em",fontStyle:"italic"}}>Messages</div>
        <button onClick={()=>nav("/inbox/new")} style={{background:T.panel,border:"none",borderRadius:T.r16,padding:"10px 18px",fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.04em",color:T.accent,cursor:"pointer",boxShadow:"0 4px 14px rgba(5,46,22,0.2)"}}>+ New</button>
      </div>
      {loading&&<div style={{display:"flex",justifyContent:"center",padding:"40px"}}><div style={{width:"32px",height:"32px",borderRadius:"50%",border:`3px solid ${T.border}`,borderTop:`3px solid ${T.accent}`,animation:"spin 0.8s linear infinite"}}/></div>}
      {!loading&&convos.length===0&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"64px 20px",textAlign:"center"}}>
          <div style={{fontSize:"64px",marginBottom:"16px"}}>💬</div>
          <div style={{fontFamily:T.fontDisplay,fontSize:"26px",color:T.textMuted,fontStyle:"italic",marginBottom:"8px"}}>No messages yet</div>
          <button onClick={()=>nav("/inbox/new")} style={{background:T.panel,border:"none",borderRadius:T.r16,padding:"14px 28px",fontFamily:T.fontDisplay,fontSize:"20px",letterSpacing:"0.06em",color:T.accent,cursor:"pointer",marginTop:"16px"}}>Start a Chat →</button>
        </div>
      )}
      {!loading&&convos.length>0&&(
        <div style={{padding:"0 16px"}}>
          {convos.map(c=>{
            const otherId=c.participants?.find(id=>id!==user.uid);
            const otherName=c.participantNames?.[otherId]||"Unknown";
            const otherPhoto=c.participantPhotos?.[otherId]||null;
            const unread=c.unreadCount?.[user.uid]||0;
            const isMe=c.lastSenderId===user.uid;
            return(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:"14px",background:T.bg1,border:`1px solid ${unread>0?T.accentBorder:T.border}`,borderRadius:T.r20,padding:"14px 16px",marginBottom:"10px",cursor:"pointer",boxShadow:T.shadowCard,transition:"all 0.15s"}} onClick={()=>nav(`/inbox/${c.id}`)}>
                {otherPhoto?<img src={otherPhoto} alt="" style={{width:"50px",height:"50px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${unread>0?T.accent:T.border}`,flexShrink:0}}/>:<div style={{width:"50px",height:"50px",borderRadius:"50%",background:T.panel,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"20px",color:T.accent,flexShrink:0,border:`2px solid ${unread>0?T.accent:T.border}`}}>{otherName?.charAt(0)||"?"}</div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px"}}>
                    <div style={{fontFamily:T.fontBody,fontSize:"15px",fontWeight:unread>0?"700":"600",color:T.panel,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{otherName}</div>
                    <div style={{fontFamily:T.fontMono,fontSize:"11px",color:T.textMuted,flexShrink:0,marginLeft:"8px"}}>{timeAgo(c.lastMessageAt)}</div>
                  </div>
                  <div style={{fontFamily:T.fontBody,fontSize:"13px",color:unread>0?T.panel:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:unread>0?"500":"400"}}>
                    {isMe?"You: ":""}{c.lastMessage||"Say hello! 👋"}
                  </div>
                </div>
                {unread>0&&<div style={{width:"20px",height:"20px",borderRadius:"50%",background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontMono,fontSize:"11px",fontWeight:"700",color:"#fff",flexShrink:0}}>{unread>9?"9+":unread}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}