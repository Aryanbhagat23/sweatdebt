import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection, query, where, onSnapshot,
  limit, doc, getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const getTheme = () => localStorage.getItem("sweatdebt_theme") || "dark";
const setThemeStorage = (t) => localStorage.setItem("sweatdebt_theme", t);

export default function ProfileOverlay({ user, isOpen, onClose }) {
  const navigate = useNavigate();
  const [bets, setBets] = useState([]);
  const [incomingBets, setIncomingBets] = useState([]);
  const [videos, setVideos] = useState([]);
  const [profile, setProfile] = useState(null); // fresh from Firestore
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [screen, setScreen] = useState("main");
  const [theme, setTheme] = useState(getTheme());
  const [notifPush, setNotifPush] = useState(true);
  const [notifBets, setNotifBets] = useState(true);
  const [notifApproved, setNotifApproved] = useState(true);
  const [privPublic, setPrivPublic] = useState(true);
  const [privVideos, setPrivVideos] = useState(true);
  const [privLeader, setPrivLeader] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [videoQuality, setVideoQuality] = useState("high");

  // Apply theme
  useEffect(() => {
    setThemeStorage(theme);
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
      document.body.style.background = "#f5f5f5";
      if (document.getElementById("root")) document.getElementById("root").style.background = "#f5f5f5";
    } else {
      document.body.style.background = "#111";
      if (document.getElementById("root")) document.getElementById("root").style.background = "#111";
    }
  }, [theme]);

  // Animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setScreen("main");
      setActiveSection(null);
      setTimeout(() => setAnimIn(true), 10);
    } else {
      setAnimIn(false);
      const timer = setTimeout(() => setVisible(false), 380);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Load data — re-runs every time overlay opens to get fresh profile
  useEffect(() => {
    if (!user || !isOpen) return;

    // Fetch fresh profile from Firestore
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) setProfile(snap.data());
    }).catch(e => console.error("Profile fetch error:", e));

    // My bets — no orderBy
    const bq = query(collection(db, "bets"), where("createdBy", "==", user.uid));
    const unsub1 = onSnapshot(bq, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setBets(data);
    }, e => console.error(e));

    // Incoming bets — no orderBy
    const iq = query(collection(db, "bets"), where("opponentEmail", "==", user.email));
    const unsub2 = onSnapshot(iq, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setIncomingBets(data);
    }, e => console.error(e));

    // Videos — no orderBy
    const vq = query(collection(db, "videos"), where("uploadedBy", "==", user.uid));
    const unsub3 = onSnapshot(vq, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setVideos(data.slice(0, 6));
    }, e => console.error(e));

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user, isOpen]); // isOpen dependency ensures fresh load every open

  const won = bets.filter(b => b.status === "won").length;
  const lost = bets.filter(b => b.status === "lost").length;
  const total = bets.length;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
  const honour = Math.max(0, 100 - (bets.filter(b => b.status === "disputed").length * 20));
  const friends = new Set([...bets.map(b => b.opponentEmail), ...incomingBets.map(b => b.createdByEmail)]).size;
  const streak = Math.min(bets.length + videos.length, 7);

  // Use fresh profile data, fall back to auth user
  const displayName = profile?.displayName || user?.displayName || "";
  const photoURL = profile?.photoURL || user?.photoURL || null;
  const username = profile?.username || displayName.toLowerCase().replace(/\s/g, "");
  const bio = profile?.bio || "";

  const badges = [
    { icon: "🔥", name: "On Fire", earned: won >= 1, desc: "Win your first bet" },
    { icon: "⚡", name: "Streak x3", earned: won >= 3, desc: "Win 3 bets" },
    { icon: "💪", name: "100 Reps", earned: videos.length >= 3, desc: "Upload 3 forfeits" },
    { icon: "🏆", name: "First Win", earned: won >= 1, desc: "Win a bet" },
    { icon: "👑", name: "Top 10", earned: winRate >= 70, desc: "70%+ win rate" },
    { icon: "💀", name: "No Mercy", earned: lost === 0 && total >= 3, desc: "Never lost" },
    { icon: "🌟", name: "30-day", earned: false, desc: "Active 30 days" },
    { icon: "🎯", name: "Sniper", earned: winRate >= 90 && total >= 5, desc: "90%+ win rate" },
  ];

  const recentActivity = [
    ...bets.slice(0, 5).map(b => ({
      type: b.status,
      text: b.status === "won"
        ? `Won bet vs ${b.opponentEmail?.split("@")[0]}`
        : b.status === "lost"
        ? `Lost to ${b.opponentEmail?.split("@")[0]}`
        : `Challenged ${b.opponentEmail?.split("@")[0]}`,
      sub: b.description, ts: b.createdAt,
      color: b.status === "won" ? "#00e676" : b.status === "lost" ? "#ff4444" : "#d4ff00",
    })),
    ...videos.slice(0, 3).map(v => ({
      type: "proof", text: "Completed forfeit",
      sub: "Uploaded proof video", ts: v.createdAt, color: "#4a9eff"
    })),
  ].sort((a, b) => (b.ts?.toDate?.()?.getTime() || 0) - (a.ts?.toDate?.()?.getTime() || 0)).slice(0, 5);

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "just now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 172800) return "Yesterday";
    return `${Math.floor(s / 86400)}d ago`;
  };

  const handleSignOut = async () => { onClose(); await signOut(auth); };
  const goTo = (path) => { onClose(); setTimeout(() => navigate(path), 300); };

  const isDark = theme === "dark" || theme === "auto";
  const bg = isDark ? "#1a1a1a" : "#ffffff";
  const bg2 = isDark ? "#222" : "#f0f0f0";
  const bg3 = isDark ? "#2a2a2a" : "#e8e8e8";
  const text = isDark ? "#f5f0e8" : "#1a1a1a";
  const text2 = isDark ? "#888" : "#666";
  const border = isDark ? "#2a2a2a" : "#e0e0e0";

  if (!visible) return null;

  const Toggle = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{
      width: "48px", height: "26px", borderRadius: "13px",
      background: value ? "#d4ff00" : "#333",
      position: "relative", cursor: "pointer",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: "3px",
        left: value ? "22px" : "3px",
        width: "20px", height: "20px", borderRadius: "50%",
        background: value ? "#000" : "#888",
        transition: "left 0.2s",
      }} />
    </div>
  );

  const SettingRow = ({ icon, label, sub, right, onClick, danger }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: "14px",
      padding: "14px 20px", borderBottom: `1px solid ${border}`,
      cursor: onClick ? "pointer" : "default",
      WebkitTapHighlightColor: "transparent", // ADD THIS
      userSelect: "none", // ADD THIS
    }}
  >
      <div style={{
        width: "38px", height: "38px", borderRadius: "10px",
        background: danger ? "rgba(255,68,68,0.1)" : bg2,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "18px", flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "15px", fontWeight: "500", color: danger ? "#ff4444" : text }}>{label}</div>
        {sub && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: text2, marginTop: "2px" }}>{sub}</div>}
      </div>
      {right}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        @keyframes staggerIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .stagger{animation:staggerIn 0.3s forwards;opacity:0;}
        .stagger:nth-child(1){animation-delay:0.04s}
        .stagger:nth-child(2){animation-delay:0.08s}
        .stagger:nth-child(3){animation-delay:0.12s}
        .stagger:nth-child(4){animation-delay:0.16s}
        .stagger:nth-child(5){animation-delay:0.20s}
        .stagger:nth-child(6){animation-delay:0.24s}
        .stagger:nth-child(7){animation-delay:0.28s}
        .stagger:nth-child(8){animation-delay:0.32s}
        .pulse-anim{animation:pulse 1.8s ease-in-out infinite;}
        .tap-scale:active{transform:scale(0.97);opacity:0.8;}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: animIn ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
        backdropFilter: animIn ? "blur(6px)" : "blur(0px)",
        transition: "all 0.35s ease",
      }} onClick={onClose} />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0,
        left: "50%",
        width: "100%", maxWidth: "480px",
        background: bg,
        borderRadius: "24px 24px 0 0",
        maxHeight: "92vh", overflowY: "auto",
        zIndex: 2001,
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        transform: animIn
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(100%)",
        transition: "transform 0.38s cubic-bezier(0.32,0.72,0,1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
      }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ width: "36px", height: "4px", background: border, borderRadius: "2px", margin: "12px auto 0" }} />

        {/* ===== MAIN SCREEN ===== */}
        {screen === "main" && (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px 8px" }}>
              <div style={{ position: "relative", cursor: "pointer" }}
                onClick={() => { onClose(); setTimeout(() => navigate("/edit-profile"), 300); }}>
                {photoURL ? (
                  <img src={photoURL} alt={displayName}
                    style={{ width: "54px", height: "54px", borderRadius: "50%", objectFit: "cover", border: "2px solid #d4ff00" }} />
                ) : (
                  <div style={{
                    width: "54px", height: "54px", borderRadius: "50%",
                    background: "linear-gradient(135deg,#d4ff00,#ff5c1a)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Bebas Neue',sans-serif", fontSize: "22px", color: "#000", flexShrink: 0,
                  }}>{displayName?.charAt(0) || "?"}</div>
                )}
                <div style={{
                  position: "absolute", bottom: "-2px", right: "-2px",
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "#d4ff00", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "10px", border: "2px solid #1a1a1a",
                }}>✏️</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "18px", fontWeight: "700", color: text }}>{displayName}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: text2 }}>
                  @{username} · {friends} friends · {winRate}% win rate
                </div>
                {bio ? <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: text2, marginTop: "2px" }}>{bio}</div> : null}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div className="tap-scale" style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: bg2, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "18px", cursor: "pointer",
                }} onClick={() => setScreen("settings")}>⚙️</div>
                <div className="tap-scale" style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: bg2, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "14px", color: text2, cursor: "pointer",
                }} onClick={onClose}>✕</div>
              </div>
            </div>

            {/* 3 stat cards */}
            <div style={{ display: "flex", gap: "8px", padding: "8px 20px 16px" }}>
              {[
                { val: won, label: "Bets won", color: "#00e676", extra: null },
                { val: streak, label: "Day streak", color: "#ff5c1a", extra: "🔥" },
                { val: videos.length, label: "Forfeits done", color: "#4a9eff", extra: null },
              ].map((s, i) => (
                <div key={i} className="stagger" style={{
                  flex: 1, background: bg2, borderRadius: "14px",
                  padding: "14px 8px", textAlign: "center", position: "relative", overflow: "hidden",
                }}>
                  <div className={s.extra ? "pulse-anim" : ""} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", color: s.color }}>{s.val}</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "11px", color: text2, marginTop: "2px" }}>{s.label}</div>
                  {s.extra && <div style={{ position: "absolute", top: "6px", right: "8px", fontSize: "14px" }}>{s.extra}</div>}
                </div>
              ))}
            </div>

            {/* Honour bar */}
            <div style={{ margin: "0 20px 16px", background: bg2, borderRadius: "14px", padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.08em" }}>HONOUR SCORE</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px", fontWeight: "500", color: "#d4ff00" }}>{honour}/100</span>
              </div>
              <div style={{ height: "6px", background: bg3, borderRadius: "3px", marginBottom: "8px" }}>
                <div style={{ height: "100%", width: `${honour}%`, background: "linear-gradient(90deg,#d4ff00,#00e676)", borderRadius: "3px", transition: "width 0.8s" }} />
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: text2 }}>
                {honour >= 80 ? "🟢 Trusted player" : honour >= 50 ? "🟡 Building reputation" : "🔴 Complete your forfeits!"}
              </div>
            </div>

            {/* Badges */}
            <div style={{ padding: "0 20px 4px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "12px" }}>BADGES</div>
              <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
                {badges.map((b, i) => (
                  <div key={b.name} className="stagger" style={{
                    flexShrink: 0,
                    background: b.earned ? "rgba(212,255,0,0.08)" : bg2,
                    border: b.earned ? "1px solid rgba(212,255,0,0.3)" : `1px solid ${border}`,
                    borderRadius: "16px", padding: "14px 10px", textAlign: "center", width: "76px",
                    opacity: b.earned ? 1 : 0.4,
                  }}>
                    <div style={{ fontSize: "26px", marginBottom: "6px" }}>{b.icon}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: b.earned ? "#d4ff00" : text2, lineHeight: "1.3" }}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div style={{ padding: "16px 20px 4px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "12px" }}>RECENT ACTIVITY</div>
              {recentActivity.length === 0 ? (
                <div style={{ fontFamily: "'DM Sans',sans-serif", color: text2, fontSize: "13px", textAlign: "center", padding: "16px 0" }}>
                  No activity yet — place a bet! ⚔️
                </div>
              ) : (
                recentActivity.map((a, i) => (
                  <div key={i} className="stagger" style={{
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    padding: "12px", background: bg2, borderRadius: "12px", marginBottom: "6px",
                  }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: a.color, flexShrink: 0, marginTop: "6px",
                      boxShadow: `0 0 8px ${a.color}`,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "14px", fontWeight: "500", color: text }}>{a.text}</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: text2, marginTop: "2px" }}>
                        {a.sub?.length > 42 ? a.sub.slice(0, 42) + "..." : a.sub}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, flexShrink: 0, marginTop: "2px" }}>{timeAgo(a.ts)}</div>
                  </div>
                ))
              )}
            </div>

            {/* Quick access */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "12px" }}>QUICK ACCESS</div>
              {[
                { icon: "⚔️", label: "My Bets", sub: `${total} bets · ${incomingBets.length} challenges`, action: () => goTo("/bets") },
                {icon:"👥", label:"My Friends", sub:"See your friends list", action:()=>goTo("/my-friends")},
                {icon:"🔍", label:"Find Friends", sub:"Search and add new friends", action:()=>goTo("/friends")},
                { icon: "✏️", label: "Edit Profile", sub: "Change photo, username, bio", action: () => goTo("/edit-profile") },
                { icon: "🎥", label: "My Videos", sub: `${videos.length} forfeit videos`, action: () => setActiveSection(activeSection === "videos" ? null : "videos") },
                { icon: "🏆", label: "Leaderboard", sub: "See your ranking", action: () => goTo("/leaderboard") },
                { icon: "⚙️", label: "Settings", sub: "Appearance, privacy, notifications", action: () => setScreen("settings") },
              ].map((item, i) => (
                <div key={item.label}>
                  <div className="tap-scale stagger" style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px", background: bg2, borderRadius: "14px",
                    marginBottom: "8px", cursor: "pointer",
                  }} onClick={item.action}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: bg3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "16px", fontWeight: "500", color: text }}>{item.label}</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: text2, marginTop: "2px" }}>{item.sub}</div>
                    </div>
                    <div style={{ fontSize: "20px", color: text2 }}>›</div>
                  </div>

                  {item.label === "My Videos" && activeSection === "videos" && (
                    <div style={{ background: bg2, borderRadius: "12px", padding: "12px", marginBottom: "8px", marginTop: "-4px" }}>
                      {videos.length === 0 ? (
                        <div style={{ fontFamily: "'DM Sans',sans-serif", color: text2, fontSize: "13px", textAlign: "center", padding: "8px" }}>No videos yet 😤</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                          {videos.map(v => (
                            <div key={v.id} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", borderRadius: "8px", cursor: "pointer", background: bg3 }}
                              onClick={() => window.open(v.videoUrl, "_blank")}>
                              <video src={v.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} preload="metadata" />
                              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", fontSize: "18px", color: "#fff" }}>▶</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Log out */}
              <div className="tap-scale" style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "14px", background: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.15)",
                borderRadius: "14px", marginBottom: "8px", cursor: "pointer",
              }} onClick={handleSignOut}>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(255,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🚪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "16px", fontWeight: "500", color: "#ff4444" }}>Log out</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: text2, marginTop: "2px" }}>{user?.email}</div>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", textAlign: "center", color: border, fontSize: "11px", padding: "16px 0 0" }}>SweatDebt v1.0</div>
          </>
        )}

        {/* ===== SETTINGS SCREEN ===== */}
        {screen === "settings" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px 8px" }}>
              <div className="tap-scale" style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: bg2, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "18px", cursor: "pointer",
              }} onClick={() => setScreen("main")}>←</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "24px", color: text, flex: 1, letterSpacing: "0.04em" }}>Settings</div>
              <div className="tap-scale" style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: bg2, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "14px", color: text2, cursor: "pointer",
              }} onClick={onClose}>✕</div>
            </div>

            {/* Theme */}
            <div style={{ padding: "16px 20px 8px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "8px" }}>APPEARANCE</div>
            </div>
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ background: bg2, borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "13px", color: text2, marginBottom: "10px" }}>Theme</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["dark", "light", "auto"].map(t => (
                      <div key={t} className="tap-scale" style={{
                        flex: 1, padding: "10px", borderRadius: "12px", textAlign: "center", cursor: "pointer",
                        background: theme === t ? "#d4ff00" : bg3,
                        border: theme === t ? "none" : `1px solid ${border}`,
                        transition: "all 0.2s",
                      }} onClick={() => setTheme(t)}>
                        <div style={{ fontSize: "20px", marginBottom: "4px" }}>
                          {t === "dark" ? "🌙" : t === "light" ? "☀️" : "🔄"}
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", fontWeight: "500", color: theme === t ? "#000" : text2, textTransform: "capitalize" }}>{t}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "8px" }}>NOTIFICATIONS</div>
            </div>
            <div style={{ margin: "0 20px 16px", background: bg2, borderRadius: "16px", overflow: "hidden" }}>
              <SettingRow icon="🔔" label="Push notifications" sub="Get notified when challenged"
  right={<Toggle value={notifPush} onChange={setNotifPush}/>}/>
<SettingRow icon="⚔️" label="Bet challenges" sub="When someone challenges you"
  right={<Toggle value={notifBets} onChange={setNotifBets}/>}/>
<SettingRow icon="✅" label="Forfeit approved" sub="When opponent approves your video"
  right={<Toggle value={notifApproved} onChange={setNotifApproved}/>}/>
</div>

            {/* Privacy */}
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "8px" }}>PRIVACY</div>
            </div>
            <div style={{ margin: "0 20px 16px", background: bg2, borderRadius: "16px", overflow: "hidden" }}>
              <SettingRow icon="👁" label="Public profile" sub="Anyone can see your stats"
  right={<Toggle value={privPublic} onChange={setPrivPublic}/>}/>
