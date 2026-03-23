import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc, getDoc, setDoc, updateDoc,
  collection, onSnapshot, query, where,
  serverTimestamp, increment, arrayUnion, arrayRemove,
} from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", coral:"#ff6b4a", green:"#00e676",
  red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a",
  purple:"#a855f7", amber:"#f59e0b",
};

// Default challenges — rotates daily
const CHALLENGE_POOL = [
  { exercise:"Push-ups",      reps:50,  icon:"💪", difficulty:"Medium" },
  { exercise:"Burpees",       reps:20,  icon:"🔥", difficulty:"Hard"   },
  { exercise:"Squats",        reps:100, icon:"🦵", difficulty:"Medium" },
  { exercise:"Plank",         reps:2,   icon:"⏱",  difficulty:"Easy", unit:"min" },
  { exercise:"Jumping Jacks", reps:100, icon:"⚡", difficulty:"Easy"   },
  { exercise:"Mountain Climbers", reps:60, icon:"🏔", difficulty:"Hard" },
  { exercise:"Sit-ups",       reps:75,  icon:"🎯", difficulty:"Medium" },
  { exercise:"Lunges",        reps:50,  icon:"🚶", difficulty:"Easy"   },
  { exercise:"Pull-ups",      reps:15,  icon:"🏋️", difficulty:"Hard"  },
  { exercise:"Box Jumps",     reps:30,  icon:"📦", difficulty:"Hard"   },
  { exercise:"Skipping",      reps:200, icon:"🎀", difficulty:"Easy", unit:"skips" },
  { exercise:"Wall Sit",      reps:3,   icon:"🧱", difficulty:"Medium", unit:"min" },
  { exercise:"Bear Crawl",    reps:20,  icon:"🐻", difficulty:"Hard", unit:"meters" },
  { exercise:"High Knees",    reps:100, icon:"🦿", difficulty:"Easy"   },
];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24,0,0,0);
  return midnight - now;
}

