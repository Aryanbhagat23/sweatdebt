import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, doc, updateDoc, increment } from "firebase/firestore";
import NotificationBell from "../components/NotificationBell";
import CommentsPanel from "../components/CommentsPanel";
import { BadgeToast, StreakBadge } from "../components/BadgeDisplay";
import { recordWin, recordLossApproved, recordDisputed } from "../utils/streaks";
import { useNavigate } from "react-router-dom";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", coral:"#ff6b4a", green:"#00e676",
  red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7",
};

export default function Feed({ user, onBellClick }) {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forYou");
  const [friendIds, setFriendIds] = useState([]);
  const [newBadge, setNewBadge] = useState(null); // badge toast

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db,"users",user.uid,"friends"),
      snap => setFriendIds(snap.docs.map(d=>d.data().uid).filter(Boolean)),
      ()=>{}
    );
    return ()=>unsub();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db,"videos"));
    const unsub = onSnapshot(q, snap=>{
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setVideos(data); setLoading(false);
    }, err=>{console.error(err); setLoading(false);});
    return ()=>unsub();
  }, []);

  const getTabVideos = () => {
    if (activeTab==="friends") return videos.filter(v=>friendIds.includes(v.uploadedBy)||v.uploadedBy===user?.uid);
    if (activeTab==="trending") return [...videos].sort((a,b)=>((b.likes||0)+(b.comments||0)*2)-((a.likes||0)+(a.comments||0)*2));
    return videos;
  };
  const displayVideos = getTabVideos();

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"40px",height:"40px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg0}}>
      {/* Badge toast */}
      {newBadge && <BadgeToast badgeId={newBadge} onClose={() => setNewBadge(null)} />}

      {/* Tab bar */}
      <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",zIndex:100,paddingTop:"env(safe-area-inset-top,0)"}}>
        <div style={{display:"flex",justifyContent:"center",gap:"24px",padding:"12px 20px 8px",background:"linear-gradient(to bottom,rgba(7,13,26,0.97),transparent)"}}>
          {[{key:"forYou",label:"For You"},{key:"friends",label:"Friends"},{key:"trending",label:"🔥 Trending"}].map(tab=>(
            <div key={tab.key} style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"600",color:activeTab===tab.key?C.white:"rgba(224,242,254,0.4)",cursor:"pointer",borderBottom:activeTab===tab.key?`2px solid ${C.cyan}`:"2px solid transparent",paddingBottom:"4px",transition:"all 0.2s"}} onClick={()=>setActiveTab(tab.key)}>
              {tab.label}
            </div>
          ))}
        </div>
        <div style={{position:"absolute",top:"10px",right:"16px"}}>
          <NotificationBell user={user} onClick={onBellClick}/>
        </div>
      </div>

      {displayVideos.length===0 && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px",padding:"24px"}}>
          <div style={{fontSize:"64px"}}>{activeTab==="friends"?"👥":"🎥"}</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"26px",color:C.muted,letterSpacing:"0.04em",textAlign:"center"}}>
            {activeTab==="friends"?"No friend videos yet":activeTab==="trending"?"Nothing trending yet":"No forfeits yet"}
          </div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:C.dim,textAlign:"center"}}>
            {activeTab==="friends"?"Add friends and challenge them!":"Be the first to lose a bet 😤"}
          </div>
          {activeTab==="friends"&&(
            <div style={{background:`rgba(0,212,255,0.1)`,border:`1px solid rgba(0,212,255,0.3)`,borderRadius:"14px",padding:"12px 20px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:C.cyan,letterSpacing:"0.04em"}} onClick={()=>navigate("/friends")}>
              🔍 FIND FRIENDS
            </div>
          )}
        </div>
      )}

      {displayVideos.length>0 && (
        <ReelsFeed videos={displayVideos} user={user} navigate={navigate} onBadgeEarned={setNewBadge} />
      )}
    </div>
  );
}

