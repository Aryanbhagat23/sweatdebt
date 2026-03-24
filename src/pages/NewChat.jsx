// src/pages/NewChat.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import T from "../theme";

export default function NewChat({ user }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  useEffect(()=>{
    if(!user)return;
    getDocs(collection(db,"users",user.uid,"friends")).then(snap=>{
      setFriends(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false);
    });
  },[user]);

  const start=async(f)=>{
    setStarting(f.id);
    try{
      const fuid=f.uid||f.id;
      const cid=[user.uid,fuid].sort().join("_");
      const ex=await getDoc(doc(db,"conversations",cid));
      if(!ex.exists()) await setDoc(doc(db,"conversations",cid),{participants:[user.uid,fuid],participantNames:{[user.uid]:user.displayName,[fuid]:f.displayName},participantPhotos:{[user.uid]:user.photoURL||null,[fuid]:f.photoURL||null},lastMessage:"",lastMessageAt:serverTimestamp(),lastSenderId:null,unreadCount:{[user.uid]:0,[fuid]:0},createdAt:serverTimestamp()});
      navigate(`/inbox/${cid}`);
    }catch(e){console.error(e);}
    setStarting(null);
  };

  return(
    <div style={{ minHeight:"100vh",background:T.bg0,paddingBottom:"40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",padding:"52px 16px 16px",borderBottom:`1px solid ${T.border}` }}>
        <button style={{ background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"50%",width:"44px",height:"44px",color:T.white,fontSize:"20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }} onClick={()=>navigate("/inbox")}>←</button>
        <div style={{ fontFamily:T.fontDisplay,fontSize:"28px",color:T.white,letterSpacing:"0.04em" }}>New Message</div>
      </div>
      <div style={{ padding:"16px" }}>
        <div style={{ fontFamily:T.fontMono,fontSize:"11px",color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px" }}>Your Friends ({friends.length})</div>
        {loading?(<div style={{ display:"flex",justifyContent:"center",padding:"40px" }}><div style={{ width:"28px",height:"28px",borderRadius:"50%",border:`3px solid ${T.bg3}`,borderTop:`3px solid ${T.pink}`,animation:"spin 0.8s linear infinite" }}/></div>)
          :friends.length===0?(
            <div style={{ textAlign:"center",padding:"40px 0" }}>
              <div style={{ fontSize:"48px",marginBottom:"12px" }}>👥</div>
              <div style={{ fontFamily:T.fontDisplay,fontSize:"22px",color:T.muted,letterSpacing:"0.04em",marginBottom:"8px" }}>No friends yet</div>
              <button style={{ background:T.gradPrimary,border:"none",borderRadius:T.r16,padding:"12px 24px",fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.06em",color:"#fff",cursor:"pointer" }} onClick={()=>navigate("/friends")}>🔍 Find Friends</button>
            </div>
          ):(
            friends.map(f=>(
              <div key={f.id} style={{ display:"flex",alignItems:"center",gap:"14px",background:T.bg1,border:`1px solid ${T.border}`,borderRadius:T.r16,padding:"14px",marginBottom:"8px",cursor:"pointer",opacity:starting===f.id?0.6:1,transition:"all 0.15s" }} onClick={()=>!starting&&start(f)}>
                {f.photoURL?<img src={f.photoURL} alt="" style={{ width:"48px",height:"48px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.border}`,flexShrink:0 }}/>
                  :<div style={{ width:"48px",height:"48px",borderRadius:"50%",background:T.gradPrimary,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"18px",color:"#fff",flexShrink:0 }}>{f.displayName?.charAt(0)||"?"}</div>}
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fontBody,fontSize:"15px",fontWeight:"500",color:T.white }}>{f.displayName}</div>
                  <div style={{ fontFamily:T.fontMono,fontSize:"12px",color:T.muted,marginTop:"2px" }}>@{f.username||""}</div>
                </div>
                <div style={{ fontFamily:T.fontBody,fontSize:"13px",color:T.pink }}>{starting===f.id?"...":"Message →"}</div>
              </div>
            ))
          )}
      </div>
    </div>
  );
}