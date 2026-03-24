// src/components/DailyChallenge.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, increment, arrayUnion } from "firebase/firestore";
import T from "../theme";

const POOL = [
  {exercise:"Push-ups",reps:50,icon:"💪",difficulty:"Medium"},
  {exercise:"Burpees",reps:20,icon:"🔥",difficulty:"Hard"},
  {exercise:"Squats",reps:100,icon:"🦵",difficulty:"Medium"},
  {exercise:"Plank",reps:2,icon:"⏱",difficulty:"Easy",unit:"min"},
  {exercise:"Jumping Jacks",reps:100,icon:"⚡",difficulty:"Easy"},
  {exercise:"Mountain Climbers",reps:60,icon:"🏔",difficulty:"Hard"},
  {exercise:"Sit-ups",reps:75,icon:"🎯",difficulty:"Medium"},
  {exercise:"Lunges",reps:50,icon:"🚶",difficulty:"Easy"},
  {exercise:"Pull-ups",reps:15,icon:"🏋️",difficulty:"Hard"},
  {exercise:"Box Jumps",reps:30,icon:"📦",difficulty:"Hard"},
  {exercise:"Skipping",reps:200,icon:"🎀",difficulty:"Easy",unit:"skips"},
  {exercise:"High Knees",reps:100,icon:"🦿",difficulty:"Easy"},
  {exercise:"Bear Crawl",reps:20,icon:"🐻",difficulty:"Hard",unit:"meters"},
  {exercise:"Wall Sit",reps:3,icon:"🧱",difficulty:"Medium",unit:"min"},
];

