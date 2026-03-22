import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import {
  collection, query, onSnapshot,
  doc, updateDoc, increment, addDoc, serverTimestamp,
} from "firebase/firestore";
import NotificationBell from "../components/NotificationBell";
import { useNavigate } from "react-router-dom";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", coral:"#ff6b4a", green:"#00e676",
  red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a",
  purple:"#a855f7",
};

export default function Feed({ user, onBellClick, onCommentsToggle }) {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forYou");
  const [friendIds, setFriendIds] = useState([]);

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
        <ReelsFeed
          videos={displayVideos}
          user={user}
          navigate={navigate}
          onCommentsToggle={onCommentsToggle}
        />
      )}
    </div>
  );
}

function ReelsFeed({videos, user, navigate, onCommentsToggle}){
  const [currentIndex,setCurrentIndex]=useState(0);
  const startY=useRef(null);
  const startTime=useRef(null);
  const containerRef=useRef(null);
  const isAnimating=useRef(false);

  useEffect(()=>setCurrentIndex(0),[videos]);

  const goTo=(idx)=>{
    if(isAnimating.current)return;
    const clamped=Math.max(0,Math.min(videos.length-1,idx));
    if(clamped===currentIndex)return;
    isAnimating.current=true;
    setCurrentIndex(clamped);
    setTimeout(()=>{ isAnimating.current=false; },500);
  };

  const handleTouchStart=(e)=>{
    startY.current=e.touches[0].clientY;
    startTime.current=Date.now();
  };
  const handleTouchEnd=(e)=>{
    if(startY.current===null)return;
    const diff=startY.current-e.changedTouches[0].clientY;
    const elapsed=Date.now()-startTime.current;
    const isMeaningful=Math.abs(diff)>50||(Math.abs(diff)>20&&elapsed<200);
    if(isMeaningful){
      if(diff>0) goTo(currentIndex+1);
      else goTo(currentIndex-1);
    }
    startY.current=null; startTime.current=null;
  };

  const handleWheel=useCallback((e)=>{
    e.preventDefault();
    if(isAnimating.current)return;
    if(e.deltaY>30) goTo(currentIndex+1);
    else if(e.deltaY<-30) goTo(currentIndex-1);
  },[currentIndex,videos.length]);

  useEffect(()=>{
    const el=containerRef.current; if(!el)return;
    el.addEventListener("wheel",handleWheel,{passive:false});
    return()=>el.removeEventListener("wheel",handleWheel);
  },[handleWheel]);

  return(
    <div ref={containerRef} style={{height:"100vh",overflow:"hidden",position:"relative"}}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {videos.map((video,index)=>{
        if(Math.abs(index-currentIndex)>2)return null;
        return(
          <ReelCard key={video.id} video={video} user={user}
            isActive={index===currentIndex} offset={index-currentIndex}
            navigate={navigate} onCommentsToggle={onCommentsToggle}/>
        );
      })}
      {/* Side dots */}
      <div style={{position:"fixed",right:"8px",top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:"5px",zIndex:50}}>
        {videos.slice(Math.max(0,currentIndex-4),currentIndex+5).map((_,i)=>{
          const actual=Math.max(0,currentIndex-4)+i;
          return <div key={actual} style={{width:"3px",height:actual===currentIndex?"18px":"4px",borderRadius:"2px",background:actual===currentIndex?C.cyan:"rgba(224,242,254,0.2)",transition:"all 0.3s",cursor:"pointer"}} onClick={()=>goTo(actual)}/>;
        })}
      </div>
    </div>
  );
}