<SettingRow icon="🎥" label="Public forfeit videos" sub="Videos visible in global feed"
  right={<Toggle value={privVideos} onChange={setPrivVideos}/>}/>
<SettingRow icon="📊" label="Show on leaderboard" sub="Appear in public rankings"
  right={<Toggle value={privLeader} onChange={setPrivLeader}/>}/> </div>

            {/* Bet settings */}
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "8px" }}>BET SETTINGS</div>
            </div>
            <div style={{ margin: "0 20px 16px", background: bg2, borderRadius: "16px", overflow: "hidden" }}>
              <SettingRow icon="⚡" label="Auto-approve forfeits" sub="Skip manual review" right={<Toggle value={autoApprove} onChange={setAutoApprove} />} />
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: bg3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📹</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "15px", fontWeight: "500", color: text }}>Video quality</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "12px", color: text2, marginTop: "2px" }}>Higher = more storage</div>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {["low", "high"].map(q => (
                      <div key={q} className="tap-scale" style={{
                        padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "500", cursor: "pointer",
                        background: videoQuality === q ? "#d4ff00" : bg3,
                        color: videoQuality === q ? "#000" : text2,
                        transition: "all 0.2s",
                        fontFamily: "'DM Sans',sans-serif",
                      }} onClick={() => setVideoQuality(q)}>{q}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Account */}
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "8px" }}>ACCOUNT</div>
            </div>
            <div style={{ margin: "0 20px 16px", background: bg2, borderRadius: "16px", overflow: "hidden" }}>
              <SettingRow icon="✏️" label="Edit Profile" sub={`@${username}`} right={<div style={{ fontSize: "20px", color: text2 }}>›</div>} onClick={() => goTo("/edit-profile")} />
              <SettingRow icon="📧" label="Email" sub={user?.email} right={null} />
              <SettingRow icon="🔒" label="Linked account" sub="Google" right={<div style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: "#00e676" }}>✓ Linked</div>} />
            </div>

            {/* Support */}
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: text2, letterSpacing: "0.1em", marginBottom: "8px" }}>SUPPORT</div>
            </div>
            <div style={{ margin: "0 20px 16px", background: bg2, borderRadius: "16px", overflow: "hidden" }}>
              <SettingRow icon="📖" label="How to play" sub="Rules and guides"
  right={<div style={{fontSize:"20px",color:text2}}>›</div>}
  onClick={() => {
    onClose();
    alert("SweatDebt Rules:\n\n1. Place a bet with a friend\n2. Loser does the forfeit workout\n3. Film yourself doing it\n4. Upload proof\n5. Opponent approves or disputes\n\nHonour score goes up when you complete forfeits on time! 🏆");
  }}/>
