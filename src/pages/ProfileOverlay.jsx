import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, updateDoc, collection, query, where,
  getDocs, deleteDoc, onSnapshot,
} from "firebase/firestore";
import T from "../theme";

// ─── theme helpers ────────────────────────────────────────────────────────────
const CHALKBOARD = "#2C4A3E";
const WHITE      = "#ffffff";
const MINT       = "#f0fdf4";
const ACCENT     = "#10b981";
const MUTED      = "#6b7280";
const DANGER     = "#ef4444";

// ─── tier helpers ─────────────────────────────────────────────────────────────
const TIERS = [
  { label:"Rookie",   min:0,   emoji:"🌱", color:"#9ca3af" },
  { label:"Iron",     min:50,  emoji:"⚙️", color:"#6b7280" },
  { label:"Bronze",   min:150, emoji:"🥉", color:"#cd7f32" },
  { label:"Silver",   min:300, emoji:"🥈", color:"#9ca3af" },
  { label:"Gold",     min:500, emoji:"🥇", color:"#f59e0b" },
  { label:"Platinum", min:750, emoji:"💎", color:"#38bdf8" },
  { label:"Diamond",  min:1000,emoji:"💠", color:"#818cf8" },
  { label:"Legend",   min:1500,emoji:"👑", color:"#f97316" },
];
function getTier(score=0){ return [...TIERS].reverse().find(t=>score>=t.min)||TIERS[0]; }

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  { q:"What is the Honour Score?",       a:"Your honour score reflects your reliability. You gain points by winning bets and completing forfeits. You lose points for dodging debts or disputing unfairly." },
  { q:"What happens if I dodge a debt?", a:"If you don't upload proof within 24 hours of losing, you automatically lose 15 honour points and get a permanent 'Debt Dodger 💀' badge visible to everyone." },
  { q:"How do Group Bets work?",         a:"Create a group bet, invite friends, set rules (all lose / last loses / vote / elimination). Group bets give 2× honour multiplier." },
  { q:"How do Seasons work?",            a:"Seasons reset monthly. Your honour score is tallied each month. Top finishers earn Champion title, exclusive badges, and bonus honour." },
  { q:"Can I delete a bet?",             a:"You can delete a pending bet before the opponent accepts. Once accepted, the bet is live and cannot be deleted." },
  { q:"Is SweatDebt free?",              a:"Yes, SweatDebt is completely free. No real money is ever involved — only sweat and pride." },
];

// ─── Badges data ──────────────────────────────────────────────────────────────
const ALL_BADGES = [
  { id:"first_win",    emoji:"⚔️",  label:"First Win",      desc:"Win your first bet" },
  { id:"win_streak_3", emoji:"🔥",  label:"Hot Streak",     desc:"Win 3 in a row" },
  { id:"win_streak_5", emoji:"💥",  label:"On Fire",        desc:"Win 5 in a row" },
  { id:"honour_100",   emoji:"🏅",  label:"Century",        desc:"Reach 100 honour" },
  { id:"honour_500",   emoji:"🏆",  label:"Legend",         desc:"Reach 500 honour" },
  { id:"forfeit_done", emoji:"💪",  label:"Good Sport",     desc:"Complete a forfeit" },
  { id:"group_bet",    emoji:"👥",  label:"Team Player",    desc:"Join a group bet" },
  { id:"jury_voted",   emoji:"⚖️",  label:"Juror",          desc:"Vote as a juror" },
  { id:"season_top3",  emoji:"🥇",  label:"Podium",         desc:"Finish top 3 in a season" },
  { id:"debt_dodger",  emoji:"💀",  label:"Debt Dodger",    desc:"Missed a forfeit deadline" },
];

const SOCIAL_PLATFORMS = [
  { key:"instagram", emoji:"📸", label:"Instagram",  placeholder:"@yourusername" },
  { key:"twitter",   emoji:"🐦", label:"X / Twitter",placeholder:"@yourusername" },
  { key:"linkedin",  emoji:"💼", label:"LinkedIn",   placeholder:"linkedin.com/in/yourname" },
  { key:"youtube",   emoji:"▶️", label:"YouTube",    placeholder:"@yourchannel" },
  { key:"tiktok",    emoji:"🎵", label:"TikTok",     placeholder:"@yourusername" },
];

