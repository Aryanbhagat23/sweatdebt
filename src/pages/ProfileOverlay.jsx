import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, updateDoc, collection, query, where,
  getDocs, deleteDoc, onSnapshot,
} from "firebase/firestore";
import T from "../theme";
import InviteFriends from "../components/InviteFriends";

// ── Night Gold palette ─────────────────────────────────────────────────────────
const NAVY    = "#1a1a2e";
const GOLD    = "#f5c518";
const ORANGE  = "#ff6b35";
const SAND    = "#faf8f4";
const SAND2   = "#f2ede4";
const WHITE   = "#ffffff";
const MUTED   = "#9ca3af";
const BORDER  = "#ede9e0";
const DANGER  = "#ef4444";
const SUCCESS = "#10b981";

const TIERS = [
  { label:"Rookie",   min:0,   emoji:"🌱", color:"#9ca3af" },
  { label:"Iron",     min:50,  emoji:"⚙️",  color:"#6b7280" },
  { label:"Bronze",   min:150, emoji:"🥉", color:"#cd7f32" },
  { label:"Silver",   min:300, emoji:"🥈", color:"#9ca3af" },
  { label:"Gold",     min:500, emoji:"🥇", color:GOLD      },
  { label:"Platinum", min:750, emoji:"💎", color:"#38bdf8" },
  { label:"Diamond",  min:1000,emoji:"💠", color:"#818cf8" },
  { label:"Legend",   min:1500,emoji:"👑", color:ORANGE    },
];
function getTier(score=0){ return [...TIERS].reverse().find(t=>score>=t.min)||TIERS[0]; }
function getNext(score=0){ return TIERS.find(t=>t.min>score)||null; }

const FAQS = [
  { q:"What is the Honour Score?",       a:"Your honour score reflects your reliability. You gain points by winning bets and completing forfeits. You lose points for dodging debts or disputing unfairly." },
  { q:"What happens if I dodge a debt?", a:"If you don't upload proof within 24 hours of losing, you automatically lose 15 honour points and get a permanent 'Debt Dodger 💀' badge visible to everyone." },
  { q:"How do Group Bets work?",         a:"Create a group bet, invite friends, set rules (all lose / last loses / vote / elimination). Group bets give 2× honour multiplier." },
  { q:"How do Seasons work?",            a:"Seasons reset monthly. Your honour score is tallied each month. Top finishers earn Champion title, exclusive badges, and bonus honour." },
  { q:"Can I delete a bet?",             a:"You can delete a pending bet before the opponent accepts. Once accepted, the bet is live and cannot be deleted." },
  { q:"Is SweatDebt free?",              a:"Yes, SweatDebt is completely free. No real money is ever involved — only sweat and pride." },
];

const ALL_BADGES = [
  { id:"first_win",    emoji:"⚔️", label:"First Win",   desc:"Win your first bet" },
  { id:"win_streak_3", emoji:"🔥", label:"Hot Streak",  desc:"Win 3 in a row" },
  { id:"win_streak_5", emoji:"💥", label:"On Fire",     desc:"Win 5 in a row" },
  { id:"honour_100",   emoji:"🏅", label:"Century",     desc:"Reach 100 honour" },
  { id:"honour_500",   emoji:"🏆", label:"Legend",      desc:"Reach 500 honour" },
  { id:"forfeit_done", emoji:"💪", label:"Good Sport",  desc:"Complete a forfeit" },
  { id:"group_bet",    emoji:"👥", label:"Team Player", desc:"Join a group bet" },
  { id:"jury_voted",   emoji:"⚖️", label:"Juror",       desc:"Vote as a juror" },
  { id:"season_top3",  emoji:"🥇", label:"Podium",      desc:"Finish top 3 in a season" },
  { id:"debt_dodger",  emoji:"💀", label:"Debt Dodger", desc:"Missed a forfeit deadline" },
];

