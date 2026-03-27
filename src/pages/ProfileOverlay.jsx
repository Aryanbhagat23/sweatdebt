import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection, query, where, onSnapshot,
  orderBy, limit, doc, getDoc, updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import T from "../theme";
import HonourBadge, { getHonourInfo } from "../components/HonourBadge";

/* ─────────────────────────────────────────────────────────────
   PROFILE / ME OVERLAY
   — Stats, honour, badges, recent activity
   — Settings screen with dark mode (Dim + OLED)
   — No messages tab (that's in main nav)
───────────────────────────────────────────────────────────── */
export default function ProfileOverlay({ user, isOpen, onClose }) {
  const navigate   = useNavigate();
  const [profile,  setProfile]  = useState(null);
  const [bets,     setBets]     = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [videos,   setVideos]   = useState([]);
  const [visible,  setVisible]  = useState(false);
  const [animIn,   setAnimIn]   = useState(false);
  const [screen,   setScreen]   = useState("main"); // main | settings | badges | videos

  // Dark mode state — persisted in localStorage
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("sd_dark")||"off");

  // Apply dark mode to the page
  useEffect(() => {
    localStorage.setItem("sd_dark", darkMode);
    const root = document.getElementById("root");
    if (!root) return;
    if (darkMode === "dim") {
      document.body.style.background = "#15202B";
      root.style.background = "#15202B";
      root.setAttribute("data-dark", "dim");
    } else if (darkMode === "oled") {
      document.body.style.background = "#000000";
      root.style.background = "#000000";
      root.setAttribute("data-dark", "oled");
    } else {
      document.body.style.background = T.bg0;
      root.style.background = T.bg0;
      root.removeAttribute("data-dark");
    }
  }, [darkMode]);

  // Notification toggles (local for now)
  const [notifBets,     setNotifBets]     = useState(true);
  const [notifProof,    setNotifProof]    = useState(true);
  const [notifFriends,  setNotifFriends]  = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [privPublic,    setPrivPublic]    = useState(true);
  const [privVideos,    setPrivVideos]    = useState(true);
  const [privLeader,    setPrivLeader]    = useState(true);
  const [autoApprove,   setAutoApprove]   = useState(false);

  // Animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setScreen("main");
      setTimeout(() => setAnimIn(true), 10);
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setVisible(false), 380);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Load profile from Firestore fresh every open
  useEffect(() => {
    if (!user || !isOpen) return;
    getDoc(doc(db,"users",user.uid))
      .then(snap => { if (snap.exists()) setProfile(snap.data()); })
      .catch(() => {});
  }, [user, isOpen]);

  // Live data
  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db,"bets"), where("createdBy","==",user.uid));
    const u1  = onSnapshot(q1, snap => setBets(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const q2  = query(collection(db,"bets"), where("opponentEmail","==",user.email));
    const u2  = onSnapshot(q2, snap => setIncoming(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const q3  = query(collection(db,"videos"), where("uploadedBy","==",user.uid), orderBy("createdAt","desc"), limit(6));
    const u3  = onSnapshot(q3, snap => setVideos(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { u1(); u2(); u3(); };
  }, [user]);

  // Stats
  const won      = bets.filter(b=>b.status==="won").length;
  const lost     = bets.filter(b=>b.status==="lost").length;
  const total    = bets.length;
  const winRate  = total>0 ? Math.round((won/total)*100) : 0;
  const honour   = profile?.honour ?? Math.max(0, 100 - lost*5);
  const honourInfo = getHonourInfo(honour);
  const friends  = new Set([...bets.map(b=>b.opponentEmail),...incoming.map(b=>b.createdByEmail)]).size;
  const streak   = (() => {
    const sorted = [...bets].sort((a,b)=>(a.createdAt?.toDate?.()||0)-(b.createdAt?.toDate?.()||0));
    let s=0; for (const b of [...sorted].reverse()) { if(b.status==="won") s++; else break; } return s;
  })();

  // Recent activity
  const activity = [
    ...bets.slice(0,4).map(b=>({
      icon: b.status==="won"?"🏆":b.status==="lost"?"💀":"⚔️",
      text: b.status==="won"?`Won vs ${b.opponentEmail?.split("@")[0]}`:b.status==="lost"?`Lost to ${b.opponentEmail?.split("@")[0]}`:`Challenged ${b.opponentEmail?.split("@")[0]}`,
      sub:  b.description?.slice(0,40)||"",
      ts:   b.createdAt,
      color:b.status==="won"?"#10b981":b.status==="lost"?"#ef4444":T.accent,
    })),
    ...videos.slice(0,2).map(v=>({ icon:"📹", text:"Uploaded forfeit proof", sub:"", ts:v.createdAt, color:"#3b82f6" })),
  ].sort((a,b)=>(b.ts?.toDate?.()||0)-(a.ts?.toDate?.()||0)).slice(0,5);

  const timeAgo = ts => {
    if (!ts?.toDate) return "just now";
    const s=Math.floor((new Date()-ts.toDate())/1000);
    if(s<60) return "just now"; if(s<3600) return `${Math.floor(s/60)}m ago`;
    if(s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  };

  const badges = [
    { icon:"🔥", name:"On Fire",     earned:streak>=3,         desc:"3 win streak"          },
    { icon:"⚡", name:"Unstoppable", earned:streak>=5,         desc:"5 win streak"          },
    { icon:"👑", name:"God Mode",    earned:streak>=10,        desc:"10 win streak"         },
    { icon:"🏆", name:"First Win",   earned:won>=1,            desc:"Win first bet"         },
    { icon:"💪", name:"Grinder",     earned:videos.length>=3,  desc:"Upload 3 forfeits"     },
    { icon:"🌟", name:"Veteran",     earned:total>=10,         desc:"10 bets placed"        },
    { icon:"🛡️", name:"Trusted",    earned:honour>=90,        desc:"90+ honour score"      },
    { icon:"💀", name:"No Mercy",    earned:lost===0&&total>=3,desc:"Never lost"            },
  ];

  const goTo = path => { onClose(); setTimeout(()=>navigate(path),300); };
  const handleSignOut = async () => { onClose(); await signOut(auth); };

  const displayName = profile?.displayName || user?.displayName || "User";
  const photoURL    = profile?.photoURL    || user?.photoURL    || null;
  const username    = profile?.username    || displayName.toLowerCase().replace(/\s/g,"");

  if (!visible) return null;

  // Dark mode colours for the overlay itself
  const overlayBg = darkMode==="oled"?"#000":darkMode==="dim"?"#15202B":T.bg1;
  const overlayBg2= darkMode==="oled"?"#111":darkMode==="dim"?"#1c2b3a":T.bg0;
  const textColor = darkMode!=="off"?"#e7e9ea":T.panel;
  const mutedColor= darkMode!=="off"?"#6e767d":T.textMuted;
  const borderCol = darkMode!=="off"?"rgba(255,255,255,0.1)":T.borderCard;

  return (
    <>
      <style>{`
        @keyframes _ov{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}
        @keyframes _spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Backdrop */}
      <div style={{ position:"fixed",inset:0,zIndex:2000,background:animIn?"rgba(0,0,0,0.7)":"rgba(0,0,0,0)",backdropFilter:animIn?"blur(6px)":"blur(0px)",transition:"all 0.35s ease" }} onClick={onClose}/>

      {/* Sheet */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",
        width:"100%",maxWidth:"480px",
        background:overlayBg,
        borderRadius:"24px 24px 0 0",
        maxHeight:"92vh",overflowY:"auto",
        zIndex:2001,
        paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))",
        transform:animIn?"translateX(-50%) translateY(0)":"translateX(-50%) translateY(100%)",
        transition:"transform 0.38s cubic-bezier(0.32,0.72,0,1)",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.4)",
      }} onClick={e=>e.stopPropagation()}>

        {/* Handle */}
        <div style={{width:"36px",height:"4px",background:borderCol,borderRadius:"2px",margin:"12px auto 0"}}/>

        {/* ══════════ MAIN SCREEN ══════════ */}
        {screen==="main" && (
          <>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"16px 20px 8px"}}>
              <div style={{position:"relative",cursor:"pointer"}} onClick={()=>goTo("/edit-profile")}>
                {photoURL
                  ? <img src={photoURL} alt="" style={{width:"56px",height:"56px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>
                  : <div style={{width:"56px",height:"56px",borderRadius:"50%",background:T.panel,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"24px",color:T.accent}}>{displayName.charAt(0)}</div>
                }
                <div style={{position:"absolute",bottom:"-2px",right:"-2px",width:"20px",height:"20px",borderRadius:"50%",background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",border:`2px solid ${overlayBg}`}}>✏️</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.fontBody,fontSize:"18px",fontWeight:"700",color:textColor}}>{displayName}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:mutedColor}}>@{username} · {friends} friends</div>
                {streak>=3&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#f59e0b",marginTop:"2px"}}>🔥 {streak} win streak</div>}
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <div onClick={()=>setScreen("settings")} style={{width:"36px",height:"36px",borderRadius:"10px",background:overlayBg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",cursor:"pointer"}}>⚙️</div>
                <div onClick={onClose} style={{width:"36px",height:"36px",borderRadius:"50%",background:overlayBg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:mutedColor,cursor:"pointer"}}>✕</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{display:"flex",gap:"8px",padding:"8px 20px 16px"}}>
              {[
                {val:won,    label:"Bets won",     color:"#10b981"},
                {val:streak, label:"Win streak",   color:"#f59e0b"},
                {val:videos.length,label:"Forfeits",color:"#3b82f6"},
              ].map((s,i)=>(
                <div key={i} style={{flex:1,background:overlayBg2,borderRadius:"14px",padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontFamily:T.fontDisplay,fontSize:"26px",color:s.color,lineHeight:1}}>{s.val}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:mutedColor,marginTop:"3px"}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Honour bar */}
            <div style={{margin:"0 20px 16px",background:overlayBg2,borderRadius:"14px",padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:mutedColor,letterSpacing:"0.08em"}}>HONOUR SCORE</span>
                <HonourBadge score={honour} size="sm"/>
              </div>
              <div style={{height:"6px",background:borderCol,borderRadius:"3px",marginBottom:"8px"}}>
                <div style={{height:"100%",width:`${honour}%`,background:`linear-gradient(90deg,${honourInfo.color},${honourInfo.color}cc)`,borderRadius:"3px",transition:"width 0.8s"}}/>
              </div>
              <div style={{fontFamily:T.fontBody,fontSize:"12px",color:mutedColor}}>
                {honour>=90?"🟢 Trusted — keep it up!":honour>=70?"🔵 Reliable standing":honour>=50?"🟡 Average — complete your forfeits":"🔴 Low — forfeits overdue!"}
              </div>
            </div>

            {/* Badges row */}
            <div style={{padding:"0 20px 4px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:mutedColor,letterSpacing:"0.1em"}}>BADGES</span>
                <span onClick={()=>setScreen("badges")} style={{fontFamily:T.fontBody,fontSize:"12px",color:T.accent,cursor:"pointer"}}>See all →</span>
              </div>
              <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"8px"}}>
                {badges.map(b=>(
                  <div key={b.name} style={{flexShrink:0,background:b.earned?`${T.accent}12`:overlayBg2,border:`1px solid ${b.earned?`${T.accent}40`:borderCol}`,borderRadius:"14px",padding:"12px 10px",textAlign:"center",width:"72px",opacity:b.earned?1:0.35}}>
                    <div style={{fontSize:"24px",marginBottom:"5px"}}>{b.icon}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"9px",color:b.earned?T.accent:mutedColor,letterSpacing:"0.03em",lineHeight:"1.3"}}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div style={{padding:"12px 20px 4px"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:mutedColor,letterSpacing:"0.1em",marginBottom:"10px"}}>RECENT ACTIVITY</div>
              {activity.length===0
                ? <div style={{fontFamily:T.fontBody,fontSize:"13px",color:mutedColor,textAlign:"center",padding:"16px 0"}}>No activity yet — place a bet! ⚔️</div>
                : activity.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"10px",background:overlayBg2,borderRadius:"12px",marginBottom:"6px"}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"50%",background:a.color,flexShrink:0,marginTop:"6px",boxShadow:`0 0 6px ${a.color}60`}}/>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:T.fontBody,fontSize:"14px",fontWeight:"500",color:textColor}}>{a.icon} {a.text}</div>
                      {a.sub&&<div style={{fontFamily:T.fontBody,fontSize:"12px",color:mutedColor,marginTop:"2px"}}>{a.sub}</div>}
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:mutedColor,flexShrink:0}}>{timeAgo(a.ts)}</div>
                  </div>
                ))
              }
            </div>

            {/* Quick access menu */}
            <div style={{padding:"16px 20px 0"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:mutedColor,letterSpacing:"0.1em",marginBottom:"10px"}}>QUICK ACCESS</div>
              {[
                {icon:"⚔️", label:"My Bets",       sub:`${total} bets · ${incoming.filter(b=>b.status==="pending").length} pending`, action:()=>goTo("/bets")},
                {icon:"🎥", label:"My Videos",     sub:`${videos.length} forfeit videos`, action:()=>setScreen("videos")},
                {icon:"🏆", label:"Leaderboard",   sub:"See your ranking", action:()=>goTo("/leaderboard")},
                {icon:"✏️", label:"Edit Profile",  sub:"Change username, photo, bio", action:()=>goTo("/edit-profile")},
                {icon:"⚙️", label:"Settings",      sub:"Dark mode, notifications, privacy", action:()=>setScreen("settings")},
              ].map(item=>(
                <div key={item.label} onClick={item.action}
                  style={{display:"flex",alignItems:"center",gap:"14px",padding:"13px",background:overlayBg2,borderRadius:"14px",marginBottom:"8px",cursor:"pointer",border:`1px solid ${borderCol}`}}>
                  <div style={{width:"42px",height:"42px",borderRadius:"12px",background:overlayBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{item.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:T.fontBody,fontSize:"16px",fontWeight:"500",color:textColor}}>{item.label}</div>
                    <div style={{fontFamily:T.fontBody,fontSize:"12px",color:mutedColor,marginTop:"2px"}}>{item.sub}</div>
                  </div>
                  <div style={{fontSize:"18px",color:mutedColor}}>›</div>
                </div>
              ))}

              {/* Sign out */}
              <div onClick={handleSignOut}
                style={{display:"flex",alignItems:"center",gap:"14px",padding:"13px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"14px",marginBottom:"8px",cursor:"pointer"}}>
                <div style={{width:"42px",height:"42px",borderRadius:"12px",background:"rgba(239,68,68,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>🚪</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:T.fontBody,fontSize:"16px",fontWeight:"500",color:"#ef4444"}}>Sign out</div>
                  <div style={{fontFamily:T.fontBody,fontSize:"12px",color:mutedColor,marginTop:"2px"}}>{user?.email}</div>
                </div>
              </div>
            </div>
            <div style={{textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:"10px",color:borderCol,padding:"16px 0 0"}}>SweatDebt v1.0</div>
          </>
        )}

        {/* ══════════ VIDEOS SCREEN ══════════ */}
        {screen==="videos" && (
          <>
            <SubHeader title="My Videos" onBack={()=>setScreen("main")} onClose={onClose} overlayBg2={overlayBg2} textColor={textColor} mutedColor={mutedColor}/>
            {videos.length===0
              ? <EmptySection icon="🎥" text="No videos yet" sub="Lose a bet and upload your forfeit!" mutedColor={mutedColor}/>
              : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"2px",padding:"0 20px"}}>
                  {videos.map(v=>(
                    <div key={v.id} onClick={()=>window.open(v.videoUrl,"_blank")}
                      style={{position:"relative",aspectRatio:"1",overflow:"hidden",borderRadius:"8px",cursor:"pointer",background:"#000"}}>
                      <video src={v.videoUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} preload="metadata" muted/>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.3)",fontSize:"20px",color:"#fff"}}>▶</div>
                    </div>
                  ))}
                </div>
            }
          </>
        )}

        {/* ══════════ BADGES SCREEN ══════════ */}
        {screen==="badges" && (
          <>
            <SubHeader title="Badges" onBack={()=>setScreen("main")} onClose={onClose} overlayBg2={overlayBg2} textColor={textColor} mutedColor={mutedColor}/>
            <div style={{padding:"0 20px"}}>
              {badges.map(b=>(
                <div key={b.name} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",background:overlayBg2,borderRadius:"16px",marginBottom:"8px",border:`1px solid ${borderCol}`,opacity:b.earned?1:0.4}}>
                  <div style={{fontSize:"32px",width:"48px",textAlign:"center"}}>{b.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:T.fontBody,fontSize:"16px",fontWeight:"600",color:b.earned?T.accent:textColor}}>{b.name}</div>
                    <div style={{fontFamily:T.fontBody,fontSize:"12px",color:mutedColor,marginTop:"2px"}}>{b.desc}</div>
                  </div>
                  {b.earned&&<div style={{fontSize:"20px",color:T.accent}}>✓</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════ SETTINGS SCREEN ══════════ */}
        {screen==="settings" && (
          <>
            <SubHeader title="Settings" onBack={()=>setScreen("main")} onClose={onClose} overlayBg2={overlayBg2} textColor={textColor} mutedColor={mutedColor}/>

            {/* Dark mode */}
            <SectionLabel text="APPEARANCE" mutedColor={mutedColor}/>
            <div style={{margin:"0 20px 16px",background:overlayBg2,borderRadius:"16px",overflow:"hidden",border:`1px solid ${borderCol}`}}>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontFamily:T.fontBody,fontSize:"14px",color:mutedColor,marginBottom:"12px"}}>Theme</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {[
                    {key:"off",  icon:"☀️", label:"Light"  },
                    {key:"dim",  icon:"🌙", label:"Dim"    },
                    {key:"oled", icon:"⬛", label:"OLED"   },
                  ].map(t=>(
                    <div key={t.key} onClick={()=>setDarkMode(t.key)}
                      style={{flex:1,padding:"12px 8px",borderRadius:"12px",textAlign:"center",cursor:"pointer",background:darkMode===t.key?T.accent:overlayBg,border:`1px solid ${darkMode===t.key?T.accent:borderCol}`,transition:"all 0.2s"}}>
                      <div style={{fontSize:"22px",marginBottom:"4px"}}>{t.icon}</div>
                      <div style={{fontFamily:T.fontBody,fontSize:"12px",fontWeight:"500",color:darkMode===t.key?"#052e16":textColor}}>{t.label}</div>
                      {t.key==="dim"&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:"9px",color:darkMode===t.key?"#052e16":mutedColor,marginTop:"2px"}}>#15202B</div>}
                      {t.key==="oled"&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:"9px",color:darkMode===t.key?"#052e16":mutedColor,marginTop:"2px"}}>#000000</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notifications */}
            <SectionLabel text="NOTIFICATIONS" mutedColor={mutedColor}/>
            <div style={{margin:"0 20px 16px",background:overlayBg2,borderRadius:"16px",overflow:"hidden",border:`1px solid ${borderCol}`}}>
              <ToggleRow icon="⚔️" label="Bet challenges"    sub="When someone challenges you"      val={notifBets}     set={setNotifBets}     textColor={textColor} mutedColor={mutedColor} borderCol={borderCol}/>
              <ToggleRow icon="📹" label="Proof uploaded"     sub="When opponent uploads proof"      val={notifProof}    set={setNotifProof}    textColor={textColor} mutedColor={mutedColor} borderCol={borderCol}/>
              <ToggleRow icon="👥" label="Friend requests"    sub="New friend request"               val={notifFriends}  set={setNotifFriends}  textColor={textColor} mutedColor={mutedColor} borderCol={borderCol}/>
              <ToggleRow icon="💬" label="Comments & likes"   sub="Activity on your videos"         val={notifComments} set={setNotifComments} textColor={textColor} mutedColor={mutedColor} borderCol={borderCol} last/>
            </div>

            {/* Privacy */}
            <SectionLabel text="PRIVACY" mutedColor={mutedColor}/>
            <div style={{margin:"0 20px 16px",background:overlayBg2,borderRadius:"16px",overflow:"hidden",border:`1px solid ${borderCol}`}}>
              <ToggleRow icon="👁" label="Public profile"        sub="Anyone can see your stats"      val={privPublic}  set={setPrivPublic}  textColor={textColor} mutedColor={mutedColor} borderCol={borderCol}/>
              <ToggleRow icon="🎥" label="Public forfeit videos" sub="Videos visible in global feed" val={privVideos}  set={setPrivVideos}  textColor={textColor} mutedColor={mutedColor} borderCol={borderCol}/>
              <ToggleRow icon="🏆" label="Show on leaderboard"   sub="Appear in public rankings"     val={privLeader}  set={setPrivLeader}  textColor={textColor} mutedColor={mutedColor} borderCol={borderCol} last/>
            </div>

            {/* Bet settings */}
            <SectionLabel text="BET SETTINGS" mutedColor={mutedColor}/>
            <div style={{margin:"0 20px 16px",background:overlayBg2,borderRadius:"16px",overflow:"hidden",border:`1px solid ${borderCol}`}}>
              <ToggleRow icon="⚡" label="Auto-approve forfeits" sub="Skip manual review (risky)" val={autoApprove} set={setAutoApprove} textColor={textColor} mutedColor={mutedColor} borderCol={borderCol} last/>
            </div>

            {/* Account */}
            <SectionLabel text="ACCOUNT" mutedColor={mutedColor}/>
            <div style={{margin:"0 20px 16px",background:overlayBg2,borderRadius:"16px",overflow:"hidden",border:`1px solid ${borderCol}`}}>
              <SettingRow icon="👤" label="Display name" sub={displayName} textColor={textColor} mutedColor={mutedColor} borderCol={borderCol} onClick={()=>goTo("/edit-profile")}/>
              <SettingRow icon="📧" label="Email"        sub={user?.email} textColor={textColor} mutedColor={mutedColor} borderCol={borderCol}/>
              <SettingRow icon="🔒" label="Linked account" sub="Google"   textColor={textColor} mutedColor={mutedColor} borderCol={borderCol} right={<span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#10b981"}}>✓ Linked</span>} last/>
            </div>

            {/* Support */}
            <SectionLabel text="SUPPORT" mutedColor={mutedColor}/>
            <div style={{margin:"0 20px 16px",background:overlayBg2,borderRadius:"16px",overflow:"hidden",border:`1px solid ${borderCol}`}}>
              <SettingRow icon="📖" label="How to play"  sub="Rules and guides"   textColor={textColor} mutedColor={mutedColor} borderCol={borderCol} onClick={()=>alert("SweatDebt: Place a bet → Loser films forfeit → Upload proof → Opponent approves → Honour score updates!")}/>
              <SettingRow icon="🐛" label="Report a bug" sub="Help us improve"    textColor={textColor} mutedColor={mutedColor} borderCol={borderCol} onClick={()=>window.open("mailto:support@sweatdebt.app?subject=Bug Report")}/>
              <SettingRow icon="📢" label="Share app"    sub="Invite your friends" textColor={textColor} mutedColor={mutedColor} borderCol={borderCol}
                onClick={()=>navigator.share?.({title:"SweatDebt",url:"https://sweatdebt.vercel.app"})||window.open("https://sweatdebt.vercel.app")} last/>
            </div>

            {/* Danger */}
            <SectionLabel text="DANGER ZONE" mutedColor="#ef4444"/>
            <div style={{margin:"0 20px 20px",background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"16px",overflow:"hidden"}}>
              <SettingRow icon="🚪" label="Log out" sub="Sign out of your account" textColor="#ef4444" mutedColor={mutedColor} borderCol="rgba(239,68,68,0.2)" onClick={handleSignOut} danger/>
            </div>
            <div style={{textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:"10px",color:borderCol,padding:"0 0 16px"}}>SweatDebt v1.0</div>
          </>
        )}
      </div>
    </>
  );
}

/* ── Sub-components ── */
function SubHeader({ title, onBack, onClose, overlayBg2, textColor, mutedColor }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"16px 20px 12px"}}>
      <div onClick={onBack} style={{width:"36px",height:"36px",borderRadius:"50%",background:overlayBg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",cursor:"pointer"}}>←</div>
      <div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:textColor,letterSpacing:"0.04em",fontStyle:"italic",flex:1}}>{title}</div>
      <div onClick={onClose} style={{width:"36px",height:"36px",borderRadius:"50%",background:overlayBg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:mutedColor,cursor:"pointer"}}>✕</div>
    </div>
  );
}

function SectionLabel({ text, mutedColor }) {
  return <div style={{padding:"0 20px 8px",fontFamily:"'DM Mono',monospace",fontSize:"11px",color:mutedColor,letterSpacing:"0.1em"}}>{text}</div>;
}

function EmptySection({ icon, text, sub, mutedColor }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px",gap:"10px"}}>
      <div style={{fontSize:"40px"}}>{icon}</div>
      <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:mutedColor,letterSpacing:"0.04em",fontStyle:"italic"}}>{text}</div>
      {sub&&<div style={{fontFamily:T.fontBody,fontSize:"13px",color:mutedColor,textAlign:"center"}}>{sub}</div>}
    </div>
  );
}

function ToggleRow({ icon, label, sub, val, set, textColor, mutedColor, borderCol, last }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"13px 16px",borderBottom:last?"none":`1px solid ${borderCol}`}}>
      <div style={{width:"36px",height:"36px",borderRadius:"10px",background:"rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:T.fontBody,fontSize:"15px",fontWeight:"500",color:textColor}}>{label}</div>
        {sub&&<div style={{fontFamily:T.fontBody,fontSize:"12px",color:mutedColor,marginTop:"2px"}}>{sub}</div>}
      </div>
      <div onClick={()=>set(!val)} style={{width:"48px",height:"26px",borderRadius:"13px",background:val?T.accent:"rgba(0,0,0,0.15)",position:"relative",cursor:"pointer",transition:"background 0.2s",flexShrink:0}}>
        <div style={{position:"absolute",top:"3px",left:val?"22px":"3px",width:"20px",height:"20px",borderRadius:"50%",background:val?"#052e16":"#888",transition:"left 0.2s"}}/>
      </div>
    </div>
  );
}

function SettingRow({ icon, label, sub, textColor, mutedColor, borderCol, onClick, right, last, danger }) {
  return (
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:"12px",padding:"13px 16px",borderBottom:last?"none":`1px solid ${borderCol}`,cursor:onClick?"pointer":"default"}}>
      <div style={{width:"36px",height:"36px",borderRadius:"10px",background:danger?"rgba(239,68,68,0.1)":"rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:T.fontBody,fontSize:"15px",fontWeight:"500",color:textColor||"inherit"}}>{label}</div>
        {sub&&<div style={{fontFamily:T.fontBody,fontSize:"12px",color:mutedColor,marginTop:"2px"}}>{sub}</div>}
      </div>
      {right||<div style={{fontSize:"18px",color:mutedColor}}>›</div>}
    </div>
  );
}