import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import T from "../theme";

export default function ProfileOverlay({ user, isOpen, onClose }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user || !isOpen) return;
    getDoc(doc(db,"users",user.uid)).then(snap => { if (snap.exists()) setProfile(snap.data()); });
  }, [user, isOpen]);

  if (!isOpen) return null;

  const p = profile;
  const displayName = p?.displayName || user?.displayName || "Unknown";
  const photo       = p?.photoURL    || user?.photoURL    || null;
  const username    = p?.username    || null;

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(5,46,22,0.4)", backdropFilter:"blur(6px)", zIndex:2000 }} onClick={onClose} />
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", background:T.bg0, borderRadius:`${T.r24} ${T.r24} 0 0`, padding:"0 0 40px", zIndex:2001, animation:"slideUp 0.28s ease" }}>
        <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
          <div style={{ width:"40px", height:"4px", borderRadius:"2px", background:T.border }} />
        </div>

        {/* Profile section */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 20px 20px" }}>
          <div style={{ width:"80px", height:"80px", borderRadius:"50%", overflow:"hidden", border:`3px solid ${T.accent}`, marginBottom:"12px", boxShadow:"0 4px 14px rgba(16,185,129,0.25)" }}>
            {photo
              ? <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ width:"100%", height:"100%", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"32px", color:T.accent }}>{displayName.charAt(0)}</div>}
          </div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"26px", color:T.panel, letterSpacing:"0.02em", fontStyle:"italic" }}>{displayName}</div>
          {username && <div style={{ fontFamily:T.fontMono, fontSize:"12px", color:T.textMuted, marginTop:"2px" }}>@{username}</div>}
          {p?.honourScore > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"8px", background:T.accentLight, border:`1px solid ${T.accentBorder}`, borderRadius:T.rFull, padding:"4px 12px" }}>
              <span style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.accent, fontWeight:"700", letterSpacing:"0.08em" }}>⚡ {p.honourScore} HONOUR</span>
            </div>
          )}
        </div>

        <div style={{ height:"1px", background:T.border, margin:"0 20px 16px" }} />

        {/* Menu items */}
        {[
          { icon:"👤", label:"View Profile", action: () => { navigate(`/profile/${user.uid}`); onClose(); } },
          { icon:"✏️", label:"Edit Profile",  action: () => { navigate("/edit-profile");        onClose(); } },
          { icon:"👥", label:"Find Friends",  action: () => { navigate("/friends");             onClose(); } },
          
        ].map(item => (
          <div key={item.label} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"14px 20px", cursor:"pointer" }} onClick={item.action}>
            <div style={{ width:"40px", height:"40px", borderRadius:T.r12, background:T.bg3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>{item.icon}</div>
            <span style={{ fontFamily:T.fontBody, fontSize:"16px", fontWeight:"600", color:T.panel }}>{item.label}</span>
            <div style={{ marginLeft:"auto", color:T.textMuted, fontSize:"16px" }}>›</div>
          </div>
        ))}

        <div style={{ height:"1px", background:T.border, margin:"8px 20px" }} />

        {/* Sign out */}
        <div style={{ display:"flex", alignItems:"center", gap:"14px", padding:"14px 20px", cursor:"pointer" }} onClick={async () => { await signOut(auth); onClose(); }}>
          <div style={{ width:"40px", height:"40px", borderRadius:T.r12, background:T.redLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>🚪</div>
          <span style={{ fontFamily:T.fontBody, fontSize:"16px", fontWeight:"600", color:T.red }}>Sign Out</span>
        </div>
      </div>
    </>
  );
}