function ReelsFeed({videos,user,navigate,onBadgeEarned}){
  const [currentIndex,setCurrentIndex]=useState(0);
  const startY=useRef(null);
  const containerRef=useRef(null);
  const lastSwipe=useRef(0);

  useEffect(()=>setCurrentIndex(0),[videos]);

  const handleTouchStart=(e)=>{ startY.current=e.touches[0].clientY; };
  const handleTouchEnd=(e)=>{
    if(startY.current===null)return;
    const diff=startY.current-e.changedTouches[0].clientY;
    const now=Date.now();
    if(Math.abs(diff)>60&&now-lastSwipe.current>400){
      lastSwipe.current=now;
      if(diff>0&&currentIndex<videos.length-1) setCurrentIndex(p=>p+1);
      else if(diff<0&&currentIndex>0) setCurrentIndex(p=>p-1);
    }
    startY.current=null;
  };

  const handleWheel=useCallback((e)=>{
    e.preventDefault();
    const now=Date.now();
    if(now-lastSwipe.current<600)return;
    if(e.deltaY>40&&currentIndex<videos.length-1){lastSwipe.current=now;setCurrentIndex(p=>p+1);}
    else if(e.deltaY<-40&&currentIndex>0){lastSwipe.current=now;setCurrentIndex(p=>p-1);}
  },[currentIndex,videos.length]);

  useEffect(()=>{
    const el=containerRef.current; if(!el)return;
    el.addEventListener("wheel",handleWheel,{passive:false});
    return()=>el.removeEventListener("wheel",handleWheel);
  },[handleWheel]);

  return(
    <div ref={containerRef} style={{height:"100vh",overflow:"hidden",position:"relative"}} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {videos.map((video,index)=>(
        <ReelCard key={video.id} video={video} user={user} isActive={index===currentIndex} offset={index-currentIndex} navigate={navigate} onBadgeEarned={onBadgeEarned} />
      ))}
      <div style={{position:"fixed",right:"8px",top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:"5px",zIndex:50}}>
        {videos.slice(Math.max(0,currentIndex-4),currentIndex+5).map((_,i)=>{
          const actual=Math.max(0,currentIndex-4)+i;
          return <div key={actual} style={{width:"3px",height:actual===currentIndex?"18px":"4px",borderRadius:"2px",background:actual===currentIndex?C.cyan:"rgba(224,242,254,0.2)",transition:"all 0.3s",cursor:"pointer"}} onClick={()=>setCurrentIndex(actual)}/>;
        })}
      </div>
    </div>
  );
}

