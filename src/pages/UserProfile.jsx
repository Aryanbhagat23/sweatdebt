import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, getDoc, collection, query, where, onSnapshot,
} from "firebase/firestore";

/* ── colours ── */
const C = {
  page:       "#f0fdf4",
  card:       "#ffffff",
  border:     "#d1fae5",
  heading:    "#052e16",
  body:       "#374151",
  muted:      "#6b7280",
  accent:     "#10b981",
  accentSoft: "#6EE7B7",
  chalkboard: "#2C4A3E",   // ← the header colour you approved
  gold:       "#f5a623",
  blue:       "#4a9eff",
};

const QUOTES = [
  "Sweat is just fat crying. Keep going.",
  "Every forfeit is proof you kept your word.",
  "Your streak is your reputation. Protect it.",
  "Losers pay in sweat. Winners do too.",
  "The only bad workout is the one you didn't post.",
  "Pain is temporary. Your honour score is forever.",
  "Bet against yourself first. Win every time.",
  "Champions are made when they don't feel like it.",
  "Your body can do it. It's your mind you have to convince.",
  "Forfeits build character. Win streaks build confidence.",
  "No excuses. Just results.",
  "The harder the forfeit, the sweeter the win.",
  "Discipline is doing it even when no one is watching.",
  "Your honour score is your legacy.",
  "Make your opponent regret challenging you.",
];

const TIERS = [
  { min:0,   max:9,   name:"Bronze",  icon:"🥉", next:"Silver",  nextMin:10  },
  { min:10,  max:24,  name:"Silver",  icon:"🥈", next:"Gold",    nextMin:25  },
  { min:25,  max:49,  name:"Gold",    icon:"🥇", next:"Platinum",nextMin:50  },
  { min:50,  max:99,  name:"Platinum",icon:"💎", next:"Legend",  nextMin:100 },
  { min:100, max:999, name:"Legend",  icon:"👑", next:null,      nextMin:null},
];
const getTier = pts => [...TIERS].reverse().find(t => pts >= t.min) || TIERS[0];

const BADGES_DEF = [
  { icon:"🔥", name:"On Fire",      desc:"Win your first bet",          earned: (w,l,v,h) => w >= 1             },
  { icon:"⚡", name:"Streak x3",    desc:"Win 3 bets in a row",         earned: (w,l,v,h) => w >= 3             },
  { icon:"🏆", name:"First Win",    desc:"Win any bet",                 earned: (w,l,v,h) => w >= 1             },
  { icon:"💪", name:"Proof Poster", desc:"Upload 3 forfeit videos",     earned: (w,l,v,h) => v >= 3             },
  { icon:"👑", name:"Top Player",   desc:"70%+ win rate (5+ bets)",     earned: (w,l,v,h) => (w+l)>=5 && w/(w+l||1)>=0.7 },
  { icon:"💀", name:"No Mercy",     desc:"Win 5 bets total",            earned: (w,l,v,h) => w >= 5             },
  { icon:"🌟", name:"Dedicated",    desc:"Play 10+ bets",               earned: (w,l,v,h) => (w+l) >= 10       },
  { icon:"💎", name:"Platinum",     desc:"Reach Platinum tier",         earned: (w,l,v,h) => w*3 >= 50         },
  { icon:"🤝", name:"Honest",       desc:"Complete 3 forfeits on time", earned: (w,l,v,h) => v >= 3            },
  { icon:"🔑", name:"Legend",       desc:"Reach Legend tier",           earned: (w,l,v,h) => w*3 >= 100        },
];

const BET_STATUS_STYLE = {
  won:      { bg:"#10b981", color:"#fff",     label:"WON"    },
  lost:     { bg:"#ef4444", color:"#fff",     label:"LOST"   },
  active:   { bg:C.gold,    color:"#fff",     label:"ACTIVE" },
  pending:  { bg:C.page,    color:C.muted,    label:"PENDING", border:`1px solid ${C.border}` },
  disputed: { bg:"#f97316", color:"#fff",     label:"DISPUTED"},
};