function todayKey(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function midnight(){const n=new Date(),m=new Date(n);m.setHours(24,0,0,0);return m-n;}

function useMidnight(){
  const [ms,setMs]=useState(midnight);
  useEffect(()=>{const t=setInterval(()=>setMs(midnight()),1000);return()=>clearInterval(t);},[]);
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
  return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export default function DailyChallenge({ user }) {
  const [ch, setCh] = useState(null);
  const [joined, setJoined] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const countdown = useMidnight();
  const key = todayKey();
  const diffColor={Easy:T.green,Medium:T.orange,Hard:T.pink};

  useEffect(()=>{
    if(!user)return;
    const load=async()=>{
      const ref=doc(db,"daily_challenges",key);
      const snap=await getDoc(ref);
      if(!snap.exists()){
        const day=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/86400000);
        const picked=POOL[day%POOL.length];
        await setDoc(ref,{...picked,date:key,createdAt:serverTimestamp(),participantIds:[],completedIds:[],totalJoined:0,totalCompleted:0});
      }
    };
    load();
    const u=onSnapshot(doc(db,"daily_challenges",key),snap=>{
      if(!snap.exists())return;
      const d=snap.data();
      setCh({id:snap.id,...d});
      setJoined(d.participantIds?.includes(user.uid)||false);
      setCompleted(d.completedIds?.includes(user.uid)||false);
    });
    return()=>u();
  },[user,key]);

  const join=async()=>{
    if(!user||joining||joined)return; setJoining(true);
    try{ await updateDoc(doc(db,"daily_challenges",key),{participantIds:arrayUnion(user.uid),totalJoined:increment(1)}); }
    catch(e){console.error(e);}
    setJoining(false);
  };
  const markDone=async()=>{
    if(!user||!joined||completed)return;
    try{
      await updateDoc(doc(db,"daily_challenges",key),{completedIds:arrayUnion(user.uid),totalCompleted:increment(1)});
      await updateDoc(doc(db,"users",user.uid),{honour:increment(2),dailyChallengesCompleted:increment(1)}).catch(()=>{});
    }catch(e){console.error(e);}
  };

  if(!ch)return null;
  const pct=ch.totalJoined>0?Math.round((ch.totalCompleted/ch.totalJoined)*100):0;
  const accent=completed?T.green:joined?T.pink:T.orange;

  return(
    <div style={{ margin:"0 16px 16px", background:T.bg1, border:`1px solid ${completed?"rgba(48,209,88,0.3)":joined?T.pinkBorder:T.border}`, borderRadius:T.r20, overflow:"hidden" }}>
      <div style={{ padding:"16px", cursor:"pointer" }} onClick={()=>setExpanded(p=>!p)}>
        <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
          <div style={{ width:"52px",height:"52px",borderRadius:T.r16,background:completed?T.greenDim:T.pinkDim,border:`1px solid ${accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",flexShrink:0 }}>{ch.icon}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px" }}>
              <div style={{ background:T.pinkDim,border:`1px solid ${T.pinkBorder}`,borderRadius:T.rFull,padding:"2px 8px",fontFamily:T.fontMono,fontSize:"9px",fontWeight:"700",color:T.pink,letterSpacing:"0.08em" }}>DAILY CHALLENGE</div>
              <div style={{ fontFamily:T.fontMono,fontSize:"10px",color:T.dim }}>Resets {countdown}</div>
            </div>
            <div style={{ fontFamily:T.fontDisplay,fontSize:"20px",color:T.white,letterSpacing:"0.02em",lineHeight:1 }}>{ch.reps} {ch.unit||"x"} {ch.exercise}</div>
            <div style={{ display:"flex",alignItems:"center",gap:"8px",marginTop:"4px" }}>
              <span style={{ fontFamily:T.fontMono,fontSize:"10px",color:diffColor[ch.difficulty]||T.muted }}>● {ch.difficulty}</span>
              <span style={{ fontFamily:T.fontMono,fontSize:"10px",color:T.muted }}>{ch.totalJoined||0} joined · {ch.totalCompleted||0} done</span>
            </div>
          </div>
          <div style={{ flexShrink:0 }}>
            {completed?<div style={{ background:T.greenDim,border:`1px solid ${T.greenBorder}`,borderRadius:T.rFull,padding:"6px 12px",fontFamily:T.fontDisplay,fontSize:"14px",color:T.green,letterSpacing:"0.04em" }}>✓ DONE</div>
              :joined?<div style={{ background:T.pinkDim,border:`1px solid ${T.pinkBorder}`,borderRadius:T.rFull,padding:"6px 12px",fontFamily:T.fontDisplay,fontSize:"14px",color:T.pink,letterSpacing:"0.04em" }}>JOINED</div>
              :<div style={{ fontFamily:T.fontMono,fontSize:"18px",color:T.muted }}>▾</div>}
          </div>
        </div>
        {ch.totalJoined>0&&(
          <div style={{ marginTop:"12px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
              <span style={{ fontFamily:T.fontMono,fontSize:"10px",color:T.muted }}>Community progress</span>
              <span style={{ fontFamily:T.fontMono,fontSize:"10px",color:pct>50?T.green:T.muted }}>{pct}% done</span>
            </div>
            <div style={{ height:"4px",background:T.bg3,borderRadius:"2px",overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${pct}%`,background:T.gradPrimary,borderRadius:"2px",transition:"width 0.8s" }}/>
            </div>
          </div>
        )}
      </div>
      {(expanded||!joined)&&(
        <div style={{ borderTop:`1px solid ${T.border}`,padding:"14px 16px" }}>
          {!joined&&<button style={{ width:"100%",padding:"14px",background:T.gradPrimary,border:"none",borderRadius:T.r16,fontFamily:T.fontDisplay,fontSize:"20px",letterSpacing:"0.06em",color:"#fff",cursor:"pointer",opacity:joining?0.6:1 }} onClick={join} disabled={joining}>{joining?"Joining...":"⚡ JOIN TODAY'S CHALLENGE"}</button>}
          {joined&&!completed&&(
            <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
              <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.muted,textAlign:"center" }}>You're in! Complete and mark done.</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px" }}>
                <button style={{ padding:"14px",background:"transparent",border:`1px solid ${T.borderMid}`,borderRadius:T.r16,fontFamily:T.fontDisplay,fontSize:"16px",color:T.muted,cursor:"pointer" }} onClick={()=>setExpanded(false)}>Later</button>
                <button style={{ padding:"14px",background:T.gradPrimary,border:"none",borderRadius:T.r16,fontFamily:T.fontDisplay,fontSize:"16px",color:"#fff",cursor:"pointer" }} onClick={markDone}>✓ DONE!</button>
              </div>
              <div style={{ fontFamily:T.fontMono,fontSize:"10px",color:T.dim,textAlign:"center" }}>Completing earns +2 honour</div>
            </div>
          )}
          {joined&&completed&&(
            <div style={{ textAlign:"center",padding:"8px 0" }}>
              <div style={{ fontSize:"32px",marginBottom:"8px" }}>🎉</div>
              <div style={{ fontFamily:T.fontDisplay,fontSize:"22px",color:T.green,letterSpacing:"0.04em" }}>Challenge Complete!</div>
              <div style={{ fontFamily:T.fontBody,fontSize:"13px",color:T.muted,marginTop:"4px" }}>+2 honour earned · Come back tomorrow!</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}