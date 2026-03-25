import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import T from "../theme";

const ALL_BADGES = [
  { id:"first_win",    emoji:"🏆", label:"First Win",      desc:"Won your first bet"          },
  { id:"first_loss",   emoji:"💀", label:"First L",        desc:"Lost your first bet"         },
  { id:"on_fire",      emoji:"🔥", label:"On Fire",        desc:"Won 3 in a row"              },
  { id:"sweat_lord",   emoji:"👑", label:"Sweat Lord",     desc:"Won 10 bets"                 },
  { id:"humble",       emoji:"🙏", label:"Humble",         desc:"Paid debt within 24 hours"  },
  { id:"trash_talker", emoji:"😤", label:"Trash Talker",   desc:"10 comments posted"          },
  { id:"social",       emoji:"👥", label:"Social",         desc:"Added 5 friends"             },
  { id:"streak_3",     emoji:"⚡", label:"3-Day Streak",   desc:"3 day activity streak"       },
  { id:"streak_7",     emoji:"🌟", label:"Week Warrior",   desc:"7 day activity streak"       },
  { id:"content",      emoji:"🎥", label:"Content King",   desc:"Posted 5 proof videos"       },
  { id:"multi_sport",  emoji:"🎯", label:"Multi-Sport",    desc:"Bet on 3 different sports"   },
  { id:"honest",       emoji:"⚖️", label:"Honest",         desc:"Zero disputed bets"          },
  { id:"challenger",   emoji:"⚔️", label:"Challenger",     desc:"Challenged 5 different people" },
  { id:"comeback",     emoji:"🔄", label:"Comeback Kid",   desc:"Won after losing 3 in a row" },
  { id:"legend",       emoji:"🦁", label:"Legend",         desc:"50+ bets total"              },
];

// Default export: badge grid used in UserProfile
export default function BadgeDisplay({ uid }) {
  const [earned,  setEarned]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db,"users",uid)).then(snap => {
      if (snap.exists()) setEarned(snap.data().badges || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [uid]);

  const earnedSet    = new Set(earned);
  const earnedBadges = ALL_BADGES.filter(b => earnedSet.has(b.id));
  const lockedBadges = ALL_BADGES.filter(b => !earnedSet.has(b.id));

  if (loading) return null;

  return (
    <div style={{background:T.bg1,border:`1px solid ${T.borderCard}`,borderRadius:T.r16,padding:"14px 16px",boxShadow:T.shadowSm}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
        <div style={{fontFamily:T.fontMono,fontSize:"10px",fontWeight:"700",color:T.textMuted,letterSpacing:"0.1em"}}>BADGES</div>
        <div style={{fontFamily:T.fontMono,fontSize:"10px",color:T.accent}}>{earned.length}/{ALL_BADGES.length}</div>
      </div>

      {earnedBadges.length > 0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:lockedBadges.length>0?"12px":"0"}}>
          {earnedBadges.map(b => (
            <div key={b.id} title={b.desc} style={{display:"flex",alignItems:"center",gap:"5px",background:T.accentLight,border:`1px solid ${T.accentBorder}`,borderRadius:T.rFull,padding:"4px 10px"}}>
              <span style={{fontSize:"14px"}}>{b.emoji}</span>
              <span style={{fontFamily:T.fontMono,fontSize:"10px",fontWeight:"700",color:T.accentDark,letterSpacing:"0.04em"}}>{b.label}</span>
            </div>
          ))}
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
          {lockedBadges.slice(0,4).map(b => (
            <div key={b.id} title={`Locked: ${b.desc}`} style={{display:"flex",alignItems:"center",gap:"5px",background:T.bg3,border:`1px solid ${T.border}`,borderRadius:T.rFull,padding:"4px 10px",opacity:0.5}}>
              <span style={{fontSize:"14px",filter:"grayscale(1)"}}>{b.emoji}</span>
              <span style={{fontFamily:T.fontMono,fontSize:"10px",fontWeight:"700",color:T.textMuted,letterSpacing:"0.04em"}}>{b.label}</span>
            </div>
          ))}
          {lockedBadges.length > 4 && <div style={{display:"flex",alignItems:"center",padding:"4px 10px",fontFamily:T.fontMono,fontSize:"10px",color:T.textMuted}}>+{lockedBadges.length-4} more</div>}
        </div>
      )}

      {earnedBadges.length === 0 && (
        <div style={{textAlign:"center",padding:"8px",fontFamily:T.fontBody,fontSize:"13px",color:T.textMuted}}>No badges yet — start betting! 🏆</div>
      )}
    </div>
  );
}

// Named export: toast notification when badge is earned
export function BadgeToast({ badgeId, onClose }) {
  const badge = ALL_BADGES.find(b => b.id === badgeId);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    setTimeout(() => setVis(true), 50);
    const t = setTimeout(() => { setVis(false); setTimeout(onClose, 400); }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (!badge) return null;

  return (
    <>
      <style>{`@keyframes badgeIn{from{transform:translateX(-50%) translateY(-60px) scale(0.85);opacity:0}to{transform:translateX(-50%) translateY(0) scale(1);opacity:1}} @keyframes badgeOut{from{transform:translateX(-50%) translateY(0) scale(1);opacity:1}to{transform:translateX(-50%) translateY(-60px) scale(0.85);opacity:0}}`}</style>
      <div style={{position:"fixed",top:"60px",left:"50%",zIndex:9999,animation:vis?"badgeIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)":"badgeOut 0.4s ease",width:"100%",maxWidth:"340px",padding:"0 20px"}}>
        <div style={{background:T.bg1,border:`1px solid ${T.accentBorder}`,borderRadius:T.r20,padding:"16px 20px",display:"flex",alignItems:"center",gap:"14px",boxShadow:"0 8px 32px rgba(16,185,129,0.25)"}}>
          <div style={{fontSize:"40px",flexShrink:0}}>{badge.emoji}</div>
          <div>
            <div style={{fontFamily:T.fontMono,fontSize:"11px",color:T.accent,letterSpacing:"0.1em",marginBottom:"3px"}}>BADGE UNLOCKED</div>
            <div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:T.panel,letterSpacing:"0.04em",lineHeight:1,marginBottom:"3px",fontStyle:"italic"}}>{badge.label}</div>
            <div style={{fontFamily:T.fontBody,fontSize:"13px",color:T.textMuted}}>{badge.desc}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// Named export: streak indicator
export function StreakBadge({ streak, size="normal" }) {
  if (!streak || streak < 1) return null;
  const cfg = streak>=10
    ? {icon:"👑",color:T.panel,  bg:T.accentLight,border:T.accentBorder}
    : streak>=5
    ? {icon:"⚡",color:T.accentDark,bg:T.accentLight,border:T.accentBorder}
    : streak>=3
    ? {icon:"🔥",color:T.accent, bg:T.accentLight,border:T.accentBorder}
    : {icon:"💪",color:T.textMuted,bg:T.bg3,border:T.border};
  const sm = size==="small";
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:"5px",background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:T.rFull,padding:sm?"3px 8px":"5px 12px"}}>
      <span style={{fontSize:sm?"12px":"16px"}}>{cfg.icon}</span>
      <span style={{fontFamily:T.fontDisplay,fontSize:sm?"13px":"18px",color:cfg.color,letterSpacing:"0.04em"}}>{streak} STREAK</span>
    </div>
  );
}