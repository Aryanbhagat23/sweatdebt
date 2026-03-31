import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, getDoc, collection, query, where, getDocs,
} from "firebase/firestore";

// ── Tier config ───────────────────────────────────────────────
const TIERS = [
  { label:"Rookie",   min:0,    emoji:"🌱", color:"#9ca3af" },
  { label:"Iron",     min:50,   emoji:"⚙️", color:"#6b7280" },
  { label:"Bronze",   min:150,  emoji:"🥉", color:"#cd7f32" },
  { label:"Silver",   min:300,  emoji:"🥈", color:"#9ca3af" },
  { label:"Gold",     min:500,  emoji:"🥇", color:"#f59e0b" },
  { label:"Platinum", min:750,  emoji:"💎", color:"#38bdf8" },
  { label:"Diamond",  min:1000, emoji:"💠", color:"#818cf8" },
  { label:"Legend",   min:1500, emoji:"👑", color:"#f97316" },
];
function getTier(score = 0) {
  return [...TIERS].reverse().find(t => score >= t.min) || TIERS[0];
}

// ── Motivational quotes ───────────────────────────────────────
const QUOTES = [
  "Pain is temporary. Your honour score is forever.",
  "Every forfeit is proof you kept your word.",
  "Debt paid in sweat. Character built in reps.",
  "Champions don't dodge debts.",
  "Win or sweat. Either way you grow.",
  "Your word is your bond. Your body is the proof.",
  "Excuses don't count reps.",
  "Earned every point. Sweated every loss.",
];

