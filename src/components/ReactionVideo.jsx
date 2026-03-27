import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import T from "../theme";

const CLOUD_NAME    = "daf3vs5n6";
const UPLOAD_PRESET = "jrmodcfe";
const MAX_SEC       = 5;

export function ReactionStrip({ videoId, currentUser }) {
  const [reactions,    setReactions]    = useState([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [viewing,      setViewing]      = useState(null);

  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,"videos",videoId,"reactions"), orderBy("createdAt","asc")),
      snap => setReactions(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
    return ()=>unsub();
  },[videoId]);

  return (
    <>
      <div style={{padding:"8px 14px 12px",borderTop:`1px solid ${T.borderCard}`}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:T.textMuted,letterSpacing:"0.08em",marginBottom:"8px"}}>
          REACTIONS ({reactions.length})
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"8px",overflowX:"auto"}}>
          <button type="button" onClick={()=>setShowRecorder(true)}
            style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",background:`${T.accent}15`,border:`1px dashed ${T.accent}`,borderRadius:"12px",padding:"8px 12px",cursor:"pointer",fontFamily:T.fontBody,fontSize:"11px",color:T.accent,fontWeight:"600",minWidth:"56px"}}>
            <span style={{fontSize:"20px"}}>🎥</span>React
          </button>
          {reactions.map(r=>(
            <div key={r.id} onClick={()=>setViewing(r.videoUrl)}
              style={{flexShrink:0,width:"56px",height:"72px",borderRadius:"12px",overflow:"hidden",position:"relative",cursor:"pointer",border:`2px solid ${T.borderCard}`,background:"#000"}}>
              <video src={r.videoUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} preload="metadata" muted/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",color:"rgba(255,255,255,0.8)"}}>▶</div>
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.7))",padding:"3px 4px"}}>
                {r.userPhoto
                  ? <img src={r.userPhoto} alt="" style={{width:"14px",height:"14px",borderRadius:"50%",objectFit:"cover"}}/>
                  : <div style={{width:"14px",height:"14px",borderRadius:"50%",background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",color:"#052e16",fontWeight:"700"}}>{r.userName?.charAt(0)||"?"}</div>
                }
              </div>
            </div>
          ))}
          {reactions.length===0 && (
            <span style={{fontFamily:T.fontBody,fontSize:"12px",color:T.textMuted}}>No reactions yet — be first! 👆</span>
          )}
        </div>
      </div>
      {showRecorder && <ReactionRecorder videoId={videoId} currentUser={currentUser} onClose={()=>setShowRecorder(false)}/>}
      {viewing && <ReactionViewer url={viewing} onClose={()=>setViewing(null)}/>}
    </>
  );
}