function useMidnightCountdown() {
  const [ms, setMs] = useState(getTimeUntilMidnight);
  useEffect(() => {
    const tick = setInterval(() => setMs(getTimeUntilMidnight()), 1000);
    return () => clearInterval(tick);
  }, []);
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export default function DailyChallenge({ user }) {
  const [challenge, setChallenge] = useState(null);
  const [joined, setJoined] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const countdown = useMidnightCountdown();

  const todayKey = getTodayKey();

  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "daily_challenges", todayKey);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // Create today's challenge — pick based on day of year
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
        const picked = CHALLENGE_POOL[dayOfYear % CHALLENGE_POOL.length];
        const newChallenge = {
          ...picked,
          date: todayKey,
          createdAt: serverTimestamp(),
          participantIds: [],
          completedIds: [],
          totalJoined: 0,
          totalCompleted: 0,
        };
        await setDoc(ref, newChallenge);
        setChallenge({ id: todayKey, ...newChallenge });
      } else {
        const data = { id: snap.id, ...snap.data() };
        setChallenge(data);
        setJoined(data.participantIds?.includes(user?.uid) || false);
        setCompleted(data.completedIds?.includes(user?.uid) || false);
      }
      setLoading(false);
    };
    if (user) load();
  }, [user, todayKey]);

  // Listen to participant count live
  useEffect(() => {
    const ref = doc(db, "daily_challenges", todayKey);
    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setChallenge(prev => ({ ...prev, ...data }));
      setJoined(data.participantIds?.includes(user?.uid) || false);
      setCompleted(data.completedIds?.includes(user?.uid) || false);
    });
    return () => unsub();
  }, [user, todayKey]);

  const joinChallenge = async () => {
    if (!user || joining || joined) return;
    setJoining(true);
    try {
      await updateDoc(doc(db, "daily_challenges", todayKey), {
        participantIds: arrayUnion(user.uid),
        totalJoined: increment(1),
      });
      // Add to user's streak tracking
      await updateDoc(doc(db, "users", user.uid), {
        lastDailyChallengeDate: todayKey,
      }).catch(() => {});
      setJoined(true);
    } catch (e) { console.error(e); }
    setJoining(false);
  };

  const markComplete = async () => {
    if (!user || !joined || completed) return;
    try {
      await updateDoc(doc(db, "daily_challenges", todayKey), {
        completedIds: arrayUnion(user.uid),
        totalCompleted: increment(1),
      });
      // Reward honour points
      await updateDoc(doc(db, "users", user.uid), {
        honour: increment(2),
        dailyChallengesCompleted: increment(1),
      }).catch(() => {});
      setCompleted(true);
    } catch (e) { console.error(e); }
  };

  const diffColor = { Easy:C.green, Medium:C.amber, Hard:C.red };

  if (loading) return null;
  if (!challenge) return null;

  const pct = challenge.totalJoined > 0
    ? Math.round((challenge.totalCompleted / challenge.totalJoined) * 100)
    : 0;

  return (
    <div style={{
      margin:"0 16px 16px",
      background: completed
        ? "rgba(0,230,118,0.05)"
        : joined
        ? "rgba(0,212,255,0.05)"
        : C.bg2,
      border:`1px solid ${completed ? "rgba(0,230,118,0.4)" : joined ? "rgba(0,212,255,0.3)" : C.border1}`,
      borderRadius:"20px",
      overflow:"hidden",
    }}>
      <style>{`@keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}`}</style>

      {/* Header row */}
      <div style={{ padding:"16px", cursor:"pointer" }} onClick={() => setExpanded(p=>!p)}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {/* Icon */}
          <div style={{
            width:"52px", height:"52px", borderRadius:"16px",
            background: completed ? "rgba(0,230,118,0.15)" : "rgba(0,212,255,0.1)",
            border: `1px solid ${completed ? "rgba(0,230,118,0.4)" : "rgba(0,212,255,0.2)"}`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", flexShrink:0,
          }}>
            {challenge.icon}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            {/* Daily badge */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
              <div style={{ background:"rgba(0,212,255,0.12)", border:"1px solid rgba(0,212,255,0.3)", borderRadius:"20px", padding:"2px 8px", fontFamily:"'DM Mono',monospace", fontSize:"9px", fontWeight:"700", color:C.cyan, letterSpacing:"0.08em" }}>
                DAILY CHALLENGE
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.dim }}>
                Resets in {countdown}
              </div>
            </div>

            {/* Challenge name */}
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.white, letterSpacing:"0.03em", lineHeight:1 }}>
              {challenge.reps} {challenge.unit || "x"} {challenge.exercise}
            </div>

            {/* Difficulty + participants */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"4px" }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color: diffColor[challenge.difficulty] || C.muted }}>
                ● {challenge.difficulty}
              </span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted }}>
                {challenge.totalJoined || 0} joined · {challenge.totalCompleted || 0} done
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div style={{ flexShrink:0 }}>
            {completed ? (
              <div style={{ background:"rgba(0,230,118,0.15)", border:"1px solid rgba(0,230,118,0.4)", borderRadius:"20px", padding:"6px 12px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", color:C.green, letterSpacing:"0.04em" }}>
                ✓ DONE
              </div>
            ) : joined ? (
              <div style={{ background:"rgba(0,212,255,0.12)", border:"1px solid rgba(0,212,255,0.3)", borderRadius:"20px", padding:"6px 12px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", color:C.cyan, letterSpacing:"0.04em" }}>
                JOINED
              </div>
            ) : (
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"18px", color:C.muted }}>▾</div>
            )}
          </div>
        </div>

        {/* Progress bar — shows % completion */}
        {challenge.totalJoined > 0 && (
          <div style={{ marginTop:"12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted }}>Community progress</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color: pct>50?C.green:C.muted }}>{pct}% done</span>
            </div>
            <div style={{ height:"5px", background:C.bg3, borderRadius:"3px", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.cyan},${C.green})`, borderRadius:"3px", transition:"width 0.8s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* Expanded actions */}
      {(expanded || !joined) && (
        <div style={{ borderTop:`1px solid ${C.border1}`, padding:"14px 16px" }}>
          {!joined && (
            <button style={{
              width:"100%", padding:"14px",
              background:`linear-gradient(135deg,${C.cyan},${C.purple})`,
              border:"none", borderRadius:"14px",
              fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em",
              color:"#000", cursor:"pointer",
              opacity: joining ? 0.6 : 1,
            }} onClick={joinChallenge} disabled={joining}>
              {joining ? "Joining..." : `⚡ JOIN TODAY'S CHALLENGE`}
            </button>
          )}
          {joined && !completed && (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, textAlign:"center" }}>
                You're in! Complete the challenge and mark it done.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                <button style={{ padding:"14px", background:"transparent", border:`1px solid ${C.border2}`, borderRadius:"14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", color:C.muted, cursor:"pointer", letterSpacing:"0.04em" }}
                  onClick={() => setExpanded(false)}>
                  Later
                </button>
                <button style={{ padding:"14px", background:`linear-gradient(135deg,${C.green},${C.cyan})`, border:"none", borderRadius:"14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", color:"#000", cursor:"pointer", letterSpacing:"0.04em" }}
                  onClick={markComplete}>
                  ✓ DONE!
                </button>
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.dim, textAlign:"center" }}>
                Completing earns +2 honour points
              </div>
            </div>
          )}
          {joined && completed && (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:"32px", marginBottom:"8px" }}>🎉</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.green, letterSpacing:"0.04em" }}>
                Challenge Complete!
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted, marginTop:"4px" }}>
                +2 honour earned · Come back tomorrow for a new challenge
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}