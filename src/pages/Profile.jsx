import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Profile({ user }) {
  const navigate = useNavigate();
  const [bets, setBets] = useState([]);
  const [videos, setVideos] = useState([]);
  const [activeSection, setActiveSection] = useState("stats");

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
    { icon:"🔥", name:"On Fire", earned: won >= 1, desc:"Win your first bet" },
    { icon:"⚡", name:"Streak x3", earned: won >= 3, desc:"Win 3 bets" },
    { icon:"💪", name:"Grinder", earned: videos.length >= 3, desc:"Upload 3 forfeits" },
    { icon:"👑", name:"Top 10", earned: winRate >= 70, desc:"70%+ win rate" },
    { icon:"🏆", name:"Champion", earned: won >= 10, desc:"Win 10 bets" },
    { icon:"💀", name:"No Mercy", earned: lost === 0 && total >= 3, desc:"Never lost" },
  ];

  const menuItems = [
    { icon:"⚔️", label:"My Bets", sub:`${total} total bets`, action:()=>navigate("/bets") },
    { icon:"🎥", label:"My Videos", sub:`${videos.length} forfeit videos`, action:()=>setActiveSection("videos") },
    { icon:"🏅", label:"Badges", sub:`${badges.filter(b=>b.earned).length}/${badges.length} earned`, action:()=>setActiveSection("badges") },
    { icon:"🏆", label:"Leaderboard", sub:"See your ranking", action:()=>navigate("/leaderboard") },
  ];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={S.avatar}>{user?.displayName?.charAt(0)||"?"}</div>
          <div style={S.headerInfo}>
            <div style={S.name}>{user?.displayName}</div>
            <div style={S.handle}>@{user?.displayName?.toLowerCase().replace(/\s/g,"")}</div>
          </div>
          <div style={S.settingsBtn} onClick={()=>signOut(auth)}>⚙️</div>
        </div>

        {/* Honour score bar */}
        <div style={S.honourWrap}>
          <div style={S.honourTop}>
            <span style={S.honourLabel}>HONOUR SCORE</span>
            <span style={S.honourVal}>{honour}/100</span>
          </div>
          <div style={S.honourTrack}>
            <div style={{...S.honourBar, width:`${honour}%`}}/>
          </div>
          <div style={S.honourSub}>
            {honour >= 80 ? "🟢 Trusted player" : honour >= 50 ? "🟡 Building reputation" : "🔴 Low honour — complete your forfeits!"}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={S.statsGrid}>
        <div style={S.statBox}>
          <div style={S.statNum}>{total}</div>
          <div style={S.statLabel}>Total Bets</div>
        </div>
        <div style={S.statBox}>
          <div style={{...S.statNum,color:"#00e676"}}>{won}</div>
          <div style={S.statLabel}>Won</div>
        </div>
        <div style={S.statBox}>
          <div style={{...S.statNum,color:"#ff4444"}}>{lost}</div>
          <div style={S.statLabel}>Lost</div>
        </div>
        <div style={S.statBox}>
          <div style={{...S.statNum,color:"#d4ff00"}}>{winRate}%</div>
          <div style={S.statLabel}>Win Rate</div>
        </div>
      </div>

      {activeSection === "stats" && (
        <>
          {/* Menu grid like the reference app */}
          <div style={S.sectionTitle}>QUICK ACCESS</div>
          <div style={S.menuGrid}>
            {menuItems.map(item => (
              <div key={item.label} style={S.menuItem} onClick={item.action}>
                <div style={S.menuIcon}>{item.icon}</div>
                <div style={S.menuLabel}>{item.label}</div>
                <div style={S.menuSub}>{item.sub}</div>
                <div style={S.menuArrow}>›</div>
              </div>
            ))}
          </div>

          {/* Earned badges preview */}
          <div style={S.sectionTitle}>BADGES EARNED</div>
          <div style={S.badgesRow}>
            {badges.filter(b=>b.earned).length === 0 ? (
              <div style={S.noBadges}>Win bets to earn badges 🏅</div>
            ) : (
              badges.filter(b=>b.earned).map(b => (
                <div key={b.name} style={S.badgePill}>
                  <span>{b.icon}</span>
                  <span style={S.badgePillName}>{b.name}</span>
                </div>
              ))
            )}
          </div>

          {/* Sign out */}
          <div style={S.signOutWrap}>
            <button style={S.signOutBtn} onClick={()=>signOut(auth)}>
              Sign out
            </button>
            <div style={S.version}>SweatDebt v1.0 · sweatdebt.vercel.app</div>
          </div>
        </>
      )}

      {activeSection === "videos" && (
        <>
          <div style={S.sectionHeaderRow}>
            <div style={S.sectionTitle}>MY FORFEIT VIDEOS</div>
            <button style={S.backBtn} onClick={()=>setActiveSection("stats")}>← Back</button>
          </div>
          {videos.length === 0 ? (
            <div style={S.emptySection}>
              <div style={{fontSize:"48px"}}>🎥</div>
              <div style={S.emptyText}>No videos yet</div>
              <div style={S.emptySub}>Lose a bet and upload your forfeit!</div>
            </div>
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
        </>
      )}

      {activeSection === "badges" && (
        <>
          <div style={S.sectionHeaderRow}>
            <div style={S.sectionTitle}>ALL BADGES</div>
            <button style={S.backBtn} onClick={()=>setActiveSection("stats")}>← Back</button>
          </div>
          <div style={S.badgesList}>
            {badges.map(b => (
              <div key={b.name} style={{...S.badgeRow, opacity:b.earned?1:0.4}}>
                <div style={S.badgeRowIcon}>{b.icon}</div>
                <div style={S.badgeRowInfo}>
                  <div style={S.badgeRowName}>{b.name}</div>
                  <div style={S.badgeRowDesc}>{b.desc}</div>
                </div>
                <div style={S.badgeRowStatus}>
                  {b.earned ? <span style={{color:"#d4ff00",fontSize:"20px"}}>✓</span> : <span style={{color:"#333",fontSize:"20px"}}>○</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"90px"},
  header:{background:"#1a1a1a",padding:"52px 16px 20px",borderBottom:"1px solid #222"},
  headerTop:{display:"flex",alignItems:"center",gap:"14px",marginBottom:"20px"},
  avatar:{width:"64px",height:"64px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",fontWeight:"700",color:"#000",flexShrink:0},
  headerInfo:{flex:1},
  name:{fontSize:"20px",fontWeight:"700",color:"#f5f0e8"},
  handle:{fontSize:"13px",color:"#666",fontFamily:"monospace"},
  settingsBtn:{fontSize:"24px",cursor:"pointer",padding:"8px"},
  honourWrap:{background:"#222",borderRadius:"16px",padding:"16px"},
  honourTop:{display:"flex",justifyContent:"space-between",marginBottom:"8px"},
  honourLabel:{fontSize:"11px",color:"#666",fontFamily:"monospace",letterSpacing:"0.08em"},
  honourVal:{fontSize:"13px",fontWeight:"500",color:"#d4ff00",fontFamily:"monospace"},
  honourTrack:{height:"6px",background:"#333",borderRadius:"3px",marginBottom:"8px"},
  honourBar:{height:"100%",background:"linear-gradient(90deg,#d4ff00,#00e676)",borderRadius:"3px",transition:"width 0.5s"},
  honourSub:{fontSize:"12px",color:"#666"},
  statsGrid:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"1px",background:"#222",borderBottom:"1px solid #222"},
  statBox:{background:"#1a1a1a",padding:"16px 8px",textAlign:"center"},
  statNum:{fontSize:"24px",fontWeight:"700",color:"#f5f0e8"},
  statLabel:{fontSize:"11px",color:"#666",marginTop:"3px"},
  sectionTitle:{padding:"20px 16px 10px",fontSize:"11px",color:"#555",letterSpacing:"0.1em",fontFamily:"monospace"},
  sectionHeaderRow:{display:"flex",alignItems:"center",justifyContent:"space-between",paddingRight:"16px"},
  backBtn:{background:"none",border:"none",color:"#d4ff00",fontSize:"14px",cursor:"pointer",padding:"8px"},
  menuGrid:{display:"flex",flexDirection:"column",gap:"2px",margin:"0 16px"},
  menuItem:{background:"#1a1a1a",borderRadius:"16px",padding:"16px",display:"flex",alignItems:"center",gap:"14px",cursor:"pointer",marginBottom:"6px",border:"1px solid #222"},
  menuIcon:{fontSize:"24px",width:"40px",height:"40px",background:"#222",borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  menuLabel:{fontSize:"16px",fontWeight:"500",color:"#f5f0e8",flex:1},
  menuSub:{fontSize:"12px",color:"#555"},
  menuArrow:{fontSize:"20px",color:"#444"},
  badgesRow:{display:"flex",flexWrap:"wrap",gap:"8px",padding:"0 16px"},
  badgePill:{display:"flex",alignItems:"center",gap:"6px",background:"rgba(212,255,0,0.1)",border:"1px solid rgba(212,255,0,0.3)",borderRadius:"20px",padding:"8px 14px"},
  badgePillName:{fontSize:"13px",color:"#d4ff00",fontWeight:"500"},
  noBadges:{color:"#444",fontSize:"14px",padding:"4px"},
  badgesList:{padding:"0 16px"},
  badgeRow:{display:"flex",alignItems:"center",gap:"14px",padding:"16px",background:"#1a1a1a",borderRadius:"16px",marginBottom:"8px",border:"1px solid #222"},
  badgeRowIcon:{fontSize:"32px",width:"52px",textAlign:"center"},
  badgeRowInfo:{flex:1},
  badgeRowName:{fontSize:"16px",fontWeight:"500",color:"#f5f0e8"},
  badgeRowDesc:{fontSize:"12px",color:"#555",marginTop:"3px"},
  badgeRowStatus:{width:"30px",textAlign:"center"},
  videoGrid:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"2px",margin:"0 16px"},
  videoThumb:{position:"relative",aspectRatio:"1",overflow:"hidden",background:"#000",cursor:"pointer",borderRadius:"6px"},
  thumbVideo:{width:"100%",height:"100%",objectFit:"cover"},
  thumbOverlay:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.3)",fontSize:"22px",color:"#fff"},
  emptySection:{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 16px",gap:"12px"},
  emptyText:{color:"#666",fontSize:"16px",fontWeight:"500"},
  emptySub:{color:"#444",fontSize:"14px",textAlign:"center"},
  signOutWrap:{padding:"24px 16px 0"},
  signOutBtn:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"16px",padding:"16px",fontSize:"16px",color:"#666",cursor:"pointer",minHeight:"54px"},
  version:{textAlign:"center",color:"#333",fontSize:"11px",fontFamily:"monospace",marginTop:"12px"},
};