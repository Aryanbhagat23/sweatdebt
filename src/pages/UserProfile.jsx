import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import T, { gradientText } from "../theme";
import BadgeDisplay, { StreakBadge } from "../components/BadgeDisplay";

export default function UserProfile({ currentUser }) {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [tab, setTab] = useState("stats");
  const isOwn = userId === currentUser?.uid;

  useEffect(()=>{
    const load=async()=>{
      try{
        const snap=await getDoc(doc(db,"users",userId));
        if(snap.exists()) setProfile({id:snap.id,...snap.data()});
        if(currentUser&&!isOwn){const f=await getDoc(doc(db,"users",currentUser.uid,"friends",userId));setIsFriend(f.exists());}
      }catch(e){console.error(e);}
      setLoading(false);
    };
    load();
  },[userId,currentUser]);

  useEffect(()=>{
    if(!userId)return;
    const u=onSnapshot(query(collection(db,"videos"),where("uploadedBy","==",userId)),snap=>{
      const d=snap.docs.map(x=>({id:x.id,...x.data()}));
      d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setVideos(d);
    });
    return()=>u();
  },[userId]);

  const toggleFriend=async()=>{
    if(!currentUser||isOwn)return; setFriendLoading(true);
    try{
      const my=doc(db,"users",currentUser.uid,"friends",userId);
      const their=doc(db,"users",userId,"friends",currentUser.uid);
      if(isFriend){await deleteDoc(my);await deleteDoc(their);setIsFriend(false);}
      else{await setDoc(my,{uid:userId,displayName:profile?.displayName,email:profile?.email,photoURL:profile?.photoURL||null,addedAt:serverTimestamp()});await setDoc(their,{uid:currentUser.uid,displayName:currentUser.displayName,email:currentUser.email,photoURL:currentUser.photoURL||null,addedAt:serverTimestamp()});setIsFriend(true);}
    }catch(e){console.error(e);}
    setFriendLoading(false);
  };

  const winRate=()=>{const t=(profile?.wins||0)+(profile?.losses||0);return t>0?Math.round((profile.wins/t)*100):0;};
  const honour=Math.max(0,Math.min(200,profile?.honour??100));
  const honourPct=Math.min(100,Math.round((honour/150)*100));

  if(loading)return(<div style={{ minHeight:"100vh",background:T.bg0,display:"flex",alignItems:"center",justifyContent:"center" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width:"36px",height:"36px",borderRadius:"50%",border:`3px solid ${T.bg3}`,borderTop:`3px solid ${T.pink}`,animation:"spin 0.8s linear infinite" }}/></div>);
  if(!profile)return(<div style={{ minHeight:"100vh",background:T.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px" }}><div style={{ fontSize:"48px",marginBottom:"16px" }}>👤</div><div style={{ fontFamily:T.fontDisplay,fontSize:"24px",color:T.muted }}>User not found</div><button style={{ marginTop:"20px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:T.r12,padding:"12px 24px",color:T.muted,cursor:"pointer",fontFamily:T.fontBody,fontSize:"15px" }} onClick={()=>navigate(-1)}>← Go back</button></div>);

  return(
    <div style={{ minHeight:"100vh",background:T.bg0,paddingBottom:"40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ padding:"52px 16px 16px",display:"flex",alignItems:"center",gap:"12px" }}>
        <button style={{ background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"50%",width:"44px",height:"44px",color:T.white,fontSize:"20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }} onClick={()=>navigate(-1)}>←</button>
        <div style={{ flex:1 }}/>
        {isOwn&&<button style={{ background:"transparent",border:`1px solid ${T.borderMid}`,borderRadius:T.r12,padding:"8px 16px",color:T.pink,fontFamily:T.fontBody,fontSize:"14px",cursor:"pointer" }} onClick={()=>navigate("/edit-profile")}>Edit</button>}
      </div>

      {/* Profile card */}
      <div style={{ margin:"0 16px 16px",background:T.bg1,borderRadius:T.r24,padding:"24px",border:`1px solid ${T.border}`,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:"-40px",right:"-40px",width:"120px",height:"120px",borderRadius:"50%",background:`radial-gradient(circle,${T.pinkDim},transparent)`,pointerEvents:"none" }}/>
        <div style={{ display:"flex",alignItems:"flex-start",gap:"16px",marginBottom:"16px" }}>
          {profile.photoURL?<img src={profile.photoURL} alt="" style={{ width:"72px",height:"72px",borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.pink}`,flexShrink:0 }}/>
            :<div style={{ width:"72px",height:"72px",borderRadius:"50%",background:T.gradPrimary,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"28px",color:"#fff",flexShrink:0 }}>{profile.displayName?.charAt(0)||"?"}</div>}
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fontBody,fontSize:"20px",fontWeight:"700",color:T.white }}>{profile.displayName}</div>
            <div style={{ fontFamily:T.fontMono,fontSize:"13px",color:T.muted,marginBottom:"8px" }}>@{profile.username||profile.displayName?.toLowerCase().replace(/\s/g,"")}</div>
            {profile.currentWinStreak>=1&&<StreakBadge streak={profile.currentWinStreak} size="small"/>}
            {profile.bio&&<div style={{ fontFamily:T.fontBody,fontSize:"13px",color:"rgba(255,255,255,0.6)",lineHeight:"1.5",marginTop:"6px" }}>{profile.bio}</div>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px",marginBottom:"16px" }}>
          {[{val:profile.wins||0,label:"Wins",color:T.green},{val:profile.losses||0,label:"Losses",color:T.red},{val:`${winRate()}%`,label:"Win Rate",color:T.pink},{val:profile.bestWinStreak||0,label:"Best 🔥",color:T.orange}].map(s=>(
            <div key={s.label} style={{ background:T.bg3,borderRadius:T.r12,padding:"12px 8px",textAlign:"center" }}>
              <div style={{ fontFamily:T.fontDisplay,fontSize:"24px",color:s.color,lineHeight:1 }}>{s.val}</div>
              <div style={{ fontFamily:T.fontMono,fontSize:"9px",color:T.muted,marginTop:"3px",letterSpacing:"0.06em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Honour */}
        <div style={{ marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"6px" }}>
            <span style={{ fontFamily:T.fontMono,fontSize:"11px",color:T.muted,letterSpacing:"0.08em" }}>HONOUR SCORE</span>
            <span style={{ fontFamily:T.fontMono,fontSize:"12px",color:honour>=120?T.green:honour>=80?T.orange:T.red }}>{honour}/150</span>
          </div>
          <div style={{ height:"6px",background:T.bg3,borderRadius:"3px" }}>
            <div style={{ height:"100%",width:`${honourPct}%`,background:T.gradPrimary,borderRadius:"3px",transition:"width 0.8s" }}/>
          </div>
          <div style={{ fontFamily:T.fontBody,fontSize:"12px",color:T.muted,marginTop:"4px" }}>
            {honour>=150?"💫 Elite player":honour>=120?"✅ Trusted player":honour>=80?"🟡 Building reputation":"🔴 Low honour"}
          </div>
        </div>

        {/* Actions */}
        {!isOwn&&(
          <div style={{ display:"flex",gap:"10px" }}>
            <button style={{ flex:1,padding:"14px",background:isFriend?T.bg3:T.gradPrimary,border:isFriend?`1px solid ${T.border}`:"none",borderRadius:T.r12,fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.04em",color:isFriend?T.muted:"#fff",cursor:"pointer",opacity:friendLoading?0.6:1 }} onClick={toggleFriend} disabled={friendLoading}>{friendLoading?"...":isFriend?"✓ Friends":"+ Add Friend"}</button>
            <button style={{ flex:1,padding:"14px",background:"transparent",border:`1px solid ${T.pinkBorder}`,borderRadius:T.r12,fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.04em",color:T.pink,cursor:"pointer" }} onClick={()=>navigate("/create",{state:{opponent:{email:profile.email,displayName:profile.displayName,uid:profile.id}}})}>⚔️ Challenge</button>
            <button style={{ padding:"14px 16px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:T.r12,fontSize:"18px",cursor:"pointer" }} onClick={()=>{const cid=[currentUser.uid,profile.id].sort().join("_");navigate(`/inbox/${cid}`);}}>💬</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",margin:"0 16px 16px",background:T.bg1,borderRadius:T.r16,padding:"4px",border:`1px solid ${T.border}` }}>
        {[{key:"stats",label:"Stats"},{key:"badges",label:`Badges${profile.badges?.length>0?` (${profile.badges.length})`:""}`},{key:"videos",label:`Videos${videos.length>0?` (${videos.length})`:""}`}].map(t=>(
          <div key={t.key} style={{ padding:"10px",textAlign:"center",borderRadius:"12px",cursor:"pointer",background:tab===t.key?T.gradPrimary:"transparent",fontFamily:T.fontBody,fontSize:"13px",fontWeight:"600",color:tab===t.key?"#fff":T.muted,transition:"all 0.2s" }} onClick={()=>setTab(t.key)}>{t.label}</div>
        ))}
      </div>

      <div style={{ padding:"0 16px" }}>
        {tab==="stats"&&(
          <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
            {[{label:"Total Bets",val:profile.totalBets||0,icon:"⚔️"},{label:"Current Win Streak",val:profile.currentWinStreak||0,icon:"🔥"},{label:"Best Win Streak",val:profile.bestWinStreak||0,icon:"👑"},{label:"Forfeits Completed",val:profile.forfeitsCompleted||0,icon:"💀"},{label:"Daily Challenges",val:profile.dailyChallengesCompleted||0,icon:"📅"},{label:"Honour Score",val:honour,icon:"⭐"}].map(r=>(
              <div key={r.label} style={{ display:"flex",alignItems:"center",gap:"14px",background:T.bg1,border:`1px solid ${T.border}`,borderRadius:T.r16,padding:"14px 16px" }}>
                <span style={{ fontSize:"22px",flexShrink:0 }}>{r.icon}</span>
                <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.muted,flex:1 }}>{r.label}</div>
                <div style={{ fontFamily:T.fontDisplay,fontSize:"24px",color:T.white }}>{r.val}</div>
              </div>
            ))}
          </div>
        )}
        {tab==="badges"&&<BadgeDisplay earnedBadgeIds={profile.badges||[]}/>}
        {tab==="videos"&&(
          videos.length===0?(
            <div style={{ textAlign:"center",padding:"32px 0" }}>
              <div style={{ fontSize:"40px",marginBottom:"12px" }}>🎥</div>
              <div style={{ fontFamily:T.fontDisplay,fontSize:"20px",color:T.muted,letterSpacing:"0.04em" }}>{isOwn?"No forfeits uploaded yet":"No forfeits uploaded yet"}</div>
            </div>
          ):(
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px" }}>
              {videos.map(v=>(
                <div key={v.id} style={{ position:"relative",aspectRatio:"9/16",overflow:"hidden",borderRadius:T.r12,background:T.bg2,cursor:"pointer" }} onClick={()=>window.open(v.videoUrl,"_blank")}>
                  <video src={v.videoUrl} style={{ width:"100%",height:"100%",objectFit:"cover" }} preload="metadata"/>
                  <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ fontSize:"20px" }}>▶</div></div>
                  {v.approved&&<div style={{ position:"absolute",top:"6px",left:"6px",background:T.gradPrimary,borderRadius:"6px",padding:"2px 6px",fontFamily:T.fontMono,fontSize:"9px",color:"#fff",fontWeight:"700" }}>✓</div>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}