function ReactionRecorder({ videoId, currentUser, onClose }) {
  const [phase,     setPhase]     = useState("idle");
  const [countdown, setCountdown] = useState(3);
  const [remaining, setRemaining] = useState(MAX_SEC);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState("");
  const vidRef      = useRef(null);
  const streamRef   = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);

  useEffect(()=>{ startCamera(); return ()=>stopCamera(); },[]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{facingMode:"user"}, audio:true });
      streamRef.current = s;
      if (vidRef.current) { vidRef.current.srcObject=s; vidRef.current.play(); }
    } catch(e) { setError("Camera access denied."); }
  };
  const stopCamera = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); clearInterval(timerRef.current); };

  const startCountdown = () => {
    setPhase("countdown"); let c=3; setCountdown(c);
    timerRef.current = setInterval(()=>{ c--; setCountdown(c); if(c===0){ clearInterval(timerRef.current); startRecording(); }},1000);
  };

  const startRecording = () => {
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";
    const rec = new MediaRecorder(streamRef.current,{mimeType:mime});
    recorderRef.current = rec;
    rec.ondataavailable = e=>{ if(e.data.size>0) chunksRef.current.push(e.data); };
    rec.onstop = ()=>uploadBlob();
    rec.start(100);
    setPhase("recording"); let rem=MAX_SEC; setRemaining(rem);
    timerRef.current = setInterval(()=>{ rem-=0.1; setRemaining(Math.max(0,rem)); setProgress(((MAX_SEC-rem)/MAX_SEC)*100); if(rem<=0){ clearInterval(timerRef.current); rec.stop(); }},100);
  };

  const uploadBlob = async () => {
    setPhase("uploading"); setProgress(0);
    try {
      const blob = new Blob(chunksRef.current,{type:"video/webm"});
      const form = new FormData();
      form.append("file",blob,"reaction.webm");
      form.append("upload_preset",UPLOAD_PRESET);
      const url = await new Promise((res,rej)=>{
        const xhr = new XMLHttpRequest();
        xhr.open("POST",`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
        xhr.upload.onprogress = e=>{ if(e.lengthComputable) setProgress(Math.round(e.loaded/e.total*100)); };
        xhr.onload = ()=>{ const r=JSON.parse(xhr.responseText); r.secure_url?res(r.secure_url):rej(new Error("Upload failed")); };
        xhr.onerror = ()=>rej(new Error("Network error"));
        xhr.send(form);
      });
      await addDoc(collection(db,"videos",videoId,"reactions"),{
        videoUrl:url, uploadedBy:currentUser.uid,
        userName:currentUser.displayName, userPhoto:currentUser.photoURL||null,
        createdAt:serverTimestamp(),
      });
      setPhase("done"); setTimeout(onClose,1500);
    } catch(e) { setError("Upload failed. Try again."); setPhase("idle"); }
  };

  return (
    <>
      <style>{`@keyframes _su{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}} @keyframes _pl{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:3000}} onClick={onClose}/>
      <div style={{position:"fixed",bottom:0,left:"50%",width:"100%",maxWidth:"480px",background:"#0a0a0a",borderRadius:"24px 24px 0 0",zIndex:3001,animation:"_su 0.35s cubic-bezier(0.32,0.72,0,1) forwards",paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:"36px",height:"4px",background:"#333",borderRadius:"2px",margin:"12px auto 0"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px 8px"}}>
          <div style={{fontFamily:T.fontDisplay,fontSize:"22px",color:"#fff",letterSpacing:"0.04em",fontStyle:"italic"}}>
            React <span style={{color:T.accent}}>5s</span>
          </div>
          <button type="button" onClick={onClose} style={{background:"#1a1a1a",border:"none",borderRadius:"50%",width:"32px",height:"32px",color:"#888",fontSize:"14px",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{position:"relative",margin:"0 20px",borderRadius:"16px",overflow:"hidden",background:"#000",aspectRatio:"9/16",maxHeight:"42vh"}}>
          <video ref={vidRef} style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}} playsInline muted autoPlay/>
          {phase==="countdown" && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)"}}>
              <div style={{fontFamily:T.fontDisplay,fontSize:"96px",color:"#fff",animation:"_pl 0.8s ease infinite"}}>{countdown}</div>
            </div>
          )}
          {phase==="recording" && (
            <div style={{position:"absolute",top:"12px",right:"12px",display:"flex",alignItems:"center",gap:"6px",background:"rgba(0,0,0,0.6)",borderRadius:"20px",padding:"4px 10px"}}>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#ef4444",animation:"_pl 0.6s ease infinite"}}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:"#fff",fontWeight:"600"}}>{remaining.toFixed(1)}s</span>
            </div>
          )}
          {phase==="done" && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)",fontSize:"64px"}}>✅</div>
          )}
        </div>
        {(phase==="recording"||phase==="uploading") && (
          <div style={{margin:"12px 20px 0"}}>
            <div style={{height:"4px",background:"#222",borderRadius:"2px",overflow:"hidden"}}>
              <div style={{height:"100%",background:phase==="recording"?"#ef4444":T.accent,width:`${progress}%`,transition:"width 0.1s linear",borderRadius:"2px"}}/>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#666",marginTop:"6px",textAlign:"center"}}>
              {phase==="recording"?`Recording… ${remaining.toFixed(1)}s left`:`Uploading… ${progress}%`}
            </div>
          </div>
        )}
        {error && <div style={{margin:"12px 20px 0",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"10px",padding:"10px 14px",fontFamily:T.fontBody,fontSize:"13px",color:"#ef4444",textAlign:"center"}}>{error}</div>}
        <div style={{padding:"16px 20px 0"}}>
          {phase==="idle" && <button type="button" onClick={startCountdown} style={{width:"100%",padding:"16px",background:T.accent,border:"none",borderRadius:"14px",fontFamily:T.fontDisplay,fontSize:"22px",letterSpacing:"0.06em",color:"#052e16",cursor:"pointer"}}>🎥 START REACTION</button>}
          {phase==="countdown" && <button type="button" onClick={()=>{clearInterval(timerRef.current);setPhase("idle");setCountdown(3);}} style={{width:"100%",padding:"16px",background:"transparent",border:"1px solid #444",borderRadius:"14px",fontFamily:T.fontBody,fontSize:"16px",color:"#888",cursor:"pointer"}}>Cancel</button>}
          {phase==="done" && <div style={{textAlign:"center",fontFamily:T.fontBody,fontSize:"15px",color:T.accent}}>Reaction posted! 🎉</div>}
        </div>
        {phase==="idle" && <div style={{padding:"10px 20px 0",textAlign:"center"}}><span style={{fontFamily:T.fontBody,fontSize:"12px",color:"#555"}}>3-second countdown then 5 seconds to react 😂</span></div>}
      </div>
    </>
  );
}

function ReactionViewer({ url, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:4000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <video src={url} style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:"12px"}} controls autoPlay onClick={e=>e.stopPropagation()}/>
      <button type="button" onClick={onClose} style={{position:"absolute",top:"20px",right:"20px",background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:"40px",height:"40px",color:"#fff",fontSize:"18px",cursor:"pointer"}}>✕</button>
    </div>
  );
}