const SOCIAL_PLATFORMS = [
  { key:"instagram", emoji:"📸", label:"Instagram",   placeholder:"@yourusername" },
  { key:"twitter",   emoji:"🐦", label:"X / Twitter", placeholder:"@yourusername" },
  { key:"linkedin",  emoji:"💼", label:"LinkedIn",    placeholder:"linkedin.com/in/yourname" },
  { key:"youtube",   emoji:"▶️", label:"YouTube",     placeholder:"@yourchannel" },
  { key:"tiktok",    emoji:"🎵", label:"TikTok",      placeholder:"@yourusername" },
];

// ── UI helpers ─────────────────────────────────────────────────────────────────
function NightRow({ icon, label, sub, right, onClick, danger }){
  return (
    <div onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:"12px",
      padding:"13px 16px", cursor:onClick?"pointer":"default",
      borderBottom:`1px solid ${BORDER}`,
    }}>
      <div style={{width:"34px",height:"34px",borderRadius:"10px",background:SAND2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>
        {icon}
      </div>
      <div style={{flex:1}}>
        <div style={{fontFamily:T.fontBody,fontSize:"14px",color:danger?DANGER:NAVY,fontWeight:"600"}}>{label}</div>
        {sub && <div style={{fontFamily:T.fontBody,fontSize:"11px",color:MUTED,marginTop:"1px"}}>{sub}</div>}
      </div>
      {right && <div style={{color:MUTED,fontSize:"14px"}}>{right}</div>}
    </div>
  );
}

function NightCard({ children, style={} }){
  return (
    <div style={{background:WHITE,borderRadius:"16px",overflow:"hidden",marginBottom:"10px",border:`1px solid ${BORDER}`,...style}}>
      {children}
    </div>
  );
}

function SectionLabel({ label }){
  return (
    <div style={{fontFamily:"monospace",fontSize:"10px",letterSpacing:"0.1em",color:MUTED,padding:"14px 16px 6px",textTransform:"uppercase",fontWeight:"700"}}>
      {label}
    </div>
  );
}

function Toggle({ value, onChange }){
  return (
    <div onClick={()=>onChange(!value)} style={{width:"44px",height:"24px",borderRadius:"12px",cursor:"pointer",background:value?SUCCESS:"#d1d5db",transition:"background 0.2s",position:"relative",flexShrink:0}}>
      <div style={{position:"absolute",top:"3px",left:value?"23px":"3px",width:"18px",height:"18px",borderRadius:"50%",background:WHITE,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </div>
  );
}

function ToggleRow({ label, value, onChange }){
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderBottom:`1px solid ${BORDER}`}}>
      <span style={{fontFamily:T.fontBody,fontSize:"14px",color:NAVY}}>{label}</span>
      <Toggle value={value} onChange={onChange}/>
    </div>
  );
}

const menuBtnStyle = {
  display:"block",width:"100%",padding:"16px",background:"none",border:"none",
  fontFamily:"inherit",fontSize:"16px",color:NAVY,textAlign:"left",cursor:"pointer",
  borderBottom:`1px solid ${BORDER}`,
};

