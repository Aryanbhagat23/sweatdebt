import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

const CHALK  = "#2C4A3E";
const MINT   = "#f0fdf4";
const ACCENT = "#10b981";
const WHITE  = "#ffffff";
const MUTED  = "#6b7280";
const BORDER = "#d1fae5";

const SPORTS = [
  { id:"football",   icon:"⚽", name:"Football"   },
  { id:"basketball", icon:"🏀", name:"Basketball" },
  { id:"cricket",    icon:"🏏", name:"Cricket"    },
  { id:"gaming",     icon:"🎮", name:"Gaming"     },
  { id:"mma",        icon:"🥊", name:"MMA"        },
  { id:"running",    icon:"🏃", name:"Running"    },
  { id:"tennis",     icon:"🎾", name:"Tennis"     },
  { id:"chess",      icon:"♟️", name:"Chess"      },
];

const HOW_IT_WORKS = [
  { emoji:"⚔️", title:"Make a bet",      desc:"Challenge a friend on anything — a game, a sport, a prediction." },
  { emoji:"💀", title:"Loser pays up",   desc:"The loser has 24 hours to film themselves doing the forfeit workout." },
  { emoji:"🏆", title:"Build honour",    desc:"Win bets, complete forfeits, climb the leaderboard. Your honour score is public." },
];

