import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, getDoc, collection, query, where,
  onSnapshot, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import BadgeDisplay, { StreakBadge } from "../components/BadgeDisplay";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  coral:"#ff6b4a", green:"#00e676", red:"#ff4d6d",
  border1:"#1e3a5f", border2:"#2a4f7a", purple:"#a855f7",
};

export default function UserProfile({ currentUser }) {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("stats"); // stats | badges | videos

  const isOwn = userId === currentUser?.uid;

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
        if (currentUser && !isOwn) {
          const fSnap = await getDoc(doc(db, "users", currentUser.uid, "friends", userId));
          setIsFriend(fSnap.exists());
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [userId, currentUser]);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "videos"), where("uploadedBy", "==", userId));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setVideos(data);
    });
    return () => unsub();
  }, [userId]);

  const toggleFriend = async () => {
    if (!currentUser || isOwn) return;
    setFriendLoading(true);
    try {
      const myRef = doc(db, "users", currentUser.uid, "friends", userId);
      const theirRef = doc(db, "users", userId, "friends", currentUser.uid);
      if (isFriend) {
        await deleteDoc(myRef); await deleteDoc(theirRef);
        setIsFriend(false);
      } else {
        await setDoc(myRef, { uid: userId, displayName: profile?.displayName, email: profile?.email, photoURL: profile?.photoURL || null, addedAt: serverTimestamp() });
        await setDoc(theirRef, { uid: currentUser.uid, displayName: currentUser.displayName, email: currentUser.email, photoURL: currentUser.photoURL || null, addedAt: serverTimestamp() });
        setIsFriend(true);
      }
    } catch (e) { console.error(e); }
    setFriendLoading(false);
  };

  const winRate = () => {
    const total = (profile?.wins || 0) + (profile?.losses || 0);
    return total > 0 ? Math.round((profile.wins / total) * 100) : 0;
  };

  const honour = Math.max(0, Math.min(200, profile?.honour ?? 100));
  const honourPct = Math.min(100, Math.round((honour / 150) * 100));

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:`3px solid ${C.border1}`, borderTop:`3px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight:"100vh", background:C.bg0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ fontSize:"48px", marginBottom:"16px" }}>👤</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:C.muted }}>User not found</div>
      <button style={{ marginTop:"20px", background:"transparent", border:`1px solid ${C.border1}`, borderRadius:"12px", padding:"12px 24px", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"15px" }} onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, paddingBottom:"40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ padding:"52px 16px 16px", display:"flex", alignItems:"center", gap:"12px" }}>
        <button style={{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }} onClick={() => navigate(-1)}>←</button>
        <div style={{ flex:1 }} />
        {isOwn && (
          <button style={{ background:"transparent", border:`1px solid ${C.border1}`, borderRadius:"12px", padding:"8px 16px", color:C.cyan, fontFamily:"'DM Sans',sans-serif", fontSize:"14px", cursor:"pointer" }} onClick={() => navigate("/edit-profile")}>Edit</button>
        )}
      </div>

      {/* Profile card */}
      <div style={{ margin:"0 16px 16px", background:C.bg2, borderRadius:"24px", padding:"24px", border:`1px solid ${C.border1}`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-40px", right:"-40px", width:"120px", height:"120px", borderRadius:"50%", background:"radial-gradient(circle,rgba(0,212,255,0.06),transparent)", pointerEvents:"none" }} />

        {/* Avatar + info */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:"16px", marginBottom:"16px" }}>
          {profile.photoURL
            ? <img src={profile.photoURL} alt="" style={{ width:"72px", height:"72px", borderRadius:"50%", objectFit:"cover", border:`3px solid ${C.cyan}`, flexShrink:0 }} />
            : <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:"#000", flexShrink:0 }}>{profile.displayName?.charAt(0)||"?"}</div>
          }
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"20px", fontWeight:"700", color:C.white }}>{profile.displayName}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"13px", color:C.muted, marginBottom:"8px" }}>@{profile.username || profile.displayName?.toLowerCase().replace(/\s/g,"")}</div>
            {/* Streak badge */}
            {profile.currentWinStreak >= 1 && (
              <StreakBadge streak={profile.currentWinStreak} size="small" />
            )}
            {profile.bio && (
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"rgba(224,242,254,0.65)", lineHeight:"1.5", marginTop:"6px" }}>{profile.bio}</div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"8px", marginBottom:"16px" }}>
          {[
            { val: profile.wins || 0,              label:"Wins",    color:C.green  },
            { val: profile.losses || 0,             label:"Losses",  color:C.red    },
            { val: `${winRate()}%`,                 label:"Win Rate",color:C.cyan   },
            { val: profile.bestWinStreak || 0,      label:"Best 🔥", color:"#f59e0b"},
          ].map(s => (
            <div key={s.label} style={{ background:C.bg3, borderRadius:"12px", padding:"12px 8px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:C.muted, marginTop:"3px", letterSpacing:"0.06em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Honour bar */}
        <div style={{ marginBottom:"16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.08em" }}>HONOUR SCORE</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color: honour >= 120 ? C.green : honour >= 80 ? "#f59e0b" : C.red }}>{honour}/150</span>
          </div>
          <div style={{ height:"6px", background:C.bg3, borderRadius:"3px" }}>
            <div style={{ height:"100%", width:`${honourPct}%`, background:`linear-gradient(90deg,${C.cyan},${C.green})`, borderRadius:"3px", transition:"width 0.8s" }} />
          </div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:C.muted, marginTop:"4px" }}>
            {honour >= 150 ? "💫 Elite player" : honour >= 120 ? "✅ Trusted player" : honour >= 80 ? "🟡 Building reputation" : "🔴 Low honour"}
          </div>
        </div>

        {/* Action buttons */}
        {!isOwn && (
          <div style={{ display:"flex", gap:"10px" }}>
            <button style={{ flex:1, padding:"14px", background: isFriend ? C.bg3 : `linear-gradient(135deg,${C.cyan},${C.purple})`, border: isFriend ? `1px solid ${C.border1}` : "none", borderRadius:"12px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", letterSpacing:"0.04em", color: isFriend ? C.muted : "#000", cursor:"pointer", opacity: friendLoading ? 0.6 : 1 }}
              onClick={toggleFriend} disabled={friendLoading}>
              {friendLoading ? "..." : isFriend ? "✓ Friends" : "+ Add Friend"}
            </button>
            <button style={{ flex:1, padding:"14px", background:"transparent", border:`1px solid ${C.cyanBorder}`, borderRadius:"12px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", letterSpacing:"0.04em", color:C.cyan, cursor:"pointer" }}
              onClick={() => navigate("/create", { state: { opponent: { email: profile.email, displayName: profile.displayName, uid: profile.id } } })}>
              ⚔️ Challenge
            </button>
            <button style={{ padding:"14px 16px", background:"transparent", border:`1px solid ${C.border1}`, borderRadius:"12px", fontSize:"18px", cursor:"pointer" }}
              onClick={() => {
                const convoId = [currentUser.uid, profile.id].sort().join("_");
                navigate(`/inbox/${convoId}`);
              }}>
              💬
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0", margin:"0 16px 16px", background:C.bg2, borderRadius:"14px", padding:"4px", border:`1px solid ${C.border1}` }}>
        {[
          { key:"stats",   label:"Stats"   },
          { key:"badges",  label:`Badges ${profile.badges?.length > 0 ? `(${profile.badges.length})` : ""}` },
          { key:"videos",  label:`Videos ${videos.length > 0 ? `(${videos.length})` : ""}` },
        ].map(t => (
          <div key={t.key} style={{ padding:"10px", textAlign:"center", borderRadius:"10px", cursor:"pointer", background: activeTab===t.key ? `linear-gradient(135deg,${C.cyan},${C.purple})` : "transparent", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", color: activeTab===t.key ? "#000" : C.muted, transition:"all 0.2s" }}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* Stats tab */}
        {activeTab === "stats" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {[
              { label:"Total Bets",           val: profile.totalBets || 0,              icon:"⚔️" },
              { label:"Current Win Streak",   val: profile.currentWinStreak || 0,       icon:"🔥" },
              { label:"Best Win Streak",      val: profile.bestWinStreak || 0,          icon:"👑" },
              { label:"Forfeits Completed",   val: profile.forfeitsCompleted || 0,      icon:"💀" },
              { label:"Daily Challenges Done",val: profile.dailyChallengesCompleted || 0,icon:"📅" },
              { label:"Honour Score",         val: honour,                              icon:"⭐" },
            ].map(row => (
              <div key={row.label} style={{ display:"flex", alignItems:"center", gap:"14px", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 16px" }}>
                <span style={{ fontSize:"22px", flexShrink:0 }}>{row.icon}</span>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, flex:1 }}>{row.label}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:C.white }}>{row.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Badges tab */}
        {activeTab === "badges" && (
          <BadgeDisplay earnedBadgeIds={profile.badges || []} />
        )}

        {/* Videos tab */}
        {activeTab === "videos" && (
          videos.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>🎥</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:C.muted, letterSpacing:"0.04em" }}>
                {isOwn ? "You haven't uploaded any forfeits yet" : "No forfeits uploaded yet"}
              </div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"4px" }}>
              {videos.map(v => (
                <div key={v.id} style={{ position:"relative", aspectRatio:"9/16", overflow:"hidden", borderRadius:"10px", background:C.bg2, cursor:"pointer" }}
                  onClick={() => window.open(v.videoUrl, "_blank")}>
                  <video src={v.videoUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} preload="metadata" />
                  <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ fontSize:"20px" }}>▶</div>
                  </div>
                  {v.approved && <div style={{ position:"absolute", top:"6px", left:"6px", background:"rgba(0,230,118,0.8)", borderRadius:"6px", padding:"2px 6px", fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#000", fontWeight:"700" }}>✓</div>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}