function ReelCard({video,user,isActive,offset,navigate,onCommentsToggle}){
  const videoRef=useRef(null);
  const [liked,setLiked]=useState(false);
  const [likes,setLikes]=useState(video.likes||0);
  const [approved,setApproved]=useState(video.approved||false);
  const [disputed,setDisputed]=useState(video.disputed||false);
  const [approving,setApproving]=useState(false);
  const [showComments,setShowComments]=useState(false);
  const [commentCount,setCommentCount]=useState(video.comments||0);
  const [muted,setMuted]=useState(false);

  const openComments=()=>{ setShowComments(true); onCommentsToggle?.(true); };
  const closeComments=()=>{ setShowComments(false); onCommentsToggle?.(false); };

  useEffect(()=>{
    const v=videoRef.current; if(!v)return;
    if(isActive){ v.play().catch(()=>{}); }
    else { v.pause(); closeComments(); }
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
      if(video.betCreatedBy) await updateDoc(doc(db,"users",video.betCreatedBy),{wins:increment(1),honour:increment(5)});
      if(video.uploadedBy) await updateDoc(doc(db,"users",video.uploadedBy),{losses:increment(1),honour:increment(3)});
      setApproved(true);
    }catch(e){console.error(e);}
    setApproving(false);
  };
  const handleDispute=async()=>{
    setApproving(true);
    try{
      await updateDoc(doc(db,"videos",video.id),{disputed:true,approved:false});
      if(video.betId&&video.betId!=="general") await updateDoc(doc(db,"bets",video.betId),{status:"disputed"});
      if(video.uploadedBy) await updateDoc(doc(db,"users",video.uploadedBy),{losses:increment(1),honour:increment(-15)});
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
    <div style={{
      position:"absolute",inset:0,
      transform:`translateY(${offset*100}%)`,
      transition:offset===0?"none":"transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94)",
      background:C.bg0,overflow:"hidden",
      pointerEvents:isActive?"all":"none",
    }}>
      <video ref={videoRef} src={video.videoUrl}
        style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}
        loop playsInline muted={muted} preload="metadata"
        onClick={()=>setMuted(!muted)}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(to top,rgba(7,13,26,0.97) 0%,rgba(7,13,26,0.2) 30%,transparent 55%,rgba(7,13,26,0.5) 100%)"}}/>

      {/* Status tag */}
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
          {icon:"💬",count:commentCount,onClick:openComments},
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
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px",cursor:"pointer"}} onClick={()=>navigate(`/profile/${video.uploadedBy}`)}>
          {video.uploaderPhoto?(
            <img src={video.uploaderPhoto} alt="" style={{width:"42px",height:"42px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.cyan}`,flexShrink:0}}/>
          ):(
            <div style={{width:"42px",height:"42px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#000",border:`2px solid ${C.cyan}`,flexShrink:0}}>
              {video.uploadedByName?.charAt(0)||"?"}
            </div>
          )}
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
        {approved&&<div style={{background:"rgba(0,230,118,0.15)",border:"1px solid rgba(0,230,118,0.4)",borderRadius:"10px",padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.green,textAlign:"center",marginBottom:"10px"}}>✓ Approved! Scores updated 🏆</div>}
        {disputed&&<div style={{background:"rgba(255,77,109,0.15)",border:"1px solid rgba(255,77,109,0.4)",borderRadius:"10px",padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.red,textAlign:"center",marginBottom:"10px"}}>⚠ Disputed — honour dropped</div>}
      </div>

      {/* Comments panel — full screen, nav already hidden by App.js */}
      {showComments&&(
        <CommentsPanel
          videoId={video.id}
          currentUser={user}
          onCountChange={setCommentCount}
          onClose={closeComments}
          navigate={navigate}
        />
      )}
    </div>
    </>
  );
}

function CommentsPanel({videoId,currentUser,onCountChange,onClose,navigate}){
  const [comments,setComments]=useState([]);
  const [text,setText]=useState("");
  const [replyingTo,setReplyingTo]=useState(null);
  const [posting,setPosting]=useState(false);
  const [loading,setLoading]=useState(true);
  const [keyboardHeight,setKeyboardHeight]=useState(0);
  const inputRef=useRef(null);
  const listRef=useRef(null);

  // Detect keyboard and shift panel up
  useEffect(()=>{
    if(!window.visualViewport)return;
    const handleResize=()=>{
      const kh=window.innerHeight-window.visualViewport.height;
      setKeyboardHeight(Math.max(0,kh));
      if(kh>100) setTimeout(()=>listRef.current?.scrollTo({top:99999,behavior:"smooth"}),100);
    };
    window.visualViewport.addEventListener("resize",handleResize);
    window.visualViewport.addEventListener("scroll",handleResize);
    return()=>{
      window.visualViewport.removeEventListener("resize",handleResize);
      window.visualViewport.removeEventListener("scroll",handleResize);
    };
  },[]);

  useEffect(()=>{
    const q=query(collection(db,"videos",videoId,"comments"));
    const unsub=onSnapshot(q,snap=>{
      const data=snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(a.createdAt?.toDate?.()||0)-(b.createdAt?.toDate?.()||0));
      setComments(data); onCountChange(data.length); setLoading(false);
      setTimeout(()=>listRef.current?.scrollTo({top:99999,behavior:"smooth"}),100);
    });
    return()=>unsub();
  },[videoId]);

  const postComment=async()=>{
    if(!text.trim()||posting)return;
    setPosting(true);
    const t=text.trim(); setText(""); setReplyingTo(null);
    try{
      await addDoc(collection(db,"videos",videoId,"comments"),{
        text:replyingTo?`@${replyingTo.userName} ${t}`:t,
        userId:currentUser.uid,userName:currentUser.displayName,
        userPhoto:currentUser.photoURL||null,createdAt:serverTimestamp(),likes:0,
        replyTo:replyingTo?.id||null,replyToName:replyingTo?.userName||null,
      });
      await updateDoc(doc(db,"videos",videoId),{comments:increment(1)});
      setTimeout(()=>listRef.current?.scrollTo({top:99999,behavior:"smooth"}),200);
    }catch(e){console.error(e);setText(t);}
    setPosting(false);
  };

  const timeAgo=(ts)=>{
    if(!ts?.toDate)return"now";
    const s=Math.floor((new Date()-ts.toDate())/1000);
    if(s<60)return"now"; if(s<3600)return`${Math.floor(s/60)}m`;
    if(s<86400)return`${Math.floor(s/3600)}h`; return`${Math.floor(s/86400)}d`;
  };

  const quickReactions=["😂","🔥","💀","😤","👑","🫡","💪","😭"];

  return(
    <>
    <style>{`@keyframes slideUpPanel{from{transform:translateY(100%)}to{transform:translateY(0)}}
    `}</style>
    {/* Backdrop covers full screen */}
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:2000}} onClick={onClose}/>

    {/* Panel — shifts up when keyboard opens, fills full height above keyboard */}
    <div style={{
      position:"fixed",
bottom:`${keyboardHeight}px`,
left:0,
right:0,
width:"100%",
maxWidth:"100vw",
height:`calc(100vh - ${keyboardHeight}px)`,
      maxHeight:"100vh",
      background:C.bg1,
      borderRadius:keyboardHeight>0?"0":"20px 20px 0 0",
      zIndex:2001,
      animation:"slideUpPanel 0.35s cubic-bezier(0.32,0.72,0,1)",
      display:"flex",flexDirection:"column",
      transition:"bottom 0.2s ease, height 0.2s ease, border-radius 0.2s ease",
    }}>
      {/* Handle */}
      <div style={{width:"36px",height:"4px",background:C.bg3,borderRadius:"2px",margin:"12px auto 0",flexShrink:0}}/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 8px",flexShrink:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:C.white,letterSpacing:"0.04em"}}>
          Comments <span style={{fontFamily:"'DM Mono',monospace",fontSize:"14px",color:C.muted}}>{comments.length}</span>
        </div>
        <div style={{fontSize:"18px",color:C.muted,cursor:"pointer",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>✕</div>
      </div>

      {/* Quick reactions */}
      <div style={{display:"flex",gap:"8px",padding:"0 16px 10px",overflowX:"auto",flexShrink:0}}>
        {quickReactions.map(emoji=>(
          <button key={emoji} style={{background:C.bg2,border:`1px solid ${C.border1}`,borderRadius:"20px",padding:"6px 12px",fontSize:"18px",cursor:"pointer",flexShrink:0}}
            onClick={()=>{setText(p=>p+emoji);inputRef.current?.focus();}}>{emoji}</button>
        ))}
      </div>

      {/* Comments list */}
      <div ref={listRef} style={{flex:1,overflowY:"auto",padding:"0 16px 4px"}}>
        {loading?(
          <div style={{display:"flex",justifyContent:"center",padding:"32px"}}>
            <div style={{width:"24px",height:"24px",borderRadius:"50%",border:`2px solid ${C.border1}`,borderTop:`2px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
          </div>
        ):comments.length===0?(
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:"32px",marginBottom:"8px"}}>💬</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:C.muted,letterSpacing:"0.04em"}}>No comments yet</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.dim,marginTop:"4px"}}>Be the first to roast them 😂</div>
          </div>
        ):(
          comments.map(c=>(
            <CommentRow key={c.id} comment={c} videoId={videoId} currentUser={currentUser} timeAgo={timeAgo}
              onReply={()=>{
                setReplyingTo({id:c.id,userName:c.userName});
                setText(`@${c.userName} `);
                setTimeout(()=>{inputRef.current?.focus();listRef.current?.scrollTo({top:99999,behavior:"smooth"});},100);
              }}
              onProfileClick={()=>{onClose();navigate(`/profile/${c.userId}`);}}
            />
          ))
        )}
      </div>

      {/* Reply banner */}
      {replyingTo&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",background:C.bg2,borderTop:`1px solid ${C.border1}`,flexShrink:0}}>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.cyan}}>↩ Replying to @{replyingTo.userName}</div>
          <div style={{color:C.muted,cursor:"pointer",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"flex-end"}}
            onClick={()=>{setReplyingTo(null);setText("");}}>✕</div>
        </div>
      )}

      {/* INPUT — always at bottom, always visible */}
      <div style={{flexShrink:0,background:C.bg1,borderTop:`1px solid ${C.border1}`,padding:"12px 16px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          {currentUser?.photoURL?(
            <img src={currentUser.photoURL} alt="" style={{width:"34px",height:"34px",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
          ):(
            <div style={{width:"34px",height:"34px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"14px",color:"#000",flexShrink:0}}>
              {currentUser?.displayName?.charAt(0)||"?"}
            </div>
          )}
          <div style={{flex:1,display:"flex",alignItems:"center",gap:"8px",background:C.bg3,border:`1.5px solid ${C.border2}`,borderRadius:"24px",padding:"10px 14px"}}>
            <input
              ref={inputRef}
              style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e0f2fe",caretColor:"#00d4ff",WebkitTextFillColor:"#e0f2fe",fontSize:"16px",fontFamily:"'DM Sans',sans-serif"}}
              value={text}
              onChange={e=>setText(e.target.value)}
              placeholder={replyingTo?`Reply to @${replyingTo.userName}...`:"Add a comment..."}
              onKeyDown={e=>e.key==="Enter"&&postComment()}
              onFocus={()=>setTimeout(()=>listRef.current?.scrollTo({top:99999,behavior:"smooth"}),300)}
              maxLength={200}
            />
            {text.trim().length>0&&(
              <button style={{background:`linear-gradient(135deg,${C.cyan},${C.purple})`,border:"none",borderRadius:"50%",width:"30px",height:"30px",fontSize:"14px",color:"#000",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:posting?0.5:1,flexShrink:0}}
                onClick={postComment} disabled={posting}>{posting?"…":"↑"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function CommentRow({comment,videoId,currentUser,timeAgo,onReply,onProfileClick}){
  const [liked,setLiked]=useState(false);
  const [likes,setLikes]=useState(comment.likes||0);
  const isOwn=comment.userId===currentUser?.uid;
  return(
    <div style={{display:"flex",gap:"10px",padding:"12px 0",borderBottom:`1px solid ${C.bg3}`}}>
      <div style={{cursor:"pointer",flexShrink:0}} onClick={onProfileClick}>
        {comment.userPhoto?(
          <img src={comment.userPhoto} alt="" style={{width:"34px",height:"34px",borderRadius:"50%",objectFit:"cover"}}/>
        ):(
          <div style={{width:"34px",height:"34px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"13px",color:"#000"}}>
            {comment.userName?.charAt(0)||"?"}
          </div>
        )}
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:"600",color:isOwn?C.cyan:C.white,cursor:"pointer"}} onClick={onProfileClick}>
            {isOwn?"You":comment.userName}
          </span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.dim}}>{timeAgo(comment.createdAt)}</span>
        </div>
        {comment.replyToName&&(
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.muted,marginBottom:"3px"}}>
            ↩ <span style={{color:C.cyan}}>@{comment.replyToName}</span>
          </div>
        )}
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:"rgba(224,242,254,0.9)",lineHeight:"1.5",marginBottom:"6px"}}>{comment.text}</div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px",cursor:"pointer"}} onClick={()=>{setLiked(!liked);setLikes(liked?likes-1:likes+1);}}>
            <span style={{fontSize:"14px",color:liked?"#ff4d6d":C.muted}}>{liked?"❤️":"♡"}</span>
            {likes>0&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted}}>{likes}</span>}
          </div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.muted,cursor:"pointer",minHeight:"36px",display:"flex",alignItems:"center"}} onClick={onReply}>Reply</div>
        </div>
      </div>
    </div>
  );
}