export default function Onboarding({ user, onComplete }) {
  const navigate = useNavigate();
  const [step,           setStep]           = useState(0); // 0=welcome, 1=profile, 2=done
  const [username,       setUsername]       = useState("");
  const [selectedSports, setSelectedSports] = useState([]);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [usernameOk,     setUsernameOk]     = useState(null);
  const checkTimer = useRef(null);

  // ── username availability check ───────────────────────────────────────────
  const handleUsernameChange = async (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20);
    setUsername(clean);
    setUsernameOk(null);
    setError("");
    if (clean.length < 3) return;
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      try {
        const { getDoc, doc: fDoc } = await import("firebase/firestore");
        const snap = await getDoc(fDoc(db, "usernames", clean));
        setUsernameOk(!snap.exists());
      } catch(e) { setUsernameOk(true); }
    }, 500);
  };

  const toggleSport = (id) => {
    setSelectedSports(s =>
      s.includes(id) ? s.filter(x => x !== id) : [...s, id]
    );
  };

  // ── save and finish ───────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!username || username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (usernameOk === false) { setError("That username is taken. Try another."); return; }
    setSaving(true);
    setError("");
    try {
      // Update Firebase Auth display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: username });
      }
      // Update Firestore user doc
      await updateDoc(doc(db, "users", user.uid), {
        username:        username.toLowerCase(),
        displayName:     username,
        sports:          selectedSports,
        needsOnboarding: false,
        updatedAt:       serverTimestamp(),
      });
      // Reserve username
      await setDoc(doc(db, "usernames", username.toLowerCase()), { uid: user.uid });

      onComplete();
    } catch(e) {
      console.error(e);
      setError("Something went wrong. Try again.");
    }
    setSaving(false);
  };

  // ── SCREEN 0: Welcome ─────────────────────────────────────────────────────
  if (step === 0) return (
    <div style={{
      minHeight:"100vh", background:CHALK,
      display:"flex", flexDirection:"column",
      padding:"0 0 40px",
      position:"relative", overflow:"hidden",
    }}>
      {/* background text */}
      <div style={{
        position:"absolute", top:"30%", left:"-10%",
        fontFamily:"'Bebas Neue',sans-serif", fontSize:"160px",
        color:"rgba(255,255,255,0.03)", letterSpacing:"0.04em",
        whiteSpace:"nowrap", transform:"rotate(-8deg)",
        pointerEvents:"none", userSelect:"none",
      }}>SWEAT DEBT SWEAT</div>

      {/* header */}
      <div style={{ padding:"60px 24px 0", position:"relative" }}>
        <div style={{
          fontFamily:"'Bebas Neue',sans-serif",
          fontSize:"56px", lineHeight:0.9,
          color:WHITE, letterSpacing:"0.04em",
        }}>
          Sweat<span style={{color:ACCENT}}>Debt</span>
        </div>
        <div style={{
          fontFamily:"system-ui", fontSize:"18px",
          color:"rgba(255,255,255,0.6)", marginTop:"10px",
          lineHeight:"1.5",
        }}>
          Bet on yourself.<br/>
          <span style={{color:ACCENT, fontWeight:"600"}}>Lose the bet, pay in sweat.</span>
        </div>
      </div>

      {/* how it works cards */}
      <div style={{ padding:"40px 24px 0", display:"flex", flexDirection:"column", gap:"12px", flex:1 }}>
        {HOW_IT_WORKS.map((h, i) => (
          <div key={i} style={{
            background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:"18px", padding:"18px 20px",
            display:"flex", alignItems:"center", gap:"16px",
            animation:`fadeUp 0.4s ${i * 0.1 + 0.2}s ease both`,
          }}>
            <div style={{
              width:"50px", height:"50px", borderRadius:"14px",
              background:"rgba(16,185,129,0.15)",
              border:"1px solid rgba(16,185,129,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"24px", flexShrink:0,
            }}>{h.emoji}</div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:WHITE, letterSpacing:"0.04em" }}>
                {h.title}
              </div>
              <div style={{ fontFamily:"system-ui", fontSize:"13px", color:"rgba(255,255,255,0.5)", marginTop:"3px", lineHeight:"1.5" }}>
                {h.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding:"32px 24px 0" }}>
        <button onClick={() => setStep(1)} style={{
          width:"100%", padding:"18px",
          background:ACCENT, border:"none", borderRadius:"18px",
          fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px",
          letterSpacing:"0.06em", color:CHALK,
          cursor:"pointer",
        }}>
          LET'S GO ⚔️
        </button>
        <div style={{
          fontFamily:"system-ui", fontSize:"12px",
          color:"rgba(255,255,255,0.3)", textAlign:"center", marginTop:"12px",
        }}>
          Free forever · No money involved
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );

  // ── SCREEN 1: Profile setup ───────────────────────────────────────────────
  if (step === 1) return (
    <div style={{ minHeight:"100vh", background:MINT, paddingBottom:"40px" }}>

      {/* header */}
      <div style={{ background:CHALK, padding:"52px 24px 24px" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:WHITE, letterSpacing:"0.04em" }}>
          Set up your profile
        </div>
        <div style={{ fontFamily:"system-ui", fontSize:"14px", color:"rgba(255,255,255,0.5)", marginTop:"4px" }}>
          Step 2 of 3 — almost there
        </div>
        {/* progress */}
        <div style={{ height:"3px", background:"rgba(255,255,255,0.1)", borderRadius:"2px", marginTop:"16px" }}>
          <div style={{ width:"66%", height:"100%", background:ACCENT, borderRadius:"2px" }}/>
        </div>
      </div>

      <div style={{ padding:"24px 20px", display:"flex", flexDirection:"column", gap:"20px" }}>

        {/* username */}
        <div style={{ background:WHITE, borderRadius:"18px", padding:"20px", border:`1px solid ${BORDER}` }}>
          <div style={{ fontFamily:"monospace", fontSize:"11px", color:MUTED, letterSpacing:"0.1em", marginBottom:"10px" }}>
            CHOOSE YOUR USERNAME
          </div>
          <div style={{ position:"relative" }}>
            <span style={{
              position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)",
              fontFamily:"monospace", fontSize:"16px", color:MUTED,
            }}>@</span>
            <input
              value={username}
              onChange={e => handleUsernameChange(e.target.value)}
              placeholder="coolname123"
              maxLength={20}
              style={{
                width:"100%", padding:"14px 14px 14px 32px",
                background:MINT, border:`1.5px solid ${
                  usernameOk === true ? ACCENT :
                  usernameOk === false ? "#ef4444" : BORDER
                }`,
                borderRadius:"12px", fontFamily:"monospace",
                fontSize:"16px", color:CHALK, outline:"none",
                boxSizing:"border-box",
              }}
            />
            {usernameOk === true && (
              <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", color:ACCENT, fontSize:"18px" }}>✓</span>
            )}
            {usernameOk === false && (
              <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", color:"#ef4444", fontSize:"18px" }}>✗</span>
            )}
          </div>
          <div style={{ fontFamily:"system-ui", fontSize:"12px", color:MUTED, marginTop:"6px" }}>
            Letters, numbers and underscores only. This is your public handle.
          </div>
        </div>

        {/* sport selection */}
        <div style={{ background:WHITE, borderRadius:"18px", padding:"20px", border:`1px solid ${BORDER}` }}>
          <div style={{ fontFamily:"monospace", fontSize:"11px", color:MUTED, letterSpacing:"0.1em", marginBottom:"14px" }}>
            WHAT DO YOU BET ON? (pick any)
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            {SPORTS.map(s => {
              const sel = selectedSports.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleSport(s.id)} style={{
                  display:"flex", alignItems:"center", gap:"10px",
                  padding:"12px 14px",
                  background: sel ? CHALK : MINT,
                  border:`1.5px solid ${sel ? CHALK : BORDER}`,
                  borderRadius:"12px", cursor:"pointer",
                  transition:"all 0.15s",
                }}>
                  <span style={{ fontSize:"18px" }}>{s.icon}</span>
                  <span style={{
                    fontFamily:"monospace", fontSize:"13px", fontWeight:"600",
                    color: sel ? ACCENT : CHALK,
                  }}>{s.name}</span>
                  {sel && <span style={{ marginLeft:"auto", color:ACCENT, fontSize:"14px" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{
            background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:"12px", padding:"12px 16px",
            fontFamily:"system-ui", fontSize:"13px", color:"#ef4444",
          }}>{error}</div>
        )}

        <button onClick={handleFinish} disabled={saving || !username || username.length < 3}
          style={{
            width:"100%", padding:"18px",
            background: (saving || !username || username.length < 3) ? "#e5e7eb" : CHALK,
            border:"none", borderRadius:"18px",
            fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px",
            letterSpacing:"0.06em",
            color: (saving || !username || username.length < 3) ? MUTED : ACCENT,
            cursor: (saving || !username || username.length < 3) ? "not-allowed" : "pointer",
            transition:"all 0.2s",
          }}>
          {saving ? "SAVING…" : "LET'S BET ⚔️"}
        </button>
      </div>
    </div>
  );

  return null;
}