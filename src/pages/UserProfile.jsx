import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import T from "../theme";
import BadgeDisplay from "../components/BadgeDisplay";

export default function UserProfile({ currentUser }) {
  const navigate      = useNavigate();
  const { userId }    = useParams();
  const targetId      = userId || currentUser?.uid;
  const isSelf        = targetId === currentUser?.uid;

  const [profile,    setProfile]   = useState(null);
  const [bets,       setBets]      = useState([]);
  const [isFriend,   setIsFriend]  = useState(false);
  const [loading,    setLoading]   = useState(true);
  const [reqSent,    setReqSent]   = useState(false);

  useEffect(() => {
    if (!targetId) return;
    Promise.all([
      getDoc(doc(db,"users",targetId)),
      getDocs(query(collection(db,"bets"), where("createdBy","==",targetId))),
      isSelf ? Promise.resolve(null) : getDoc(doc(db,"users",currentUser.uid,"friends",targetId)),
    ]).then(([uSnap, bSnap, fSnap]) => {
      if (uSnap.exists()) setProfile({ id:uSnap.id, ...uSnap.data() });
      setBets(bSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      if (fSnap?.exists?.()) setIsFriend(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [targetId]);

  const addFriend = async () => {
    await addDoc(collection(db,"users",targetId,"friendRequests"), { fromUid:currentUser.uid, fromName:currentUser.displayName, fromEmail:currentUser.email, createdAt:serverTimestamp() });
    await updateDoc(doc(db,"users",currentUser.uid), { sentRequests: arrayUnion(targetId) });
    setReqSent(true);
  };

  const sendChallenge = () => navigate("/create", { state: { opponent: profile } });

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"spin 0.8s linear infinite" }} />
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"12px", padding:"24px", textAlign:"center" }}>
      <div style={{ fontSize:"48px" }}>👤</div>
      <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:T.textMuted, fontStyle:"italic" }}>User not found</div>
      <button onClick={() => navigate(-1)} style={{ background:T.panel, border:"none", borderRadius:T.rFull, padding:"12px 24px", fontFamily:T.fontDisplay, fontSize:"16px", color:T.accent, cursor:"pointer" }}>Go Back</button>
    </div>
  );

  const wins   = bets.filter(b => b.status==="won").length;
  const losses = bets.filter(b => b.status==="lost").length;
  const active = bets.filter(b => ["pending","accepted"].includes(b.status)).length;

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"40px" }}>
      {/* Header */}
      <div style={{ background:T.panel, padding:"52px 16px 24px", position:"relative" }}>
        <button onClick={() => navigate(-1)} style={{ position:"absolute", top:"52px", left:"16px", background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:"44px", height:"44px", color:"#fff", fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", paddingTop:"20px" }}>
          {/* Avatar */}
          <div style={{ width:"88px", height:"88px", borderRadius:"50%", overflow:"hidden", border:`3px solid ${T.accent}`, boxShadow:"0 4px 16px rgba(16,185,129,0.3)" }}>
            {profile.photoURL
              ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ width:"100%", height:"100%", background:T.accentDark, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"36px", color:"#fff" }}>{profile.displayName?.charAt(0)||"?"}</div>}
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:"#fff", letterSpacing:"0.02em", fontStyle:"italic" }}>{profile.displayName}</div>
            <div style={{ fontFamily:T.fontMono, fontSize:"12px", color:"rgba(255,255,255,0.5)", marginTop:"2px" }}>@{profile.username||"—"}</div>
          </div>

          {/* Honour score */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(16,185,129,0.15)", border:`1px solid ${T.accentBorder}`, borderRadius:T.rFull, padding:"6px 14px" }}>
            <span style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.accent, fontWeight:"700", letterSpacing:"0.1em" }}>⚡ HONOUR</span>
            <span style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.accent }}>{profile.honourScore||0}</span>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px" }}>
        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"16px" }}>
          {[{label:"WINS",val:wins,color:T.green},{label:"LOSSES",val:losses,color:T.red},{label:"ACTIVE",val:active,color:T.accent}].map(s => (
            <div key={s.label} style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:T.r14, padding:"14px 10px", textAlign:"center", boxShadow:T.shadowSm }}>
              <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:s.color }}>{s.val}</div>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, letterSpacing:"0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div style={{ marginBottom:"16px" }}>
          <BadgeDisplay uid={targetId} />
        </div>

        {/* Sports tags */}
        {profile.sports?.length > 0 && (
          <div style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:T.r16, padding:"14px 16px", marginBottom:"16px", boxShadow:T.shadowSm }}>
            <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, letterSpacing:"0.1em", marginBottom:"10px" }}>SPORTS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {profile.sports.map(s => (
                <div key={s} style={{ background:T.accentLight, border:`1px solid ${T.accentBorder}`, borderRadius:T.rFull, padding:"5px 12px", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"600", color:T.accentDark }}>{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isSelf && (
          <div style={{ display:"flex", gap:"10px", marginBottom:"16px" }}>
            <button onClick={sendChallenge} style={{ flex:1, background:T.panel, border:"none", borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer", boxShadow:T.shadowMd }}>⚔️ CHALLENGE</button>
            {!isFriend && <button onClick={addFriend} disabled={reqSent} style={{ flex:1, background:reqSent?T.bg3:T.bg1, border:`1.5px solid ${reqSent?T.accent:T.borderMid}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:reqSent?T.accent:T.panel, cursor:reqSent?"default":"pointer" }}>{reqSent?"✓ Sent":"+ ADD"}</button>}
          </div>
        )}

        {isSelf && (
          <button onClick={() => navigate("/edit-profile")} style={{ width:"100%", background:T.bg1, border:`1.5px solid ${T.borderMid}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.05em", color:T.panel, cursor:"pointer", boxShadow:T.shadowSm, marginBottom:"16px" }}>✏️ Edit Profile</button>
        )}

        {/* Recent bets */}
        <div style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"10px" }}>Recent Bets</div>
        {bets.slice(0,5).map(b => {
          const st = T.status[b.status]||T.status.pending;
          return (
            <div key={b.id} style={{ background:T.bg1, border:`1px solid ${T.borderCard}`, borderRadius:T.r14, padding:"12px 16px", marginBottom:"8px", display:"flex", alignItems:"center", gap:"12px", boxShadow:T.shadowSm }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:T.panel }}>{b.description||b.forfeit||"Bet"}</div>
                <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, marginTop:"2px" }}>{b.reps?`${b.reps}x `:""}{b.forfeit}</div>
              </div>
              <div style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:T.rFull, padding:"3px 10px", fontFamily:T.fontMono, fontSize:"10px", fontWeight:"700", color:st.color }}>{st.label}</div>
            </div>
          );
        })}
        {bets.length === 0 && <div style={{ textAlign:"center", padding:"24px", fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted }}>No bets yet</div>}
      </div>
    </div>
  );
}