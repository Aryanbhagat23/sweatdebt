// src/components/LiveSportsFeed.jsx
// Real live sports data from ESPN's free public API
// Users can tap "Bet on this" to create a SweatDebt fitness bet tied to a real match

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", coral:"#ff6b4a", green:"#00e676",
  red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a",
  purple:"#a855f7", amber:"#f59e0b",
};

// ESPN free public APIs — no key needed
const SPORTS = [
  { key:"nba",     label:"🏀 NBA",     url:"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"     },
  { key:"nfl",     label:"🏈 NFL",     url:"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"     },
  { key:"soccer",  label:"⚽ Soccer",  url:"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"     },
  { key:"nhl",     label:"🏒 NHL",     url:"https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard"     },
  { key:"mlb",     label:"⚾ MLB",     url:"https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard"     },
  { key:"mma",     label:"🥊 UFC/MMA", url:"https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard"     },
];

// Fitness forfeits tied to sports — loser does these
const SPORT_FORFEITS = {
  nba:    ["50 free throws (squats)", "100 dribble hops (jumping jacks)", "30 dunks (box jumps)"],
  nfl:    ["50 touchdown celebrations (burpees)", "100 yard sprint (200 jumping jacks)", "30 tackling squats"],
  soccer: ["50 penalty kicks (lunges per leg)", "100 keepie-uppies (high knees)", "20 headers (situps)"],
  nhl:    ["50 slap shots (squat jumps)", "100 puck pickups (mountain climbers)", "2 min plank (penalty box)"],
  mlb:    ["50 home run swings (standing rotations)", "100 base slides (burpees)", "30 pitching reps (pushups)"],
  mma:    ["50 jabs (pushups)", "100 kicks (jump squats)", "3 min shadowbox"],
};

