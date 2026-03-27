import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  doc, getDoc, setDoc, onSnapshot,
  updateDoc, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import T from "../theme";

const DAILY_POOL = [
  { exercise:"Pushups",    reps:50,  icon:"💪", color:"#10b981" },
  { exercise:"Burpees",    reps:20,  icon:"🔥", color:"#f59e0b" },
  { exercise:"Squats",     reps:100, icon:"🦵", color:"#8b5cf6" },
  { exercise:"Plank",      reps:60,  icon:"🧘", color:"#3b82f6", unit:"sec" },
  { exercise:"Situps",     reps:50,  icon:"⚡", color:"#ef4444" },
  { exercise:"Lunges",     reps:40,  icon:"🏃", color:"#10b981" },
  { exercise:"JumpJacks",  reps:75,  icon:"🌟", color:"#f59e0b" },
];
const WEEKLY_POOL = [
  { exercise:"Running",  reps:5,   unit:"km",    icon:"🏃", color:"#3b82f6", desc:"5k this week" },
  { exercise:"Pushups",  reps:300, unit:"total",  icon:"💪", color:"#10b981", desc:"300 pushups total" },
  { exercise:"Burpees",  reps:100, unit:"total",  icon:"🔥", color:"#ef4444", desc:"100 burpees challenge" },
  { exercise:"Squats",   reps:500, unit:"total",  icon:"🦵", color:"#8b5cf6", desc:"500 squats this week" },
  { exercise:"Cycling",  reps:20,  unit:"km",    icon:"🚴", color:"#f59e0b", desc:"20km on the bike" },
];
const MONTHLY_POOL = [
  { exercise:"Running",  reps:30,   unit:"km",       icon:"🏃", color:"#3b82f6", desc:"30km this month" },
  { exercise:"Pushups",  reps:1000, unit:"total",     icon:"💪", color:"#10b981", desc:"1000 pushup month" },
  { exercise:"Yoga",     reps:20,   unit:"sessions",  icon:"🧘", color:"#8b5cf6", desc:"20 yoga sessions" },
  { exercise:"Steps",    reps:300,  unit:"k steps",   icon:"👟", color:"#f59e0b", desc:"300k steps month" },
];

const getDOY  = () => Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
const getWOY  = () => Math.floor(getDOY() / 7);
const getMOY  = () => new Date().getMonth();

const countdownMidnight = () => {
  const now = new Date(), mid = new Date(); mid.setHours(24,0,0,0);
  const d = mid - now;
  return `${Math.floor(d/3600000)}h ${Math.floor((d%3600000)/60000)}m ${Math.floor((d%60000)/1000)}s`;
};
const countdownSunday = () => {
  const now = new Date();
  const sun = new Date(now); sun.setDate(now.getDate() + ((7-now.getDay())%7||7)); sun.setHours(0,0,0,0);
  const d = sun - now; return `${Math.floor(d/86400000)}d ${Math.floor((d%86400000)/3600000)}h`;
};
const countdownMonth = () => {
  const now = new Date(), end = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
  return `${Math.floor((end-now)/86400000)} days left`;
};

