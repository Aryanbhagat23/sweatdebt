import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, doc, updateDoc, increment } from "firebase/firestore";
import T from "../theme";
import NotificationBell from "../components/NotificationBell";
import CommentsPanel from "../components/CommentsPanel";
import { BadgeToast } from "../components/BadgeDisplay";
import { recordWin, recordLossApproved, recordDisputed } from "../utils/streaks";
import { useNavigate } from "react-router-dom";

export default function Feed({ user, onBellClick }) {
  const navigate = useNavigate();
  const [videos,    setVideos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("forYou");
  const [friendIds, setFriendIds] = useState([]);
  const [newBadge,  setNewBadge]  = useState(null);

  useEffect(() => {
    if (!user) return;
    const u = onSnapshot(collection(db,"users",user.uid,"friends"),
      snap => setFriendIds(snap.docs.map(d=>d.data().uid).filter(Boolean)), ()=>{});
    return ()=>u();
  }, [user]);

  useEffect(() => {
    const u = onSnapshot(query(collection(db,"videos")), snap => {
      const d = snap.docs.map(x=>({id:x.id,...x.data()}));
      d.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setVideos(d); setLoading(false);
    }, err=>{console.error(err); setLoading(false);});
    return ()=>u();
  }, []);

  const getVids = () => {
    if (tab==="friends") return videos.filter(v=>friendIds.includes(v.uploadedBy)||v.uploadedBy===user?.uid);
    if (tab==="trending") return [...videos].sort((a,b)=>((b.likes||0)+(b.comments||0)*2)-((a.likes||0)+(a.comments||0)*2));
    return videos;
  };
  const vids = getVids();

  if (loading) return (
    <div style={{minHeight:"100vh",background:T.bg0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"40px",height:"40px",borderRadius:"50%",border:`3px solid ${T.bg3}`,borderTop:`3px solid ${T.pink}`,animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg0}}>
      {newBadge && <BadgeToast badgeId={newBadge} onClose={()=>setNewBadge(null)}/>}

      {/* Tab bar */}
      <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",zIndex:100,paddingTop:"env(safe-area-inset-top,0)"}}>
        <div style={{display:"flex",justifyContent:"center",gap:"24px",padding:"14px 20px 10px",background:"rgba(10,10,15,0.97)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)"}}>
          {[{key:"forYou",label:"For You"},{key:"friends",label:"Friends"},{key:"trending",label:"🔥 Trending"}].map(t=>(
            <div key={t.key} style={{fontFamily:T.fontBody,fontSize:"15px",fontWeight:"600",color:tab===t.key?T.white:"rgba(255,255,255,0.3)",cursor:"pointer",borderBottom:tab===t.key?`2px solid ${T.pink}`:"2px solid transparent",paddingBottom:"4px",transition:"all 0.2s"}}
              onClick={()=>setTab(t.key)}>{t.label}</div>
          ))}
        </div>
        <div style={{position:"absolute",top:"12px",right:"16px"}}>
          <NotificationBell user={user} onClick={onBellClick}/>
        </div>
      </div>

      {vids.length===0 ? (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px",padding:"24px"}}>
          <div style={{fontSize:"64px"}}>{tab==="friends"?"👥":"🎥"}</div>
          <div style={{fontFamily:T.fontDisplay,fontSize:"26px",color:T.muted,letterSpacing:"0.04em",textAlign:"center"}}>
            {tab==="friends"?"No friend videos yet":tab==="trending"?"Nothing trending yet":"No forfeits yet"}
          </div>
          {tab==="friends"&&<button style={{background:T.pinkDim,border:`1px solid ${T.pinkBorder}`,borderRadius:T.r16,padding:"12px 20px",cursor:"pointer",fontFamily:T.fontDisplay,fontSize:"18px",color:T.pink,letterSpacing:"0.04em"}} onClick={()=>navigate("/friends")}>🔍 FIND FRIENDS</button>}
        </div>
      ):(
        <ReelsFeed videos={vids} user={user} navigate={navigate} onBadge={setNewBadge}/>
      )}
    </div>
  );
}

function ReelsFeed({videos,user,navigate,onBadge}){
  const [idx,setIdx]=useState(0);
  const containerRef=useRef(null);
  const idxRef=useRef(0); idxRef.current=idx;
  const totalRef=useRef(0); totalRef.current=videos.length;
  // No commentsOpen state here at all — panel uses z-index to cover everything
  const touch=useRef({y:0,x:0,time:0,dir:null,active:false});
  const lastSwipe=useRef(0);

  useEffect(()=>{
    const el=containerRef.current; if(!el)return;
    const onStart=e=>{
      const t=e.changedTouches[0];
      touch.current={y:t.clientY,x:t.clientX,time:Date.now(),dir:null,active:true};
    };
    const onMove=e=>{
      if(!touch.current.active)return;
      const t=e.changedTouches[0];
      const dy=Math.abs(t.clientY-touch.current.y);
      const dx=Math.abs(t.clientX-touch.current.x);
      if(touch.current.dir===null&&(dy>10||dx>10)) touch.current.dir=dy>=dx?"v":"h";
      if(touch.current.dir==="v") e.preventDefault();
    };
    const onEnd=e=>{
      if(!touch.current.active){touch.current.active=false;return;}
      touch.current.active=false;
      if(touch.current.dir!=="v")return;
      const t=e.changedTouches[0];
      const dy=touch.current.y-t.clientY;
      const dx=Math.abs(t.clientX-touch.current.x);
      const dt=Date.now()-touch.current.time;
      if(Math.abs(dy)<45||dx>80||dt>700)return;
      if(Date.now()-lastSwipe.current<300)return;
      lastSwipe.current=Date.now();
      if(dy>0&&idxRef.current<totalRef.current-1)setIdx(p=>p+1);
      else if(dy<0&&idxRef.current>0)setIdx(p=>p-1);
    };
    el.addEventListener("touchstart",onStart,{passive:true});
    el.addEventListener("touchmove",onMove,{passive:false});
    el.addEventListener("touchend",onEnd,{passive:true});
    el.addEventListener("touchcancel",()=>{touch.current.active=false;},{passive:true});
    return()=>{
      el.removeEventListener("touchstart",onStart);
      el.removeEventListener("touchmove",onMove);
      el.removeEventListener("touchend",onEnd);
    };
  },[]);

  const lastWheel=useRef(0);
  const onWheel=useCallback(e=>{
    e.preventDefault();
    const now=Date.now();
    if(now-lastWheel.current<600)return;
    if(e.deltaY>30&&idxRef.current<totalRef.current-1){lastWheel.current=now;setIdx(p=>p+1);}
    else if(e.deltaY<-30&&idxRef.current>0){lastWheel.current=now;setIdx(p=>p-1);}
  },[]);
  useEffect(()=>{
    const el=containerRef.current; if(!el)return;
    el.addEventListener("wheel",onWheel,{passive:false});
    return()=>el.removeEventListener("wheel",onWheel);
  },[onWheel]);

  return(
    <div ref={containerRef} style={{height:"100vh",overflow:"hidden",position:"relative",touchAction:"none",userSelect:"none",WebkitUserSelect:"none"}}>
      {videos.map((v,i)=>(
        <ReelCard key={v.id} video={v} user={user} isActive={i===idx} offset={i-idx} navigate={navigate} onBadge={onBadge}/>
      ))}
      <div style={{position:"fixed",right:"8px",top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:"5px",zIndex:50,pointerEvents:"none"}}>
        {videos.slice(Math.max(0,idx-4),idx+5).map((_,i)=>{const a=Math.max(0,idx-4)+i;return <div key={a} style={{width:"3px",height:a===idx?"18px":"4px",borderRadius:"2px",background:a===idx?T.pink:"rgba(255,255,255,0.15)",transition:"all 0.3s"}}/>;} )}
      </div>
    </div>
  );
}

function ReelCard({video,user,isActive,offset,navigate,onBadge}){
  const vRef=useRef(null);
  const [liked,        setLiked]        =useState(false);
  const [likes,        setLikes]        =useState(video.likes||0);
  const [approved,     setApproved]     =useState(video.approved||false);
  const [disputed,     setDisputed]     =useState(video.disputed||false);
  const [approving,    setApproving]    =useState(false);
  const [showComments, setShowComments] =useState(false);
  const [commentCount, setCommentCount] =useState(video.comments||0);
  const [muted,        setMuted]        =useState(false);

  useEffect(()=>{
    const v=vRef.current; if(!v)return;
    if(isActive)v.play().catch(()=>{});
    else{v.pause();v.currentTime=0;}
  },[isActive]);

  useEffect(()=>{if(!isActive)setShowComments(false);},[isActive]);

  const canVerdict=!approved&&!disputed&&(video.uploadedBy===user?.uid||video.opponentEmail===user?.email||video.createdByEmail===user?.email);

  const handleLike=async()=>{setLiked(!liked);setLikes(liked?likes-1:likes+1);await updateDoc(doc(db,"videos",video.id),{likes:increment(liked?-1:1)});};
  const handleApprove=async()=>{
    setApproving(true);
    try{
      await updateDoc(doc(db,"videos",video.id),{approved:true,disputed:false});
      if(video.betId&&video.betId!=="general")await updateDoc(doc(db,"bets",video.betId),{status:"lost"});
      if(video.betCreatedBy){const nb=await recordWin(video.betCreatedBy);if(video.betCreatedBy===user?.uid&&nb?.length>0)onBadge(nb[0]);}
      if(video.uploadedBy){const nb=await recordLossApproved(video.uploadedBy);if(video.uploadedBy===user?.uid&&nb?.length>0)onBadge(nb[0]);}
      setApproved(true);
    }catch(e){console.error(e);}
    setApproving(false);
  };
  const handleDispute=async()=>{
    setApproving(true);
    try{
      await updateDoc(doc(db,"videos",video.id),{disputed:true,approved:false});
      if(video.betId&&video.betId!=="general")await updateDoc(doc(db,"bets",video.betId),{status:"disputed"});
      if(video.uploadedBy)await recordDisputed(video.uploadedBy);
      setDisputed(true);
    }catch(e){console.error(e);}
    setApproving(false);
  };
  const timeAgo=ts=>{if(!ts?.toDate)return"just now";const s=Math.floor((new Date()-ts.toDate())/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m`;if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;};

  return(
    <div style={{position:"absolute",inset:0,transform:`translateY(${offset*100}%)`,transition:"transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",background:T.bg0,overflow:"hidden",touchAction:"none"}}>
      <video ref={vRef} src={video.videoUrl} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} loop playsInline muted={muted} preload={isActive?"auto":"none"} onClick={()=>setMuted(!muted)}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:T.gradOverlay}}/>

      {/* Status badge */}
      <div style={{position:"absolute",top:"60px",left:"16px",zIndex:10}}>
        {approved&&<div style={{background:T.greenDim,border:`1px solid ${T.greenBorder}`,color:T.green,padding:"4px 12px",borderRadius:T.rFull,fontFamily:T.fontMono,fontSize:"11px",fontWeight:"700"}}>APPROVED ✓</div>}
        {disputed&&<div style={{background:T.redDim,border:`1px solid ${T.redBorder}`,color:T.red,padding:"4px 12px",borderRadius:T.rFull,fontFamily:T.fontMono,fontSize:"11px",fontWeight:"700"}}>DISPUTED ✗</div>}
        {!approved&&!disputed&&<div style={{background:T.pinkDim,border:`1px solid ${T.pinkBorder}`,color:T.pink,padding:"4px 12px",borderRadius:T.rFull,fontFamily:T.fontMono,fontSize:"11px",fontWeight:"700"}}>FORFEIT 💀</div>}
      </div>
      {muted&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,0.6)",borderRadius:"50%",width:"60px",height:"60px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",pointerEvents:"none"}}>🔇</div>}

      {/*
        ICONS — zIndex 10, ALWAYS visible, NEVER hidden by React state.
        The CommentsPanel backdrop uses zIndex 4000 which covers these icons
        completely when open. When panel closes, icons are just there already.
        No state toggle = no Android partial re-render bug.
      */}
      <div style={{position:"absolute",right:"12px",bottom:"100px",display:"flex",flexDirection:"column",gap:"20px",alignItems:"center",zIndex:10}}>
        {[
          {icon:liked?"❤️":"🤍",count:likes,        fn:handleLike},
          {icon:"💬",            count:commentCount,  fn:()=>setShowComments(true)},
          {icon:"↗️",            label:"Share",       fn:async()=>{if(navigator.share)await navigator.share({title:"SweatDebt forfeit",url:window.location.href});else navigator.clipboard.writeText(window.location.href);}},
          {icon:"⚔️",            label:"Bet",         fn:()=>navigate("/create")},
        ].map((btn,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",cursor:"pointer"}} onClick={btn.fn}>
            <div style={{fontSize:"28px"}}>{btn.icon}</div>
            {btn.count!==undefined&&<div style={{fontFamily:T.fontMono,fontSize:"12px",color:T.white,fontWeight:"500"}}>{btn.count}</div>}
            {btn.label&&<div style={{fontFamily:T.fontMono,fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>{btn.label}</div>}
          </div>
        ))}
      </div>

      {/* Bottom info — ALWAYS visible, covered by panel z-index when open */}
      <div style={{position:"absolute",bottom:0,left:0,right:"60px",padding:"0 16px 90px",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px",cursor:"pointer"}} onClick={()=>navigate(`/profile/${video.uploadedBy}`)}>
          {video.uploaderPhoto
            ?<img src={video.uploaderPhoto} alt="" style={{width:"42px",height:"42px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.pink}`,flexShrink:0}}/>
            :<div style={{width:"42px",height:"42px",borderRadius:"50%",background:T.gradPrimary,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"18px",color:"#fff",flexShrink:0}}>{video.uploadedByName?.charAt(0)||"?"}</div>
          }
          <div>
            <div style={{fontFamily:T.fontBody,fontSize:"15px",fontWeight:"700",color:T.white}}>@{video.uploadedByName?.toLowerCase().replace(/\s/g,"")}</div>
            <div style={{fontFamily:T.fontMono,fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>{timeAgo(video.createdAt)}</div>
          </div>
        </div>
        {canVerdict&&(
          <div style={{background:"rgba(10,10,15,0.9)",border:`1px solid ${T.border}`,borderRadius:T.r16,padding:"12px",marginBottom:"10px",backdropFilter:"blur(8px)"}}>
            <div style={{fontFamily:T.fontBody,fontSize:"12px",color:T.muted,marginBottom:"8px",textAlign:"center"}}>Did they complete the forfeit?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <button style={{background:T.greenDim,border:`1px solid ${T.greenBorder}`,borderRadius:T.r12,padding:"12px",fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.06em",color:T.green,cursor:"pointer",opacity:approving?0.5:1}} onClick={handleApprove} disabled={approving}>✓ APPROVE</button>
              <button style={{background:T.redDim,border:`1px solid ${T.redBorder}`,borderRadius:T.r12,padding:"12px",fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.06em",color:T.red,cursor:"pointer",opacity:approving?0.5:1}} onClick={handleDispute} disabled={approving}>✗ DISPUTE</button>
            </div>
          </div>
        )}
        {approved&&<div style={{background:T.greenDim,border:`1px solid ${T.greenBorder}`,borderRadius:T.r12,padding:"10px 14px",fontFamily:T.fontBody,fontSize:"13px",color:T.green,textAlign:"center",marginBottom:"10px"}}>✓ Forfeit approved! 🏆</div>}
        {disputed&&<div style={{background:T.redDim,border:`1px solid ${T.redBorder}`,borderRadius:T.r12,padding:"10px 14px",fontFamily:T.fontBody,fontSize:"13px",color:T.red,textAlign:"center",marginBottom:"10px"}}>⚠ Disputed — honour dropped</div>}
      </div>

      {/* Comments panel */}
      {showComments&&(
        <CommentsPanel videoId={video.id} currentUser={user} onCountChange={setCommentCount} onClose={()=>setShowComments(false)}/>
      )}
    </div>
  );
}