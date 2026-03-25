import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import T from "../theme";

const SPORT_KEYS = [
  { key:"nba",   label:"NBA",    emoji:"🏀" },
  { key:"nfl",   label:"NFL",    emoji:"🏈" },
  { key:"mlb",   label:"MLB",    emoji:"⚾" },
  { key:"nhl",   label:"NHL",    emoji:"🏒" },
  { key:"soccer",label:"Soccer", emoji:"⚽" },
];

const ESPN_ENDPOINTS = {
  nba:    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  nfl:    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  mlb:    "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  nhl:    "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  soccer: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
};

export default function LiveSportsFeed({ user }) {
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState("nba");
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    setLoading(true); setError(""); setGames([]);
    fetch(ESPN_ENDPOINTS[activeSport])
      .then(r => r.json())
      .then(data => {
        const events = data.events || [];
        setGames(events.slice(0, 6).map(e => {
          const comp = e.competitions?.[0];
          const home = comp?.competitors?.find(c => c.homeAway==="home");
          const away = comp?.competitors?.find(c => c.homeAway==="away");
          const status = comp?.status?.type;
          return {
            id:       e.id,
            homeTeam: home?.team?.abbreviation || "HOME",
            awayTeam: away?.team?.abbreviation || "AWAY",
            homeScore:home?.score || "0",
            awayScore:away?.score || "0",
            homeLogo: home?.team?.logo || null,
            awayLogo: away?.team?.logo || null,
            status:   status?.shortDetail || "Upcoming",
            isLive:   status?.state === "in",
            isOver:   status?.state === "post",
            gameName: e.name,
          };
        }));
        setLoading(false);
      }).catch(() => { setError("Could not load games"); setLoading(false); });
  }, [activeSport]);

  return (
    <div style={{ marginBottom:"8px" }}>
      {/* Sport selector */}
      <div style={{ display:"flex", gap:"8px", padding:"0 16px 10px", overflowX:"auto" }}>
        {SPORT_KEYS.map(s => (
          <button key={s.key} onClick={() => setActiveSport(s.key)} style={{ flexShrink:0, background:activeSport===s.key?T.panel:T.bg1, border:`1.5px solid ${activeSport===s.key?T.accent:T.border}`, borderRadius:T.rFull, padding:"6px 14px", display:"flex", alignItems:"center", gap:"5px", fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:activeSport===s.key?T.accent:T.textMuted, cursor:"pointer", letterSpacing:"0.06em" }}>
            <span>{s.emoji}</span>{s.label}
          </button>
        ))}
      </div>

      {/* Game cards */}
      <div style={{ display:"flex", gap:"10px", padding:"0 16px", overflowX:"auto" }}>
        {loading && Array(3).fill(0).map((_,i) => (
          <div key={i} style={{ flexShrink:0, width:"160px", height:"88px", borderRadius:T.r16, background:T.bg3, animation:"shimmer 1.4s ease-in-out infinite" }} />
        ))}
        {!loading && error && <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, padding:"8px 0" }}>{error}</div>}
        {!loading && games.map(g => (
          <div key={g.id} style={{ flexShrink:0, background:T.panel, borderRadius:T.r16, padding:"12px 14px", cursor:"pointer", minWidth:"160px", border:`1px solid ${g.isLive?T.accentBorder:T.border}`, boxShadow:g.isLive?`0 0 12px rgba(16,185,129,0.2)`:T.shadowSm }}
            onClick={() => navigate("/create", { state: { prefillDesc:`${g.awayTeam} vs ${g.homeTeam} · Loser does workout`, gameName:g.gameName, sport:activeSport } })}>
            {/* Live badge */}
            {g.isLive && (
              <div style={{ display:"flex", alignItems:"center", gap:"4px", marginBottom:"6px" }}>
                <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:T.red, animation:"livePulse 1s ease-in-out infinite" }} />
                <span style={{ fontFamily:T.fontMono, fontSize:"9px", fontWeight:"800", color:T.red, letterSpacing:"0.08em" }}>LIVE</span>
              </div>
            )}
            {g.isOver && <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:"rgba(255,255,255,0.35)", marginBottom:"6px", letterSpacing:"0.08em" }}>FINAL</div>}
            {!g.isLive && !g.isOver && <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:"rgba(255,255,255,0.35)", marginBottom:"6px", letterSpacing:"0.08em" }}>UPCOMING</div>}

            {/* Score */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"6px" }}>
              <div style={{ textAlign:"center", flex:1 }}>
                <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:"rgba(255,255,255,0.6)", letterSpacing:"0.06em" }}>{g.awayTeam}</div>
                <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:"#fff", lineHeight:1 }}>{g.awayScore}</div>
              </div>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:"rgba(255,255,255,0.3)" }}>vs</div>
              <div style={{ textAlign:"center", flex:1 }}>
                <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:"rgba(255,255,255,0.6)", letterSpacing:"0.06em" }}>{g.homeTeam}</div>
                <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:T.accent, lineHeight:1 }}>{g.homeScore}</div>
              </div>
            </div>

            <div style={{ fontFamily:T.fontMono, fontSize:"9px", color:T.accent, textAlign:"center", marginTop:"6px", letterSpacing:"0.06em" }}>+ BET THIS →</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.45}} @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}