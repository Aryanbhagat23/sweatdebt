// src/components/DailyChallenge.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, increment, arrayUnion,
} from "firebase/firestore";
import T from "../theme";

const POOL = [
  { exercise:"Push-ups",        reps:50,  icon:"💪", difficulty:"Medium" },
  { exercise:"Burpees",         reps:20,  icon:"🔥", difficulty:"Hard"   },
  { exercise:"Squats",          reps:100, icon:"🦵", difficulty:"Medium" },
  { exercise:"Plank",           reps:2,   icon:"⏱",  difficulty:"Easy",  unit:"min" },
  { exercise:"Jumping Jacks",   reps:100, icon:"⚡", difficulty:"Easy"   },
  { exercise:"Mountain Climbers",reps:60, icon:"🏔", difficulty:"Hard"   },
  { exercise:"Sit-ups",         reps:75,  icon:"🎯", difficulty:"Medium" },
  { exercise:"Lunges",          reps:50,  icon:"🚶", difficulty:"Easy"   },
  { exercise:"Pull-ups",        reps:15,  icon:"🏋️", difficulty:"Hard"   },
  { exercise:"Box Jumps",       reps:30,  icon:"📦", difficulty:"Hard"   },
];

const DC = { Easy:T.green, Medium:T.yellow, Hard:T.red };

