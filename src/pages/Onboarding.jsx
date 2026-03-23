import React, { useState } from "react";
import { completeOnboarding, isUsernameTaken } from "../firebase";

const CLOUD_NAME = "daf3vs5n6";
const UPLOAD_PRESET = "jrmodcfe";
const C = { bg0:"#070d1a", bg2:"#111f38", bg3:"#172847", white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a", cyan:"#00d4ff", green:"#00e676", red:"#ff4d6d", border1:"#1e3a5f", purple:"#a855f7" };

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState("");
  const [uStatus, setUStatus] = useState(""); // "" | "checking" | "available" | "taken"
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(null);

  const checkUsername = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    setUsername(clean); setUStatus("checking"); clearTimeout(timer);
    if (clean.length < 3) { setUStatus(""); return; }
    const t = setTimeout(async () => {
      const taken = await isUsernameTaken(clean);
      setUStatus(taken ? "taken" : "available");
    }, 600);
    setTimer(t);
  };

  const uploadPhoto = () => {
    if (!window.cloudinary) return;
    setUploading(true);
    window.cloudinary.openUploadWidget({ cloudName:CLOUD_NAME, uploadPreset:UPLOAD_PRESET, sources:["local","camera"], resourceType:"image", cropping:true, croppingAspectRatio:1, showSkipCropButton:false, multiple:false, styles:{ palette:{ window:"#0d1629", windowBorder:"#1e3a5f", tabIcon:"#00d4ff", textDark:"#000", textLight:"#e0f2fe", link:"#00d4ff", action:"#00d4ff", inactiveTabIcon:"#64748b", error:"#ff4d6d", inProgress:"#00d4ff", complete:"#00e676", sourceBg:"#111f38" } } },
      (err, result) => { if (result?.event === "success") setPhotoURL(result.info.secure_url); setUploading(false); });
  };

  const finish = async () => {
    if (!displayName.trim()) { setError("Please enter your name"); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (uStatus === "taken") { setError("That username is taken"); return; }
    setSaving(true); setError("");
    try {
      await completeOnboarding(user.uid, { displayName: displayName.trim(), username, photoURL, bio: "" });
      onComplete();
    } catch (e) { setError("Something went wrong. Please try again."); }
    setSaving(false);
  };

  const prog = (step / 3) * 100;

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"100%", maxWidth:"360px", height:"4px", background:C.bg2, borderRadius:"2px", marginBottom:"20px" }}>
        <div style={{ height:"100%", width:`${prog}%`, background:`linear-gradient(90deg,${C.cyan},${C.purple})`, borderRadius:"2px", transition:"width 0.4s" }} />
      </div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px", color:C.muted, letterSpacing:"0.08em", marginBottom:"8px" }}>Step {step} of 3</div>

      {step === 1 && (
        <div style={{ width:"100%", maxWidth:"360px", textAlign:"center" }}>
          <div style={{ fontSize:"52px", marginBottom:"16px" }}>👋</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:C.white, letterSpacing:"0.03em", marginBottom:"8px" }}>What's your name?</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"24px" }}>This is how other users will see you</div>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" maxLength={30} autoFocus style={{ width:"100%", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 16px", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif", outline:"none", marginBottom:"8px" }} />
          {error && <div style={Es}>{error}</div>}
          <button style={{ ...Btn, opacity: displayName.trim().length < 2 ? 0.4 : 1 }} disabled={displayName.trim().length < 2} onClick={() => { setError(""); setStep(2); }}>Continue →</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ width:"100%", maxWidth:"360px", textAlign:"center" }}>
          <div style={{ fontSize:"52px", marginBottom:"16px" }}>🎯</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:C.white, letterSpacing:"0.03em", marginBottom:"8px" }}>Choose a username</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"24px" }}>Unique — letters, numbers, dots and underscores only</div>
          <div style={{ position:"relative", marginBottom:"8px" }}>
            <span style={{ position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)", color:C.cyan, fontFamily:"'DM Mono',monospace", fontSize:"16px", zIndex:1 }}>@</span>
            <input value={username} onChange={e => checkUsername(e.target.value)} placeholder="yourname" maxLength={20} autoCapitalize="none" autoCorrect="off" autoFocus style={{ width:"100%", background:C.bg2, border:`1px solid ${uStatus==="available"?C.green:uStatus==="taken"?C.red:C.border1}`, borderRadius:"14px", padding:"14px 16px 14px 38px", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
          </div>
          {uStatus === "checking" && <div style={{ display:"flex", alignItems:"center", gap:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted, marginBottom:"8px" }}><div style={{ width:"14px", height:"14px", borderRadius:"50%", border:`2px solid ${C.border1}`, borderTop:`2px solid ${C.cyan}`, animation:"spin 0.8s linear infinite" }} />Checking...</div>}
          {uStatus === "available" && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.green, marginBottom:"8px" }}>✓ @{username} is available!</div>}
          {uStatus === "taken" && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.red, marginBottom:"8px" }}>✗ @{username} is already taken</div>}
          {error && <div style={Es}>{error}</div>}
          <button style={{ ...Btn, opacity: uStatus !== "available" ? 0.4 : 1, marginTop:"8px" }} disabled={uStatus !== "available"} onClick={() => { setError(""); setStep(3); }}>Continue →</button>
          <button style={Skip} onClick={() => setStep(1)}>← Back</button>
        </div>
      )}

      {step === 3 && (
        <div style={{ width:"100%", maxWidth:"360px", textAlign:"center" }}>
          <div style={{ fontSize:"52px", marginBottom:"16px" }}>📸</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:C.white, letterSpacing:"0.03em", marginBottom:"8px" }}>Add a profile photo</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginBottom:"24px" }}>Help friends recognise you — you can skip this and add one later</div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", margin:"16px 0 24px" }}>
            <div style={{ position:"relative", cursor:"pointer" }} onClick={uploadPhoto}>
              {photoURL
                ? <img src={photoURL} alt="" style={{ width:"100px", height:"100px", borderRadius:"50%", objectFit:"cover", border:`3px solid ${C.cyan}` }} />
                : <div style={{ width:"100px", height:"100px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color:"#000" }}>{displayName?.charAt(0)?.toUpperCase()||"?"}</div>
              }
              <div style={{ position:"absolute", bottom:"-2px", right:"-2px", width:"28px", height:"28px", borderRadius:"50%", background:C.bg2, border:`2px solid ${C.border1}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px" }}>{uploading?"⏳":"📷"}</div>
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.cyan, cursor:"pointer" }} onClick={uploadPhoto}>{uploading?"Uploading...":photoURL?"Change photo":"Upload photo"}</div>
          </div>
          {error && <div style={Es}>{error}</div>}
          <button style={{ ...Btn, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={finish}>{saving ? "Setting up..." : "🔥 Let's Go!"}</button>
          {!photoURL && <button style={Skip} onClick={finish} disabled={saving}>Skip for now →</button>}
          <button style={Skip} onClick={() => setStep(2)}>← Back</button>
        </div>
      )}
    </div>
  );
}

const Btn = { width:"100%", background:`linear-gradient(135deg,#00d4ff,#a855f7)`, border:"none", borderRadius:"16px", padding:"16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", minHeight:"56px", transition:"opacity 0.2s" };
const Skip = { background:"transparent", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:"#64748b", cursor:"pointer", padding:"10px", marginTop:"4px" };
const Es = { background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:"12px", padding:"10px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#ff4d6d", marginBottom:"12px", textAlign:"left" };