export default function ChallengesBanner({ user }) {
  const [slides,    setSlides]    = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [joined,    setJoined]    = useState({});
  const [clock,     setClock]     = useState(countdownMidnight());
  const [loading,   setLoading]   = useState(true);
  const autoRef    = useRef(null);
  const startX     = useRef(0);

  useEffect(() => {
    const daily   = DAILY_POOL[getDOY()  % DAILY_POOL.length];
    const weekly  = WEEKLY_POOL[getWOY() % WEEKLY_POOL.length];
    const monthly = MONTHLY_POOL[getMOY()% MONTHLY_POOL.length];
    const today = new Date().toISOString().split("T")[0];
    const wk    = `w${getWOY()}-${new Date().getFullYear()}`;
    const mo    = `m${getMOY()}-${new Date().getFullYear()}`;

    const defs = [
      { id:`daily-${today}`, type:"DAILY",   timeLabel:countdownMidnight(), desc:`Complete ${daily.reps}${daily.unit?" "+daily.unit:""} ${daily.exercise} today`, ...daily },
      { id:`weekly-${wk}`,   type:"WEEKLY",  timeLabel:countdownSunday(),   ...weekly },
      { id:`monthly-${mo}`,  type:"MONTHLY", timeLabel:countdownMonth(),    ...monthly },
    ];

    Promise.all(defs.map(async ch => {
      const ref  = doc(db,"challenges",ch.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) await setDoc(ref,{ ...ch, participants:[], createdAt:serverTimestamp() });
      return { ...ch, ...(snap.exists()?snap.data():{}) };
    })).then(built => { setSlides(built); setLoading(false); }).catch(()=>setLoading(false));
  }, []);

  useEffect(()=>{
    if (!slides.length) return;
    const unsubs = slides.map(s=>onSnapshot(doc(db,"challenges",s.id), snap=>{
      if (!snap.exists()) return;
      setSlides(prev=>prev.map(p=>p.id===s.id?{...p,...snap.data()}:p));
      if ((snap.data().participants||[]).includes(user?.uid))
        setJoined(prev=>({...prev,[s.id]:true}));
    }));
    return ()=>unsubs.forEach(u=>u());
  },[slides.length,user?.uid]);

  useEffect(()=>{ const t=setInterval(()=>setClock(countdownMidnight()),1000); return ()=>clearInterval(t); },[]);

  useEffect(()=>{
    if (!slides.length) return;
    autoRef.current = setInterval(()=>setCurrent(c=>(c+1)%slides.length),4000);
    return ()=>clearInterval(autoRef.current);
  },[slides.length]);

  const goTo = i => {
    setCurrent(i);
    clearInterval(autoRef.current);
    autoRef.current = setInterval(()=>setCurrent(c=>(c+1)%slides.length),4000);
  };

  const handleJoin = async slide => {
    if (!user||joined[slide.id]) return;
    try {
      await updateDoc(doc(db,"challenges",slide.id),{ participants:arrayUnion(user.uid) });
      setJoined(prev=>({...prev,[slide.id]:true}));
    } catch(e){}
  };

  if (loading) return <div style={{margin:"0 16px 16px",height:"140px",background:T.bg1,borderRadius:"16px"}}/>;
  if (!slides.length) return null;

  const slide = slides[current];
  const count = slide.participants?.length||0;
  const isJoined = !!joined[slide.id];
  const typeColor = slide.type==="DAILY"?"#10b981":slide.type==="WEEKLY"?"#3b82f6":"#8b5cf6";

  return (
    <div style={{margin:"0 16px 16px"}}>
      <div
        onTouchStart={e=>{ startX.current=e.touches[0].clientX; }}
        onTouchEnd={e=>{ const dx=e.changedTouches[0].clientX-startX.current; if(dx<-40)goTo((current+1)%slides.length); if(dx>40)goTo((current-1+slides.length)%slides.length); }}
        style={{borderRadius:"20px",overflow:"hidden",border:`1px solid ${T.borderCard}`,background:T.bg1,userSelect:"none"}}
      >
        {/* Top stripe */}
        <div style={{background:typeColor,padding:"6px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",fontWeight:"700",color:slide.type==="DAILY"?"#052e16":"#fff",letterSpacing:"0.1em"}}>
            {slide.type} CHALLENGE
          </span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:slide.type==="DAILY"?"#052e16":"#fff",opacity:0.85}}>
            ⏱ {slide.type==="DAILY"?clock:slide.timeLabel}
          </span>
        </div>

        {/* Body */}
        <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:"14px"}}>
          <div style={{width:"60px",height:"60px",borderRadius:"16px",background:`${typeColor}20`,border:`1px solid ${typeColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",flexShrink:0}}>
            {slide.icon}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:T.panel,letterSpacing:"0.03em",lineHeight:1.1}}>
              {slide.reps}{slide.unit?" "+slide.unit:""} {slide.exercise}
            </div>
            <div style={{fontFamily:T.fontBody,fontSize:"12px",color:T.textMuted,marginTop:"4px"}}>
              {slide.desc||`Complete this ${slide.type.toLowerCase()} challenge`}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"8px"}}>
              {[...Array(Math.min(count,4))].map((_,i)=>(
                <div key={i} style={{width:"20px",height:"20px",borderRadius:"50%",background:typeColor,border:`2px solid ${T.bg1}`,marginLeft:i?"-6px":0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",color:"#052e16",fontWeight:"700"}}>
                  {String.fromCharCode(65+i)}
                </div>
              ))}
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:T.textMuted}}>
                {count>0?`${count} joined`:"Be the first!"}
              </span>
            </div>
          </div>
          <button type="button" onClick={()=>handleJoin(slide)} disabled={isJoined}
            style={{flexShrink:0,padding:"10px 14px",background:isJoined?`${typeColor}20`:typeColor,border:isJoined?`1px solid ${typeColor}`:"none",borderRadius:"12px",fontFamily:T.fontDisplay,fontSize:"14px",letterSpacing:"0.04em",color:isJoined?typeColor:(slide.type==="DAILY"?"#052e16":"#fff"),cursor:isJoined?"default":"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}>
            {isJoined?"✓ JOINED":"JOIN"}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{margin:"0 16px 14px"}}>
          <div style={{height:"4px",background:T.border,borderRadius:"2px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min((count/50)*100,100)}%`,background:typeColor,borderRadius:"2px",transition:"width 0.5s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:T.textMuted}}>{count}/50 goal</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:T.textMuted}}>swipe for more →</span>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{display:"flex",justifyContent:"center",gap:"6px",marginTop:"8px"}}>
        {slides.map((s,i)=>{
          const c = s.type==="DAILY"?"#10b981":s.type==="WEEKLY"?"#3b82f6":"#8b5cf6";
          return <div key={i} onClick={()=>goTo(i)} style={{width:i===current?"24px":"8px",height:"8px",borderRadius:"4px",background:i===current?c:T.border,transition:"all 0.3s",cursor:"pointer"}}/>;
        })}
      </div>
    </div>
  );
}