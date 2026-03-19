import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function Profile({ user }) {
  const [bets, setBets] = useState([]);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const bq = query(collection(db, "bets"), where("createdBy","==",user.uid));
    const unsub1 = onSnapshot(bq, snap => setBets(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const vq = query(collection(db, "videos"), where("uploadedBy","==",user.uid));
    const unsub2 = onSnapshot(vq, snap => setVideos(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { unsub1(); unsub2(); };
  }, [user.uid]);

  const won = bets.filter(b=>b.status==="won").length;
  const lost = bets.filter(b=>b.status==="lost").length;
  const total = bets.length;
  const winRate = total > 0 ? Math.round((won/total)*100) : 0;
  const honour = Math.max(0, 100 - (bets.filter(b=>b.status==="disputed").length * 20));

  const badges = [
    { icon:"🔥", name:"ON FIRE", earned: won >= 1 },
    { icon:"⚡", name:"STREAK", earned: won >= 3 },
    { icon:"💪", name:"500 REPS", earned: videos.length >= 5 },
    { icon:"👑", name:"TOP 10", earned: winRate >= 70 },
    { icon:"🏆", name:"CHAMPION", earned: won >= 10 },
    { icon:"💀", name:"NO MERCY", earned: lost === 0 && total >= 3 },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.avatarWrap}>
          <div style={S.avatar}>{user?.displayName?.charAt(0)||"?"}</div>
        </div>
        <div style={S.info}>
          <div style={S.name}>{user?.displayName}</div>
          <div style={S.handle}>@{user?.displayName?.toLowerCase().replace(" ","")}</div>
          <div style={S.honourBadge}>
            <span style={S.honourLabel}>HONOUR</span>
            <span style={S.honourScore}>{honour}/100</span>
          </div>
        </div>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statNum}>{total}</div><div style={S.statLabel}>BETS</div></div>
        <div style={S.stat}><div style={{...S.statNum,color:"#00e676"}}>{won}</div><div style={S.statLabel}>WON</div></div>
        <div style={S.stat}><div style={{...S.statNum,color:"#ff4444"}}>{lost}</div><div style={S.statLabel}>LOST</div></div>
        <div style={S.stat}><div style={{...S.statNum,color:"#d4ff00"}}>{winRate}%</div><div style={S.statLabel}>RATE</div></div>
      </div>

      <div style={S.sectionTitle}>BADGES</div>
      <div style={S.badgesWrap}>
        <div style={S.badgesScroll}>
          {badges.map(b => (
            <div key={b.name} style={{...S.badge, ...(b.earned?S.badgeEarned:{})}}>
              <div style={S.badgeIcon}>{b.icon}</div>
              <div style={{...S.badgeName, color:b.earned?"#d4ff00":"#444"}}>{b.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.sectionTitle}>MY FORFEIT VIDEOS ({videos.length})</div>
      {videos.length === 0 ? (
        <div style={S.noVideos}>No forfeit videos yet — go lose a bet! 😤</div>
      ) : (
        <div style={S.videoGrid}>
          {videos.map(v => (
            <div key={v.id} style={S.videoThumb} onClick={()=>window.open(v.videoUrl,"_blank")}>
              <video src={v.videoUrl} style={S.thumbVideo} preload="metadata"/>
              <div style={S.thumbOverlay}>▶</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.signOutWrap}>
        <button style={S.signOutBtn} onClick={()=>signOut(auth)}>Sign out</button>
      </div>
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"90px"},
  header:{padding:"24px 20px 20px",display:"flex",gap:"16px",alignItems:"center",borderBottom:"1px solid #222"},
  avatarWrap:{flexShrink:0},
  avatar:{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",fontWeight:"700",color:"#000"},
  info:{flex:1},
  name:{fontSize:"22px",fontWeight:"700",color:"#f5f0e8",marginBottom:"2px"},
  handle:{fontSize:"13px",color:"#666",fontFamily:"monospace",marginBottom:"8px"},
  honourBadge:{display:"inline-flex",alignItems:"center",gap:"6px",background:"rgba(212,255,0,0.1)",border:"1px solid rgba(212,255,0,0.3)",borderRadius:"20px",padding:"4px 12px"},
  honourLabel:{fontSize:"10px",color:"#666",fontFamily:"monospace",letterSpacing:"0.05em"},
  honourScore:{fontSize:"13px",fontWeight:"500",color:"#d4ff00",fontFamily:"monospace"},
  stats:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"1px",background:"#333",margin:"0 0 4px"},
  stat:{background:"#1a1a1a",padding:"14px 8px",textAlign:"center"},
  statNum:{fontSize:"24px",fontWeight:"700",color:"#f5f0e8"},
  statLabel:{fontSize:"10px",color:"#666",marginTop:"2px",letterSpacing:"0.05em"},
  sectionTitle:{padding:"16px 20px 10px",fontSize:"11px",color:"#555",letterSpacing:"0.1em",fontFamily:"monospace"},
  badgesWrap:{padding:"0 20px"},
  badgesScroll:{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"4px"},
  badge:{flexShrink:0,background:"#1a1a1a",border:"1px solid #333",borderRadius:"12px",padding:"12px",textAlign:"center",width:"72px"},
  badgeEarned:{border:"1px solid rgba(212,255,0,0.4)",background:"rgba(212,255,0,0.05)"},
  badgeIcon:{fontSize:"24px",marginBottom:"4px"},
  badgeName:{fontSize:"9px",fontFamily:"monospace",letterSpacing:"0.05em"},
  videoGrid:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"2px",margin:"0 20px"},
  videoThumb:{position:"relative",aspectRatio:"1",overflow:"hidden",background:"#000",cursor:"pointer",borderRadius:"4px"},
  thumbVideo:{width:"100%",height:"100%",objectFit:"cover"},
  thumbOverlay:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.3)",fontSize:"20px",color:"#fff"},
  noVideos:{padding:"20px",color:"#444",fontSize:"13px",textAlign:"center"},
  signOutWrap:{padding:"20px"},
  signOutBtn:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"12px",padding:"14px",fontSize:"15px",color:"#666",cursor:"pointer"},
};