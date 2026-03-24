import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import T, { gradientText } from "../theme";

export default function InboxScreen({ user }) {
  const navigate = useNavigate();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    if(!user)return;
    const u=onSnapshot(query(collection(db,"conversations"),where("participants","array-contains",user.uid)),snap=>{
      const d=snap.docs.map(x=>({id:x.id,...x.data()}));
      d.sort((a,b)=>(b.lastMessageAt?.toDate?.()||0)-(a.lastMessageAt?.toDate?.()||0));
      setConvos(d); setLoading(false);
    },()=>setLoading(false));
    return()=>u();
  },[user]);
  const timeAgo=ts=>{if(!ts?.toDate)return"";const s=Math.floor((new Date()-ts.toDate())/1000);if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;};
  return(
    <div style={{ minHeight:"100vh",background:T.bg0,paddingBottom:"90px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",padding:"52px 16px 16px",borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontFamily:T.fontDisplay,fontSize:"32px",color:T.white,letterSpacing:"0.04em",flex:1 }}>
          <span style={gradientText}>Messages</span>
        </div>
        <button style={{ background:T.pinkDim,border:`1px solid ${T.pinkBorder}`,borderRadius:T.r12,width:"44px",height:"44px",color:T.pink,fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>navigate("/inbox/new")}>✏️</button>
      </div>
      {loading?(
        <div style={{ display:"flex",justifyContent:"center",padding:"64px" }}><div style={{ width:"32px",height:"32px",borderRadius:"50%",border:`3px solid ${T.bg3}`,borderTop:`3px solid ${T.pink}`,animation:"spin 0.8s linear infinite" }}/></div>
      ):convos.length===0?(
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"64px 20px",textAlign:"center" }}>
          <div style={{ fontSize:"56px",marginBottom:"16px" }}>💬</div>
          <div style={{ fontFamily:T.fontDisplay,fontSize:"26px",color:T.muted,letterSpacing:"0.04em",marginBottom:"8px" }}>No messages yet</div>
          <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.dim,marginBottom:"24px" }}>Start a conversation with a friend</div>
          <button style={{ background:T.gradPrimary,border:"none",borderRadius:T.r16,padding:"14px 28px",fontFamily:T.fontDisplay,fontSize:"20px",letterSpacing:"0.06em",color:"#fff",cursor:"pointer" }} onClick={()=>navigate("/inbox/new")}>+ New Message</button>
        </div>
      ):(
        convos.map(c=>{
          const otherId=c.participants?.find(id=>id!==user.uid);
          const name=c.participantNames?.[otherId]||"Unknown";
          const photo=c.participantPhotos?.[otherId]||null;
          const unread=(c.unreadCount?.[user.uid]||0)>0;
          return(
            <div key={c.id} style={{ display:"flex",alignItems:"center",gap:"14px",padding:"14px 16px",background:unread?T.pinkDim:"transparent",borderBottom:`1px solid ${T.border}`,cursor:"pointer" }} onClick={()=>navigate(`/inbox/${c.id}`)}>
              {photo?<img src={photo} alt="" style={{ width:"52px",height:"52px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${unread?T.pink:T.border}`,flexShrink:0 }}/>
                :<div style={{ width:"52px",height:"52px",borderRadius:"50%",background:T.gradPrimary,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"20px",color:"#fff",border:`2px solid ${unread?T.pink:T.border}`,flexShrink:0 }}>{name?.charAt(0)||"?"}</div>}
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px" }}>
                  <div style={{ fontFamily:T.fontBody,fontSize:"15px",fontWeight:unread?"700":"500",color:unread?T.white:"rgba(255,255,255,0.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</div>
                  <div style={{ fontFamily:T.fontMono,fontSize:"11px",color:unread?T.pink:T.muted,flexShrink:0,marginLeft:"8px" }}>{timeAgo(c.lastMessageAt)}</div>
                </div>
                <div style={{ fontFamily:T.fontBody,fontSize:"13px",color:unread?T.muted:T.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.lastMessage||"Start the conversation..."}</div>
              </div>
              {unread&&<div style={{ width:"8px",height:"8px",borderRadius:"50%",background:T.pink,flexShrink:0,boxShadow:`0 0 8px ${T.pink}` }}/>}
            </div>
          );
        })
      )}
    </div>
  );
}