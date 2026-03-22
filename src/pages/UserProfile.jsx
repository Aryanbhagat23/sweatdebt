import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, getDoc, collection, query, where,
  onSnapshot, setDoc, deleteDoc, serverTimestamp,
  updateDoc
} from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  coral:"#ff6b4a", green:"#00e676", red:"#ff4d6d",
  border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7",
};

export default function UserProfile({ currentUser }) {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // videoId to confirm delete
  const [deleting, setDeleting] = useState(false);

  const isOwnProfile = userId === currentUser?.uid;

  // Load profile + friend status
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db,"users",userId));
        if (snap.exists()) setProfile({id:snap.id,...snap.data()});
        if (currentUser && !isOwnProfile) {
          const fSnap = await getDoc(doc(db,"users",currentUser.uid,"friends",userId));
          setIsFriend(fSnap.exists());
        }
      } catch(e){console.error(e);}
      setLoading(false);
    };
    load();
  }, [userId, currentUser]);

  // Real time videos
  useEffect(() => {
    if (!userId) return;
    const vq = query(collection(db,"videos"), where("uploadedBy","==",userId));
    const unsub = onSnapshot(vq, snap=>{
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.createdAt?.toDate?.()||0)-(a.createdAt?.toDate?.()||0));
      setVideos(data);
    });
    return ()=>unsub();
  }, [userId]);

  // Real time profile (scores update live)
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db,"users",userId), snap=>{
      if (snap.exists()) setProfile({id:snap.id,...snap.data()});
    });
    return ()=>unsub();
  }, [userId]);

  const toggleFriend = async () => {
    if (!currentUser||isOwnProfile) return;
    setFriendLoading(true);
    try {
      const myRef = doc(db,"users",currentUser.uid,"friends",userId);
      const theirRef = doc(db,"users",userId,"friends",currentUser.uid);
      if (isFriend) {
        await deleteDoc(myRef); await deleteDoc(theirRef);
        setIsFriend(false);
      } else {
        await setDoc(myRef,{uid:userId,displayName:profile?.displayName,email:profile?.email,username:profile?.username,photoURL:profile?.photoURL||null,addedAt:serverTimestamp()});
        await setDoc(theirRef,{uid:currentUser.uid,displayName:currentUser.displayName,email:currentUser.email,username:currentUser.displayName?.toLowerCase().replace(/\s/g,"")||"",photoURL:currentUser.photoURL||null,addedAt:serverTimestamp()});
        setIsFriend(true);
      }
    } catch(e){console.error(e);}
    setFriendLoading(false);
  };

  const deleteVideo = async (videoId) => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db,"videos",videoId));
      setDeleteConfirm(null);
    } catch(e){console.error(e);}
    setDeleting(false);
  };

  const honour = Math.max(0, Math.min(100, profile?.honour ?? 100));
  const total = (profile?.wins||0)+(profile?.losses||0);
  const winRate = total>0 ? Math.round(((profile?.wins||0)/total)*100) : 0;

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"36px",height:"36px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  if (!profile) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{fontSize:"48px",marginBottom:"16px"}}>👤</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",color:C.muted}}>User not found</div>
      <button style={{marginTop:"20px",background:"transparent",border:`1px solid ${C.border1}`,borderRadius:"12px",padding:"12px 24px",color:C.muted,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:"15px"}} onClick={()=>navigate(-1)}>← Go back</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg0,paddingBottom:"40px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Header */}
      <div style={{padding:"52px 16px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
        <button style={{background:C.bg2,border:`1px solid ${C.border1}`,borderRadius:"50%",width:"44px",height:"44px",color:C.white,fontSize:"20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={()=>navigate(-1)}>←</button>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",color:C.white,letterSpacing:"0.04em",flex:1}}>
          {isOwnProfile?"My Profile":"Profile"}
        </div>
        {isOwnProfile&&(
          <button style={{background:"transparent",border:`1px solid ${C.border1}`,borderRadius:"12px",padding:"8px 16px",color:C.cyan,fontFamily:"'DM Sans',sans-serif",fontSize:"14px",cursor:"pointer"}} onClick={()=>navigate("/edit-profile")}>
            Edit ✏️
          </button>
        )}
      </div>

      {/* Profile card */}
      <div style={{margin:"0 16px 16px",background:C.bg2,borderRadius:"24px",padding:"24px",border:`1px solid ${C.border1}`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-40px",right:"-40px",width:"120px",height:"120px",borderRadius:"50%",background:`radial-gradient(circle,${C.cyanDim},transparent)`,pointerEvents:"none"}}/>

        <div style={{display:"flex",alignItems:"flex-start",gap:"16px",marginBottom:"20px"}}>
          {profile.photoURL?(
            <img src={profile.photoURL} alt="" style={{width:"72px",height:"72px",borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.cyan}`,flexShrink:0}}/>
          ):(
            <div style={{width:"72px",height:"72px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:"#000",flexShrink:0,border:`3px solid ${C.border1}`}}>
              {profile.displayName?.charAt(0)||"?"}
            </div>
          )}
          <div style={{flex:1}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"20px",fontWeight:"700",color:C.white,marginBottom:"2px"}}>{profile.displayName}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"13px",color:C.muted,marginBottom:"6px"}}>@{profile.username||profile.displayName?.toLowerCase().replace(/\s/g,"")}</div>
            {profile.bio&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"rgba(224,242,254,0.65)",lineHeight:"1.5"}}>{profile.bio}</div>}
          </div>
        </div>

        {/* Real time stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px",marginBottom:"20px"}}>
          {[
            {val:profile.wins||0,label:"Wins",color:C.green},
            {val:profile.losses||0,label:"Losses",color:C.red},
            {val:`${winRate}%`,label:"Win Rate",color:C.cyan},
            {val:videos.length,label:"Forfeits",color:C.coral},
          ].map(s=>(
            <div key={s.label} style={{background:C.bg3,borderRadius:"12px",padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",color:s.color,lineHeight:1}}>{s.val}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"9px",color:C.muted,marginTop:"3px",letterSpacing:"0.06em"}}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Honour bar */}
        <div style={{marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.08em"}}>HONOUR SCORE</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:honour>=80?C.green:honour>=50?C.coral:C.red}}>{honour}/100</span>
          </div>
          <div style={{height:"6px",background:C.bg3,borderRadius:"3px"}}>
            <div style={{height:"100%",width:`${honour}%`,background:`linear-gradient(90deg,${C.cyan},${C.green})`,borderRadius:"3px",transition:"width 0.8s"}}/>
          </div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.muted,marginTop:"4px"}}>
            {honour>=80?"🟢 Trusted player":honour>=50?"🟡 Building reputation":"🔴 Low honour"}
          </div>
        </div>

        {/* Action buttons */}
        {!isOwnProfile&&(
          <div style={{display:"flex",gap:"10px"}}>
            <button style={{flex:1,padding:"14px",background:isFriend?C.bg3:`linear-gradient(135deg,${C.cyan},${C.purple})`,border:isFriend?`1px solid ${C.border1}`:"none",borderRadius:"12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.04em",color:isFriend?C.muted:"#000",cursor:"pointer",opacity:friendLoading?0.6:1}} onClick={toggleFriend} disabled={friendLoading}>
              {friendLoading?"...":isFriend?"✓ Friends":"+ Add Friend"}
            </button>
            <button style={{flex:1,padding:"14px",background:"transparent",border:`1px solid ${C.cyanBorder}`,borderRadius:"12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.04em",color:C.cyan,cursor:"pointer"}}
              onClick={()=>navigate("/create",{state:{opponent:{email:profile.email,displayName:profile.displayName,uid:profile.id}}})}>
              ⚔️ Challenge
            </button>
          </div>
        )}
      </div>

      {/* Videos section */}
      <div style={{padding:"0 16px"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px"}}>
          Forfeit Videos ({videos.length})
        </div>

        {videos.length===0?(
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>🎥</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:C.muted,letterSpacing:"0.04em"}}>
              {isOwnProfile?"No forfeits uploaded yet":"No forfeits uploaded yet"}
            </div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px"}}>
            {videos.map(v=>(
              <div key={v.id} style={{position:"relative",aspectRatio:"9/16",overflow:"hidden",borderRadius:"10px",background:C.bg2}}>
                <video
  src={v.videoUrl}
  style={{width:"100%",height:"100%",objectFit:"cover",cursor:"pointer"}}
  preload="metadata"
  onClick={()=>window.open(v.videoUrl,"_blank")}
/>
                {/* Status badge */}
                <div style={{position:"absolute",top:"6px",left:"6px"}}>
                  {v.approved&&<div style={{background:"rgba(0,230,118,0.8)",borderRadius:"6px",padding:"2px 6px",fontFamily:"'DM Mono',monospace",fontSize:"9px",color:"#000",fontWeight:"700"}}>✓ OK</div>}
                  {v.disputed&&<div style={{background:"rgba(255,77,109,0.8)",borderRadius:"6px",padding:"2px 6px",fontFamily:"'DM Mono',monospace",fontSize:"9px",color:"#fff",fontWeight:"700"}}>✗ DIS</div>}
                </div>

                {/* Delete button — only own profile */}
                {isOwnProfile&&(
                  <div style={{position:"absolute",top:"6px",right:"6px"}}>
                    <div style={{width:"26px",height:"26px",borderRadius:"50%",background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"13px"}}
                      onClick={()=>setDeleteConfirm(v.id)}>🗑</div>
                  </div>
                )}

                {/* Play overlay */}
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}
                  onClick={()=>window.open(v.videoUrl,"_blank")}>
                  <div style={{fontSize:"18px"}}>▶</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm&&(
        <>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:3000}} onClick={()=>setDeleteConfirm(null)}/>
          <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",background:C.bg1,borderRadius:"24px 24px 0 0",padding:"24px 20px calc(32px + env(safe-area-inset-bottom))",zIndex:3001}}>
            <div style={{width:"36px",height:"4px",background:C.bg3,borderRadius:"2px",margin:"0 auto 20px"}}/>
            <div style={{textAlign:"center",marginBottom:"20px"}}>
              <div style={{fontSize:"40px",marginBottom:"12px"}}>🗑</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",color:C.white,marginBottom:"8px",letterSpacing:"0.04em"}}>Delete this video?</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:C.muted}}>This can't be undone. The video will be permanently removed from the feed.</div>
            </div>
            <div style={{display:"flex",gap:"12px"}}>
              <button style={{flex:1,padding:"16px",background:"transparent",border:`1px solid ${C.border1}`,borderRadius:"14px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:C.muted,cursor:"pointer",letterSpacing:"0.04em"}}
                onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button style={{flex:1,padding:"16px",background:"rgba(255,77,109,0.2)",border:"1px solid rgba(255,77,109,0.5)",borderRadius:"14px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:C.red,cursor:"pointer",letterSpacing:"0.04em",opacity:deleting?0.5:1}}
                onClick={()=>deleteVideo(deleteConfirm)} disabled={deleting}>
                {deleting?"Deleting...":"Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}