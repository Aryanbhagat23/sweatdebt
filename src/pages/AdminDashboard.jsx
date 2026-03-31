import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, onSnapshot, doc, updateDoc,
  deleteDoc, getDocs, query, orderBy, limit,
  where, getDoc,
} from "firebase/firestore";

// ─── YOUR admin UIDs — add yours here ────────────────────────
const ADMIN_UIDS = [vxGGUgBAAAQX7Qy2CZi8AMSxver2];

const C = {
  bg:       "#0f1117",
  card:     "#1a1d27",
  border:   "#2a2d3a",
  accent:   "#10b981",
  danger:   "#ef4444",
  warn:     "#f59e0b",
  text:     "#e2e8f0",
  muted:    "#64748b",
  heading:  "#ffffff",
};

function Stat({ label, value, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"16px 20px" }}>
      <div style={{ fontSize:"28px", fontWeight:"700", color: color || C.accent, fontFamily:"monospace" }}>{value}</div>
      <div style={{ fontSize:"12px", color:C.muted, marginTop:"4px", letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</div>
    </div>
  );
}

function Tag({ text, color }) {
  return (
    <span style={{ padding:"2px 8px", borderRadius:"20px", fontSize:"10px", fontWeight:"700",
      background:`${color}20`, color, border:`1px solid ${color}50`, letterSpacing:"0.05em" }}>
      {text}
    </span>
  );
}

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [tab,      setTab]     = useState("overview");
  const [users,    setUsers]   = useState([]);
  const [bets,     setBets]    = useState([]);
  const [videos,   setVideos]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState("");
  const [confirm,  setConfirm] = useState(null); // { action, id, label }

  // ── Access control ────────────────────────────────────────
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  useEffect(() => {
    if (!isAdmin) return;

    // Load users
    const u1 = onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
    });

    // Load bets
    const u2 = onSnapshot(collection(db, "bets"), snap => {
      setBets(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
      setLoading(false);
    });

    // Load videos
    const u3 = onSnapshot(collection(db, "videos"), snap => {
      setVideos(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
    });

    return () => { u1(); u2(); u3(); };
  }, [isAdmin]);

  // ── Actions ───────────────────────────────────────────────
  const deleteVideo = async (id) => {
    await deleteDoc(doc(db, "videos", id));
    setConfirm(null);
  };

  const deleteBet = async (id) => {
    await deleteDoc(doc(db, "bets", id));
    setConfirm(null);
  };

  const banUser = async (uid) => {
    await updateDoc(doc(db, "users", uid), { banned: true });
    setConfirm(null);
  };

  const unbanUser = async (uid) => {
    await updateDoc(doc(db, "users", uid), { banned: false });
  };

  const resolveBet = async (id, status) => {
    await updateDoc(doc(db, "bets", id), { status });
  };

  const forceApproveVideo = async (id) => {
    await updateDoc(doc(db, "videos", id), { approved:true, disputed:false, juryStatus:"approved" });
  };

  // ── Not admin ─────────────────────────────────────────────
  if (!user) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:C.muted, fontFamily:"monospace" }}>Not logged in.</div>
    </div>
  );

  if (!isAdmin) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px" }}>
      <div style={{ fontSize:"48px" }}>🔒</div>
      <div style={{ color:C.heading, fontFamily:"monospace", fontSize:"20px" }}>Access Denied</div>
      <div style={{ color:C.muted, fontFamily:"monospace", fontSize:"13px", textAlign:"center", maxWidth:"320px" }}>
        Your UID is not in the admin list.<br/>
        Add <code style={{ color:C.accent }}>{user.uid}</code> to ADMIN_UIDS in AdminDashboard.jsx
      </div>
      <button onClick={() => navigate("/")} style={{ padding:"10px 20px", background:C.accent, border:"none", borderRadius:"8px", color:"#fff", cursor:"pointer", fontFamily:"monospace" }}>
        ← Go Back
      </button>
    </div>
  );

  // ── Stats ─────────────────────────────────────────────────
  const stats = {
    users:       users.length,
    bets:        bets.length,
    activeBets:  bets.filter(b => ["pending","accepted"].includes(b.status)).length,
    disputedBets:bets.filter(b => b.status === "jury").length,
    videos:      videos.length,
    banned:      users.filter(u => u.banned).length,
    today:       bets.filter(b => {
      const d = b.createdAt?.toDate?.();
      return d && (new Date() - d) < 86400000;
    }).length,
  };

  // ── Filter helpers ────────────────────────────────────────
  const fUsers  = users.filter(u =>
    !search || (u.displayName||u.email||"").toLowerCase().includes(search.toLowerCase())
  );
  const fBets   = bets.filter(b =>
    !search || (b.description||b.createdByName||"").toLowerCase().includes(search.toLowerCase())
  );
  const fVideos = videos.filter(v =>
    !search || (v.uploadedByName||"").toLowerCase().includes(search.toLowerCase())
  );

  const tabs = ["overview","users","bets","videos"];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui" }}>

      {/* Confirm dialog */}
      {confirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"24px", maxWidth:"360px", width:"90%" }}>
            <div style={{ fontSize:"18px", fontWeight:"700", color:C.heading, marginBottom:"8px" }}>Confirm Action</div>
            <div style={{ fontSize:"14px", color:C.muted, marginBottom:"20px" }}>{confirm.label}</div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setConfirm(null)}
                style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:"8px", color:C.muted, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={confirm.onConfirm}
                style={{ flex:1, padding:"10px", background:C.danger, border:"none", borderRadius:"8px", color:"#fff", cursor:"pointer", fontWeight:"700" }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button onClick={() => navigate("/")} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:"8px", padding:"6px 12px", color:C.muted, cursor:"pointer", fontSize:"13px" }}>
            ← App
          </button>
          <div style={{ fontFamily:"monospace", fontSize:"18px", fontWeight:"700", color:C.heading }}>
            SweatDebt <span style={{ color:C.accent }}>Admin</span>
          </div>
        </div>
        <div style={{ fontSize:"12px", color:C.muted, fontFamily:"monospace" }}>
          {user.displayName} · {user.email}
        </div>
      </div>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"24px" }}>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"4px", marginBottom:"24px", background:C.card, padding:"4px", borderRadius:"12px", border:`1px solid ${C.border}`, width:"fit-content" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"8px 20px", borderRadius:"8px", border:"none", cursor:"pointer", fontFamily:"monospace", fontSize:"13px", fontWeight:"600", letterSpacing:"0.04em", textTransform:"uppercase",
                background: tab===t ? C.accent : "transparent",
                color: tab===t ? "#fff" : C.muted,
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== "overview" && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tab}…`}
            style={{ width:"100%", maxWidth:"400px", padding:"10px 14px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", color:C.text, fontSize:"14px", outline:"none", marginBottom:"16px", boxSizing:"border-box" }}
          />
        )}

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:"12px", marginBottom:"32px" }}>
              <Stat label="Total Users"    value={stats.users}        color={C.accent} />
              <Stat label="Total Bets"     value={stats.bets}         color="#60a5fa" />
              <Stat label="Active Bets"    value={stats.activeBets}   color={C.warn} />
              <Stat label="In Jury"        value={stats.disputedBets} color="#a78bfa" />
              <Stat label="Videos"         value={stats.videos}       color="#34d399" />
              <Stat label="Bets Today"     value={stats.today}        color="#f472b6" />
              <Stat label="Banned Users"   value={stats.banned}       color={C.danger} />
            </div>

            {/* Recent bets */}
            <div style={{ marginBottom:"24px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"13px", color:C.muted, letterSpacing:"0.1em", marginBottom:"12px" }}>RECENT BETS</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {bets.slice(0,5).map(b => (
                  <div key={b.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"12px 16px", display:"flex", alignItems:"center", gap:"12px" }}>
                    <Tag text={b.status?.toUpperCase() || "PENDING"}
                      color={b.status==="accepted"||b.status==="won"?C.accent:b.status==="jury"?"#a78bfa":b.status==="declined"?C.danger:C.warn} />
                    <div style={{ flex:1, fontSize:"13px", color:C.text }}>{b.description || `${b.createdByName} vs ${b.opponentName||b.opponentEmail}`}</div>
                    <div style={{ fontSize:"11px", color:C.muted }}>
                      {b.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent videos */}
            <div>
              <div style={{ fontFamily:"monospace", fontSize:"13px", color:C.muted, letterSpacing:"0.1em", marginBottom:"12px" }}>RECENT VIDEOS</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:"10px" }}>
                {videos.slice(0,6).map(v => (
                  <div key={v.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
                    <video src={v.videoUrl} style={{ width:"100%", aspectRatio:"9/16", objectFit:"cover" }}/>
                    <div style={{ padding:"8px" }}>
                      <div style={{ fontSize:"11px", color:C.text, fontWeight:"600" }}>@{v.uploadedByName}</div>
                      <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>
                        {v.approved ? "✅ approved" : v.disputed ? "⚖️ jury" : "⏳ pending"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            <div style={{ fontSize:"13px", color:C.muted, marginBottom:"4px" }}>{fUsers.length} users</div>
            {fUsers.map(u => (
              <div key={u.id} style={{ background:C.card, border:`1px solid ${u.banned?C.danger:C.border}`, borderRadius:"12px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"12px" }}>
                {u.photoURL
                  ? <img src={u.photoURL} alt="" style={{ width:"40px", height:"40px", borderRadius:"50%", objectFit:"cover" }}/>
                  : <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:"#2a2d3a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", color:C.accent, fontWeight:"700" }}>
                      {(u.displayName||"?").charAt(0).toUpperCase()}
                    </div>
                }
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{ fontSize:"14px", fontWeight:"600", color:C.heading }}>{u.displayName || "No name"}</span>
                    {u.banned && <Tag text="BANNED" color={C.danger}/>}
                  </div>
                  <div style={{ fontSize:"12px", color:C.muted, marginTop:"2px" }}>{u.email}</div>
                  <div style={{ fontSize:"11px", color:C.muted, marginTop:"2px", fontFamily:"monospace" }}>
                    uid: {u.id} · honour: {u.honourScore||0} · tier: {u.tier||"rookie"}
                  </div>
                </div>
                <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                  <button onClick={() => navigate(`/profile/${u.id}`)}
                    style={{ padding:"6px 12px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:"8px", color:C.muted, fontSize:"12px", cursor:"pointer" }}>
                    View
                  </button>
                  {u.banned
                    ? <button onClick={() => unbanUser(u.id)}
                        style={{ padding:"6px 12px", background:`${C.accent}20`, border:`1px solid ${C.accent}`, borderRadius:"8px", color:C.accent, fontSize:"12px", cursor:"pointer" }}>
                        Unban
                      </button>
                    : <button
                        onClick={() => setConfirm({ label:`Ban ${u.displayName||u.email}? They won't be able to log in.`, onConfirm:()=>banUser(u.id) })}
                        style={{ padding:"6px 12px", background:`${C.danger}20`, border:`1px solid ${C.danger}`, borderRadius:"8px", color:C.danger, fontSize:"12px", cursor:"pointer" }}>
                        Ban
                      </button>
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BETS ── */}
        {tab === "bets" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            <div style={{ fontSize:"13px", color:C.muted, marginBottom:"4px" }}>{fBets.length} bets</div>
            {fBets.map(b => (
              <div key={b.id} style={{ background:C.card, border:`1px solid ${b.status==="jury"?"#a78bfa":C.border}`, borderRadius:"12px", padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
                  <Tag text={b.status?.toUpperCase() || "PENDING"}
                    color={b.status==="accepted"||b.status==="won"?C.accent:b.status==="jury"?"#a78bfa":b.status==="declined"?C.danger:C.warn} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"14px", color:C.text, fontWeight:"500" }}>
                      {b.description || `${b.createdByName||"?"} vs ${b.opponentName||b.opponentEmail||"?"}`}
                    </div>
                    <div style={{ fontSize:"11px", color:C.muted, marginTop:"4px", fontFamily:"monospace" }}>
                      id: {b.id} · sport: {b.sport} · forfeit: {b.reps} {b.forfeit}
                    </div>
                    <div style={{ fontSize:"11px", color:C.muted, marginTop:"2px" }}>
                      Created: {b.createdAt?.toDate?.()?.toLocaleString() || "unknown"}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"6px", marginTop:"10px", flexWrap:"wrap" }}>
                  {b.status==="jury" && (
                    <>
                      <button onClick={() => resolveBet(b.id,"lost")}
                        style={{ padding:"5px 12px", background:`${C.accent}20`, border:`1px solid ${C.accent}`, borderRadius:"6px", color:C.accent, fontSize:"11px", cursor:"pointer" }}>
                        ✓ Force Approve
                      </button>
                      <button onClick={() => resolveBet(b.id,"disputed")}
                        style={{ padding:"5px 12px", background:`${C.danger}20`, border:`1px solid ${C.danger}`, borderRadius:"6px", color:C.danger, fontSize:"11px", cursor:"pointer" }}>
                        ✗ Force Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setConfirm({ label:`Delete bet "${b.description||b.id}"? This cannot be undone.`, onConfirm:()=>deleteBet(b.id) })}
                    style={{ padding:"5px 12px", background:`${C.danger}15`, border:`1px solid ${C.danger}40`, borderRadius:"6px", color:C.danger, fontSize:"11px", cursor:"pointer" }}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── VIDEOS ── */}
        {tab === "videos" && (
          <div>
            <div style={{ fontSize:"13px", color:C.muted, marginBottom:"12px" }}>{fVideos.length} videos</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"12px" }}>
              {fVideos.map(v => (
                <div key={v.id} style={{ background:C.card, border:`1px solid ${v.disputed?C.warn:C.border}`, borderRadius:"12px", overflow:"hidden" }}>
                  <video src={v.videoUrl} controls style={{ width:"100%", aspectRatio:"9/16", objectFit:"cover", maxHeight:"260px" }}/>
                  <div style={{ padding:"10px 12px" }}>
                    <div style={{ fontSize:"13px", color:C.text, fontWeight:"600" }}>@{v.uploadedByName||"unknown"}</div>
                    <div style={{ fontSize:"11px", color:C.muted, marginTop:"3px" }}>
                      {v.approved ? "✅ approved" : v.juryStatus==="pending" ? "⚖️ jury voting" : v.disputed ? "⚠️ disputed" : "⏳ awaiting approval"}
                    </div>
                    {v.description && (
                      <div style={{ fontSize:"11px", color:C.muted, marginTop:"4px", fontStyle:"italic" }}>"{v.description}"</div>
                    )}
                    <div style={{ display:"flex", gap:"6px", marginTop:"8px" }}>
                      {!v.approved && (
                        <button onClick={() => forceApproveVideo(v.id)}
                          style={{ flex:1, padding:"5px", background:`${C.accent}20`, border:`1px solid ${C.accent}`, borderRadius:"6px", color:C.accent, fontSize:"10px", cursor:"pointer" }}>
                          ✓ Approve
                        </button>
                      )}
                      <button
                        onClick={() => setConfirm({ label:"Delete this video permanently?", onConfirm:()=>deleteVideo(v.id) })}
                        style={{ flex:1, padding:"5px", background:`${C.danger}20`, border:`1px solid ${C.danger}`, borderRadius:"6px", color:C.danger, fontSize:"10px", cursor:"pointer" }}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}