<SettingRow icon="🐛" label="Report a bug" sub="Help us improve"
  right={<div style={{fontSize:"20px",color:text2}}>›</div>}
  onClick={() => {
    window.open("mailto:support@sweatdebt.app?subject=Bug Report&body=Describe the bug here...", "_blank");
  }}/>
              <SettingRow icon="📢" label="Share SweatDebt" sub="Invite your friends" right={<div style={{ fontSize: "20px", color: text2 }}>›</div>}
                onClick={() => navigator.share?.({ title: "SweatDebt", url: "https://sweatdebt.vercel.app" }) || window.open("https://sweatdebt.vercel.app")} />
            </div>

            {/* Danger zone */}
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#ff4444", letterSpacing: "0.1em", marginBottom: "8px" }}>DANGER ZONE</div>
            </div>
            <div style={{ margin: "0 20px 20px", background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.15)", borderRadius: "16px", overflow: "hidden" }}>
              <SettingRow icon="🚪" label="Log out" sub="Sign out of your account" danger right={null} onClick={handleSignOut} />
              <SettingRow icon="🗑" label="Delete account" sub="Permanently delete all data" danger right={null} onClick={() => alert("Contact support to delete your account")} />
            </div>

            <div style={{ fontFamily: "'DM Mono',monospace", textAlign: "center", color: border, fontSize: "11px", padding: "0 0 16px" }}>SweatDebt v1.0 · sweatdebt.vercel.app</div>
          </>
        )}
      </div>
    </>
  );
}