import React, { useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

const CLOUD_NAME = "daf3vs5n6"; // replace this
const UPLOAD_PRESET = "jrmodcfe"; // replace this

export default function UploadProof({ user }) {
  const navigate = useNavigate();
  const { betId } = useParams();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [progress, setProgress] = useState(0);

  const openUploadWidget = () => {
    window.cloudinary.openUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "camera"],
        resourceType: "video",
        maxFileSize: 50000000,
        clientAllowedFormats: ["mp4", "mov", "avi", "webm"],
        showAdvancedOptions: false,
        cropping: false,
        multiple: false,
        defaultSource: "local",
        styles: {
          palette: {
            window: "#111111",
            windowBorder: "#333333",
            tabIcon: "#d4ff00",
            menuIcons: "#d4ff00",
            textDark: "#000000",
            textLight: "#f5f0e8",
            link: "#d4ff00",
            action: "#d4ff00",
            inactiveTabIcon: "#666666",
            error: "#ff4444",
            inProgress: "#d4ff00",
            complete: "#00e676",
            sourceBg: "#1a1a1a",
          },
        },
      },
      async (error, result) => {
        if (error) {
          console.error(error);
          return;
        }
        if (result.event === "upload-added") {
          setUploading(true);
        }
        if (result.event === "progress") {
          setProgress(Math.round(result.info.progress * 100));
        }
        if (result.event === "success") {
          const url = result.info.secure_url;
          setVideoUrl(url);
          setUploading(false);
          setUploaded(true);

          // Save video to Firestore
          await addDoc(collection(db, "videos"), {
            videoUrl: url,
            betId: betId || "general",
            uploadedBy: user.uid,
            uploadedByName: user.displayName,
            uploadedByEmail: user.email,
            createdAt: serverTimestamp(),
            likes: 0,
            comments: 0,
            approved: false,
          });

          // Update bet status if betId provided
          if (betId) {
            await updateDoc(doc(db, "bets", betId), {
              status: "proof_uploaded",
              proofUrl: url,
            });
          }
        }
      }
    );
  };

  return (
    <div style={S.page}>
      {/* Cloudinary script */}
      <script src="https://widget.cloudinary.com/v2.0/global/all.js" type="text/javascript"/>

      <div style={S.header}>
        <button style={S.back} onClick={() => navigate("/bets")}>←</button>
        <div style={S.title}>Upload Proof</div>
      </div>

      <div style={S.content}>
        {!uploaded ? (
          <>
            <div style={S.iconWrap}>
              <div style={S.bigIcon}>📹</div>
            </div>
            <div style={S.heading}>Time to settle your debt</div>
            <div style={S.subheading}>
              Film yourself completing the forfeit. Your opponent will review it and approve or dispute.
            </div>

            <div style={S.rules}>
              <div style={S.rulesTitle}>VIDEO RULES</div>
              <div style={S.ruleItem}><span style={S.ruleDot}>●</span>Must be filmed now — no old videos</div>
              <div style={S.ruleItem}><span style={S.ruleDot}>●</span>Your face must be visible</div>
              <div style={S.ruleItem}><span style={S.ruleDot}>●</span>Complete all reps — no shortcuts</div>
              <div style={S.ruleItem}><span style={S.ruleDot}>●</span>Max 50MB file size</div>
            </div>

            {uploading && (
              <div style={S.progressWrap}>
                <div style={S.progressLabel}>Uploading... {progress}%</div>
                <div style={S.progressTrack}>
                  <div style={{...S.progressBar, width:`${progress}%`}}/>
                </div>
              </div>
            )}

            <button
              style={{...S.uploadBtn, opacity: uploading ? 0.5 : 1}}
              disabled={uploading}
              onClick={openUploadWidget}
            >
              {uploading ? `UPLOADING ${progress}%...` : "📹 CHOOSE / RECORD VIDEO"}
            </button>
          </>
        ) : (
          <>
            <div style={S.successWrap}>
              <div style={S.successIcon}>✅</div>
              <div style={S.successTitle}>Proof uploaded!</div>
              <div style={S.successSub}>Your opponent has been notified. They have 24 hours to approve or dispute.</div>
            </div>

            <video
              src={videoUrl}
              controls
              style={S.videoPreview}
            />

            <div style={S.honourNote}>
              Your honour score will increase when they approve 🏆
            </div>

            <button style={S.doneBtn} onClick={() => navigate("/bets")}>
              BACK TO MY BETS
            </button>

            <button style={S.feedBtn} onClick={() => navigate("/")}>
              VIEW IN FEED →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"40px"},
  header:{display:"flex",alignItems:"center",gap:"12px",padding:"20px 20px 16px"},
  back:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"50%",width:"36px",height:"36px",color:"#f5f0e8",fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  title:{fontSize:"22px",fontWeight:"700",color:"#f5f0e8"},
  content:{padding:"0 20px"},
  iconWrap:{textAlign:"center",marginBottom:"20px",marginTop:"20px"},
  bigIcon:{fontSize:"64px"},
  heading:{fontSize:"24px",fontWeight:"700",color:"#f5f0e8",textAlign:"center",marginBottom:"10px"},
  subheading:{fontSize:"14px",color:"#666",textAlign:"center",lineHeight:"1.6",marginBottom:"28px"},
  rules:{background:"#1a1a1a",borderRadius:"16px",padding:"16px 20px",marginBottom:"28px",border:"1px solid #333"},
  rulesTitle:{fontSize:"10px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px",fontFamily:"monospace"},
  ruleItem:{fontSize:"13px",color:"#888",lineHeight:"1.8",display:"flex",gap:"8px"},
  ruleDot:{color:"#d4ff00",flexShrink:0},
  progressWrap:{marginBottom:"16px"},
  progressLabel:{fontSize:"12px",color:"#d4ff00",fontFamily:"monospace",marginBottom:"6px",textAlign:"center"},
  progressTrack:{height:"4px",background:"#333",borderRadius:"2px"},
  progressBar:{height:"100%",background:"#d4ff00",borderRadius:"2px",transition:"width 0.3s"},
  uploadBtn:{width:"100%",background:"#d4ff00",border:"none",borderRadius:"12px",padding:"18px",fontSize:"16px",fontWeight:"700",color:"#000",cursor:"pointer"},
  successWrap:{textAlign:"center",padding:"24px 0 20px"},
  successIcon:{fontSize:"56px",marginBottom:"12px"},
  successTitle:{fontSize:"24px",fontWeight:"700",color:"#f5f0e8",marginBottom:"8px"},
  successSub:{fontSize:"14px",color:"#666",lineHeight:"1.6",marginBottom:"20px"},
  videoPreview:{width:"100%",borderRadius:"12px",marginBottom:"16px",background:"#000"},
  honourNote:{fontSize:"13px",color:"#666",textAlign:"center",marginBottom:"20px"},
  doneBtn:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"12px",padding:"16px",fontSize:"16px",fontWeight:"600",color:"#f5f0e8",cursor:"pointer",marginBottom:"10px"},
  feedBtn:{width:"100%",background:"transparent",border:"1px solid #d4ff00",borderRadius:"12px",padding:"16px",fontSize:"16px",fontWeight:"600",color:"#d4ff00",cursor:"pointer"},
};