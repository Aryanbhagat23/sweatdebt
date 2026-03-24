import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import T, { gradientText } from "../theme";

const CLOUD_NAME   = "daf3vs5n6";
const UPLOAD_PRESET = "jrmodcfe";

export default function UploadProof({ user }) {
  const navigate   = useNavigate();
  const { betId }  = useParams();
  const fileRef    = useRef(null);
  const cameraRef  = useRef(null);

  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState("");
  const [done,        setDone]        = useState(false);

  const pickFile = src => {
    if (src === "camera") cameraRef.current?.click();
    else fileRef.current?.click();
  };

  const handleFile = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { setError("Please select a video file"); return; }
    if (f.size > 200 * 1024 * 1024) { setError("Video must be under 200MB"); return; }
    setFile(f);
    setError("");
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const upload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setProgress(0);
    setError("");

    try {
      // Upload to Cloudinary via fetch (no widget — instant, no lag)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("resource_type", "video");

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90));
      };

      const videoUrl = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url);
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
        xhr.send(formData);
      });

      setProgress(95);

      // Get bet info for context
      let betData = {};
      if (betId && betId !== "general") {
        const betSnap = await getDoc(doc(db, "bets", betId));
        if (betSnap.exists()) betData = betSnap.data();
      }

      // Save video doc to Firestore
      await addDoc(collection(db, "videos"), {
        videoUrl,
        betId:           betId || "general",
        uploadedBy:      user.uid,
        uploadedByName:  user.displayName,
        uploadedByEmail: user.email,
        uploaderPhoto:   user.photoURL || null,
        betCreatedBy:    betData.createdBy || null,
        createdByEmail:  betData.createdByEmail || null,
        opponentEmail:   betData.opponentEmail || null,
        createdAt:       serverTimestamp(),
        likes:           0,
        comments:        0,
        approved:        false,
        disputed:        false,
      });

      // Mark bet as video uploaded
      if (betId && betId !== "general") {
        await updateDoc(doc(db, "bets", betId), {
          status:       "proof_uploaded",
          proofUrl:     videoUrl,
          uploadedAt:   serverTimestamp(),
        });
      }

      setProgress(100);
      setDone(true);
    } catch (e) {
      console.error(e);
      setError("Upload failed — please check your connection and try again");
      setProgress(0);
    }
    setUploading(false);
  };

  if (done) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", textAlign:"center" }}>
      <div style={{ fontSize:"72px", marginBottom:"16px" }}>🎉</div>
      <div style={{ fontFamily:T.fontDisplay, fontSize:"40px", letterSpacing:"0.02em", marginBottom:"8px" }}>
        <span style={gradientText}>Proof uploaded!</span>
      </div>
      <div style={{ fontFamily:T.fontBody, fontSize:"16px", color:T.muted, marginBottom:"32px" }}>
        Your forfeit video is live. Your opponent can now approve or dispute it.
      </div>
      <button style={{ background:T.gradPrimary, border:"none", borderRadius:T.r16, padding:"16px 32px", fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.06em", color:"#fff", cursor:"pointer", marginBottom:"12px", width:"100%", maxWidth:"320px" }}
        onClick={() => navigate("/feed")}>
        View in Feed 🎬
      </button>
      <button style={{ background:"transparent", border:`1px solid ${T.borderMid}`, borderRadius:T.r16, padding:"14px 32px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.06em", color:T.white, cursor:"pointer", width:"100%", maxWidth:"320px" }}
        onClick={() => navigate("/")}>
        Back to Bets
      </button>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"40px" }}>
      {/* Hidden file inputs — direct device access */}
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        style={{ display:"none" }}
        onChange={handleFile}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="video/*"
        capture="environment"   /* opens rear camera directly */
        style={{ display:"none" }}
        onChange={handleFile}
      />

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 24px" }}>
        <button style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:"50%", width:"44px", height:"44px", color:T.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
          onClick={() => navigate(-1)}>←</button>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:T.white, letterSpacing:"0.02em" }}>
          Upload <span style={gradientText}>Proof</span>
        </div>
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* Video preview */}
        {preview && (
          <div style={{ borderRadius:T.r20, overflow:"hidden", marginBottom:"16px", aspectRatio:"9/16", maxHeight:"400px", background:T.bg2, position:"relative" }}>
            <video src={preview} style={{ width:"100%", height:"100%", objectFit:"cover" }} controls playsInline />
            {/* Remove button */}
            <button style={{ position:"absolute", top:"12px", right:"12px", background:"rgba(0,0,0,0.7)", border:"none", borderRadius:"50%", width:"36px", height:"36px", color:T.white, fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
              onClick={() => { setFile(null); setPreview(null); setError(""); }}>✕</button>
          </div>
        )}

        {/* Pick source buttons — shown when no file selected */}
        {!file && (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"20px" }}>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>
              Select your forfeit video
            </div>

            {/* Camera — most important on mobile */}
            <button style={{ background:T.pinkDim, border:`1px solid ${T.pinkBorder}`, borderRadius:T.r16, padding:"20px 16px", display:"flex", alignItems:"center", gap:"16px", cursor:"pointer" }}
              onClick={() => pickFile("camera")}>
              <span style={{ fontSize:"36px" }}>📷</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.pink, letterSpacing:"0.04em" }}>Record Now</div>
                <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.muted, marginTop:"2px" }}>Opens your camera to record</div>
              </div>
            </button>

            {/* Gallery */}
            <button style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.r16, padding:"20px 16px", display:"flex", alignItems:"center", gap:"16px", cursor:"pointer" }}
              onClick={() => pickFile("gallery")}>
              <span style={{ fontSize:"36px" }}>🎞️</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.white, letterSpacing:"0.04em" }}>Choose from Gallery</div>
                <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.muted, marginTop:"2px" }}>Pick an existing video from your phone</div>
              </div>
            </button>
          </div>
        )}

        {/* Upload info */}
        {!file && (
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.r16, padding:"16px", marginBottom:"20px" }}>
            <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Tips</div>
            {["Keep it under 2 minutes for best results","Make sure your face is visible","Show yourself completing the full forfeit","Good lighting helps — don't record in the dark"].map(tip => (
              <div key={tip} style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.muted, lineHeight:"1.8" }}>💡 {tip}</div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background:T.redDim, border:`1px solid ${T.redBorder}`, borderRadius:T.r12, padding:"12px 16px", fontFamily:T.fontBody, fontSize:"14px", color:T.red, marginBottom:"16px" }}>
            {error}
          </div>
        )}

        {/* Upload button — shown when file is selected */}
        {file && !uploading && (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.muted, textAlign:"center" }}>
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
            </div>
            <button style={{ background:T.gradPrimary, border:"none", borderRadius:T.r16, padding:"18px", fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.06em", color:"#fff", cursor:"pointer" }}
              onClick={upload}>
              🚀 UPLOAD PROOF
            </button>
            <button style={{ background:"transparent", border:`1px solid ${T.borderMid}`, borderRadius:T.r16, padding:"14px", fontFamily:T.fontDisplay, fontSize:"18px", letterSpacing:"0.06em", color:T.muted, cursor:"pointer" }}
              onClick={() => { setFile(null); setPreview(null); }}>
              Choose Different Video
            </button>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.r16, padding:"24px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.white, letterSpacing:"0.04em", marginBottom:"16px", textAlign:"center" }}>
              {progress < 90 ? "Uploading..." : "Almost done..."}
            </div>
            <div style={{ height:"8px", background:T.bg3, borderRadius:"4px", overflow:"hidden", marginBottom:"12px" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:T.gradPrimary, borderRadius:"4px", transition:"width 0.3s ease" }} />
            </div>
            <div style={{ fontFamily:T.fontMono, fontSize:"14px", color:T.pink, textAlign:"center" }}>{progress}%</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.muted, textAlign:"center", marginTop:"8px" }}>
              Don't close the app while uploading
            </div>
          </div>
        )}
      </div>
    </div>
  );
}