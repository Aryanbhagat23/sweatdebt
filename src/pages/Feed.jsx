import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import {
  collection, query, onSnapshot,
  doc, updateDoc, increment, addDoc, serverTimestamp,
} from "firebase/firestore";
import NotificationBell from "../components/NotificationBell";

const C = {
  bg0:"#070d1a",bg1:"#0d1629",bg2:"#111f38",bg3:"#172847",
  white:"#e0f2fe",muted:"#64748b",dim:"#3d5a7a",
  cyan:"#00d4ff",coral:"#ff6b4a",green:"#00e676",
  red:"#ff4d6d",border1:"#1e3a5f",border2:"#2a4f7a",
  purple:"#a855f7",
};

export default function Feed({ user, onBellClick }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forYou");

  useEffect(() => {
    const q = query(collection(db, "videos"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setVideos(data);
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"40px",height:"40px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.muted}}>Loading feed...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg0}}>
      {/* Floating tab bar */}
      <div style={{
        position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:"480px",zIndex:100,
        paddingTop:"env(safe-area-inset-top,0)",
      }}>
        <div style={{
          display:"flex",justifyContent:"center",gap:"24px",
          padding:"12px 20px 8px",
          background:"linear-gradient(to bottom,rgba(7,13,26,0.97),transparent)",
        }}>
          {["forYou","friends","trending"].map(tab=>(
            <div key={tab} style={{
              fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"600",
              color:activeTab===tab?C.white:"rgba(224,242,254,0.4)",
              cursor:"pointer",
              borderBottom:activeTab===tab?`2px solid ${C.cyan}`:"2px solid transparent",
              paddingBottom:"4px",transition:"all 0.2s",
            }} onClick={()=>setActiveTab(tab)}>
              {tab==="forYou"?"For You":tab==="friends"?"Friends":"Trending"}
            </div>
          ))}
        </div>
        <div style={{position:"absolute",top:"10px",right:"16px"}}>
          <NotificationBell user={user} onClick={onBellClick}/>
        </div>
      </div>

      {videos.length===0?(
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px",padding:"24px"}}>
          <div style={{fontSize:"64px"}}>🎥</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:C.muted,letterSpacing:"0.04em"}}>No forfeits yet</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:C.dim,textAlign:"center"}}>Be the first to lose a bet 😤</div>
        </div>
      ):(
        <ReelsFeed videos={videos} user={user}/>
      )}
    </div>
  );
}

function ReelsFeed({videos,user}){
  const [currentIndex,setCurrentIndex]=useState(0);
  const startY=useRef(null);
  const containerRef=useRef(null);

  const handleTouchStart=(e)=>{ startY.current=e.touches[0].clientY; };
  const handleTouchEnd=(e)=>{
    if(startY.current===null)return;
    const diff=startY.current-e.changedTouches[0].clientY;
    if(Math.abs(diff)>60){
      if(diff>0&&currentIndex<videos.length-1) setCurrentIndex(p=>p+1);
      else if(diff<0&&currentIndex>0) setCurrentIndex(p=>p-1);
    }
    startY.current=null;
  };

  const handleWheel=useCallback((e)=>{
    e.preventDefault();
    if(e.deltaY>40&&currentIndex<videos.length-1) setCurrentIndex(p=>p+1);
    else if(e.deltaY<-40&&currentIndex>0) setCurrentIndex(p=>p-1);
  },[currentIndex,videos.length]);

  useEffect(()=>{
    const el=containerRef.current;
    if(!el)return;
    el.addEventListener("wheel",handleWheel,{passive:false});
    return()=>el.removeEventListener("wheel",handleWheel);
  },[handleWheel]);

  return(
    <div ref={containerRef} style={{height:"100vh",overflow:"hidden",position:"relative"}}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {videos.map((video,index)=>(
        <ReelCard key={video.id} video={video} user={user}
          isActive={index===currentIndex} offset={index-currentIndex}/>
      ))}
      {/* Side progress dots */}
      <div style={{position:"fixed",right:"8px",top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:"5px",zIndex:50}}>
        {videos.slice(Math.max(0,currentIndex-4),currentIndex+5).map((_,i)=>{
          const actual=Math.max(0,currentIndex-4)+i;
          return(
            <div key={actual} style={{
              width:"3px",height:actual===currentIndex?"18px":"4px",borderRadius:"2px",
              background:actual===currentIndex?C.cyan:"rgba(224,242,254,0.2)",
              transition:"all 0.3s",cursor:"pointer",
            }} onClick={()=>setCurrentIndex(actual)}/>
          );
        })}
      </div>
    </div>
  );
}