function ReelCard({video,user,isActive,offset,navigate,onBadgeEarned}){
  const videoRef=useRef(null);
  const [liked,setLiked]=useState(false);
  const [likes,setLikes]=useState(video.likes||0);
  const [approved,setApproved]=useState(video.approved||false);
  const [disputed,setDisputed]=useState(video.disputed||false);
  const [approving,setApproving]=useState(false);
  const [showComments,setShowComments]=useState(false);
  const [commentCount,setCommentCount]=useState(video.comments||0);
  const [muted,setMuted]=useState(false);

  useEffect(()=>{
    const v=videoRef.current; if(!v)return;
    if(isActive){v.play().catch(()=>{});}
    else{v.pause(); v.currentTime=0; setShowComments(false);}
  },[isActive]);

  const canVerdict=!approved&&!disputed&&(
    video.uploadedBy===user?.uid||video.opponentEmail===user?.email||video.createdByEmail===user?.email
  );

  const handleLike=async()=>{
    setLiked(!liked); setLikes(liked?likes-1:likes+1);
    await updateDoc(doc(db,"videos",video.id),{likes:increment(liked?-1:1)});
  };

  const handleApprove=async()=>{
    setApproving(true);
    try{
      await updateDoc(doc(db,"videos",video.id),{approved:true,disputed:false});
      if(video.betId&&video.betId!=="general") await updateDoc(doc(db,"bets",video.betId),{status:"lost"});

      // Update scores + streaks + check badges
      if(video.betCreatedBy){
        const newBadges = await recordWin(video.betCreatedBy);
        // Show badge toast to current user if they won
        if(video.betCreatedBy === user?.uid && newBadges?.length > 0) {
          onBadgeEarned(newBadges[0]);
        }
      }
      if(video.uploadedBy){
        const newBadges = await recordLossApproved(video.uploadedBy);
        if(video.uploadedBy === user?.uid && newBadges?.length > 0) {
          onBadgeEarned(newBadges[0]);
        }
      }
      setApproved(true);
    }catch(e){console.error(e);}
    setApproving(false);
  };

  const handleDispute=async()=>{
    setApproving(true);
    try{
      await updateDoc(doc(db,"videos",video.id),{disputed:true,approved:false});
      if(video.betId&&video.betId!=="general") await updateDoc(doc(db,"bets",video.betId),{status:"disputed"});
      if(video.uploadedBy) await recordDisputed(video.uploadedBy);
      setDisputed(true);
    }catch(e){console.error(e);}
    setApproving(false);
  };

  const timeAgo=(ts)=>{
    if(!ts?.toDate)return"just now";
    const s=Math.floor((new Date()-ts.toDate())/1000);
    if(s<60)return"just now"; if(s<3600)return`${Math.floor(s/60)}m`;
    if(s<86400)return`${Math.floor(s/3600)}h`; return`${Math.floor(s/86400)}d`;
  };

  return(
    <>
    <style>{`@keyframes heartPop{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}`}</style>
    <div style={{position:"absolute",inset:0,transform:`translateY(${offset*100}%)`,transition:"transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)",background:C.bg0,overflow:"hidden"}}>
      <video ref={videoRef} src={video.videoUrl} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} loop playsInline muted={muted} preload={isActive?"auto":"none"} onClick={()=>setMuted(!muted)}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(to top,rgba(7,13,26,0.97) 0%,rgba(7,13,26,0.2) 30%,transparent 55%,rgba(7,13,26,0.5) 100%)"}}/>

      {/* Status */}
      <div style={{position:"absolute",top:"60px",left:"16px"}}>
        {approved&&<div style={{background:"rgba(0,230,118,0.2)",border:"1px solid rgba(0,230,118,0.6)",color:C.green,padding:"4px 12px",borderRadius:"20px",fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"700"}}>APPROVED ✓</div>}
        {disputed&&<div style={{background:"rgba(255,77,109,0.2)",border:"1px solid rgba(255,77,109,0.6)",color:C.red,padding:"4px 12px",borderRadius:"20px",fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"700"}}>DISPUTED ✗</div>}
        {!approved&&!disputed&&<div style={{background:"rgba(255,107,74,0.2)",border:"1px solid rgba(255,107,74,0.6)",color:C.coral,padding:"4px 12px",borderRadius:"20px",fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"700"}}>FORFEIT 💀</div>}
      </div>
      {muted&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,0.6)",borderRadius:"50%",width:"60px",height:"60px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",pointerEvents:"none"}}>🔇</div>}

      {/* Right actions */}
      <div style={{position:"absolute",right:"12px",bottom:"100px",display:"flex",flexDirection:"column",gap:"20px",alignItems:"center",zIndex:10}}>
        {[
          {icon:liked?"❤️":"🤍",count:likes,onClick:handleLike},
          {icon:"💬",count:commentCount,onClick:()=>setShowComments(true)},
          {icon:"↗️",label:"Share",onClick:async()=>{if(navigator.share)await navigator.share({title:"SweatDebt forfeit",url:window.location.href});else navigator.clipboard.writeText(window.location.href);}},
          {icon:"⚔️",label:"Bet",onClick:()=>navigate("/create")},
        ].map((btn,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",cursor:"pointer"}} onClick={btn.onClick}>
            <div style={{fontSize:"28px"}}>{btn.icon}</div>
            {btn.count!==undefined&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.white,fontWeight:"500"}}>{btn.count}</div>}
            {btn.label&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"rgba(224,242,254,0.7)"}}>{btn.label}</div>}
          </div>
        ))}
      </div>

      {/* Bottom info */}
      <div style={{position:"absolute",bottom:0,left:0,right:"60px",padding:"0 16px 90px",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px",cursor:"pointer"}} onClick={()=>navigate(`/profile/${video.uploadedBy}`)}>
          {video.uploaderPhoto
            ?<img src={video.uploaderPhoto} alt="" style={{width:"42px",height:"42px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.cyan}`,flexShrink:0}}/>
            :<div style={{width:"42px",height:"42px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#000",border:`2px solid ${C.cyan}`,flexShrink:0}}>{video.uploadedByName?.charAt(0)||"?"}</div>
          }
          <div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"700",color:C.white}}>@{video.uploadedByName?.toLowerCase().replace(/\s/g,"")}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"rgba(224,242,254,0.4)"}}>{timeAgo(video.createdAt)}</div>
          </div>
        </div>

        {canVerdict&&(
          <div style={{background:"rgba(7,13,26,0.88)",border:`1px solid ${C.border1}`,borderRadius:"16px",padding:"12px",marginBottom:"10px",backdropFilter:"blur(8px)"}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.muted,marginBottom:"8px",textAlign:"center"}}>Did they complete the forfeit?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <button style={{background:"rgba(0,230,118,0.2)",border:"1px solid rgba(0,230,118,0.6)",borderRadius:"10px",padding:"12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.06em",color:C.green,cursor:"pointer",opacity:approving?0.5:1}} onClick={handleApprove} disabled={approving}>✓ APPROVE</button>
              <button style={{background:"rgba(255,77,109,0.2)",border:"1px solid rgba(255,77,109,0.6)",borderRadius:"10px",padding:"12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.06em",color:C.red,cursor:"pointer",opacity:approving?0.5:1}} onClick={handleDispute} disabled={approving}>✗ DISPUTE</button>
            </div>
          </div>
        )}
        {approved&&<div style={{background:"rgba(0,230,118,0.15)",border:"1px solid rgba(0,230,118,0.4)",borderRadius:"10px",padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.green,textAlign:"center",marginBottom:"10px"}}>✓ Forfeit approved! Scores updated 🏆</div>}
        {disputed&&<div style={{background:"rgba(255,77,109,0.15)",border:"1px solid rgba(255,77,109,0.4)",borderRadius:"10px",padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.red,textAlign:"center",marginBottom:"10px"}}>⚠ Disputed — honour dropped</div>}
      </div>

      {showComments&&<CommentsPanel videoId={video.id} currentUser={user} onCountChange={setCommentCount} onClose={()=>setShowComments(false)}/>}
    </div>
    </>
  );
}