function Overlay({ children, title, onBack }){
  return (
    <div style={{minHeight:"100vh",background:NAVY}}>
      <div style={{minHeight:"100vh",background:SAND,paddingBottom:"90px"}}>
        <div style={{background:NAVY,paddingTop:"max(env(safe-area-inset-top, 0px), 48px)",paddingBottom:"16px",paddingLeft:"16px",paddingRight:"16px",display:"flex",alignItems:"center",gap:"12px",position:"sticky",top:0,zIndex:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"50%",width:"36px",height:"36px",color:WHITE,fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <span style={{fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.04em",color:WHITE,fontStyle:"italic"}}>{title}</span>
        </div>
        <div style={{padding:"12px 16px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProfileOverlay({ user }){
  const navigate = useNavigate();

  const [profile,       setProfile]       = useState({});
  const [stats,         setStats]         = useState({ total:0, wins:0, losses:0 });
  const [badges,        setBadges]        = useState([]);
  const [videos,        setVideos]        = useState([]);
  const [socialLinks,   setSocialLinks]   = useState({});
  const [notifBets,     setNotifBets]     = useState(true);
  const [notifApproved, setNotifApproved] = useState(true);
  const [notifFriends,  setNotifFriends]  = useState(true);
  const [pubProfile,    setPubProfile]    = useState(true);
  const [pubVideos,     setPubVideos]     = useState(true);
  const [pubLeader,     setPubLeader]     = useState(true);
  const [screen,        setScreen]        = useState("main");
  const [faqOpen,       setFaqOpen]       = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [videoMenu,     setVideoMenu]     = useState(null);
  const [editCaption,   setEditCaption]   = useState(null);
  const [captionDraft,  setCaptionDraft]  = useState("");
  const [playVideo,     setPlayVideo]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [socialDraft,   setSocialDraft]   = useState({});
  const [socialSaving,  setSocialSaving]  = useState(false);

  useEffect(()=>{
    if(!user) return;
    const unsub = onSnapshot(doc(db,"users",user.uid), snap=>{
      if(snap.exists()){
        const d = snap.data();
        setProfile(d);
        setSocialLinks(d.socialLinks||{});
        setSocialDraft(d.socialLinks||{});
        setNotifBets(d.settings?.notifBets !== false);
        setNotifApproved(d.settings?.notifApproved !== false);
        setNotifFriends(d.settings?.notifFriends !== false);
        setPubProfile(d.settings?.pubProfile !== false);
        setPubVideos(d.settings?.pubVideos !== false);
        setPubLeader(d.settings?.pubLeader !== false);
        setBadges(d.badges||[]);
        setReferralCount(d.referralCount||0);
      }
    });
    return ()=>unsub();
  },[user]);

  useEffect(()=>{
    if(!user) return;
    const q = query(collection(db,"bets"), where("participants","array-contains",user.uid));
    getDocs(q).then(snap=>{
      let wins=0, losses=0;
      snap.forEach(d=>{
        const b=d.data();
        if(b.status==="completed"||b.status==="approved"){
          if(b.winner===user.uid) wins++; else losses++;
        }
      });
      setStats({ total:wins+losses, wins, losses });
    });
  },[user]);

  useEffect(()=>{
    if(!user) return;
    const q = query(collection(db,"videos"),where("uploadedBy","==",user.uid));
    const unsub = onSnapshot(q, snap=>{
      setVideos(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
    });
    return ()=>unsub();
  },[user]);

  if(!user) return null;

  const honour      = profile.honourScore||0;
  const tier        = getTier(honour);
  const nextTier    = getNext(honour);
  const winRate     = stats.total>0 ? Math.round((stats.wins/stats.total)*100) : 0;
  const displayName = profile.displayName||user?.displayName||"Athlete";
  const username    = profile.username||"";
  const photo       = profile.photoURL||user?.photoURL||null;
  const firstName   = displayName.split(" ")[0];
  const fromMin     = tier.min;
  const toMin       = nextTier?.min || (tier.min + 500);
  const progress    = Math.min(((honour - fromMin)/(toMin - fromMin))*100, 100);
  const ptsLeft     = nextTier ? nextTier.min - honour : 0;

  async function saveSettings(patch){
    try{ await updateDoc(doc(db,"users",user.uid),{ settings:{ notifBets, notifApproved, notifFriends, pubProfile, pubVideos, pubLeader, ...patch }}); }
    catch(e){ console.error(e); }
  }
  async function saveSocial(){
    setSocialSaving(true);
    try{ await updateDoc(doc(db,"users",user.uid),{ socialLinks: socialDraft }); setSocialLinks(socialDraft); }
    catch(e){ console.error(e); }
    setSocialSaving(false); setScreen("main");
  }
  async function handleDeleteVideo(video){
    try{ await deleteDoc(doc(db,"videos",video.id)); } catch(e){ alert("Could not delete video."); }
    setDeleteConfirm(null); setVideoMenu(null);
  }
  async function handleSaveCaption(){
    if(!editCaption) return;
    try{ await updateDoc(doc(db,"videos",editCaption.id),{ description: captionDraft.trim() }); } catch(e){}
    setEditCaption(null);
  }
  function goTo(path){ navigate(path); }

  // ── SETTINGS ──────────────────────────────────────────────────────────────────
  if(screen==="settings") return (
    <Overlay onBack={()=>setScreen("main")} title="Settings">
      <SectionLabel label="Notifications"/>
      <NightCard>
        <ToggleRow label="Bet updates"         value={notifBets}     onChange={v=>{setNotifBets(v);saveSettings({notifBets:v});}}/>
        <ToggleRow label="Proof approved"      value={notifApproved} onChange={v=>{setNotifApproved(v);saveSettings({notifApproved:v});}}/>
        <ToggleRow label="Friend requests"     value={notifFriends}  onChange={v=>{setNotifFriends(v);saveSettings({notifFriends:v});}}/>
      </NightCard>
      <SectionLabel label="Privacy"/>
      <NightCard>
        <ToggleRow label="Public profile"      value={pubProfile} onChange={v=>{setPubProfile(v);saveSettings({pubProfile:v});}}/>
        <ToggleRow label="Public videos"       value={pubVideos}  onChange={v=>{setPubVideos(v);saveSettings({pubVideos:v});}}/>
        <ToggleRow label="Show on leaderboard" value={pubLeader}  onChange={v=>{setPubLeader(v);saveSettings({pubLeader:v});}}/>
      </NightCard>
      <SectionLabel label="Account"/>
      <NightCard>
        <NightRow icon="✏️" label="Edit Profile"    onClick={()=>goTo("/edit-profile")}    right="›"/>
        <NightRow icon="🔒" label="Change Password" onClick={()=>goTo("/change-password")} right="›"/>
        <NightRow icon="🚪" label="Log Out"         onClick={()=>navigate("/logout")}      danger/>
        <NightRow icon="🗑️" label="Delete Account"  onClick={()=>alert("Contact support to delete your account.")} danger/>
      </NightCard>
    </Overlay>
  );

  if(screen==="faq") return (
    <Overlay onBack={()=>setScreen("main")} title="FAQ">
      <NightCard>
        {FAQS.map((f,i)=>(
          <div key={i} style={{borderBottom:i<FAQS.length-1?`1px solid ${BORDER}`:"none"}}>
            <div onClick={()=>setFaqOpen(faqOpen===i?null:i)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",cursor:"pointer"}}>
              <span style={{fontFamily:T.fontBody,fontSize:"14px",color:NAVY,fontWeight:"600",flex:1}}>{f.q}</span>
              <span style={{fontSize:"18px",color:MUTED,marginLeft:"8px"}}>{faqOpen===i?"−":"+"}</span>
            </div>
            {faqOpen===i && <div style={{padding:"0 16px 14px",fontFamily:T.fontBody,fontSize:"13px",color:MUTED,lineHeight:"1.6"}}>{f.a}</div>}
          </div>
        ))}
      </NightCard>
    </Overlay>
  );

  if(screen==="contact") return (
    <Overlay onBack={()=>setScreen("main")} title="Contact Us">
      <NightCard>
        <NightRow icon="📧" label="Email Support"      sub="support@sweatdebt.app"  onClick={()=>window.open("mailto:support@sweatdebt.app")} right="›"/>
        <NightRow icon="🐛" label="Report a Bug"       sub="Help us improve"        onClick={()=>window.open("mailto:bugs@sweatdebt.app?subject=Bug Report")} right="›"/>
        <NightRow icon="💡" label="Feature Request"    sub="Got an idea?"           onClick={()=>window.open("mailto:ideas@sweatdebt.app?subject=Feature Idea")} right="›"/>
        <NightRow icon="🐦" label="DM us on X/Twitter" sub="@SweatDebtApp"          onClick={()=>window.open("https://twitter.com/SweatDebtApp")} right="›"/>
      </NightCard>
      <p style={{fontFamily:T.fontBody,fontSize:"12px",color:MUTED,textAlign:"center",margin:"8px 16px"}}>We usually reply within 24 hours 🙌</p>
    </Overlay>
  );

  if(screen==="social") return (
    <Overlay onBack={()=>setScreen("main")} title="Social Links">
      <NightCard>
        {SOCIAL_PLATFORMS.map(p=>(
          <div key={p.key} style={{padding:"10px 16px",borderBottom:`1px solid ${BORDER}`}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
              <span style={{fontSize:"18px"}}>{p.emoji}</span>
              <span style={{fontFamily:T.fontBody,fontSize:"13px",color:NAVY,fontWeight:"600"}}>{p.label}</span>
            </div>
            <input value={socialDraft[p.key]||""} onChange={e=>setSocialDraft(d=>({...d,[p.key]:e.target.value}))} placeholder={p.placeholder}
              style={{width:"100%",padding:"10px 12px",borderRadius:"10px",border:`1px solid ${BORDER}`,fontFamily:T.fontBody,fontSize:"14px",color:NAVY,background:SAND,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
      </NightCard>
      <button onClick={saveSocial} disabled={socialSaving} style={{width:"100%",padding:"14px",borderRadius:"14px",background:NAVY,border:"none",fontFamily:T.fontDisplay,fontSize:"18px",letterSpacing:"0.06em",color:GOLD,cursor:"pointer",marginBottom:"12px"}}>
        {socialSaving?"SAVING…":"SAVE LINKS"}
      </button>
    </Overlay>
  );

  if(screen==="badges") return (
    <Overlay onBack={()=>setScreen("main")} title="Badges">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",padding:"0 4px"}}>
        {ALL_BADGES.map(b=>{
          const earned = badges.includes(b.id);
          return (
            <div key={b.id} style={{background:earned?WHITE:SAND,borderRadius:"14px",padding:"16px 12px",textAlign:"center",border:`1.5px solid ${earned?GOLD+"60":BORDER}`,opacity:earned?1:0.5}}>
              <div style={{fontSize:"28px",marginBottom:"6px",filter:earned?"none":"grayscale(1)"}}>{b.emoji}</div>
              <div style={{fontFamily:T.fontBody,fontSize:"13px",color:NAVY,fontWeight:"700"}}>{b.label}</div>
              <div style={{fontFamily:T.fontBody,fontSize:"11px",color:MUTED,marginTop:"3px"}}>{b.desc}</div>
              {earned && <div style={{marginTop:"6px",fontSize:"10px",color:GOLD,fontWeight:"700",letterSpacing:"0.08em"}}>EARNED ✓</div>}
            </div>
          );
        })}
      </div>
    </Overlay>
  );

  if(screen==="videos") return (
    <Overlay onBack={()=>setScreen("main")} title="My Videos">
      {playVideo && (
        <div style={{position:"fixed",inset:0,background:"#000",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <button onClick={()=>setPlayVideo(null)} style={{position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:"40px",height:"40px",color:WHITE,fontSize:"20px",cursor:"pointer",zIndex:10000}}>✕</button>
          <video src={playVideo} controls autoPlay style={{maxWidth:"100%",maxHeight:"100%",borderRadius:"8px"}}/>
        </div>
      )}
      {editCaption && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:8000,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:WHITE,width:"100%",borderRadius:"20px 20px 0 0",padding:"20px"}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:NAVY,marginBottom:"12px"}}>Edit Caption</div>
            <textarea value={captionDraft} onChange={e=>setCaptionDraft(e.target.value)} placeholder="Add a caption…" rows={3}
              style={{width:"100%",padding:"12px",borderRadius:"12px",border:`1.5px solid ${BORDER}`,fontFamily:T.fontBody,fontSize:"14px",color:NAVY,resize:"none",boxSizing:"border-box",outline:"none"}}/>
            <div style={{display:"flex",gap:"10px",marginTop:"12px"}}>
              <button onClick={()=>setEditCaption(null)} style={{flex:1,padding:"12px",borderRadius:"12px",background:SAND,border:`1px solid ${BORDER}`,fontFamily:T.fontBody,fontSize:"14px",color:MUTED,cursor:"pointer"}}>Cancel</button>
              <button onClick={handleSaveCaption} style={{flex:1,padding:"12px",borderRadius:"12px",background:NAVY,border:"none",fontFamily:T.fontBody,fontSize:"14px",color:GOLD,cursor:"pointer",fontWeight:"700"}}>Save</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:8000,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:WHITE,width:"100%",borderRadius:"20px 20px 0 0",padding:"24px"}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:NAVY,marginBottom:"8px"}}>Delete Video?</div>
            <p style={{fontFamily:T.fontBody,fontSize:"14px",color:MUTED,marginBottom:"20px"}}>This can't be undone.</p>
            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={()=>setDeleteConfirm(null)} style={{flex:1,padding:"13px",borderRadius:"12px",background:SAND,border:`1px solid ${BORDER}`,fontFamily:T.fontBody,fontSize:"14px",color:MUTED,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>handleDeleteVideo(deleteConfirm)} style={{flex:1,padding:"13px",borderRadius:"12px",background:DANGER,border:"none",fontFamily:T.fontBody,fontSize:"14px",color:WHITE,cursor:"pointer",fontWeight:"700"}}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {videoMenu && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:7000,display:"flex",alignItems:"flex-end"}} onClick={()=>setVideoMenu(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:WHITE,width:"100%",borderRadius:"20px 20px 0 0",overflow:"hidden"}}>
            <div style={{height:"4px",width:"40px",background:"#e5e7eb",borderRadius:"2px",margin:"12px auto"}}/>
            <button onClick={()=>{setEditCaption({id:videoMenu.id});setCaptionDraft(videoMenu.description||"");setVideoMenu(null);}} style={menuBtnStyle}>✏️  Edit Caption</button>
            <button onClick={()=>{setDeleteConfirm(videoMenu);setVideoMenu(null);}} style={{...menuBtnStyle,color:DANGER}}>🗑️  Delete Video</button>
            <button onClick={()=>setVideoMenu(null)} style={{...menuBtnStyle,color:MUTED,marginBottom:"8px"}}>Cancel</button>
          </div>
        </div>
      )}
      {videos.length === 0 ? (
        <div style={{textAlign:"center",padding:"48px 16px",color:MUTED,fontFamily:T.fontBody}}>No videos yet. Upload proof of your forfeits to show them here!</div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px"}}>
          {videos.map(v=>(
            <div key={v.id} style={{position:"relative",aspectRatio:"9/16",background:"#000",borderRadius:"8px",overflow:"hidden"}}>
              <video src={v.videoURL||v.url} style={{width:"100%",height:"100%",objectFit:"cover",cursor:"pointer"}} onClick={()=>setPlayVideo(v.videoURL||v.url)}/>
              <button onClick={e=>{e.stopPropagation();setVideoMenu(v);}} style={{position:"absolute",top:"4px",right:"4px",background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:"28px",height:"28px",color:WHITE,fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>⋮</button>
              {v.description && (
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.7))",padding:"12px 6px 4px",fontFamily:T.fontBody,fontSize:"10px",color:WHITE,lineHeight:"1.3"}}>
                  {v.description.length>40?v.description.slice(0,40)+"…":v.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Overlay>
  );

  // ── MAIN SCREEN — Night Gold ───────────────────────────────────────────────────
  return (
    <div style={{background:NAVY, minHeight:"100vh"}}>
      <div style={{minHeight:"100vh", background:SAND, paddingBottom:"90px", overflowY:"auto"}}>

        {/* ── HERO HEADER ── */}
        <div style={{background:NAVY, paddingTop:"max(env(safe-area-inset-top, 0px), 48px)", paddingBottom:"0", position:"relative", overflow:"hidden"}}>

          {/* Geometric ring decoration */}
          <div style={{position:"absolute",top:"-20px",right:"-20px",width:"130px",height:"130px",opacity:0.07,pointerEvents:"none"}}>
            <svg viewBox="0 0 130 130" fill="none" width="130" height="130">
              <circle cx="130" cy="0" r="55"  stroke="white" strokeWidth="1"/>
              <circle cx="130" cy="0" r="75"  stroke="white" strokeWidth="1"/>
              <circle cx="130" cy="0" r="95"  stroke="white" strokeWidth="1"/>
              <circle cx="130" cy="0" r="115" stroke="white" strokeWidth="1"/>
            </svg>
          </div>

          {/* Profile row */}
          <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"0 16px 16px",position:"relative"}}>
            {/* Rounded-square avatar with gold-orange gradient */}
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:"70px",height:"70px",borderRadius:"20px",background:`linear-gradient(135deg, ${GOLD}, ${ORANGE})`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:"3px solid rgba(255,255,255,0.12)"}}>
                {photo
                  ? <img src={photo} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{fontSize:"28px",fontWeight:"700",color:NAVY,fontFamily:T.fontDisplay}}>{displayName.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div style={{position:"absolute",bottom:"-4px",right:"-4px",background:tier.color,borderRadius:"8px",width:"22px",height:"22px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",border:`2px solid ${NAVY}`}}>
                {tier.emoji}
              </div>
            </div>

            {/* Name + pills */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.02em",color:WHITE,fontStyle:"italic"}}>
                {firstName}
              </div>
              {username && <div style={{fontFamily:"monospace",fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"1px"}}>@{username}</div>}
              <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginTop:"6px"}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(245,197,24,0.15)",border:"1px solid rgba(245,197,24,0.3)",borderRadius:"20px",padding:"2px 9px",fontSize:"10px",color:GOLD,fontWeight:"700",fontFamily:"monospace"}}>
                  {tier.emoji} {tier.label.toUpperCase()}
                </div>
                {stats.wins > 0 && (
                  <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(255,107,53,0.15)",border:"1px solid rgba(255,107,53,0.3)",borderRadius:"20px",padding:"2px 9px",fontSize:"10px",color:ORANGE,fontWeight:"700",fontFamily:"monospace"}}>
                    🔥 {stats.wins}W
                  </div>
                )}
              </div>
            </div>

            {/* Edit button */}
            <button onClick={()=>goTo("/edit-profile")} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"10px",padding:"7px 12px",fontFamily:"monospace",fontSize:"11px",color:"rgba(255,255,255,0.6)",cursor:"pointer",flexShrink:0}}>
              Edit ✏️
            </button>
          </div>

          {/* 4-stat row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            {[
              {label:"BETS",  value:stats.total, color:WHITE},
              {label:"WINS",  value:stats.wins,  color:GOLD},
              {label:"LOSSES",value:stats.losses,color:ORANGE},
              {label:"WIN %", value:winRate+"%", color:WHITE},
            ].map((s,i)=>(
              <div key={s.label} style={{padding:"10px 4px",textAlign:"center",borderRight:i<3?"1px solid rgba(255,255,255,0.06)":"none",background:"rgba(255,255,255,0.02)"}}>
                <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:s.color,fontStyle:"italic"}}>{s.value}</div>
                <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.35)",letterSpacing:"0.1em",marginTop:"2px"}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Honour bar strip */}
          <div style={{padding:"10px 16px",background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",flexShrink:0}}>HONOUR</span>
            <div style={{flex:1,height:"5px",background:"rgba(255,255,255,0.1)",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress}%`,background:GOLD,borderRadius:"3px",transition:"width 0.8s"}}/>
            </div>
            <span style={{fontFamily:"monospace",fontSize:"10px",color:GOLD,fontWeight:"700",flexShrink:0}}>{honour}</span>
            {nextTier && <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.35)",flexShrink:0}}>{ptsLeft} to {nextTier.emoji}</span>}
          </div>
        </div>

        {/* ── SOCIAL LINKS (if set) ── */}
        {Object.values(socialLinks).some(Boolean) && (
          <div style={{margin:"12px 16px 0",display:"flex",gap:"7px",flexWrap:"wrap"}}>
            {SOCIAL_PLATFORMS.filter(p=>socialLinks[p.key]).map(p=>(
              <button key={p.key} onClick={()=>window.open(socialLinks[p.key].startsWith("http")?socialLinks[p.key]:"https://"+socialLinks[p.key])}
                style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"20px",padding:"5px 12px",display:"flex",alignItems:"center",gap:"5px",cursor:"pointer"}}>
                <span style={{fontSize:"13px"}}>{p.emoji}</span>
                <span style={{fontFamily:T.fontBody,fontSize:"11px",color:NAVY,fontWeight:"600"}}>{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── PRIMARY CTA: New Bet ── */}
        <div style={{margin:"14px 16px 0"}}>
          <button onClick={()=>goTo("/create")} style={{width:"100%",padding:"16px",background:NAVY,border:"none",borderRadius:"16px",display:"flex",alignItems:"center",gap:"12px",cursor:"pointer"}}>
            <div style={{width:"42px",height:"42px",borderRadius:"12px",background:"rgba(245,197,24,0.15)",border:"1px solid rgba(245,197,24,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>⚔️</div>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontFamily:T.fontDisplay,fontSize:"17px",color:WHITE,letterSpacing:"0.03em",fontStyle:"italic"}}>New Bet</div>
              <div style={{fontFamily:T.fontBody,fontSize:"11px",color:"rgba(255,255,255,0.45)",marginTop:"1px"}}>Challenge a friend now</div>
            </div>
            <div style={{fontFamily:"monospace",fontSize:"16px",color:GOLD}}>›</div>
          </button>
        </div>

        {/* ── 2×2 QUICK GRID ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",margin:"8px 16px 0"}}>
          {[
            {emoji:"👤", label:"View Profile", bg:"#f0f4ff", action:()=>goTo(`/profile/${user?.uid}`)},
            {emoji:"🎥", label:"My Videos",    bg:"#fff0f6", action:()=>setScreen("videos")},
            {emoji:"🃏", label:"Share Card",   bg:"#fff8e1", action:()=>goTo("/sweat-card")},
            {emoji:"👥", label:"Group Bets",   bg:"#f0fff4", action:()=>goTo("/group-bets")},
          ].map(a=>(
            <button key={a.label} onClick={a.action} style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"14px",padding:"14px 12px",display:"flex",alignItems:"center",gap:"10px",cursor:"pointer"}}>
              <div style={{width:"34px",height:"34px",borderRadius:"10px",background:a.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>{a.emoji}</div>
              <span style={{fontFamily:T.fontBody,fontSize:"13px",color:NAVY,fontWeight:"600"}}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── INVITE FRIENDS ── */}
        <div style={{margin:"10px 16px 0"}}>
          <InviteFriends user={user} referralCount={referralCount}/>
        </div>

        {/* ── MY STUFF ── */}
        <SectionLabel label="My Stuff"/>
        <NightCard style={{margin:"0 16px 10px"}}>
          <NightRow icon="🏅" label="Badges"      sub={`${badges.length} earned`} onClick={()=>setScreen("badges")}   right="›"/>
          <NightRow icon="🏆" label="Seasons"     sub="Monthly rankings"          onClick={()=>goTo("/seasons")}     right="›"/>
          <NightRow icon="📊" label="Leaderboard" sub="See where you rank"        onClick={()=>goTo("/leaderboard")} right="›"/>
        </NightCard>

        {/* ── ACCOUNT ── */}
        <SectionLabel label="Account"/>
        <NightCard style={{margin:"0 16px 10px"}}>
          <NightRow icon="🔗" label="Social Links" sub="Instagram, Twitter…"    onClick={()=>setScreen("social")}   right="›"/>
          <NightRow icon="⚙️" label="Settings"     sub="Notifications & privacy" onClick={()=>setScreen("settings")} right="›"/>
        </NightCard>

        {/* ── SUPPORT ── */}
        <SectionLabel label="Support"/>
        <NightCard style={{margin:"0 16px 10px"}}>
          <NightRow icon="❓" label="FAQ"        sub="How does SweatDebt work?" onClick={()=>setScreen("faq")}     right="›"/>
          <NightRow icon="📩" label="Contact Us" sub="Bugs, ideas, feedback"    onClick={()=>setScreen("contact")} right="›"/>
        </NightCard>

        <NightCard style={{margin:"0 16px 10px"}}>
          <NightRow icon="🚪" label="Log Out" onClick={()=>navigate("/logout")} danger/>
        </NightCard>

        <p style={{fontFamily:"monospace",fontSize:"10px",color:MUTED,textAlign:"center",padding:"8px 16px 0",letterSpacing:"0.06em"}}>
          SWEATDEBT · v1.0 · MADE WITH 💪
        </p>
      </div>
    </div>
  );
}