function ago(ts) {
  if (!ts?.toDate) return "";
  const s = Math.floor((new Date() - ts.toDate()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function UserProfile({ user: currentUser }) {
  const navigate   = useNavigate();
  const { userId } = useParams();
  const viewingUid = userId || currentUser?.uid;
  const isMe       = viewingUid === currentUser?.uid;

  const [profile,   setProfile]   = useState(null);
  const [bets,      setBets]       = useState([]);
  const [videos,    setVideos]     = useState([]);
  const [loading,   setLoading]    = useState(true);
  const [quoteIdx,  setQuoteIdx]   = useState(() => {
    // different quote every day for "me", random for others
    if (!userId) return new Date().getDate() % QUOTES.length;
    return Math.floor(Math.random() * QUOTES.length);
  });
  const [quoteFade, setQuoteFade]  = useState(true);

  const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const today = days[new Date().getDay()];

  /* load profile */
  useEffect(() => {
    if (!viewingUid) return;
    setLoading(true);
    getDoc(doc(db, "users", viewingUid)).then(snap => {
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
  }, [viewingUid]);

  /* load bets */
  useEffect(() => {
    if (!viewingUid) return;
    const q = query(collection(db,"bets"), where("createdBy","==",viewingUid));
    return onSnapshot(q, snap => setBets(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, [viewingUid]);

  /* load videos */
  useEffect(() => {
    if (!viewingUid) return;
    const q = query(collection(db,"videos"), where("uploadedBy","==",viewingUid));
    return onSnapshot(q, snap => setVideos(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, [viewingUid]);

  const nextQuote = () => {
    setQuoteFade(false);
    setTimeout(() => {
      setQuoteIdx(i => (i + 1) % QUOTES.length);
      setQuoteFade(true);
    }, 200);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, animation:"_sp 0.8s linear infinite" }}/>
    </div>
  );

  /* derived stats */
  const displayName = profile?.displayName || "Unknown";
  const username    = profile?.username    || displayName.toLowerCase().replace(/\s/g,"");
  const photoURL    = profile?.photoURL    || null;
  const honour      = typeof profile?.honour === "number" ? profile.honour : 100;
  const bio         = profile?.bio         || null;

  const won     = bets.filter(b => b.status==="won").length;
  const lost    = bets.filter(b => b.status==="lost").length;
  const active  = bets.filter(b => b.status==="active" || b.status==="pending").length;
  const total   = bets.length;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  const pts       = won * 3 + lost;
  const tier      = getTier(pts);
  const ptsToNext = tier.nextMin ? tier.nextMin - pts : 0;
  const tierPct   = tier.nextMin
    ? Math.min(100, ((pts - tier.min) / (tier.nextMin - tier.min)) * 100)
    : 100;

  /* honour ring */
  const RING_R    = 30;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC * (1 - honour / 100);

  /* badges */
  const earnedBadges = BADGES_DEF.map(b => ({ ...b, got: b.earned(won,lost,videos.length,honour) }));

  /* social links */
  const socials = [
    { key:"instagram", icon:"📸", base:"https://instagram.com/"  },
    { key:"twitter",   icon:"𝕏",  base:"https://twitter.com/"   },
    { key:"linkedin",  icon:"💼", base:"https://linkedin.com/in/"},
    { key:"youtube",   icon:"▶️", base:"https://youtube.com/@"  },
    { key:"tiktok",    icon:"🎵", base:"https://tiktok.com/@"   },
  ].filter(s => profile?.[s.key]);

  /* recent bets */
  const recentBets = [...bets]
    .sort((a,b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))
    .slice(0, 5);

  return (
    <div style={{ minHeight:"100vh", background:C.page, paddingBottom:"100px" }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .quote-in { animation: fadein .45s ease; }
        ::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── BACK BUTTON ── */}
      <div style={{ position:"fixed", top:"env(safe-area-inset-top,0px)", left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", zIndex:100, padding:"12px 16px", pointerEvents:"none" }}>
        <button type="button"
          onClick={() => navigate(-1)}
          style={{ width:"40px", height:"40px", borderRadius:"50%", background:"rgba(44,74,62,0.7)", border:"1px solid rgba(110,231,183,0.3)", color:"#fff", fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", pointerEvents:"auto" }}>
          ←
        </button>
      </div>

      {/* ══════════════ HEADER — chalkboard ══════════════ */}
      <div style={{ background:C.chalkboard, padding:"56px 20px 44px", textAlign:"center", position:"relative" }}>
        {/* avatar with tier badge */}
        <div style={{ position:"relative", display:"inline-block", marginBottom:"12px" }}>
          {photoURL
            ? <img src={photoURL} alt={displayName} style={{ width:"88px", height:"88px", borderRadius:"50%", objectFit:"cover", border:"4px solid rgba(110,231,183,0.35)" }}/>
            : <div style={{ width:"88px", height:"88px", borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"36px", fontWeight:"700", color:"#fff", border:"4px solid rgba(110,231,183,0.25)", margin:"0 auto" }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
          }
          {/* tier badge overlay */}
          <div style={{ position:"absolute", bottom:"2px", right:"2px", background:C.gold, borderRadius:"50%", width:"28px", height:"28px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", border:`3px solid ${C.chalkboard}` }}>
            {tier.icon}
          </div>
        </div>

        <div style={{ fontSize:"21px", fontWeight:"700", color:"#fff", marginBottom:"3px", fontStyle:"italic", letterSpacing:"0.03em" }}>
          {displayName.toUpperCase()}
        </div>
        <div style={{ fontSize:"12px", color:C.accentSoft, fontFamily:"monospace", marginBottom:"10px" }}>
          @{username}
        </div>

        {bio && (
          <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.6)", fontStyle:"italic", marginBottom:"10px", padding:"0 24px" }}>
            "{bio}"
          </div>
        )}

        <div style={{ display:"inline-flex", gap:"6px" }}>
          <div style={{ background:"rgba(110,231,183,0.15)", border:"1px solid rgba(110,231,183,0.3)", borderRadius:"20px", padding:"4px 12px", fontSize:"11px", color:C.accentSoft, fontFamily:"monospace" }}>
            {tier.icon} {tier.name.toUpperCase()}
          </div>
          <div style={{ background:"rgba(110,231,183,0.15)", border:"1px solid rgba(110,231,183,0.3)", borderRadius:"20px", padding:"4px 12px", fontSize:"11px", color:C.accentSoft, fontFamily:"monospace" }}>
            H: {honour}
          </div>
        </div>

        {/* edit button for own profile */}
        {isMe && (
          <div style={{ position:"absolute", top:"16px", right:"16px" }}>
            <button type="button" onClick={() => navigate("/edit-profile")}
              style={{ background:"rgba(110,231,183,0.15)", border:"1px solid rgba(110,231,183,0.3)", borderRadius:"20px", padding:"6px 14px", fontSize:"11px", color:C.accentSoft, cursor:"pointer", fontFamily:"monospace" }}>
              Edit ✏️
            </button>
          </div>
        )}
      </div>

      {/* ══════════════ FLOATING STAT CARDS ══════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", margin:"-22px 12px 10px", position:"relative", zIndex:1 }}>
        <StatCard val={won}    label="WINS"   color={C.accent} />
        <StatCard val={lost}   label="LOSSES" color={C.gold}   />
        <StatCard val={honour} label="HONOUR" color={C.accent} dark />
      </div>

      <div style={{ padding:"0 10px", display:"flex", flexDirection:"column", gap:"10px" }}>

        {/* ══════════════ ROTATING QUOTE ══════════════ */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"16px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
            <span style={{ fontSize:"10px", color:C.muted, fontFamily:"monospace", letterSpacing:"0.1em" }}>TODAY'S QUOTE</span>
            <span style={{ fontSize:"10px", color:C.accent, fontFamily:"monospace" }}>{today}</span>
          </div>
          <div style={{ fontSize:"26px", color:C.accent, lineHeight:1, marginBottom:"6px" }}>"</div>
          <div
            key={quoteIdx}
            className="quote-in"
            style={{ fontSize:"14px", color:C.heading, lineHeight:"1.6", fontStyle:"italic", minHeight:"52px", opacity: quoteFade ? 1 : 0, transition:"opacity 0.2s" }}>
            {QUOTES[quoteIdx]}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"12px" }}>
            {/* dot indicators */}
            <div style={{ display:"flex", gap:"4px" }}>
              {QUOTES.map((_,i) => (
                <div key={i} style={{ width: i===quoteIdx?"16px":"6px", height:"6px", borderRadius:"3px", background: i===quoteIdx ? C.accent : C.border, transition:"all 0.3s" }}/>
              ))}
            </div>
            <button type="button" onClick={nextQuote}
              style={{ background:C.page, border:`1px solid ${C.border}`, borderRadius:"20px", padding:"5px 12px", fontSize:"11px", color:C.accent, cursor:"pointer", fontFamily:"monospace" }}>
              next ›
            </button>
          </div>
        </div>

        {/* ══════════════ HONOUR BAR ══════════════ */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
            <span style={{ fontSize:"13px", fontWeight:"600", color:C.heading }}>Honour Score</span>
            <span style={{ fontSize:"13px", color:C.accent, fontFamily:"monospace", fontWeight:"700" }}>{honour} / 100</span>
          </div>
          <div style={{ height:"10px", background:C.page, borderRadius:"5px", border:`1px solid ${C.border}`, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${honour}%`, background:`linear-gradient(90deg,${C.accent},#34d399)`, borderRadius:"5px", transition:"width 0.8s ease" }}/>
          </div>
          {tier.next && (
            <div style={{ fontSize:"11px", color:C.muted, marginTop:"6px" }}>
              {ptsToNext} pts to reach <span style={{ color:C.blue, fontWeight:"600" }}>
                {TIERS.find(t=>t.name===tier.next)?.icon} {tier.next}
              </span>
            </div>
          )}
        </div>

        {/* ══════════════ HONOUR RING + STATS ══════════════ */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"16px" }}>
          {/* SVG ring */}
          <div style={{ flexShrink:0 }}>
            <svg width="76" height="76" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r={RING_R} fill="none" stroke={C.border} strokeWidth="7"/>
              <circle cx="36" cy="36" r={RING_R} fill="none" stroke={C.accent} strokeWidth="7"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
                style={{ transition:"stroke-dashoffset 1s ease" }}
              />
              <text x="36" y="41" textAnchor="middle" fontSize="16" fontWeight="700" fill={C.heading}>{honour}</text>
            </svg>
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"10px" }}>
            <StatRow label="🔥 Win Streak"  val={`${won > 0 ? won : 0}`} color={C.gold}   />
            <StatRow label="🎥 Videos"       val={videos.length}          color={C.blue}   />
            <StatRow label="⚔️ Total Bets"  val={total}                  color={C.heading}/>
            <StatRow label="📊 Win Rate"     val={`${winRate}%`}          color={C.accent} />
          </div>
        </div>

        {/* ══════════════ BADGES ══════════════ */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
            <span style={{ fontSize:"10px", color:C.muted, fontFamily:"monospace", letterSpacing:"0.1em" }}>BADGES</span>
            <span style={{ fontSize:"10px", color:C.accent, fontFamily:"monospace" }}>
              {earnedBadges.filter(b=>b.got).length} / {BADGES_DEF.length} earned
            </span>
          </div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            {earnedBadges.map(b => (
              <div key={b.name} title={b.desc}
                style={{ background: b.got ? C.page : "transparent", border:`1px solid ${b.got ? C.border : C.border}`, borderRadius:"10px", padding:"6px 12px", fontSize:"12px", color: b.got ? C.heading : C.muted, fontWeight: b.got ? "600" : "400", opacity: b.got ? 1 : 0.4, transition:"all 0.2s" }}>
                {b.icon} {b.name}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════ SOCIAL LINKS ══════════════ */}
        {socials.length > 0 && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"14px 16px" }}>
            <div style={{ fontSize:"10px", color:C.muted, fontFamily:"monospace", letterSpacing:"0.1em", marginBottom:"12px" }}>FIND ME ON</div>
            <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
              {socials.map(s => (
                <a key={s.key} href={`${s.base}${profile[s.key]}`} target="_blank" rel="noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:"6px", background:C.page, border:`1px solid ${C.border}`, borderRadius:"20px", padding:"6px 14px", fontSize:"13px", color:C.heading, textDecoration:"none", fontWeight:"500" }}>
                  <span style={{ fontSize:"16px" }}>{s.icon}</span>
                  {profile[s.key]}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ RECENT BETS ══════════════ */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"14px 16px" }}>
          <div style={{ fontSize:"10px", color:C.muted, fontFamily:"monospace", letterSpacing:"0.1em", marginBottom:"12px" }}>RECENT BETS</div>
          {recentBets.length === 0 ? (
            <div style={{ textAlign:"center", padding:"20px 0", color:C.muted, fontSize:"13px" }}>
              No bets yet 🎯
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {recentBets.map(b => {
                const s = BET_STATUS_STYLE[b.status] || BET_STATUS_STYLE.pending;
                return (
                  <div key={b.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:C.page, borderRadius:"10px", border:`1px solid ${C.border}` }}>
                    <div style={{ flex:1, marginRight:"8px" }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color:C.heading, marginBottom:"2px" }}>
                        {b.title || `${b.reps || ""} ${b.forfeit || "Bet"}`}
                      </div>
                      <div style={{ fontSize:"11px", color:C.muted, fontFamily:"monospace" }}>{ago(b.createdAt)}</div>
                    </div>
                    <div style={{ background:s.bg, color:s.color, fontSize:"10px", fontWeight:"700", padding:"4px 10px", borderRadius:"10px", border:s.border||"none", flexShrink:0 }}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════ VIDEOS GRID ══════════════ */}
        {videos.length > 0 && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"14px 16px" }}>
            <div style={{ fontSize:"10px", color:C.muted, fontFamily:"monospace", letterSpacing:"0.1em", marginBottom:"12px" }}>
              FORFEIT VIDEOS ({videos.length})
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"6px" }}>
              {videos.slice(0,6).map(v => (
                <div key={v.id} style={{ aspectRatio:"1", background:"#000", borderRadius:"10px", overflow:"hidden", position:"relative", cursor:"pointer" }}
                  onClick={() => window.open(v.videoUrl,"_blank")}>
                  <video src={v.videoUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} preload="metadata"/>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.25)", fontSize:"20px" }}>▶</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── small helpers ── */
function StatCard({ val, label, color, dark }) {
  return (
    <div style={{ background: dark ? "#2C4A3E" : "#fff", border:`1px solid ${dark?"rgba(110,231,183,0.2)":"#d1fae5"}`, borderRadius:"14px", padding:"14px 6px", textAlign:"center", boxShadow:`0 4px 12px rgba(44,74,62,${dark?0.2:0.08})` }}>
      <div style={{ fontSize:"26px", fontWeight:"700", color: dark ? "#10b981" : color, fontStyle:"italic" }}>{val}</div>
      <div style={{ fontSize:"9px", color: dark ? "rgba(110,231,183,0.6)" : "#6b7280", fontFamily:"monospace", marginTop:"2px" }}>{label}</div>
    </div>
  );
}

function StatRow({ label, val, color }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ fontSize:"13px", color:"#052e16", fontWeight:"600" }}>{label}</span>
      <span style={{ fontSize:"16px", fontWeight:"700", color }}>{val}</span>
    </div>
  );
}