import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import UploadSheet from "../components/UploadSheet";

const C = {
  bg0:"#070d1a",bg1:"#0d1629",bg2:"#111f38",bg3:"#172847",
  white:"#e0f2fe",muted:"#64748b",dim:"#3d5a7a",
  cyan:"#00d4ff",coral:"#ff6b4a",green:"#00e676",
  red:"#ff4d6d",border1:"#1e3a5f",
};

export default function UploadProof({ user }) {
  const navigate = useNavigate();
  const { betId } = useParams();
  const [showSheet, setShowSheet] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUploadSuccess = async (url) => {
    setSaving(true);
    setVideoUrl(url);
    try {
      await addDoc(collection(db, "videos"), {
        videoUrl: url,
        betId: betId || "general",
        uploadedBy: user.uid,
        uploadedByName: user.displayName,
        uploadedByEmail: user.email,
        uploaderPhoto: user.photoURL || null,
        betCreatedBy: null,
        createdAt: serverTimestamp(),
        likes: 0,
        comments: 0,
        approved: false,
        disputed: false,
      });
      if (betId) {
        await updateDoc(doc(db, "bets", betId), {
          status: "proof_uploaded",
          proofUrl: url,
        });
      }
      setUploaded(true);
    } catch (e) {
      console.error("Save error:", e);
      alert("Video uploaded but failed to save. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.back} onClick={() => navigate("/bets")}>←</button>
        <div style={S.title}>Upload Proof</div>
      </div>

      {!uploaded ? (
        <div style={S.content}>
          {/* Icon */}
          <div style={S.iconWrap}>
            <div style={S.bigIconCircle}>
              <span style={{ fontSize: "48px" }}>📹</span>
            </div>
          </div>

          <div style={S.heading}>Time to settle your debt</div>
          <div style={S.subheading}>
            Film yourself completing the forfeit. Your opponent will review it and approve or dispute.
          </div>

          {/* Rules */}
          <div style={S.rules}>
            <div style={S.rulesTitle}>VIDEO RULES</div>
            {[
              "Must be filmed now — no old videos",
              "Your face must be visible throughout",
              "Complete ALL reps — no shortcuts",
              "Max 50MB file size",
            ].map(rule => (
              <div key={rule} style={S.ruleItem}>
                <span style={{ color: C.cyan, flexShrink: 0 }}>●</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {/* Upload button */}
          <button
            style={{ ...S.uploadBtn, opacity: saving ? 0.5 : 1 }}
            disabled={saving}
            onClick={() => setShowSheet(true)}
          >
            {saving ? "SAVING..." : "📹 CHOOSE HOW TO UPLOAD"}
          </button>

          <div style={S.uploadNote}>
            Camera · Gallery · Files — your choice
          </div>
        </div>
      ) : (
        <div style={S.content}>
          {/* Success */}
          <div style={S.successWrap}>
            <div style={S.successIconWrap}>
              <span style={{ fontSize: "48px" }}>✅</span>
            </div>
            <div style={S.successTitle}>Proof Uploaded!</div>
            <div style={S.successSub}>
              Your opponent has been notified. They have 24 hours to approve or dispute.
            </div>
          </div>

          {/* Video preview */}
          <video src={videoUrl} controls style={S.videoPreview} playsInline />

          {/* Honour note */}
          <div style={S.honourNote}>
            🏆 Your honour score will increase when they approve
          </div>

          <button style={S.doneBtn} onClick={() => navigate("/bets")}>
            BACK TO MY BETS
          </button>
          <button style={S.feedBtn} onClick={() => navigate("/")}>
            VIEW IN FEED →
          </button>
        </div>
      )}

      {/* Upload sheet */}
      <UploadSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        onUploadSuccess={handleUploadSuccess}
        betId={betId}
        user={user}
      />
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:C.bg0, paddingBottom:"40px" },
  header:{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 16px" },
  back:{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  title:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em" },
  content:{ padding:"0 20px" },
  iconWrap:{ textAlign:"center", marginBottom:"24px", marginTop:"16px" },
  bigIconCircle:{ width:"100px", height:"100px", borderRadius:"50%", background:`${C.cyan}15`, border:`2px solid ${C.cyan}30`, display:"inline-flex", alignItems:"center", justifyContent:"center" },
  heading:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:C.white, textAlign:"center", marginBottom:"10px", letterSpacing:"0.03em" },
  subheading:{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:C.muted, textAlign:"center", lineHeight:"1.6", marginBottom:"28px" },
  rules:{ background:C.bg2, borderRadius:"16px", padding:"16px 20px", marginBottom:"28px", border:`1px solid ${C.border1}` },
  rulesTitle:{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px" },
  ruleItem:{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:"rgba(224,242,254,0.7)", lineHeight:"1.8", display:"flex", gap:"10px" },
  uploadBtn:{ width:"100%", background:`linear-gradient(135deg,${C.cyan},#a855f7)`, border:"none", borderRadius:"16px", padding:"18px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", minHeight:"60px" },
  uploadNote:{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.dim, textAlign:"center", marginTop:"10px" },
  successWrap:{ textAlign:"center", padding:"24px 0 20px" },
  successIconWrap:{ width:"96px", height:"96px", borderRadius:"50%", background:`${C.green}15`, border:`2px solid ${C.green}40`, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:"16px" },
  successTitle:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"36px", color:C.white, marginBottom:"8px", letterSpacing:"0.03em" },
  successSub:{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, lineHeight:"1.6", marginBottom:"24px" },
  videoPreview:{ width:"100%", borderRadius:"16px", marginBottom:"16px", background:"#000", maxHeight:"300px" },
  honourNote:{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:C.muted, textAlign:"center", marginBottom:"20px" },
  doneBtn:{ width:"100%", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:C.white, cursor:"pointer", marginBottom:"10px" },
  feedBtn:{ width:"100%", background:"transparent", border:`1px solid ${C.cyan}`, borderRadius:"16px", padding:"16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.06em", color:C.cyan, cursor:"pointer" },
};