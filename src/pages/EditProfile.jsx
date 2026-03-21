// EditProfile.jsx — complete file with new color scheme
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  green:"#00e676", red:"#ff4d6d", border1:"#1e3a5f", border2:"#2a4f7a",
  purple:"#a855f7",
};

const CLOUD_NAME = "daf3vs5n6";
const UPLOAD_PRESET = "jrmodcfe";

export default function EditProfile({ user }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName||"");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState(user?.photoURL||null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db,"users",user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUsername(d.username||"");
        setBio(d.bio||"");
        setPhotoURL(d.photoURL||user?.photoURL||null);
        setDisplayName(d.displayName||user?.displayName||"");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const uploadPhoto = () => {
    if (!window.cloudinary) return;
    setUploading(true);
    window.cloudinary.openUploadWidget({
      cloudName:CLOUD_NAME, uploadPreset:UPLOAD_PRESET,
      sources:["local","camera"], resourceType:"image",
      cropping:true, croppingAspectRatio:1,
      showSkipCropButton:false, multiple:false,
      styles:{palette:{
        window:"#0d1629",windowBorder:"#1e3a5f",
        tabIcon:"#00d4ff",textDark:"#000",
        textLight:"#e0f2fe",link:"#00d4ff",
        action:"#00d4ff",inactiveTabIcon:"#64748b",
        error:"#ff4d6d",inProgress:"#00d4ff",
        complete:"#00e676",sourceBg:"#111f38",
      }},
    }, (error,result) => {
      if (result?.event==="success") { setPhotoURL(result.info.secure_url); }
      setUploading(false);
    });
  };

  const validateUsername = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g,"");
    setUsername(clean);
    if (clean.length<3) setUsernameError("At least 3 characters");
    else if (clean.length>20) setUsernameError("Max 20 characters");
    else setUsernameError("");
  };

  const save = async () => {
    if (usernameError||username.length<3) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"users",user.uid),{
        displayName:displayName.trim(), username:username.trim(),
        bio:bio.trim(), photoURL:photoURL,
      });
      setSaved(true);
      setTimeout(()=>{ setSaved(false); navigate(-1); },1200);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"32px",height:"32px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.back} onClick={()=>navigate(-1)}>←</button>
        <div style={S.title}>Edit <span style={{color:C.cyan}}>Profile</span></div>
        <button
          style={{...S.saveBtn, opacity:saving||usernameError?0.5:1, background:saved?C.green:`linear-gradient(135deg,${C.cyan},${C.purple})`}}
          onClick={save} disabled={saving||!!usernameError}
        >
          {saved?"✓ Saved!":saving?"Saving...":"Save"}
        </button>
      </div>

      {/* Avatar */}
      <div style={S.avatarSection}>
        <div style={S.avatarWrap} onClick={uploadPhoto}>
          {photoURL?(
            <img src={photoURL} alt="profile" style={S.avatarImg}/>
          ):(
            <div style={S.avatarPlaceholder}>{displayName?.charAt(0)?.toUpperCase()||"?"}</div>
          )}
          <div style={S.avatarOverlay}>
            <div style={{fontSize:"24px"}}>{uploading?"⏳":"📷"}</div>
          </div>
        </div>
        <div style={S.changePhotoText} onClick={uploadPhoto}>
          {uploading?"Uploading...":"Tap to change photo"}
        </div>
      </div>

      {/* Form */}
      <div style={S.form}>
        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>DISPLAY NAME</div>
          <input style={S.input} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your full name" maxLength={30}/>
        </div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>USERNAME</div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:"16px",top:"50%",transform:"translateY(-50%)",color:C.cyan,fontFamily:"'DM Mono',monospace",fontSize:"16px",fontWeight:"500",zIndex:1}}>@</span>
            <input
              style={{...S.input,paddingLeft:"36px",borderColor:usernameError?C.red:username.length>=3?C.green:C.border1}}
              value={username} onChange={e=>validateUsername(e.target.value)}
              placeholder="yourname" maxLength={20} autoCapitalize="none" autoCorrect="off"
            />
          </div>
          {usernameError?(
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.red,marginTop:"6px"}}>{usernameError}</div>
          ):username.length>=3?(
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:C.green,marginTop:"6px"}}>✓ @{username} looks good</div>
          ):(
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.dim,marginTop:"6px"}}>Letters, numbers and underscores only</div>
          )}
        </div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>BIO</div>
          <textarea
            style={{...S.input,minHeight:"80px",resize:"none",lineHeight:"1.5"}}
            value={bio} onChange={e=>setBio(e.target.value)}
            placeholder="Tell people who you are... 💪" maxLength={120}
          />
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.dim,marginTop:"4px"}}>{bio.length}/120</div>
        </div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>EMAIL</div>
          <div style={{...S.input,color:C.muted,display:"flex",alignItems:"center",userSelect:"none"}}>{user?.email}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.dim,marginTop:"4px"}}>Email cannot be changed</div>
        </div>

        {/* Sign out */}
        <div style={{marginTop:"24px"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"10px"}}>ACCOUNT</div>
          <div style={{background:"rgba(255,77,109,0.08)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:"16px",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"16px",cursor:"pointer"}} onClick={()=>auth.signOut()}>
              <span style={{fontSize:"20px"}}>🚪</span>
              <div style={{flex:1,fontFamily:"'DM Sans',sans-serif",fontSize:"16px",fontWeight:"500",color:C.red}}>Sign out</div>
              <span style={{fontSize:"20px",color:C.dim}}>›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:C.bg0, paddingBottom:"40px" },
  header:{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" },
  back:{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  title:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em", flex:1 },
  saveBtn:{ border:"none", borderRadius:"12px", padding:"10px 20px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", letterSpacing:"0.04em", color:"#000", cursor:"pointer", transition:"all 0.3s" },
  avatarSection:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 20px 28px" },
  avatarWrap:{ position:"relative", width:"96px", height:"96px", borderRadius:"50%", cursor:"pointer", marginBottom:"12px" },
  avatarImg:{ width:"96px", height:"96px", borderRadius:"50%", objectFit:"cover", border:`3px solid ${C.cyan}` },
  avatarPlaceholder:{ width:"96px", height:"96px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color:"#000", border:`3px solid ${C.border1}` },
  avatarOverlay:{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center" },
  changePhotoText:{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.cyan, fontWeight:"500", cursor:"pointer" },
  form:{ padding:"0 16px" },
  fieldGroup:{ marginBottom:"20px" },
  fieldLabel:{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"8px", display:"block" },
  input:{ width:"100%", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 16px", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif", outline:"none", transition:"border-color 0.2s" },
};