export default function LiveSportsFeed({ user }) {
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState("nba");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null); // which team they're betting on
  const timerRef = useRef(null);

  const fetchGames = async (sport) => {
    try {
      setLoading(true); setError(null);
      const sportConfig = SPORTS.find(s => s.key === sport);
      const res = await fetch(sportConfig.url);
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      const events = data.events || [];

      const parsed = events.map(e => {
        const comp = e.competitions?.[0];
        const home = comp?.competitors?.find(c => c.homeAway === "home");
        const away = comp?.competitors?.find(c => c.homeAway === "away");
        const status = comp?.status?.type;
        const situation = comp?.situation;

        return {
          id: e.id,
          sport,
          name: e.name,
          date: e.date,
          status: status?.name || "scheduled",
          statusShortDetail: status?.shortDetail || "",
          isLive: status?.state === "in",
          isComplete: status?.completed || false,
          homeTeam: {
            id: home?.team?.id,
            name: home?.team?.displayName || home?.team?.name,
            shortName: home?.team?.abbreviation,
            logo: home?.team?.logo,
            score: home?.score,
            color: home?.team?.color ? `#${home.team.color}` : C.cyan,
            record: home?.records?.[0]?.summary || "",
          },
          awayTeam: {
            id: away?.team?.id,
            name: away?.team?.displayName || away?.team?.name,
            shortName: away?.team?.abbreviation,
            logo: away?.team?.logo,
            score: away?.score,
            color: away?.team?.color ? `#${away.team.color}` : C.coral,
            record: away?.records?.[0]?.summary || "",
          },
          venue: comp?.venue?.fullName,
          broadcast: comp?.broadcasts?.[0]?.names?.[0],
          clock: situation?.clock || "",
          period: situation?.period || comp?.status?.period || 0,
          headline: e.competitions?.[0]?.headlines?.[0]?.shortLinkText || "",
          odds: comp?.odds?.[0] || null,
        };
      });

      // Sort: live first, then upcoming, then completed
      parsed.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (!a.isComplete && b.isComplete) return -1;
        if (a.isComplete && !b.isComplete) return 1;
        return new Date(a.date) - new Date(b.date);
      });

      setGames(parsed);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError("Could not load live data. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames(activeSport);
    // Auto-refresh every 30 seconds
    timerRef.current = setInterval(() => fetchGames(activeSport), 30000);
    return () => clearInterval(timerRef.current);
  }, [activeSport]);

  const handleBetOnGame = (game, team) => {
    setSelectedGame(game);
    setSelectedTeam(team);
  };

  const createBet = (forfeitText) => {
    if (!selectedGame || !selectedTeam) return;
    const opponent = selectedTeam.id === selectedGame.homeTeam.id ? selectedGame.awayTeam : selectedGame.homeTeam;
    navigate("/create", {
      state: {
        prefillDesc: `${selectedGame.awayTeam.shortName} vs ${selectedGame.homeTeam.shortName} — I'm backing ${selectedTeam.shortName}!`,
        prefillForfeit: forfeitText,
        prefillReps: "",
        gameId: selectedGame.id,
        gameName: selectedGame.name,
        sport: selectedGame.sport,
      }
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  };

  const liveCount = games.filter(g => g.isLive).length;
  const forfeits = SPORT_FORFEITS[activeSport] || SPORT_FORFEITS.nba;

  return (
    <div style={{ margin:"0 0 16px" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>

      {/* Section header */}
      <div style={{ padding:"0 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:C.white, letterSpacing:"0.04em" }}>
            Live <span style={{ color:C.cyan }}>Sports</span>
          </div>
          {liveCount > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"5px", background:"rgba(255,77,109,0.15)", border:"1px solid rgba(255,77,109,0.4)", borderRadius:"20px", padding:"3px 10px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.red, animation:"livePulse 1s ease-in-out infinite" }} />
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.red, fontWeight:"700", letterSpacing:"0.06em" }}>{liveCount} LIVE</span>
            </div>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {lastUpdated && (
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.dim }}>
              {lastUpdated.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </span>
          )}
          <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:C.bg2, border:`1px solid ${C.border1}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:"14px" }}
            onClick={() => fetchGames(activeSport)}>🔄</div>
        </div>
      </div>

      {/* Sport tabs */}
      <div style={{ display:"flex", gap:"8px", padding:"0 16px 12px", overflowX:"auto" }}>
        {SPORTS.map(s => (
          <button key={s.key} style={{
            background: activeSport===s.key ? `linear-gradient(135deg,${C.cyan},${C.purple})` : C.bg2,
            border: `1px solid ${activeSport===s.key ? "transparent" : C.border1}`,
            borderRadius:"20px", padding:"7px 14px",
            fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600",
            color: activeSport===s.key ? "#000" : C.muted,
            cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
            transition:"all 0.2s",
          }} onClick={() => setActiveSport(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:"flex", justifyContent:"center", padding:"32px" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"50%", border:`3px solid ${C.border1}`, borderTop:`3px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ margin:"0 16px", background:"rgba(255,77,109,0.1)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:"14px", padding:"16px", textAlign:"center" }}>
          <div style={{ fontSize:"32px", marginBottom:"8px" }}>📡</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted }}>{error}</div>
          <button style={{ marginTop:"12px", background:"transparent", border:`1px solid ${C.border2}`, borderRadius:"10px", padding:"8px 16px", color:C.cyan, fontFamily:"'DM Sans',sans-serif", fontSize:"13px", cursor:"pointer" }} onClick={() => fetchGames(activeSport)}>Try again</button>
        </div>
      )}

      {/* No games */}
      {!loading && !error && games.length === 0 && (
        <div style={{ margin:"0 16px", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"24px", textAlign:"center" }}>
          <div style={{ fontSize:"40px", marginBottom:"10px" }}>🏟️</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:C.muted, letterSpacing:"0.04em" }}>No games right now</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.dim, marginTop:"4px" }}>Check back during game season!</div>
        </div>
      )}

      {/* Games list */}
      {!loading && !error && games.length > 0 && (
        <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:"10px" }}>
          {games.slice(0, 10).map(game => (
            <GameCard key={game.id} game={game} onBet={handleBetOnGame} formatTime={formatTime} />
          ))}
        </div>
      )}

      {/* Bet creation modal */}
      {selectedGame && selectedTeam && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:2000 }} onClick={() => { setSelectedGame(null); setSelectedTeam(null); }} />
          <div style={{
            position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
            width:"100%", maxWidth:"480px",
            background:C.bg1, borderRadius:"20px 20px 0 0",
            zIndex:2001, padding:"20px 20px 40px",
            animation:"slideUp 0.35s cubic-bezier(0.32,0.72,0,1)",
          }}>
            <div style={{ width:"36px", height:"4px", background:C.bg3, borderRadius:"2px", margin:"0 auto 16px" }} />
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:C.white, letterSpacing:"0.04em", marginBottom:"4px" }}>
              Create Fitness Bet
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"16px" }}>
              You're backing <span style={{ color:C.cyan, fontWeight:"600" }}>{selectedTeam.name}</span> in {selectedGame.awayTeam.shortName} vs {selectedGame.homeTeam.shortName}
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", marginBottom:"10px" }}>IF YOUR TEAM LOSES, YOUR FORFEIT IS:</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {forfeits.map((f, i) => (
                <button key={i} style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.white, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:"12px", transition:"all 0.15s" }}
                  onClick={() => createBet(f)}>
                  <span style={{ fontSize:"20px" }}>💪</span>
                  <span>{f}</span>
                  <span style={{ marginLeft:"auto", color:C.cyan, fontSize:"18px" }}>→</span>
                </button>
              ))}
              <button style={{ background:"transparent", border:"none", padding:"12px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, cursor:"pointer" }}
                onClick={() => createBet("")}>
                ✏️ Write my own forfeit
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GameCard({ game, onBet, formatTime }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor = (team, other) => {
    if (!game.isComplete && !game.isLive) return C.white;
    if (parseInt(team.score) > parseInt(other.score)) return C.green;
    if (parseInt(team.score) < parseInt(other.score)) return C.red;
    return C.amber;
  };

  return (
    <div style={{
      background:C.bg2,
      border:`1px solid ${game.isLive ? "rgba(255,77,109,0.4)" : C.border1}`,
      borderRadius:"18px", overflow:"hidden",
      boxShadow: game.isLive ? "0 0 20px rgba(255,77,109,0.1)" : "none",
      transition:"all 0.2s",
    }}>
      {/* Live banner */}
      {game.isLive && (
        <div style={{ background:"rgba(255,77,109,0.15)", padding:"6px 14px", display:"flex", alignItems:"center", gap:"8px", borderBottom:"1px solid rgba(255,77,109,0.2)" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.red, animation:"livePulse 1s ease-in-out infinite" }} />
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.red, fontWeight:"700", letterSpacing:"0.06em" }}>
            LIVE · {game.statusShortDetail}
          </span>
          {game.broadcast && (
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.dim, marginLeft:"auto" }}>📺 {game.broadcast}</span>
          )}
        </div>
      )}

      <div style={{ padding:"14px" }}>
        {/* Teams + scores */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
          {/* Away team */}
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}
            onClick={() => onBet(game, game.awayTeam)}>
            {game.awayTeam.logo && (
              <img src={game.awayTeam.logo} alt="" style={{ width:"36px", height:"36px", objectFit:"contain", flexShrink:0 }} onError={e=>e.target.style.display="none"} />
            )}
            {!game.awayTeam.logo && (
              <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`${game.awayTeam.color}22`, border:`1px solid ${game.awayTeam.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"13px", color:game.awayTeam.color, flexShrink:0 }}>
                {game.awayTeam.shortName?.slice(0,3)}
              </div>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:"700", color:C.white, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {game.awayTeam.shortName || game.awayTeam.name}
              </div>
              {game.awayTeam.record && (
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted }}>{game.awayTeam.record}</div>
              )}
            </div>
          </div>

          {/* Score / Time */}
          <div style={{ textAlign:"center", flexShrink:0, minWidth:"80px" }}>
            {(game.isLive || game.isComplete) && game.awayTeam.score !== undefined ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:scoreColor(game.awayTeam, game.homeTeam), lineHeight:1 }}>
                  {game.awayTeam.score}
                </span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"14px", color:C.dim }}>—</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:scoreColor(game.homeTeam, game.awayTeam), lineHeight:1 }}>
                  {game.homeTeam.score}
                </span>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", color:C.cyan }}>VS</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted }}>{formatTime(game.date)}</div>
              </div>
            )}
            {game.isComplete && (
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted, marginTop:"2px" }}>FINAL</div>
            )}
          </div>

          {/* Home team */}
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px", flexDirection:"row-reverse", cursor:"pointer" }}
            onClick={() => onBet(game, game.homeTeam)}>
            {game.homeTeam.logo && (
              <img src={game.homeTeam.logo} alt="" style={{ width:"36px", height:"36px", objectFit:"contain", flexShrink:0 }} onError={e=>e.target.style.display="none"} />
            )}
            {!game.homeTeam.logo && (
              <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`${game.homeTeam.color}22`, border:`1px solid ${game.homeTeam.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"13px", color:game.homeTeam.color, flexShrink:0 }}>
                {game.homeTeam.shortName?.slice(0,3)}
              </div>
            )}
            <div style={{ flex:1, minWidth:0, textAlign:"right" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:"700", color:C.white, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {game.homeTeam.shortName || game.homeTeam.name}
              </div>
              {game.homeTeam.record && (
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted }}>{game.homeTeam.record}</div>
              )}
            </div>
          </div>
        </div>

        {/* Tap to bet prompt */}
        {!game.isComplete && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"6px", alignItems:"center" }}>
            <button style={{
              background:`rgba(0,212,255,0.08)`, border:`1px solid rgba(0,212,255,0.25)`,
              borderRadius:"10px", padding:"8px 6px",
              fontFamily:"'Bebas Neue',sans-serif", fontSize:"13px", letterSpacing:"0.04em",
              color:C.cyan, cursor:"pointer", transition:"all 0.15s",
            }} onClick={() => onBet(game, game.awayTeam)}>
              BET {game.awayTeam.shortName}
            </button>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.dim, textAlign:"center" }}>
              {game.venue ? game.venue.split(",")[0] : ""}
            </div>
            <button style={{
              background:`rgba(168,85,247,0.08)`, border:`1px solid rgba(168,85,247,0.25)`,
              borderRadius:"10px", padding:"8px 6px",
              fontFamily:"'Bebas Neue',sans-serif", fontSize:"13px", letterSpacing:"0.04em",
              color:C.purple, cursor:"pointer", transition:"all 0.15s",
            }} onClick={() => onBet(game, game.homeTeam)}>
              BET {game.homeTeam.shortName}
            </button>
          </div>
        )}

        {/* Final result */}
        {game.isComplete && (
          <div style={{ textAlign:"center", padding:"4px 0" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted }}>
              {parseInt(game.awayTeam.score) > parseInt(game.homeTeam.score) ? `${game.awayTeam.shortName} won` : `${game.homeTeam.shortName} won`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}