// ─── small helpers ─────────────────────────────────────────────────────────────
function Row({ icon, label, sub, right, onClick, danger }){
  return (
    <div onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:"14px",
      padding:"14px 16px", cursor:onClick?"pointer":"default",
      borderBottom:`1px solid ${MINT}`,
    }}>
      <span style={{fontSize:"20px"}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontFamily:T.fontBody,fontSize:"15px",color:danger?DANGER:CHALKBOARD,fontWeight:"500"}}>{label}</div>
        {sub && <div style={{fontFamily:T.fontBody,fontSize:"12px",color:MUTED,marginTop:"2px"}}>{sub}</div>}
      </div>
      {right && <div style={{color:MUTED,fontSize:"13px"}}>{right}</div>}
    </div>
  );
}

function Card({ children, style={} }){
  return (
    <div style={{background:WHITE,borderRadius:"16px",overflow:"hidden",marginBottom:"12px",
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)",...style}}>
      {children}
    </div>
  );
}

function SectionTitle({ label }){
  return (
    <div style={{fontFamily:T.fontDisplay,fontSize:"11px",letterSpacing:"0.12em",
      color:MUTED,padding:"16px 16px 6px",textTransform:"uppercase"}}>
      {label}
    </div>
  );
}

function Toggle({ value, onChange }){
  return (
    <div onClick={()=>onChange(!value)} style={{
      width:"44px",height:"24px",borderRadius:"12px",cursor:"pointer",
      background:value?ACCENT:"#d1d5db",transition:"background 0.2s",
      position:"relative",flexShrink:0,
    }}>
      <div style={{
        position:"absolute",top:"3px",
        left:value?"23px":"3px",
        width:"18px",height:"18px",borderRadius:"50%",
        background:WHITE,transition:"left 0.2s",
        boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
      }}/>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────
export default function ProfileOverlay({ user }){
  const navigate = useNavigate();

  // profile data
  const [profile,    setProfile]    = useState({});
  const [stats,      setStats]      = useState({ total:0, wins:0, losses:0 });
  const [badges,     setBadges]     = useState([]);
  const [videos,     setVideos]     = useState([]);
  const [socialLinks,setSocialLinks]= useState({});

  // settings state
  const [notifBets,   setNotifBets]   = useState(true);
  const [notifApproved,setNotifApproved]=useState(true);
  const [notifFriends,setNotifFriends]= useState(true);
  const [pubProfile,  setPubProfile]  = useState(true);
  const [pubVideos,   setPubVideos]   = useState(true);
  const [pubLeader,   setPubLeader]   = useState(true);

  // screen state
  const [screen,     setScreen]     = useState("main");
  const [faqOpen,    setFaqOpen]    = useState(null);

  // video actions
  const [videoMenu,  setVideoMenu]  = useState(null);
  const [editCaption,setEditCaption]= useState(null);
  const [captionDraft,setCaptionDraft]=useState("");
  const [playVideo,  setPlayVideo]  = useState(null);
  const [deleteConfirm,setDeleteConfirm]=useState(null);

  // social editing
  const [socialDraft, setSocialDraft]=useState({});
  const [socialSaving,setSocialSaving]=useState(false);

  // ── load profile ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!user) return;
    const unsub = onSnapshot(doc(db,"users",user.uid), snap=>{
      if(snap.exists()){
        const d = snap.data();
        setProfile(d);
        setSocialLinks(d.socialLinks||{});
        setSocialDraft(d.socialLinks||{});
        setNotifBets(d.settings?.notifBets    !== false);
        setNotifApproved(d.settings?.notifApproved !== false);
        setNotifFriends(d.settings?.notifFriends !== false);
        setPubProfile(d.settings?.pubProfile  !== false);
        setPubVideos(d.settings?.pubVideos    !== false);
        setPubLeader(d.settings?.pubLeader    !== false);
        setBadges(d.badges||[]);
      }
    });
    return ()=>unsub();
  },[user]);

  // ── load bets for stats ───────────────────────────────────────────────────────
  useEffect(()=>{
    if(!user) return;
    const q = query(collection(db,"bets"),
      where("participants","array-contains",user.uid));
    getDocs(q).then(snap=>{
      let wins=0, losses=0;
      snap.forEach(d=>{
        const b=d.data();
        if(b.status==="completed"||b.status==="approved"){
          if(b.winner===user.uid) wins++;
          else losses++;
        }
      });
      setStats({ total:wins+losses, wins, losses });
    });
  },[user]);

  // ── load videos ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!user) return;
    const q = query(collection(db,"videos"),where("userId","==",user.uid));
    const unsub = onSnapshot(q, snap=>{
      setVideos(snap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
    });
    return ()=>unsub();
  },[user]);

  // ── derived ───────────────────────────────────────────────────────────────────
  // ⚠️ All hooks above — safe to return null now
  if (!user) return null;
  const tier      = getTier(profile.honourScore||0);
  const winRate   = stats.total>0 ? Math.round((stats.wins/stats.total)*100) : 0;
  const displayName = profile.displayName||user?.displayName||"Athlete";
  const username    = profile.username||"";
  const photo       = profile.photoURL||user?.photoURL||null;

  // ── save settings ─────────────────────────────────────────────────────────────
  async function saveSettings(patch){
    try{
      await updateDoc(doc(db,"users",user.uid),{ settings:{
        notifBets, notifApproved, notifFriends,
        pubProfile, pubVideos, pubLeader,
        ...patch,
      }});
    }catch(e){ console.error(e); }
  }

  // ── save social links ─────────────────────────────────────────────────────────
  async function saveSocial(){
    setSocialSaving(true);
    try{
      await updateDoc(doc(db,"users",user.uid),{ socialLinks: socialDraft });
      setSocialLinks(socialDraft);
    }catch(e){ console.error(e); }
    setSocialSaving(false);
    setScreen("main");
  }

  // ── delete video ──────────────────────────────────────────────────────────────
  async function handleDeleteVideo(video){
    try{
      await deleteDoc(doc(db,"videos",video.id));
    }catch(e){ alert("Could not delete video."); }
    setDeleteConfirm(null);
    setVideoMenu(null);
  }

  // ── edit caption ──────────────────────────────────────────────────────────────
  async function handleSaveCaption(){
    if(!editCaption) return;
    try{
      await updateDoc(doc(db,"videos",editCaption.id),{ description: captionDraft.trim() });
    }catch(e){ alert("Could not save caption."); }
    setEditCaption(null);
  }

  // ── navigate helper ───────────────────────────────────────────────────────────
  function goTo(path){ navigate(path); }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREENS
  // ─────────────────────────────────────────────────────────────────────────────

  // ── SETTINGS screen ───────────────────────────────────────────────────────────
  if(screen==="settings") return (
    <Overlay onBack={()=>setScreen("main")} title="Settings">
      <SectionTitle label="Notifications"/>
      <Card>
        <ToggleRow label="Bet updates"           value={notifBets}      onChange={v=>{setNotifBets(v);saveSettings({notifBets:v});}}/>
        <ToggleRow label="Proof approved"        value={notifApproved}  onChange={v=>{setNotifApproved(v);saveSettings({notifApproved:v});}}/>
        <ToggleRow label="Friend requests"       value={notifFriends}   onChange={v=>{setNotifFriends(v);saveSettings({notifFriends:v});}}/>
      </Card>
      <SectionTitle label="Privacy"/>
      <Card>
        <ToggleRow label="Public profile"        value={pubProfile}  onChange={v=>{setPubProfile(v);saveSettings({pubProfile:v});}}/>
        <ToggleRow label="Public videos"         value={pubVideos}   onChange={v=>{setPubVideos(v);saveSettings({pubVideos:v});}}/>
        <ToggleRow label="Show on leaderboard"   value={pubLeader}   onChange={v=>{setPubLeader(v);saveSettings({pubLeader:v});}}/>
      </Card>
      <SectionTitle label="Account"/>
      <Card>
        <Row icon="✏️" label="Edit Profile"   onClick={()=>goTo("/edit-profile")}  right="›"/>
        <Row icon="🔒" label="Change Password" onClick={()=>goTo("/change-password")} right="›"/>
        <Row icon="🚪" label="Log Out"         onClick={()=>{ onClose(); navigate("/logout"); }} danger/>
        <Row icon="🗑️" label="Delete Account"  onClick={()=>alert("Contact support to delete your account.")} danger/>
      </Card>
    </Overlay>
  );

  // ── FAQ screen ────────────────────────────────────────────────────────────────
  if(screen==="faq") return (
    <Overlay onBack={()=>setScreen("main")} title="FAQ">
      <Card>
        {FAQS.map((f,i)=>(
          <div key={i} style={{borderBottom:i<FAQS.length-1?`1px solid ${MINT}`:"none"}}>
            <div onClick={()=>setFaqOpen(faqOpen===i?null:i)}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"14px 16px",cursor:"pointer"}}>
              <span style={{fontFamily:T.fontBody,fontSize:"14px",color:CHALKBOARD,fontWeight:"500",flex:1}}>{f.q}</span>
              <span style={{fontSize:"18px",color:MUTED,marginLeft:"8px"}}>{faqOpen===i?"−":"+"}</span>
            </div>
            {faqOpen===i && (
              <div style={{padding:"0 16px 14px",fontFamily:T.fontBody,fontSize:"13px",color:MUTED,lineHeight:"1.6"}}>
                {f.a}
              </div>
            )}
          </div>
        ))}
      </Card>
    </Overlay>
  );

  // ── CONTACT screen ────────────────────────────────────────────────────────────
  if(screen==="contact") return (
    <Overlay onBack={()=>setScreen("main")} title="Contact Us">
      <Card>
        <Row icon="📧" label="Email Support"      sub="support@sweatdebt.app"
          onClick={()=>window.open("mailto:support@sweatdebt.app")} right="›"/>
        <Row icon="🐛" label="Report a Bug"       sub="Help us improve"
          onClick={()=>window.open("mailto:bugs@sweatdebt.app?subject=Bug Report")} right="›"/>
        <Row icon="💡" label="Feature Request"    sub="Got an idea?"
          onClick={()=>window.open("mailto:ideas@sweatdebt.app?subject=Feature Idea")} right="›"/>
        <Row icon="🐦" label="DM us on X/Twitter" sub="@SweatDebtApp"
          onClick={()=>window.open("https://twitter.com/SweatDebtApp")} right="›"/>
      </Card>
      <p style={{fontFamily:T.fontBody,fontSize:"12px",color:MUTED,textAlign:"center",margin:"8px 16px"}}>
        We usually reply within 24 hours 🙌
      </p>
    </Overlay>
  );

  // ── SOCIAL LINKS screen ───────────────────────────────────────────────────────
  if(screen==="social") return (
    <Overlay onBack={()=>setScreen("main")} title="Social Links">
      <Card>
        {SOCIAL_PLATFORMS.map(p=>(
          <div key={p.key} style={{padding:"10px 16px",borderBottom:`1px solid ${MINT}`}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
              <span style={{fontSize:"18px"}}>{p.emoji}</span>
              <span style={{fontFamily:T.fontBody,fontSize:"13px",color:CHALKBOARD,fontWeight:"500"}}>{p.label}</span>
            </div>
            <input
              value={socialDraft[p.key]||""}
              onChange={e=>setSocialDraft(d=>({...d,[p.key]:e.target.value}))}
              placeholder={p.placeholder}
              style={{
                width:"100%",padding:"10px 12px",borderRadius:"10px",
                border:`1px solid ${ACCENT}40`,fontFamily:T.fontBody,fontSize:"14px",
                color:CHALKBOARD,background:MINT,outline:"none",boxSizing:"border-box",
              }}
            />
          </div>
        ))}
      </Card>
      <button onClick={saveSocial} disabled={socialSaving}
        style={{
          width:"100%",padding:"14px",borderRadius:"14px",
          background:CHALKBOARD,border:"none",
          fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.06em",
          color:WHITE,cursor:"pointer",marginBottom:"12px",
        }}>
        {socialSaving?"SAVING…":"SAVE LINKS"}
      </button>
    </Overlay>
  );

  // ── BADGES screen ─────────────────────────────────────────────────────────────
  if(screen==="badges") return (
    <Overlay onBack={()=>setScreen("main")} title="Badges">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",padding:"0 4px"}}>
        {ALL_BADGES.map(b=>{
          const earned = badges.includes(b.id);
          return (
            <div key={b.id} style={{
              background:earned?WHITE:"#f9fafb",borderRadius:"14px",padding:"16px 12px",
              textAlign:"center",border:`1.5px solid ${earned?ACCENT+"50":"#e5e7eb"}`,
              opacity:earned?1:0.55,
            }}>
              <div style={{fontSize:"28px",marginBottom:"6px",filter:earned?"none":"grayscale(1)"}}>{b.emoji}</div>
              <div style={{fontFamily:T.fontBody,fontSize:"13px",color:CHALKBOARD,fontWeight:"600"}}>{b.label}</div>
              <div style={{fontFamily:T.fontBody,fontSize:"11px",color:MUTED,marginTop:"3px"}}>{b.desc}</div>
              {earned && <div style={{marginTop:"6px",fontSize:"10px",color:ACCENT,fontWeight:"700",letterSpacing:"0.08em"}}>EARNED ✓</div>}
            </div>
          );
        })}
      </div>
    </Overlay>
  );

  // ── MY VIDEOS screen ──────────────────────────────────────────────────────────
  if(screen==="videos") return (
    <Overlay onBack={()=>setScreen("main")} title="My Videos">

      {/* full screen video player */}
      {playVideo && (
        <div style={{
          position:"fixed",inset:0,background:"#000",zIndex:9999,
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>
          <button onClick={()=>setPlayVideo(null)} style={{
            position:"absolute",top:"16px",right:"16px",
            background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",
            width:"40px",height:"40px",color:WHITE,fontSize:"20px",cursor:"pointer",zIndex:10000,
          }}>✕</button>
          <video src={playVideo} controls autoPlay style={{maxWidth:"100%",maxHeight:"100%",borderRadius:"8px"}}/>
        </div>
      )}

      {/* edit caption sheet */}
      {editCaption && (
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:8000,
          display:"flex",alignItems:"flex-end",
        }}>
          <div style={{background:WHITE,width:"100%",borderRadius:"20px 20px 0 0",padding:"20px"}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:CHALKBOARD,marginBottom:"12px"}}>Edit Caption</div>
            <textarea
              value={captionDraft}
              onChange={e=>setCaptionDraft(e.target.value)}
              placeholder="Add a caption…"
              rows={3}
              style={{
                width:"100%",padding:"12px",borderRadius:"12px",
                border:`1.5px solid ${ACCENT}50`,fontFamily:T.fontBody,
                fontSize:"14px",color:CHALKBOARD,resize:"none",
                boxSizing:"border-box",outline:"none",
              }}
            />
            <div style={{display:"flex",gap:"10px",marginTop:"12px"}}>
              <button onClick={()=>setEditCaption(null)} style={{
                flex:1,padding:"12px",borderRadius:"12px",
                background:MINT,border:`1px solid ${ACCENT}40`,
                fontFamily:T.fontBody,fontSize:"14px",color:MUTED,cursor:"pointer",
              }}>Cancel</button>
              <button onClick={handleSaveCaption} style={{
                flex:1,padding:"12px",borderRadius:"12px",
                background:CHALKBOARD,border:"none",
                fontFamily:T.fontBody,fontSize:"14px",color:WHITE,cursor:"pointer",fontWeight:"600",
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirm sheet */}
      {deleteConfirm && (
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:8000,
          display:"flex",alignItems:"flex-end",
        }}>
          <div style={{background:WHITE,width:"100%",borderRadius:"20px 20px 0 0",padding:"24px"}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:CHALKBOARD,marginBottom:"8px"}}>Delete Video?</div>
            <p style={{fontFamily:T.fontBody,fontSize:"14px",color:MUTED,marginBottom:"20px"}}>
              This can't be undone. The video will be permanently removed.
            </p>
            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={()=>setDeleteConfirm(null)} style={{
                flex:1,padding:"13px",borderRadius:"12px",
                background:MINT,border:`1px solid ${ACCENT}40`,
                fontFamily:T.fontBody,fontSize:"14px",color:MUTED,cursor:"pointer",
              }}>Cancel</button>
              <button onClick={()=>handleDeleteVideo(deleteConfirm)} style={{
                flex:1,padding:"13px",borderRadius:"12px",
                background:DANGER,border:"none",
                fontFamily:T.fontBody,fontSize:"14px",color:WHITE,cursor:"pointer",fontWeight:"600",
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ⋮ menu sheet */}
      {videoMenu && (
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:7000,
          display:"flex",alignItems:"flex-end",
        }} onClick={()=>setVideoMenu(null)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:WHITE,width:"100%",borderRadius:"20px 20px 0 0",overflow:"hidden",
          }}>
            <div style={{height:"4px",width:"40px",background:"#e5e7eb",borderRadius:"2px",margin:"12px auto"}}/>
            <button onClick={()=>{
              setEditCaption({id:videoMenu.id,text:videoMenu.description||""});
              setCaptionDraft(videoMenu.description||"");
              setVideoMenu(null);
            }} style={menuBtnStyle}>✏️  Edit Caption</button>
            <button onClick={()=>{
              setDeleteConfirm(videoMenu);
              setVideoMenu(null);
            }} style={{...menuBtnStyle,color:DANGER}}>🗑️  Delete Video</button>
            <button onClick={()=>setVideoMenu(null)} style={{...menuBtnStyle,color:MUTED,marginBottom:"8px"}}>Cancel</button>
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div style={{textAlign:"center",padding:"48px 16px",color:MUTED,fontFamily:T.fontBody}}>
          No videos yet. Upload proof of your forfeits to show them here!
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px"}}>
          {videos.map(v=>(
            <div key={v.id} style={{position:"relative",aspectRatio:"9/16",background:"#000",borderRadius:"8px",overflow:"hidden"}}>
              <video
                src={v.videoURL||v.url}
                style={{width:"100%",height:"100%",objectFit:"cover",cursor:"pointer"}}
                onClick={()=>setPlayVideo(v.videoURL||v.url)}
              />
              {/* ⋮ button */}
              <button
                onClick={e=>{e.stopPropagation();setVideoMenu(v);}}
                style={{
                  position:"absolute",top:"4px",right:"4px",
                  background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",
                  width:"28px",height:"28px",color:WHITE,fontSize:"16px",
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                }}>⋮</button>
              {/* caption */}
              {v.description && (
                <div style={{
                  position:"absolute",bottom:0,left:0,right:0,
                  background:"linear-gradient(transparent,rgba(0,0,0,0.7))",
                  padding:"12px 6px 4px",
                  fontFamily:T.fontBody,fontSize:"10px",color:WHITE,
                  lineHeight:"1.3",
                }}>
                  {v.description.length>40?v.description.slice(0,40)+"…":v.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Overlay>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN SCREEN — now a full page, not a bottom sheet
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh", background:MINT,
      paddingBottom:"90px", overflowY:"auto",
    }}>
        {/* ── PROFILE HEADER ── */}
        <div style={{
          background:CHALKBOARD,margin:"0 0 16px",padding:"52px 16px 20px",
          position:"relative",overflow:"hidden",
        }}>
          {/* chalk texture lines */}
          {[20,50,80].map(y=>(
            <div key={y} style={{
              position:"absolute",left:0,right:0,top:`${y}%`,
              height:"1px",background:"rgba(255,255,255,0.04)",
            }}/>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:"14px",position:"relative"}}>
            {/* avatar */}
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{
                width:"68px",height:"68px",borderRadius:"50%",
                border:"3px solid rgba(255,255,255,0.25)",overflow:"hidden",
                background:"#1a3a2e",display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {photo
                  ? <img src={photo} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{fontSize:"28px"}}>🏃</span>
                }
              </div>
              {/* tier badge */}
              <div style={{
                position:"absolute",bottom:"-4px",right:"-4px",
                background:tier.color,borderRadius:"50%",
                width:"22px",height:"22px",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"12px",border:"2px solid "+CHALKBOARD,
              }}>{tier.emoji}</div>
            </div>

            <div style={{flex:1}}>
              <div style={{fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.04em",color:WHITE}}>
                {displayName}
              </div>
              {username && (
                <div style={{fontFamily:T.fontMono||T.fontBody,fontSize:"12px",color:"rgba(255,255,255,0.55)",marginTop:"2px"}}>
                  @{username}
                </div>
              )}
              <div style={{
                display:"inline-flex",alignItems:"center",gap:"5px",
                marginTop:"6px",background:"rgba(255,255,255,0.12)",
                borderRadius:"20px",padding:"3px 10px",
              }}>
                <span style={{fontSize:"12px"}}>{tier.emoji}</span>
                <span style={{fontFamily:T.fontBody,fontSize:"12px",color:WHITE,fontWeight:"600"}}>{tier.label}</span>
                <span style={{fontFamily:T.fontBody,fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>
                  · {profile.honourScore||0} pts
                </span>
              </div>
            </div>
          </div>

          {/* 4-stat row */}
          <div style={{
            display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px",marginTop:"16px",
          }}>
            {[
              {label:"BETS",  value:stats.total},
              {label:"WINS",  value:stats.wins},
              {label:"LOSSES",value:stats.losses},
              {label:"WIN %", value:winRate+"%"},
            ].map(s=>(
              <div key={s.label} style={{
                background:"rgba(255,255,255,0.1)",borderRadius:"10px",
                padding:"8px 4px",textAlign:"center",
              }}>
                <div style={{fontFamily:T.fontDisplay,fontSize:"18px",color:WHITE}}>{s.value}</div>
                <div style={{fontFamily:T.fontBody,fontSize:"9px",color:"rgba(255,255,255,0.5)",letterSpacing:"0.08em"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",margin:"0 16px 12px"}}>
          {[
            {emoji:"👤",label:"View Profile",  action:()=>goTo(`/profile/${user?.uid}`)},
            {emoji:"✏️",label:"Edit Profile",  action:()=>goTo("/edit-profile")},
            {emoji:"⚔️",label:"New Bet",       action:()=>goTo("/create")},
            {emoji:"👥",label:"Group Bets",    action:()=>goTo("/group-bets")},
            {emoji:"📤",label:"Share My Card", action:()=>goTo("/sweat-card")},
            {emoji:"🏆",label:"Leaderboard",   action:()=>goTo("/leaderboard")},
          ].map(a=>(
            <button key={a.label} onClick={a.action} style={{
              background:WHITE,border:`1px solid ${ACCENT}30`,borderRadius:"14px",
              padding:"12px",display:"flex",alignItems:"center",gap:"10px",cursor:"pointer",
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <span style={{fontSize:"18px"}}>{a.emoji}</span>
              <span style={{fontFamily:T.fontBody,fontSize:"13px",color:CHALKBOARD,fontWeight:"500"}}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── SOCIAL LINKS (if set) ── */}
        {Object.values(socialLinks).some(Boolean) && (
          <div style={{margin:"0 16px 12px",display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {SOCIAL_PLATFORMS.filter(p=>socialLinks[p.key]).map(p=>(
              <button key={p.key} onClick={()=>window.open(
                socialLinks[p.key].startsWith("http")?socialLinks[p.key]:"https://"+socialLinks[p.key]
              )} style={{
                background:WHITE,border:`1px solid ${ACCENT}30`,borderRadius:"20px",
                padding:"6px 12px",display:"flex",alignItems:"center",gap:"5px",cursor:"pointer",
              }}>
                <span style={{fontSize:"14px"}}>{p.emoji}</span>
                <span style={{fontFamily:T.fontBody,fontSize:"12px",color:CHALKBOARD}}>{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── MENU SECTIONS ── */}
        <SectionTitle label="My Stuff"/>
        <Card style={{margin:"0 16px 12px"}}>
          <Row icon="🎥" label="My Videos"   sub={`${videos.length} forfeit videos`} onClick={()=>setScreen("videos")}  right="›"/>
          <Row icon="🏅" label="Badges"      sub={`${badges.length} earned`}         onClick={()=>setScreen("badges")}   right="›"/>
          <Row icon="🏆" label="Seasons"     sub="Monthly rankings"                  onClick={()=>goTo("/seasons")}     right="›"/>
          <Row icon="📊" label="Leaderboard" sub="See where you rank"                onClick={()=>goTo("/leaderboard")} right="›"/>
        </Card>

        <SectionTitle label="Account"/>
        <Card style={{margin:"0 16px 12px"}}>
          <Row icon="🔗" label="Social Links"  sub="Instagram, Twitter, LinkedIn…" onClick={()=>setScreen("social")}   right="›"/>
          <Row icon="⚙️" label="Settings"      sub="Notifications & privacy"       onClick={()=>setScreen("settings")} right="›"/>
        </Card>

        <SectionTitle label="Support"/>
        <Card style={{margin:"0 16px 12px"}}>
          <Row icon="❓" label="FAQ"         sub="How does SweatDebt work?"  onClick={()=>setScreen("faq")}     right="›"/>
          <Row icon="📩" label="Contact Us"  sub="Bugs, ideas, feedback"     onClick={()=>setScreen("contact")} right="›"/>
        </Card>

        <SectionTitle label=""/>
        <Card style={{margin:"0 16px 12px"}}>
          <Row icon="🚪" label="Log Out" onClick={()=>navigate("/logout")} danger/>
        </Card>

        <p style={{
          fontFamily:T.fontBody,fontSize:"11px",color:MUTED,
          textAlign:"center",padding:"8px 16px 0",
        }}>
          SweatDebt · v1.0 · Made with 💪
        </p>
    </div>
  );
}

// ─── sub-screen wrapper ────────────────────────────────────────────────────────
function Overlay({ children, title, onBack }){
  return (
    <div style={{
      minHeight:"100vh", background:MINT,
      paddingBottom:"90px",
    }}>
      {/* header */}
      <div style={{
        background:CHALKBOARD,padding:"52px 16px 16px",
        display:"flex",alignItems:"center",gap:"12px",
        position:"sticky",top:0,zIndex:10,
      }}>
        <button onClick={onBack} style={{
          background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",
          width:"36px",height:"36px",color:WHITE,fontSize:"18px",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>‹</button>
        <span style={{fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.04em",color:WHITE}}>
          {title}
        </span>
      </div>
      <div style={{padding:"12px 16px"}}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }){
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"13px 16px",borderBottom:`1px solid ${MINT}`,
    }}>
      <span style={{fontFamily:T.fontBody,fontSize:"14px",color:CHALKBOARD}}>{label}</span>
      <Toggle value={value} onChange={onChange}/>
    </div>
  );
}

const menuBtnStyle = {
  display:"block",width:"100%",padding:"16px",
  background:"none",border:"none",
  fontFamily:"inherit",fontSize:"16px",color:"#111827",
  textAlign:"left",cursor:"pointer",
  borderBottom:`1px solid ${MINT}`,
};