function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function midnight(){
  const n=new Date(), m=new Date(n);
  m.setHours(24,0,0,0);
  return m-n;
}
function useMidnight(){
  const [ms,setMs] = useState(midnight);
  useEffect(()=>{ const t=setInterval(()=>setMs(midnight()),1000); return()=>clearInterval(t); },[]);
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export default function DailyChallenge({ user }) {
  const navigate  = useNavigate();
  const [ch,       setCh]      = useState(null);
  const [joined,   setJoined]  = useState(false);
  const [completed,setCompleted]=useState(false);
  const [joining,  setJoining] = useState(false);
  const [expanded, setExpanded]= useState(false);
  const countdown = useMidnight();
  const key = todayKey();

  useEffect(()=>{
    if(!user) return;
    const load = async () => {
      const ref  = doc(db,"daily_challenges",key);
      const snap = await getDoc(ref);
      if(!snap.exists()){
        const day    = Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/86400000);
        const picked = POOL[day%POOL.length];
        await setDoc(ref,{
          ...picked, date:key, createdAt:serverTimestamp(),
          participantIds:[], completedIds:[], totalJoined:0, totalCompleted:0,
        });
      }
    };
    load();
    const u = onSnapshot(doc(db,"daily_challenges",key), snap=>{
      if(!snap.exists()) return;
      const d = snap.data();
      setCh({id:snap.id,...d});
      setJoined(d.participantIds?.includes(user.uid)||false);
      setCompleted(d.completedIds?.includes(user.uid)||false);
    });
    return ()=>u();
  },[user,key]);

  const join = async () => {
    if(!user||joining||joined) return;
    setJoining(true);
    try{
      await updateDoc(doc(db,"daily_challenges",key),{
        participantIds:arrayUnion(user.uid),
        totalJoined:increment(1),
      });
    }catch(e){ console.error(e); }
    setJoining(false);
  };

  const markDone = async () => {
    if(!user||!joined||completed) return;
    try{
      await updateDoc(doc(db,"daily_challenges",key),{
        completedIds:arrayUnion(user.uid),
        totalCompleted:increment(1),
      });
      await updateDoc(doc(db,"users",user.uid),{
        honour:increment(2),
        dailyChallengesCompleted:increment(1),
      }).catch(()=>{});
    }catch(e){ console.error(e); }
  };

  // ✅ Post proof — navigate to feed upload with daily challenge context
  const postProof = () => {
    if(!ch) return;
    // Navigate to feed or a general upload page tagged as daily challenge
    navigate(`/upload-proof?type=daily&challenge=${encodeURIComponent(ch.exercise)}&reps=${ch.reps}`);
  };

  if(!ch) return null;
  const pct = ch.totalJoined>0 ? Math.round((ch.totalCompleted/ch.totalJoined)*100) : 0;

  return (
    <div style={{
      margin:"0 16px 16px",
      background:T.bg1,
      border:`1px solid ${completed?"rgba(16,185,129,0.4)":joined?T.accentBorder:T.borderCard}`,
      borderRadius:T.r20, overflow:"hidden", boxShadow:T.shadowCard,
    }}>
      {/* ── header row ── */}
      <div style={{padding:"16px",cursor:"pointer"}} onClick={()=>setExpanded(p=>!p)}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{
            width:"52px",height:"52px",borderRadius:T.r16,
            background:completed?T.greenLight:T.accentLight,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"26px",flexShrink:0,
            border:`1px solid ${completed?T.greenBorder:T.accentBorder}`,
          }}>{ch.icon}</div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <div style={{background:T.panel,borderRadius:T.rFull,padding:"2px 8px",fontFamily:T.fontMono,fontSize:"9px",fontWeight:"700",color:T.accent,letterSpacing:"0.08em"}}>DAILY CHALLENGE</div>
              <div style={{fontFamily:T.fontMono,fontSize:"10px",color:T.textMuted}}>Resets {countdown}</div>
            </div>
            <div style={{fontFamily:T.fontDisplay,fontSize:"20px",color:T.panel,letterSpacing:"0.02em",lineHeight:1,fontStyle:"italic"}}>
              {ch.reps} {ch.unit||"x"} {ch.exercise}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"4px"}}>
              <span style={{fontFamily:T.fontMono,fontSize:"10px",color:DC[ch.difficulty]||T.textMuted}}>● {ch.difficulty}</span>
              <span style={{fontFamily:T.fontMono,fontSize:"10px",color:T.textMuted}}>{ch.totalJoined||0} joined · {ch.totalCompleted||0} done</span>
            </div>
          </div>

          {completed
            ? <div style={{background:T.greenLight,border:`1px solid ${T.greenBorder}`,borderRadius:T.rFull,padding:"6px 12px",fontFamily:T.fontDisplay,fontSize:"14px",color:T.green,letterSpacing:"0.04em"}}>✓ DONE</div>
            : joined
              ? <div style={{background:T.accentLight,border:`1px solid ${T.accentBorder}`,borderRadius:T.rFull,padding:"6px 12px",fontFamily:T.fontDisplay,fontSize:"14px",color:T.accent,letterSpacing:"0.04em"}}>JOINED</div>
              : <div style={{fontFamily:T.fontMono,fontSize:"18px",color:T.textMuted}}>▾</div>
          }
        </div>

        {ch.totalJoined>0 && (
          <div style={{marginTop:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
              <span style={{fontFamily:T.fontMono,fontSize:"10px",color:T.textMuted}}>Community progress</span>
              <span style={{fontFamily:T.fontMono,fontSize:"10px",color:pct>50?T.green:T.textMuted}}>{pct}% done</span>
            </div>
            <div style={{height:"5px",background:T.bg3,borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:T.accent,borderRadius:"3px",transition:"width 0.8s"}}/>
            </div>
          </div>
        )}
      </div>

      {/* ── action area ── */}
      {(expanded||!joined) && (
        <div style={{borderTop:`1px solid ${T.border}`,padding:"14px 16px"}}>

          {/* Not joined yet */}
          {!joined && (
            <button
              style={{width:"100%",padding:"14px",background:T.panel,border:"none",borderRadius:T.r16,fontFamily:T.fontDisplay,fontSize:"20px",letterSpacing:"0.06em",color:T.accent,cursor:"pointer",opacity:joining?0.6:1}}
              onClick={join}
              disabled={joining}
            >
              {joining?"Joining...":"⚡ JOIN TODAY'S CHALLENGE"}
            </button>
          )}

          {/* Joined but not done */}
          {joined && !completed && (
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              <div style={{fontFamily:T.fontBody,fontSize:"14px",color:T.textMuted,textAlign:"center"}}>
                You're in! Complete and mark done.
              </div>

              {/* ✅ Three buttons: Later / DONE / POST PROOF */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                <button
                  style={{padding:"14px",background:"transparent",border:`1.5px solid ${T.borderMid}`,borderRadius:T.r16,fontFamily:T.fontDisplay,fontSize:"16px",color:T.textMuted,cursor:"pointer"}}
                  onClick={()=>setExpanded(false)}
                >
                  Later
                </button>
                <button
                  style={{padding:"14px",background:T.accent,border:"none",borderRadius:T.r16,fontFamily:T.fontDisplay,fontSize:"16px",color:"#fff",cursor:"pointer",boxShadow:"0 4px 14px rgba(16,185,129,0.35)"}}
                  onClick={markDone}
                >
                  ✓ DONE!
                </button>
              </div>

              {/* ✅ Post proof button — full width below */}
              <button
                style={{
                  width:"100%",padding:"12px",
                  background:"transparent",
                  border:`1.5px solid ${T.accent}`,
                  borderRadius:T.r16,
                  fontFamily:T.fontDisplay,fontSize:"15px",
                  color:T.accent,cursor:"pointer",
                  letterSpacing:"0.04em",
                }}
                onClick={postProof}
              >
                📹 POST PROOF VIDEO
              </button>

              <div style={{fontFamily:T.fontMono,fontSize:"10px",color:T.textMuted,textAlign:"center"}}>
                Completing earns +2 honour
              </div>
            </div>
          )}

          {/* Completed */}
          {joined && completed && (
            <div style={{display:"flex",flexDirection:"column",gap:"10px",alignItems:"center",padding:"8px 0"}}>
              <div style={{fontSize:"32px",marginBottom:"4px"}}>🎉</div>
              <div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:T.green,letterSpacing:"0.04em",fontStyle:"italic"}}>
                Challenge Complete!
              </div>
              <div style={{fontFamily:T.fontBody,fontSize:"13px",color:T.textMuted,marginTop:"4px"}}>
                +2 honour earned · Come back tomorrow!
              </div>

              {/* ✅ Still let them post proof even after completing */}
              <button
                style={{
                  padding:"10px 20px",
                  background:"transparent",
                  border:`1.5px solid ${T.green}`,
                  borderRadius:T.rFull,
                  fontFamily:T.fontBody,fontSize:"13px",
                  color:T.green,cursor:"pointer",fontWeight:"600",marginTop:"4px",
                }}
                onClick={postProof}
              >
                📹 Share your proof video
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}