function ReelCard({video,user,isActive,offset}){
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
    const v=videoRef.current;
    if(!v)return;
    if(isActive){ v.play().catch(()=>{}); }
    else{ v.pause(); v.currentTime=0; }
  },[isActive]);

  // Only bet participants can see approve/dispute
  const canVerdict=!approved&&!disputed&&(
    video.uploadedBy===user?.uid||
    video.opponentEmail===user?.email||
    video.createdByEmail===user?.email
  );

  const handleLike=async()=>{
    setLiked(!liked); setLikes(liked?likes-1:likes+1);
    await updateDoc(doc(db,"videos",video.id),{likes:increment(liked?-1:1)});
  };
  const handleApprove=async()=>{
    setApproving(true);
    await updateDoc(doc(db,"videos",video.id),{approved:true,disputed:false});
    if(video.betId&&video.betId!=="general") await updateDoc(doc(db,"bets",video.betId),{status:"lost"});
    setApproved(true); setApproving(false);
  };
  const handleDispute=async()=>{
    setApproving(true);
    await updateDoc(doc(db,"videos",video.id),{disputed:true,approved:false});
    if(video.betId&&video.betId!=="general") await updateDoc(doc(db,"bets",video.betId),{status:"disputed"});
    setDisputed(true); setApproving(false);
  };
  const timeAgo=(ts)=>{
    if(!ts?.toDate)return"just now";
    const s=Math.floor((new Date()-ts.toDate())/1000);
    if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m`;
    if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;
  };

  return(
    <>
    <style>{`@keyframes heartPop{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}`}</style>
    <div style={{
      position:"absolute",inset:0,
      transform:`translateY(${offset*100}%)`,
      transition:"transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)",
      background:C.bg0,overflow:"hidden",
    }}>
      {/* Video */}
      <video ref={videoRef} src={video.videoUrl}
        style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}
        loop playsInline muted={muted} preload={isActive?"auto":"none"}
        onClick={()=>setMuted(!muted)}/>

      {/* Gradient overlay */}
      <div style={{
        position:"absolute",inset:0,pointerEvents:"none",
        background:"linear-gradient(to top,rgba(7,13,26,0.97) 0%,rgba(7,13,26,0.3) 35%,transparent 55%,rgba(7,13,26,0.5) 100%)",
      }}/>

      {/* Status tag */}
      <div style={{position:"absolute",top:"60px",left:"16px"}}>
        {approved&&<div style={{background:`${C.green}20`,border:`1px solid ${C.green}60`,color:C.green,padding:"4px 12px",borderRadius:"20px",fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"700",letterSpacing:"0.06em"}}>APPROVED ✓</div>}
        {disputed&&<div style={{background:`${C.red}20`,border:`1px solid ${C.red}60`,color:C.red,padding:"4px 12px",borderRadius:"20px",fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"700",letterSpacing:"0.06em"}}>DISPUTED ✗</div>}
        {!approved&&!disputed&&<div style={{background:`${C.coral}20`,border:`1px solid ${C.coral}60`,color:C.coral,padding:"4px 12px",borderRadius:"20px",fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"700",letterSpacing:"0.06em"}}>FORFEIT 💀</div>}
      </div>

      {/* Muted indicator */}
      {muted&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,0.6)",borderRadius:"50%",width:"60px",height:"60px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",pointerEvents:"none"}}>🔇</div>}

      {/* Right actions */}
      <div style={{position:"absolute",right:"12px",bottom:"140px",display:"flex",flexDirection:"column",gap:"20px",alignItems:"center",zIndex:10}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",cursor:"pointer"}} onClick={handleLike}>
          <div style={{fontSize:"28px",filter:liked?"none":"grayscale(100%) brightness(2)",animation:liked?"heartPop 0.3s ease":"none"}}>{liked?"❤️":"🤍"}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.white,fontWeight:"500"}}>{likes}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",cursor:"pointer"}} onClick={()=>setShowComments(!showComments)}>
          <div style={{fontSize:"28px",filter:showComments?"none":"grayscale(30%)"}}>💬</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.white,fontWeight:"500"}}>{commentCount}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",cursor:"pointer"}}
          onClick={async()=>{
            if(navigator.share) await navigator.share({title:"SweatDebt forfeit",url:window.location.href});
            else navigator.clipboard.writeText(window.location.href);
          }}>
          <div style={{fontSize:"28px"}}>↗️</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.white}}>Share</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",cursor:"pointer"}}>
          <div style={{fontSize:"28px"}}>⚔️</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.white}}>Bet</div>
        </div>
      </div>

      {/* Bottom info */}
      <div style={{position:"absolute",bottom:0,left:0,right:"60px",padding:"0 16px 80px",zIndex:10}}>
        {/* User row */}
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
          {video.uploaderPhoto?(
            <img src={video.uploaderPhoto} alt="" style={{width:"42px",height:"42px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.cyan}`,flexShrink:0}}/>
          ):(
            <div style={{width:"42px",height:"42px",borderRadius:"50%",background:"linear-gradient(135deg,#00d4ff,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#000",border:`2px solid ${C.cyan}`,flexShrink:0}}>
              {video.uploadedByName?.charAt(0)||"?"}
            </div>
          )}
          <div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",fontWeight:"700",color:C.white}}>@{video.uploadedByName?.toLowerCase().replace(/\s/g,"")}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"rgba(224,242,254,0.4)"}}>{timeAgo(video.createdAt)}</div>
          </div>
        </div>

        {/* Approve/Dispute — participants only */}
        {canVerdict&&(
          <div style={{background:"rgba(7,13,26,0.88)",border:`1px solid ${C.border1}`,borderRadius:"16px",padding:"12px",marginBottom:"10px",backdropFilter:"blur(8px)"}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.muted,marginBottom:"8px",textAlign:"center"}}>Did they complete the forfeit?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <button style={{background:`${C.green}20`,border:`1px solid ${C.green}60`,borderRadius:"10px",padding:"12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.06em",color:C.green,cursor:"pointer",opacity:approving?0.5:1}} onClick={handleApprove} disabled={approving}>✓ APPROVE</button>
              <button style={{background:`${C.red}20`,border:`1px solid ${C.red}60`,borderRadius:"10px",padding:"12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.06em",color:C.red,cursor:"pointer",opacity:approving?0.5:1}} onClick={handleDispute} disabled={approving}>✗ DISPUTE</button>
            </div>
          </div>
        )}
        {approved&&<div style={{background:`${C.green}15`,border:`1px solid ${C.green}40`,borderRadius:"10px",padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.green,textAlign:"center",marginBottom:"10px"}}>✓ Forfeit approved!</div>}
        {disputed&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}40`,borderRadius:"10px",padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.red,textAlign:"center",marginBottom:"10px"}}>⚠ Disputed — going to jury...</div>}
      </div>

      {/* Comments panel */}
      {showComments&&<CommentsPanel videoId={video.id} currentUser={user} onCountChange={setCommentCount} onClose={()=>setShowComments(false)}/>}
    </div>
    </>
  );
}

function CommentsPanel({videoId,currentUser,onCountChange,onClose}){
  const [comments,setComments]=useState([]);
  const [text,setText]=useState("");
  const [posting,setPosting]=useState(false);
  const [loading,setLoading]=useState(true);
  const inputRef=useRef(null);

  useEffect(()=>{
    const q=query(collection(db,"videos",videoId,"comments"));
    const unsub=onSnapshot(q,snap=>{
      const data=snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(a.createdAt?.toDate?.()||0)-(b.createdAt?.toDate?.()||0));
      setComments(data); onCountChange(data.length); setLoading(false);
    });
    return()=>unsub();
  },[videoId]);

  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(),300); },[]);

  const postComment=async()=>{
    if(!text.trim()||posting)return;
    setPosting(true);
    const t=text.trim(); setText("");
    try{
      await addDoc(collection(db,"videos",videoId,"comments"),{
        text:t,userId:currentUser.uid,userName:currentUser.displayName,
        userPhoto:currentUser.photoURL||null,createdAt:serverTimestamp(),likes:0,
      });
      await updateDoc(doc(db,"videos",videoId),{comments:increment(1)});
    }catch(e){ console.error(e); setText(t); }
    setPosting(false);
  };

  const timeAgo=(ts)=>{
    if(!ts?.toDate)return"now";
    const s=Math.floor((new Date()-ts.toDate())/1000);
    if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;
    if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;
  };

  const quickReactions=["😂","🔥","💀","😤","👑","🫡","💪","😭"];

  return(
    <>
    <style>{`@keyframes slideUpPanel{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200}} onClick={onClose}/>
    <div style={{
      position:"absolute",bottom:0,left:0,right:0,height:"70vh",
      background:C.bg1,borderRadius:"20px 20px 0 0",zIndex:201,
      animation:"slideUpPanel 0.35s cubic-bezier(0.32,0.72,0,1)",
      display:"flex",flexDirection:"column",
      paddingBottom:"env(safe-area-inset-bottom,0)",
    }}>
      <div style={{width:"36px",height:"4px",background:C.bg3,borderRadius:"2px",margin:"12px auto 0",flexShrink:0}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 8px",flexShrink:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:C.white,letterSpacing:"0.04em"}}>
          Comments <span style={{fontFamily:"'DM Mono',monospace",fontSize:"14px",color:C.muted}}>{comments.length}</span>
        </div>
        <div style={{fontSize:"20px",color:C.muted,cursor:"pointer"}} onClick={onClose}>✕</div>
      </div>

      <div style={{display:"flex",gap:"8px",padding:"0 16px 10px",overflowX:"auto",flexShrink:0}}>
        {quickReactions.map(emoji=>(
          <button key={emoji} style={{background:C.bg2,border:`1px solid ${C.border1}`,borderRadius:"20px",padding:"6px 12px",fontSize:"18px",cursor:"pointer",flexShrink:0}}
            onClick={()=>{setText(p=>p+emoji);inputRef.current?.focus();}}>{emoji}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}>
        {loading?(
          <div style={{display:"flex",justifyContent:"center",padding:"24px"}}>
            <div style={{width:"24px",height:"24px",borderRadius:"50%",border:`2px solid ${C.border1}`,borderTop:`2px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
          </div>
        ):comments.length===0?(
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:"32px",marginBottom:"8px"}}>💬</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:C.muted,letterSpacing:"0.04em"}}>No comments yet</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.dim,marginTop:"4px"}}>Be the first to roast them 😂</div>
          </div>
        ):comments.map(c=>(
          <div key={c.id} style={{display:"flex",gap:"10px",padding:"10px 0",borderBottom:`1px solid ${C.bg3}`}}>
            {c.userPhoto?(
              <img src={c.userPhoto} alt="" style={{width:"34px",height:"34px",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
            ):(
              <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,#00d4ff,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"13px",color:"#000",flexShrink:0}}>
                {c.userName?.charAt(0)||"?"}
              </div>
            )}
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
                <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:"600",color:c.userId===currentUser?.uid?C.cyan:C.white}}>
                  {c.userId===currentUser?.uid?"You":c.userName}
                </span>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.dim}}>{timeAgo(c.createdAt)}</span>
              </div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:"rgba(224,242,254,0.85)",lineHeight:"1.5"}}>{c.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px 16px",borderTop:`1px solid ${C.bg2}`,flexShrink:0}}>
        {currentUser?.photoURL?(
          <img src={currentUser.photoURL} alt="" style={{width:"32px",height:"32px",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
        ):(
          <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,#00d4ff,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"13px",color:"#000",flexShrink:0}}>
            {currentUser?.displayName?.charAt(0)||"?"}
          </div>
        )}
        <div style={{flex:1,display:"flex",alignItems:"center",gap:"8px",background:C.bg2,border:`1px solid ${C.border1}`,borderRadius:"24px",padding:"8px 14px"}}>
          <input ref={inputRef} style={{flex:1,background:"none",border:"none",outline:"none",color:C.white,fontSize:"15px",fontFamily:"'DM Sans',sans-serif"}}
            value={text} onChange={e=>setText(e.target.value)}
            placeholder="Add a comment..." onKeyDown={e=>e.key==="Enter"&&postComment()} maxLength={200}/>
          {text.trim().length>0&&(
            <button style={{background:C.cyan,border:"none",borderRadius:"50%",width:"28px",height:"28px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"14px",color:"#000",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:posting?0.5:1,flexShrink:0}}
              onClick={postComment} disabled={posting}>↑</button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}