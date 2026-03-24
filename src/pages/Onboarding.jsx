import React, { useState } from "react";
import { completeOnboarding, isUsernameTaken } from "../firebase";
import T, { gradientText } from "../theme";

const CLOUD = "daf3vs5n6", PRESET = "jrmodcfe";

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.displayName||"");
  const [username, setUsername] = useState("");
  const [uStatus, setUStatus] = useState("");
  const [photo, setPhoto] = useState(user?.photoURL||null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(null);
  const prog=(step/3)*100;

  const checkUser=val=>{
    const clean=val.toLowerCase().replace(/[^a-z0-9_.]/g,"");
    setUsername(clean); setUStatus("checking"); clearTimeout(timer);
    if(clean.length<3){setUStatus("");return;}
    const t=setTimeout(async()=>{const taken=await isUsernameTaken(clean);setUStatus(taken?"taken":"available");},600);
    setTimer(t);
  };

  const uploadPhoto=()=>{
    if(!window.cloudinary)return; setUploading(true);
    window.cloudinary.openUploadWidget({cloudName:CLOUD,uploadPreset:PRESET,sources:["local","camera"],resourceType:"image",cropping:true,croppingAspectRatio:1,showSkipCropButton:false,multiple:false,styles:{palette:{window:T.bg1,windowBorder:T.border,tabIcon:T.pink,textDark:"#000",textLight:T.white,link:T.pink,action:T.pink,inactiveTabIcon:T.muted,error:T.red,inProgress:T.pink,complete:T.green,sourceBg:T.bg2}}},
      (e,r)=>{if(r?.event==="success")setPhoto(r.info.secure_url);setUploading(false);});
  };

  const finish=async()=>{
    if(!name.trim()){setError("Please enter your name");return;}
    if(username.length<3){setError("Username must be at least 3 characters");return;}
    if(uStatus==="taken"){setError("That username is taken");return;}
    setSaving(true); setError("");
    try{await completeOnboarding(user.uid,{displayName:name.trim(),username,photoURL:photo,bio:""});onComplete();}
    catch(e){setError("Something went wrong. Please try again.");}
    setSaving(false);
  };

  return(
    <div style={{ minHeight:"100vh",background:T.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Progress */}
      <div style={{ width:"100%",maxWidth:"360px",height:"4px",background:T.bg2,borderRadius:"2px",marginBottom:"20px" }}>
        <div style={{ height:"100%",width:`${prog}%`,background:T.gradPrimary,borderRadius:"2px",transition:"width 0.4s" }}/>
      </div>
      <div style={{ fontFamily:T.fontMono,fontSize:"12px",color:T.muted,letterSpacing:"0.08em",marginBottom:"8px" }}>Step {step} of 3</div>

      {step===1&&(
        <div style={{ width:"100%",maxWidth:"360px",textAlign:"center" }}>
          <div style={{ fontSize:"52px",marginBottom:"16px" }}>👋</div>
          <div style={{ fontFamily:T.fontDisplay,fontSize:"36px",color:T.white,letterSpacing:"0.02em",marginBottom:"8px" }}>What's your name?</div>
          <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.muted,marginBottom:"24px" }}>This is how other users will see you</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" maxLength={30} autoFocus
            style={{ width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.r16,padding:"16px",color:T.white,fontSize:"16px",fontFamily:T.fontBody,outline:"none",marginBottom:"8px",caretColor:T.pink,WebkitTextFillColor:T.white }}/>
          {error&&<div style={{ background:T.redDim,border:`1px solid ${T.redBorder}`,borderRadius:T.r12,padding:"10px 14px",fontFamily:T.fontBody,fontSize:"13px",color:T.red,marginBottom:"12px" }}>{error}</div>}
          <button style={{ width:"100%",background:T.gradPrimary,border:"none",borderRadius:T.r16,padding:"16px",fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.06em",color:"#fff",cursor:"pointer",opacity:name.trim().length<2?0.4:1 }} disabled={name.trim().length<2} onClick={()=>{setError("");setStep(2);}}>Continue →</button>
        </div>
      )}

      {step===2&&(
        <div style={{ width:"100%",maxWidth:"360px",textAlign:"center" }}>
          <div style={{ fontSize:"52px",marginBottom:"16px" }}>🎯</div>
          <div style={{ fontFamily:T.fontDisplay,fontSize:"36px",color:T.white,letterSpacing:"0.02em",marginBottom:"8px" }}>Choose a username</div>
          <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.muted,marginBottom:"24px" }}>Unique — letters, numbers, dots and underscores only</div>
          <div style={{ position:"relative",marginBottom:"8px" }}>
            <span style={{ position:"absolute",left:"16px",top:"50%",transform:"translateY(-50%)",color:T.pink,fontFamily:T.fontMono,fontSize:"16px",zIndex:1 }}>@</span>
            <input value={username} onChange={e=>checkUser(e.target.value)} placeholder="yourname" maxLength={20} autoCapitalize="none" autoCorrect="off" autoFocus
              style={{ width:"100%",background:T.bg2,border:`1px solid ${uStatus==="available"?T.green:uStatus==="taken"?T.red:T.border}`,borderRadius:T.r16,padding:"16px 16px 16px 38px",color:T.white,fontSize:"16px",fontFamily:T.fontBody,outline:"none",caretColor:T.pink,WebkitTextFillColor:T.white }}/>
          </div>
          {uStatus==="checking"&&<div style={{ display:"flex",alignItems:"center",gap:"8px",fontFamily:T.fontBody,fontSize:"13px",color:T.muted,marginBottom:"8px",justifyContent:"center" }}><div style={{ width:"14px",height:"14px",borderRadius:"50%",border:`2px solid ${T.bg3}`,borderTop:`2px solid ${T.pink}`,animation:"spin 0.8s linear infinite" }}/>Checking...</div>}
          {uStatus==="available"&&<div style={{ fontFamily:T.fontBody,fontSize:"13px",color:T.green,marginBottom:"8px" }}>✓ @{username} is available!</div>}
          {uStatus==="taken"&&<div style={{ fontFamily:T.fontBody,fontSize:"13px",color:T.red,marginBottom:"8px" }}>✗ @{username} is already taken</div>}
          {error&&<div style={{ background:T.redDim,border:`1px solid ${T.redBorder}`,borderRadius:T.r12,padding:"10px 14px",fontFamily:T.fontBody,fontSize:"13px",color:T.red,marginBottom:"12px" }}>{error}</div>}
          <button style={{ width:"100%",background:T.gradPrimary,border:"none",borderRadius:T.r16,padding:"16px",fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.06em",color:"#fff",cursor:"pointer",opacity:uStatus!=="available"?0.4:1,marginTop:"8px" }} disabled={uStatus!=="available"} onClick={()=>{setError("");setStep(3);}}>Continue →</button>
          <button style={{ background:"transparent",border:"none",fontFamily:T.fontBody,fontSize:"14px",color:T.muted,cursor:"pointer",padding:"10px",marginTop:"4px" }} onClick={()=>setStep(1)}>← Back</button>
        </div>
      )}

      {step===3&&(
        <div style={{ width:"100%",maxWidth:"360px",textAlign:"center" }}>
          <div style={{ fontSize:"52px",marginBottom:"16px" }}>📸</div>
          <div style={{ fontFamily:T.fontDisplay,fontSize:"36px",color:T.white,letterSpacing:"0.02em",marginBottom:"8px" }}>Add a profile photo</div>
          <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.muted,marginBottom:"24px" }}>Help friends recognise you — skip and add later</div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",margin:"16px 0 24px" }}>
            <div style={{ position:"relative",cursor:"pointer" }} onClick={uploadPhoto}>
              {photo?<img src={photo} alt="" style={{ width:"100px",height:"100px",borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.pink}` }}/>
                :<div style={{ width:"100px",height:"100px",borderRadius:"50%",background:T.gradPrimary,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:"36px",color:"#fff" }}>{name?.charAt(0)?.toUpperCase()||"?"}</div>}
              <div style={{ position:"absolute",bottom:"-2px",right:"-2px",width:"28px",height:"28px",borderRadius:"50%",background:T.bg2,border:`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px" }}>{uploading?"⏳":"📷"}</div>
            </div>
            <div style={{ fontFamily:T.fontBody,fontSize:"14px",color:T.pink,cursor:"pointer" }} onClick={uploadPhoto}>{uploading?"Uploading...":photo?"Change photo":"Upload photo"}</div>
          </div>
          {error&&<div style={{ background:T.redDim,border:`1px solid ${T.redBorder}`,borderRadius:T.r12,padding:"10px 14px",fontFamily:T.fontBody,fontSize:"13px",color:T.red,marginBottom:"12px" }}>{error}</div>}
          <button style={{ width:"100%",background:T.gradPrimary,border:"none",borderRadius:T.r16,padding:"16px",fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.06em",color:"#fff",cursor:"pointer",opacity:saving?0.5:1 }} disabled={saving} onClick={finish}>{saving?"Setting up...":"🔥 Let's Go!"}</button>
          {!photo&&<button style={{ background:"transparent",border:"none",fontFamily:T.fontBody,fontSize:"14px",color:T.muted,cursor:"pointer",padding:"10px",marginTop:"4px" }} onClick={finish} disabled={saving}>Skip for now →</button>}
          <button style={{ background:"transparent",border:"none",fontFamily:T.fontBody,fontSize:"14px",color:T.muted,cursor:"pointer",padding:"10px",marginTop:"4px" }} onClick={()=>setStep(2)}>← Back</button>
        </div>
      )}
    </div>
  );
}