export default function SweatCard({ user }) {
  const navigate = useNavigate();
  const cardRef  = useRef(null);

  const [theme,    setTheme]   = useState("dark"); // dark | light
  const [profile,  setProfile] = useState({});
  const [stats,    setStats]   = useState({ wins:0, losses:0, total:0, streak:0 });
  const [recentBets, setRecentBets] = useState([]);
  const [loading,  setLoading] = useState(true);
  const [showTip,  setShowTip] = useState(false);

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        // Profile
        const pSnap = await getDoc(doc(db, "users", user.uid));
        if (pSnap.exists()) setProfile(pSnap.data());

        // Bets
        const bSnap = await getDocs(
          query(collection(db, "bets"), where("participants", "array-contains", user.uid))
        );
        const bets = bSnap.docs.map(d => ({ id:d.id, ...d.data() }));

        let wins = 0, losses = 0, streak = 0, streakActive = true;
        const sorted = [...bets]
          .filter(b => ["won","lost","approved","disputed"].includes(b.status))
          .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

        sorted.forEach(b => {
          const won = b.winner === user.uid || b.status === "won" || b.status === "approved";
          if (won) wins++;
          else losses++;
          if (streakActive) {
            if (won) streak++;
            else streakActive = false;
          }
        });

        setStats({ wins, losses, total: wins+losses, streak });
        setRecentBets(sorted.slice(0, 5));
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [user]);

  const tier     = getTier(profile.honourScore || 0);
  const winRate  = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
  const name     = profile.displayName || user?.displayName || "Athlete";
  const username = profile.username || name.toLowerCase().replace(/\s/g,"");
  const photo    = profile.photoURL || user?.photoURL || null;

  // ── Theme tokens ──────────────────────────────────────────
  const T = theme === "dark" ? {
    bg:      "#1a2e1f",
    card:    "#2C4A3E",
    border:  "rgba(16,185,129,0.2)",
    text:    "#ffffff",
    muted:   "rgba(255,255,255,0.55)",
    accent:  "#10b981",
    accentBg:"rgba(16,185,129,0.15)",
    stat:    "rgba(255,255,255,0.1)",
    statText:"#ffffff",
    qr:      "#ffffff",
    qrBg:    "#1a2e1f",
    badge:   "rgba(16,185,129,0.2)",
    won:     "#34d399",
    lost:    "#fca5a5",
    wonBox:  "rgba(52,211,153,0.15)",
    lostBox: "rgba(252,165,165,0.15)",
    wonBorder:"#34d399",
    lostBorder:"#fca5a5",
    wonText: "#34d399",
    lostText:"#fca5a5",
  } : {
    bg:      "#f0fdf4",
    card:    "#ffffff",
    border:  "#d1fae5",
    text:    "#052e16",
    muted:   "#374151",
    accent:  "#059669",
    accentBg:"rgba(5,150,105,0.08)",
    stat:    "#f0fdf4",
    statText:"#052e16",
    qr:      "#052e16",
    qrBg:    "#ffffff",
    badge:   "rgba(5,150,105,0.1)",
    won:     "#065f46",
    lost:    "#991b1b",
    wonBox:  "rgba(6,95,70,0.1)",
    lostBox: "rgba(153,27,27,0.08)",
    wonBorder:"#059669",
    lostBorder:"#dc2626",
    wonText: "#065f46",
    lostText:"#991b1b",
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0f1a12", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"monospace", color:"#10b981", fontSize:"14px" }}>Loading your card…</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:theme==="dark"?"#0a1410":"#e8f5e9", display:"flex", flexDirection:"column", alignItems:"center" }}>

      {/* ── TOP BAR (not part of screenshot) ── */}
      <div style={{
        width:"100%", maxWidth:"480px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px", position:"sticky", top:0, zIndex:10,
        background:"transparent",
      }}>
        <button onClick={() => navigate(-1)} style={{
          background:"rgba(0,0,0,0.3)", border:"none", borderRadius:"50%",
          width:"38px", height:"38px", color:"#fff", fontSize:"18px",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        }}>‹</button>

        <div style={{ display:"flex", gap:"8px" }}>
          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t==="dark"?"light":"dark")} style={{
            background:"rgba(0,0,0,0.3)", border:"none", borderRadius:"20px",
            padding:"8px 14px", color:"#fff", fontSize:"12px",
            fontFamily:"monospace", cursor:"pointer", letterSpacing:"0.06em",
          }}>
            {theme==="dark" ? "☀️ LIGHT" : "🌙 DARK"}
          </button>

          {/* Share */}
          <button onClick={() => setShowTip(true)} style={{
            background:"#10b981", border:"none", borderRadius:"20px",
            padding:"8px 16px", color:"#052e16", fontSize:"12px",
            fontFamily:"monospace", fontWeight:"700", cursor:"pointer", letterSpacing:"0.06em",
          }}>
            📤 SHARE
          </button>
        </div>
      </div>

      {/* ── SCREENSHOT TIP ── */}
      {showTip && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"24px",
        }} onClick={() => setShowTip(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background:"#1a2e1f", border:"1px solid rgba(16,185,129,0.3)",
            borderRadius:"20px", padding:"24px", maxWidth:"320px", textAlign:"center",
          }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>📸</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:"#fff", letterSpacing:"0.04em", marginBottom:"8px" }}>
              Screenshot your card
            </div>
            <p style={{ fontFamily:"system-ui", fontSize:"14px", color:"rgba(255,255,255,0.55)", lineHeight:"1.6", marginBottom:"20px" }}>
              Take a screenshot of the card below and share it to your Instagram story, WhatsApp status, or anywhere you want to flex.
            </p>
            <div style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:"12px", padding:"12px", marginBottom:"16px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"11px", color:"#10b981", letterSpacing:"0.08em" }}>
                📱 iOS: Side button + Volume Up<br/>
                📱 Android: Power + Volume Down
              </div>
            </div>
            <button onClick={() => setShowTip(false)} style={{
              background:"#10b981", border:"none", borderRadius:"12px",
              padding:"12px 32px", color:"#052e16", fontFamily:"monospace",
              fontSize:"14px", fontWeight:"700", cursor:"pointer", letterSpacing:"0.06em",
            }}>GOT IT</button>
          </div>
        </div>
      )}

      {/* ── THE CARD (this is what gets screenshotted) ── */}
      <div ref={cardRef} style={{
        width:"100%", maxWidth:"400px",
        background:T.bg,
        borderRadius:"28px",
        border:`1px solid ${T.border}`,
        overflow:"hidden",
        margin:"0 16px 32px",
        fontFamily:"system-ui",
      }}>

        {/* Header band */}
        <div style={{
          background:T.card,
          padding:"24px 24px 20px",
          borderBottom:`1px solid ${T.border}`,
          position:"relative", overflow:"hidden",
        }}>
          {/* Chalk texture lines */}
          {[25,55,80].map(y => (
            <div key={y} style={{ position:"absolute", left:0, right:0, top:`${y}%`, height:"1px", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }}/>
          ))}

          {/* Avatar + name row */}
          <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"16px", position:"relative" }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{
                width:"60px", height:"60px", borderRadius:"50%",
                border:`2px solid ${T.accent}`,
                overflow:"hidden", background:T.accentBg,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {photo
                  ? <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : <div style={{ fontFamily:"monospace", fontSize:"24px", color:T.accent }}>{name.charAt(0).toUpperCase()}</div>
                }
              </div>
              {/* Tier badge on avatar */}
              <div style={{
                position:"absolute", bottom:"-4px", right:"-4px",
                background:tier.color, borderRadius:"50%",
                width:"20px", height:"20px",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"11px", border:`2px solid ${T.card}`,
              }}>{tier.emoji}</div>
            </div>

            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"26px", color:T.text, letterSpacing:"0.04em", lineHeight:1 }}>
                {name}
              </div>
              <div style={{ fontFamily:"monospace", fontSize:"11px", color:T.muted, marginTop:"3px" }}>
                @{username}
              </div>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:"5px",
                marginTop:"6px", background:T.badge,
                borderRadius:"20px", padding:"3px 10px",
                border:`1px solid ${T.border}`,
              }}>
                <span style={{ fontSize:"11px" }}>{tier.emoji}</span>
                <span style={{ fontFamily:"monospace", fontSize:"11px", color:T.accent, fontWeight:"700" }}>{tier.label}</span>
                <span style={{ fontFamily:"monospace", fontSize:"11px", color:T.muted }}>· {profile.honourScore || 0} pts</span>
              </div>
            </div>
          </div>

          {/* Big stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"8px" }}>
            {[
              { label:"WINS",    val:stats.wins,    color:T.won   },
              { label:"LOSSES",  val:stats.losses,  color:T.lost  },
              { label:"WIN %",   val:`${winRate}%`, color:T.accent },
              { label:"STREAK",  val:`🔥${stats.streak}`, color:"#d97706" },
            ].map(s => (
              <div key={s.label} style={{
                background:T.stat, borderRadius:"12px", padding:"10px 6px", textAlign:"center",
                border:`1px solid ${T.border}`,
              }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:s.color, lineHeight:1 }}>
                  {s.val}
                </div>
                <div style={{ fontFamily:"monospace", fontSize:"8px", color:T.muted, letterSpacing:"0.08em", marginTop:"3px" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Honour bar */}
        <div style={{ padding:"16px 24px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
            <span style={{ fontFamily:"monospace", fontSize:"10px", color:T.muted, letterSpacing:"0.1em" }}>HONOUR SCORE</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", color:T.accent }}>
              {profile.honourScore || 0} / {TIERS.find(t => (profile.honourScore||0) < t.min)?.min || 1500}
            </span>
          </div>
          <div style={{ height:"6px", background:T.stat, borderRadius:"3px", overflow:"hidden" }}>
            <div style={{
              height:"100%",
              width:`${Math.min(((profile.honourScore||0) / (TIERS.find(t => (profile.honourScore||0) < t.min)?.min || 1500)) * 100, 100)}%`,
              background:`linear-gradient(90deg, ${T.accent}, #34d399)`,
              borderRadius:"3px",
              transition:"width 1s ease",
            }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"6px" }}>
            <span style={{ fontFamily:"monospace", fontSize:"9px", color:T.muted }}>{tier.label}</span>
            <span style={{ fontFamily:"monospace", fontSize:"9px", color:T.muted }}>
              {TIERS.find(t => (profile.honourScore||0) < t.min)?.label || "MAX"}
            </span>
          </div>
        </div>

        {/* Recent bets */}
        {recentBets.length > 0 && (
          <div style={{ padding:"16px 24px", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:T.muted, letterSpacing:"0.1em", marginBottom:"10px" }}>
              RECENT RECORD
            </div>
            <div style={{ display:"flex", gap:"6px" }}>
              {recentBets.map((b, i) => {
                const won = b.winner === user?.uid || b.status === "won" || b.status === "approved";
                return (
                  <div key={i} style={{
                    width:"32px", height:"32px", borderRadius:"8px",
                    background: won ? T.wonBox : T.lostBox,
                    border:`1.5px solid ${won ? T.wonBorder : T.lostBorder}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"monospace", fontSize:"13px", fontWeight:"700",
                    color: won ? T.wonText : T.lostText,
                  }}>
                    {won ? "W" : "L"}
                  </div>
                );
              })}
              {/* Empty slots */}
              {Array(Math.max(0, 5 - recentBets.length)).fill(0).map((_, i) => (
                <div key={`e${i}`} style={{
                  width:"32px", height:"32px", borderRadius:"8px",
                  background:T.stat, border:`1px solid ${T.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"monospace", fontSize:"12px", color:T.muted,
                }}>—</div>
              ))}
              <div style={{
                marginLeft:"auto", display:"flex", alignItems:"center",
                fontFamily:"monospace", fontSize:"11px", color:T.muted,
              }}>
                {stats.total} total
              </div>
            </div>
          </div>
        )}

        <div style={{ padding:"16px 24px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontFamily:"system-ui", fontSize:"13px", color:T.muted, fontStyle:"italic", lineHeight:"1.5", textAlign:"center" }}>
            "{quote}"
          </div>
        </div>

        {/* Footer / branding */}
        <div style={{
          padding:"16px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background: theme==="dark" ? "rgba(0,0,0,0.2)" : T.stat,
        }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:T.text, letterSpacing:"0.04em", lineHeight:1 }}>
              Sweat<span style={{ color:T.accent }}>Debt</span>
            </div>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:T.muted, marginTop:"3px", letterSpacing:"0.06em" }}>
              sweatdebt.vercel.app
            </div>
          </div>

          {/* QR code (visual placeholder — real QR via API) */}
          <div style={{
            width:"52px", height:"52px", background:T.qrBg,
            borderRadius:"8px", padding:"4px",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:`1px solid ${T.border}`,
            overflow:"hidden",
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://sweatdebt.vercel.app&bgcolor=${theme==="dark"?"1a2e1f":"ffffff"}&color=${theme==="dark"?"10b981":"052e16"}&margin=0`}
              alt="QR"
              style={{ width:"100%", height:"100%", imageRendering:"pixelated" }}
              onError={e => { e.target.style.display="none"; }}
            />
          </div>
        </div>
      </div>

      {/* Instructions below card */}
      <div style={{
        maxWidth:"400px", width:"100%", padding:"0 16px 48px",
        textAlign:"center",
      }}>
        <div style={{
          background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)",
          borderRadius:"14px", padding:"16px",
        }}>
          <div style={{ fontFamily:"monospace", fontSize:"11px", color:"#10b981", letterSpacing:"0.08em", marginBottom:"8px" }}>
            📸 HOW TO SHARE
          </div>
          <p style={{ fontFamily:"system-ui", fontSize:"13px", color:"rgb(0, 46, 3)", lineHeight:"1.6", margin:0 }}>
            Take a screenshot of the card above.<br/>
            Share it to your Instagram story, WhatsApp status, or anywhere you want to flex your record.
          </p>
        </div>
      </div>
    </div>
  );
}