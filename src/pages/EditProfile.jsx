import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import {
  doc, getDoc, setDoc, getDocs,
  collection, updateDoc,
} from "firebase/firestore";
import T from "../theme";

const C = {
  page:"#f0fdf4", card:"#ffffff", border:"#d1fae5",
  heading:"#052e16", muted:"#6b7280", accent:"#10b981",
};

const CLOUDINARY_CLOUD  = "daf3vs5n6";
const CLOUDINARY_PRESET = "jrmodcfe";

export default function EditProfile({ user }) {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [username,    setUsername]    = useState("");
  const [bio,         setBio]         = useState("");
  const [photoURL,    setPhotoURL]    = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");

  // Load existing profile
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db,"users",user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setDisplayName(d.displayName || user.displayName || "");
        setUsername(d.username    || "");
        setBio(d.bio              || "");
        setPhotoURL(d.photoURL    || user.photoURL || "");
      } else {
        setDisplayName(user.displayName || "");
        setPhotoURL(user.photoURL       || "");
      }
    });
  }, [user]);

  // Upload photo to Cloudinary
  const handlePhotoChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", CLOUDINARY_PRESET);
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:"POST", body:form });
      const data = await res.json();
      if (data.secure_url) setPhotoURL(data.secure_url);
      else setError("Photo upload failed. Try again.");
    } catch(e) { setError("Photo upload failed."); }
    setUploading(false);
  };

  // ✅ After saving, update all friend subcollections in real time
  const propagateToFriends = async (uid, newDisplayName, newPhotoURL) => {
    try {
      // Get my friend list (to find who has me as a friend)
      const myFriendsSnap = await getDocs(collection(db,"users",uid,"friends"));
      const friendUids = myFriendsSnap.docs.map(d => d.id);

      // For each friend, update my entry in their friends subcollection
      const updates = friendUids.map(friendUid =>
        updateDoc(doc(db,"users",friendUid,"friends",uid), {
          displayName: newDisplayName,
          photoURL:    newPhotoURL || null,
        }).catch(() => {}) // ignore if doc doesn't exist
      );
      await Promise.all(updates);
    } catch(e) {
      console.warn("Friend propagation failed:", e);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setError("Name can't be empty"); return; }
    setSaving(true); setError("");
    try {
      const cleanName = displayName.trim();
      const cleanUser = username.trim().toLowerCase().replace(/\s/g,"") || cleanName.toLowerCase().replace(/\s/g,"");
      const cleanPhoto = photoURL || null;

      // 1. Update Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: cleanName,
        photoURL:    cleanPhoto,
      });

      // 2. Update Firestore user doc
      await setDoc(doc(db,"users",user.uid), {
        displayName: cleanName,
        username:    cleanUser,
        bio:         bio.trim(),
        photoURL:    cleanPhoto,
        email:       user.email || null,
        updatedAt:   new Date(),
      }, { merge:true });

      // 3. ✅ Propagate to all friend subcollections so their list updates
      await propagateToFriends(user.uid, cleanName, cleanPhoto);

      setSaved(true);
      setTimeout(() => { setSaved(false); navigate(-1); }, 1200);
    } catch(e) {
      console.error("Save error:", e);
      setError("Failed to save. Try again.");
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.page, paddingBottom:"40px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px", borderBottom:`1px solid ${C.border}`, background:C.card }}>
        <button type="button" onClick={() => navigate(-1)}
          style={{ width:"44px", height:"44px", borderRadius:"50%", background:C.page, border:`1px solid ${C.border}`, color:C.heading, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ←
        </button>
        <div style={{ flex:1, fontFamily:"monospace", fontSize:"13px", color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Edit Profile
        </div>
        <button type="button" onClick={handleSave} disabled={saving||uploading}
          style={{ padding:"10px 20px", background:saving?C.page:C.heading, border:"none", borderRadius:"20px", fontFamily:"monospace", fontSize:"13px", fontWeight:"700", color:saving?C.muted:C.accent, cursor:saving?"not-allowed":"pointer" }}>
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save"}
        </button>
      </div>

      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:"16px" }}>

        {/* Photo */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", padding:"20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px" }}>
          <div style={{ position:"relative" }}>
            {photoURL
              ? <img src={photoURL} alt="" style={{ width:"88px", height:"88px", borderRadius:"50%", objectFit:"cover", border:`3px solid ${C.accent}` }}/>
              : <div style={{ width:"88px", height:"88px", borderRadius:"50%", background:`${C.accent}20`, border:`3px solid ${C.accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"36px", fontWeight:"700", color:C.accent }}>
                  {displayName.charAt(0).toUpperCase()||"?"}
                </div>
            }
            {uploading && (
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
                <div style={{ width:"24px", height:"24px", borderRadius:"50%", border:"2px solid transparent", borderTop:"2px solid #fff", animation:"_sp 0.7s linear infinite" }}/>
              </div>
            )}
          </div>
          <label style={{ padding:"10px 24px", background:C.page, border:`1px solid ${C.border}`, borderRadius:"20px", fontFamily:"monospace", fontSize:"13px", color:C.heading, cursor:"pointer", fontWeight:"600" }}>
            {uploading ? "Uploading..." : "Choose Photo"}
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:"none" }}/>
          </label>
        </div>

        {/* Fields */}
        {[
          { label:"DISPLAY NAME", value:displayName, setter:setDisplayName, placeholder:"Your name",    maxLen:40 },
          { label:"USERNAME",     value:username,    setter:setUsername,    placeholder:"@yourhandle", maxLen:30 },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.12em", marginBottom:"8px" }}>{f.label}</div>
            <input
              value={f.value}
              onChange={e => f.setter(e.target.value)}
              placeholder={f.placeholder}
              maxLength={f.maxLen}
              style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"14px 16px", color:C.heading, fontSize:"16px", fontFamily:"system-ui", outline:"none", boxSizing:"border-box" }}
            />
          </div>
        ))}

        {/* Bio */}
        <div>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.12em", marginBottom:"8px" }}>BIO</div>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder='"Never skips a forfeit 💪"'
            maxLength={120}
            rows={3}
            style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"14px 16px", color:C.heading, fontSize:"16px", fontFamily:"system-ui", outline:"none", resize:"none", lineHeight:"1.5", boxSizing:"border-box" }}
          />
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, textAlign:"right", marginTop:"4px" }}>{bio.length}/120</div>
        </div>

        {/* Email (read only) */}
        <div>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.12em", marginBottom:"8px" }}>EMAIL (read-only)</div>
          <div style={{ background:C.page, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"14px 16px", color:C.muted, fontSize:"14px", fontFamily:"monospace" }}>
            {user?.email || "—"}
          </div>
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"12px", padding:"12px 16px", fontSize:"13px", color:"#ef4444" }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}40`, borderRadius:"12px", padding:"12px 16px", fontSize:"13px", color:C.accent, textAlign:"center", fontWeight:"600" }}>
            ✓ Profile saved! Updating friend lists…
          </div>
        )}

        <button type="button" onClick={handleSave} disabled={saving||uploading}
          style={{ width:"100%", padding:"16px", background:saving?C.page:C.heading, border:"none", borderRadius:"16px", fontFamily:"monospace", fontSize:"16px", fontWeight:"700", color:saving?C.muted:C.accent, cursor:saving?"not-allowed":"pointer", letterSpacing:"0.04em" }}>
          {saving ? "SAVING..." : saved ? "✓ SAVED!" : "SAVE CHANGES"}
        </button>

      </div>
    </div>
  );
}