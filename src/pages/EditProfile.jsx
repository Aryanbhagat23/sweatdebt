import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import T from "../theme";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/daf3vs5n6/image/upload";
const UPLOAD_PRESET  = "jrmodcfe";

export default function EditProfile({ user }) {
  const navigate = useNavigate();
  const [name,       setName]       = useState(user?.displayName||"");
  const [username,   setUsername]   = useState("");
  const [bio,        setBio]        = useState("");
  const [photoURL,   setPhotoURL]   = useState(user?.photoURL||null);
  const [photoFile,  setPhotoFile]  = useState(null);
  const [photoPreview,setPhotoPreview]=useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const [error,      setError]      = useState("");
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db,"users",user.uid)).then(snap => {
      if (snap.exists()) { const d=snap.data(); setUsername(d.username||""); setBio(d.bio||""); setPhotoURL(d.photoURL||user.photoURL||null); }
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [user]);

  const save = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true); setError("");
    try {
      let newPhotoURL = photoURL;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile); fd.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(CLOUDINARY_URL, { method:"POST", body:fd });
        const data = await res.json();
        newPhotoURL = data.secure_url;
      }
      const lower = username.toLowerCase().trim();
      await updateDoc(doc(db,"users",user.uid), { displayName:name.trim(), username:lower, bio:bio.trim(), photoURL:newPhotoURL, updatedAt:serverTimestamp() });
      if (lower) await setDoc(doc(db,"usernames",lower), { uid:user.uid }, { merge:true });
      setSaved(true);
      setTimeout(() => navigate(-1), 1200);
    } catch(e) { setError(e.message||"Save failed"); }
    setLoading(false);
  };

  if (fetching) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" }}>
        <button onClick={() => navigate(-1)} style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"50%", width:"44px", height:"44px", color:T.panel, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:T.shadowSm }}>←</button>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic", flex:1 }}>Edit <span style={{ color:T.accent }}>Profile</span></div>
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* Photo */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"24px" }}>
          <div style={{ width:"96px", height:"96px", borderRadius:"50%", overflow:"hidden", border:`3px solid ${T.accent}`, marginBottom:"12px", cursor:"pointer" }} onClick={() => document.getElementById("ep-photo")?.click()}>
            {photoPreview||photoURL
              ? <img src={photoPreview||photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ width:"100%", height:"100%", background:T.bg3, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"36px", color:T.panel }}>{name?.charAt(0)||"?"}</div>}
          </div>
          <input id="ep-photo" type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f=e.target.files[0]; if(f){setPhotoFile(f);setPhotoPreview(URL.createObjectURL(f));} }} />
          <button onClick={() => document.getElementById("ep-photo")?.click()} style={{ background:"transparent", border:`1.5px solid ${T.borderMid}`, borderRadius:T.rFull, padding:"8px 20px", fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:T.panel, cursor:"pointer" }}>Change photo</button>
        </div>

        {/* Fields */}
        {[
          { label:"Display Name", val:name,     set:setName,     ph:"Your full name",  type:"text" },
          { label:"Username",     val:username, set:setUsername, ph:"@handle",         type:"text" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:"14px" }}>
            <label style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} type={f.type} style={{ width:"100%", background:T.bg1, border:`1.5px solid ${T.border}`, borderRadius:T.r14, padding:"14px 16px", color:T.textDark, fontSize:"15px", fontFamily:T.fontBody, outline:"none", caretColor:T.accent, boxShadow:T.shadowSm }} />
          </div>
        ))}

        <div style={{ marginBottom:"20px" }}>
          <label style={{ fontFamily:T.fontMono, fontSize:"11px", fontWeight:"700", color:T.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself..." rows={3} maxLength={160} style={{ width:"100%", background:T.bg1, border:`1.5px solid ${T.border}`, borderRadius:T.r14, padding:"14px 16px", color:T.textDark, fontSize:"15px", fontFamily:T.fontBody, outline:"none", resize:"none", lineHeight:"1.5", caretColor:T.accent, boxShadow:T.shadowSm }} />
          <div style={{ textAlign:"right", fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, marginTop:"4px" }}>{bio.length}/160</div>
        </div>

        {error && <div style={{ background:T.redLight, border:`1px solid ${T.redBorder}`, borderRadius:T.r12, padding:"10px 14px", fontFamily:T.fontBody, fontSize:"13px", color:T.red, marginBottom:"12px" }}>{error}</div>}

        {saved && <div style={{ background:T.greenLight, border:`1px solid ${T.greenBorder}`, borderRadius:T.r12, padding:"10px 14px", fontFamily:T.fontBody, fontSize:"13px", color:T.green, marginBottom:"12px", textAlign:"center" }}>✓ Profile saved!</div>}

        <button onClick={save} disabled={loading} style={{ width:"100%", background:T.panel, border:"none", borderRadius:T.r16, padding:"16px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.05em", color:T.accent, cursor:"pointer", boxShadow:T.shadowMd, opacity:loading?0.5:1 }}>
          {loading ? (
            <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
              <div style={{ width:"18px", height:"18px", borderRadius:"50%", border:`2px solid ${T.accentLight}`, borderTop:`2px solid ${T.accent}`, animation:"spin 0.8s linear infinite" }} />
              Saving...
            </span>
          ) : "Save Changes"}
        </button>
      </div>
    </div>
  );
}