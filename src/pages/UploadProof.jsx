import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import T from "../theme";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/daf3vs5n6/video/upload";
const UPLOAD_PRESET  = "jrmodcfe";

const TRASH_TALKS = [
  "easy win, buddy. Now get on the floor 😂",
  "told you this would happen 😤",
  "no excuses, start sweating! 🏋️",
  "hope you stretched first 😅",
  "time to pay the price champ 💪",
  "this is what happens when you lose 🔥",
];

export default function UploadProof({ user }) {
  const navigate = useNavigate();
  const { betId } = useParams();
  const fileRef   = useRef();
  const cameraRef = useRef();

  const [bet,       setBet]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");
  const [trashTalk] = useState(() => TRASH_TALKS[Math.floor(Math.random() * TRASH_TALKS.length)]);
  const [showCamera, setShowCamera] = useState(false);
  const [stream,     setStream]     = useState(null);

  useEffect(() => {
    if (!betId) { setLoading(false); return; }
    getDoc(doc(db, "bets", betId)).then(snap => {
      if (snap.exists()) setBet({ id: snap.id, ...snap.data() });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [betId]);

  useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()); }, [stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      setStream(s); setShowCamera(true);
      setTimeout(() => { if (cameraRef.current) cameraRef.current.srcObject = s; }, 100);
    } catch { setError("Camera access denied. Use file upload instead."); }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null); setShowCamera(false);
  };

  const pickFile = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 100 * 1024 * 1024) { setError("File too large (max 100MB)"); return; }
    setFile(f); setPreview(URL.createObjectURL(f)); setError("");
  };

  const upload = async () => {
    if (!file) { setError("Please choose a video first"); return; }
    setUploading(true); setProgress(0); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 85)); };
      const result = await new Promise((res, rej) => {
        xhr.open("POST", CLOUDINARY_URL);
        xhr.onload = () => { if (xhr.status === 200) res(JSON.parse(xhr.responseText)); else rej(new Error("Upload failed")); };
        xhr.onerror = () => rej(new Error("Network error"));
        xhr.send(fd);
      });
      setProgress(90);
      await addDoc(collection(db, "videos"), {
        url: result.secure_url, publicId: result.public_id,
        uploadedBy: user.uid, uploaderName: user.displayName,
        betId: betId || null,
        bet: bet ? { description: bet.description, forfeit: bet.forfeit, reps: bet.reps } : null,
        createdAt: serverTimestamp(), likes: [], comments: [],
      });
      if (betId) await updateDoc(doc(db, "bets", betId), { proofUrl: result.secure_url, proofUploadedAt: serverTimestamp() });
      setProgress(100); setDone(true);
    } catch (e) { setError(e.message || "Upload failed"); }
    setUploading(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
      <div style={{ fontSize: "72px", marginBottom: "16px" }}>🏆</div>
      <div style={{ fontFamily: T.fontDisplay, fontSize: "40px", color: T.panel, letterSpacing: "0.02em", fontStyle: "italic", marginBottom: "8px" }}>
        Debt <span style={{ color: T.accent }}>Paid!</span>
      </div>
      <div style={{ fontFamily: T.fontBody, fontSize: "16px", color: T.textMuted, marginBottom: "28px" }}>Your proof has been posted to the feed 🔥</div>
      <button onClick={() => navigate("/")} style={{ background: T.panel, border: "none", borderRadius: T.rFull, padding: "16px 32px", fontFamily: T.fontDisplay, fontSize: "22px", letterSpacing: "0.05em", color: T.accent, cursor: "pointer", boxShadow: T.shadowMd }}>Back to Bets</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, paddingBottom: "40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "52px 16px 20px" }}>
        <button onClick={() => navigate(-1)} style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: "50%", width: "44px", height: "44px", color: T.panel, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.shadowSm }}>←</button>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "28px", color: T.panel, letterSpacing: "0.04em", fontStyle: "italic", flex: 1 }}>Pay <span style={{ color: T.accent }}>Debt</span></div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* ── DEBT DUE card ── */}
        {bet && (
          <div style={{ background: T.panel, borderRadius: T.r20, padding: "24px", marginBottom: "16px", textAlign: "center", boxShadow: "0 4px 20px rgba(5,46,22,0.2)" }}>
            {/* DEBT DUE badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: T.orange, borderRadius: T.rFull, padding: "6px 16px", fontFamily: T.fontMono, fontSize: "12px", fontWeight: "800", color: "#fff", letterSpacing: "0.1em", marginBottom: "20px" }}>
              ⚡ DEBT DUE
            </div>

            {/* Player avatars */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "20px", color: "#fff", border: `3px solid ${T.panel}`, zIndex: 2, position: "relative" }}>
                {bet.createdByName?.charAt(0) || "K"}
              </div>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: T.bg3, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontMono, fontSize: "12px", color: T.textMid, border: `3px solid ${T.panel}`, zIndex: 1, margin: "0 -6px", position: "relative" }}>W</div>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "20px", color: "#fff", border: `3px solid ${T.panel}`, zIndex: 2, position: "relative" }}>
                {user?.displayName?.charAt(0) || "A"}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "52px", fontFamily: T.fontMono, fontSize: "11px", color: "rgba(255,255,255,0.45)", marginBottom: "20px" }}>
              <span>{bet.createdByName?.split(" ")[0]}</span>
              <span>You</span>
            </div>

            {/* TIME TO SWEAT */}
            <div style={{ fontFamily: T.fontDisplay, fontSize: "clamp(30px,8vw,46px)", color: "#fff", letterSpacing: "0.02em", lineHeight: "1.05", fontStyle: "italic", marginBottom: "6px" }}>
              TIME TO SWEAT,<br />NO EXCUSES.
            </div>
            <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: "rgba(255,255,255,0.45)", marginBottom: "20px" }}>
              {bet.description || `${bet.createdByName} won. You lost. Pay up.`}
            </div>

            {/* Exercise count */}
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: T.r16, padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🏋️</div>
              <div style={{ fontFamily: T.fontMono, fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px" }}>{bet.forfeit}</div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: "64px", color: T.accent, lineHeight: 1 }}>{bet.reps || "?"}</div>
              <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>reps owed</div>
            </div>

            {/* Trash talk */}
            <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.2)`, borderRadius: T.r12, padding: "12px 16px", borderLeft: `3px solid ${T.red}`, textAlign: "left" }}>
              <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: "rgba(255,255,255,0.65)", fontStyle: "italic" }}>
                "{bet.createdByName?.split(" ")[0]} says: {trashTalk}"
              </div>
            </div>
          </div>
        )}

        {!bet && (
          <div style={{ background: T.bg1, border: `1px solid ${T.borderCard}`, borderRadius: T.r16, padding: "16px", marginBottom: "16px", boxShadow: T.shadowCard }}>
            <div style={{ fontFamily: T.fontMono, fontSize: "11px", fontWeight: "700", color: T.textMuted, letterSpacing: "0.1em", marginBottom: "4px" }}>FREE POST</div>
            <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: T.textMuted }}>Post any workout video to the feed</div>
          </div>
        )}

        {/* Camera / file */}
        {showCamera ? (
          <div style={{ marginBottom: "16px" }}>
            <video ref={cameraRef} autoPlay muted playsInline style={{ width: "100%", borderRadius: T.r16, background: T.panel, aspectRatio: "9/16", objectFit: "cover" }} />
            <button onClick={stopCamera} style={{ width: "100%", marginTop: "10px", background: "transparent", border: `1.5px solid ${T.borderMid}`, borderRadius: T.r16, padding: "14px", fontFamily: T.fontDisplay, fontSize: "18px", color: T.textMuted, cursor: "pointer" }}>Cancel Camera</button>
          </div>
        ) : preview ? (
          <div style={{ marginBottom: "16px", position: "relative" }}>
            <video src={preview} controls style={{ width: "100%", borderRadius: T.r16, background: T.panel, maxHeight: "320px", objectFit: "contain" }} />
            <button onClick={() => { setFile(null); setPreview(null); }} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#fff", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <button onClick={startCamera} style={{ background: T.panel, border: "none", borderRadius: T.r16, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: T.shadowMd }}>
              <span style={{ fontSize: "28px" }}>📸</span>
              <span style={{ fontFamily: T.fontDisplay, fontSize: "16px", color: T.accent, letterSpacing: "0.04em" }}>Record Now</span>
            </button>
            <button onClick={() => fileRef.current?.click()} style={{ background: T.bg1, border: `1.5px solid ${T.borderMid}`, borderRadius: T.r16, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: T.shadowSm }}>
              <span style={{ fontSize: "28px" }}>📁</span>
              <span style={{ fontFamily: T.fontDisplay, fontSize: "16px", color: T.panel, letterSpacing: "0.04em" }}>Upload File</span>
            </button>
            <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={pickFile} />
          </div>
        )}

        {uploading && (
          <div style={{ background: T.bg1, border: `1px solid ${T.borderCard}`, borderRadius: T.r16, padding: "16px", marginBottom: "16px", boxShadow: T.shadowCard }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontFamily: T.fontMono, fontSize: "12px", color: T.textMuted }}>Uploading proof...</div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: "20px", color: T.accent }}>{progress}%</div>
            </div>
            <div style={{ height: "6px", background: T.bg3, borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: T.accent, borderRadius: "3px", transition: "width 0.3s ease" }} />
            </div>
          </div>
        )}

        {error && <div style={{ background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: T.r12, padding: "12px 16px", fontFamily: T.fontBody, fontSize: "14px", color: T.red, marginBottom: "12px" }}>{error}</div>}

        <button onClick={upload} disabled={uploading || !file} style={{ width: "100%", background: file ? T.panel : T.bg3, border: "none", borderRadius: T.r16, padding: "18px 24px", fontFamily: T.fontDisplay, fontSize: "22px", letterSpacing: "0.06em", color: file ? T.accent : T.textMuted, cursor: file ? "pointer" : "default", boxShadow: file ? "0 4px 20px rgba(5,46,22,0.2)" : "none", marginBottom: "10px", transition: "all 0.2s" }}>
          {uploading ? "Uploading..." : "START SWEATING →"}
        </button>
        <div style={{ textAlign: "center", fontFamily: T.fontMono, fontSize: "11px", color: T.textMuted }}>
          Optional: Record proof to flex on {bet?.createdByName?.split(" ")[0] || "them"}
        </div>
      </div>
    </div>
  );
}