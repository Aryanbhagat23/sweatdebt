import React, { useRef } from "react";

const CLOUD_NAME = "daf3vs5n6";
const UPLOAD_PRESET = "jrmodcfe";

const C = {
  bg0:"#070d1a",bg1:"#0d1629",bg2:"#111f38",bg3:"#172847",
  white:"#e0f2fe",muted:"#64748b",dim:"#3d5a7a",
  cyan:"#00d4ff",coral:"#ff6b4a",border1:"#1e3a5f",
};

export default function UploadSheet({ isOpen, onClose, onUploadSuccess }) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const uploadToCloudinary = async (file) => {
    onClose();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("cloud_name", CLOUD_NAME);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.secure_url) onUploadSuccess(data.secure_url);
      else throw new Error("No URL returned");
    } catch (e) {
      console.error("Upload error:", e);
      alert("Upload failed. Please try again.");
    }
  };

  const openCloudinaryWidget = (sources) => {
    if (!window.cloudinary) {
      alert("Upload widget not loaded. Please refresh.");
      return;
    }
    window.cloudinary.openUploadWidget({
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      sources,
      resourceType: "video",
      maxFileSize: 50000000,
      multiple: false,
      styles: {
        palette: {
          window: "#0d1629", windowBorder: "#1e3a5f",
          tabIcon: "#00d4ff", textDark: "#000",
          textLight: "#e0f2fe", link: "#00d4ff",
          action: "#00d4ff", inactiveTabIcon: "#64748b",
          error: "#ff4d6d", inProgress: "#00d4ff",
          complete: "#00e676", sourceBg: "#111f38",
        },
      },
    }, (error, result) => {
      if (result?.event === "success") {
        onClose();
        onUploadSuccess(result.info.secure_url);
      }
      if (error && error.message !== "User closed widget") {
        console.error("Widget error:", error);
      }
    });
  };

  const options = [
    {
      icon: "📷",
      label: "Camera",
      sub: "Record your forfeit right now",
      color: C.cyan,
      action: () => { onClose(); openCloudinaryWidget(["camera"]); },
    },
    {
      icon: "🖼️",
      label: "Gallery",
      sub: "Pick a video from your phone",
      color: "#a855f7",
      action: () => fileInputRef.current?.click(),
    },
    {
      icon: "📁",
      label: "Files",
      sub: "Browse and upload any video file",
      color: C.coral,
      action: () => { onClose(); openCloudinaryWidget(["local"]); },
    },
  ];

  return (
    <>
      <style>{`
        @keyframes sheetUp {
          from { transform: translateX(-50%) translateY(100%); }
          to { transform: translateX(-50%) translateY(0); }
        }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) { onClose(); uploadToCloudinary(file); }
          e.target.value = "";
        }}
      />

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 3000,
        backdropFilter: "blur(6px)",
        animation: "backdropIn 0.25s ease",
      }} onClick={onClose} />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0,
        left: "50%",
        width: "100%", maxWidth: "480px",
        background: C.bg1,
        borderRadius: "24px 24px 0 0",
        padding: "0 20px calc(32px + env(safe-area-inset-bottom))",
        zIndex: 3001,
        animation: "sheetUp 0.38s cubic-bezier(0.32,0.72,0,1) forwards",
        boxShadow: "0 -8px 48px rgba(0,0,0,0.6)",
      }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{
          width: "36px", height: "4px",
          background: C.bg3, borderRadius: "2px",
          margin: "12px auto 20px",
        }} />

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{
            fontFamily: "'Bebas Neue',sans-serif", fontSize: "24px",
            color: C.white, letterSpacing: "0.04em", marginBottom: "4px",
          }}>Upload Proof</div>
          <div style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: "13px", color: C.muted,
          }}>Choose how to upload your forfeit video</div>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {options.map(opt => (
            <div
              key={opt.label}
              style={{
                display: "flex", alignItems: "center", gap: "16px",
                background: C.bg2,
                borderRadius: "16px", padding: "16px 18px",
                cursor: "pointer",
                border: `1px solid ${C.border1}`,
                transition: "all 0.15s",
              }}
              onClick={opt.action}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.98)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; opt.action(); }}
            >
              <div style={{
                width: "50px", height: "50px", borderRadius: "14px",
                background: `${opt.color}15`,
                border: `1px solid ${opt.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", flexShrink: 0,
              }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'DM Sans',sans-serif", fontSize: "16px",
                  fontWeight: "600", color: C.white,
                }}>{opt.label}</div>
                <div style={{
                  fontFamily: "'DM Sans',sans-serif", fontSize: "12px",
                  color: C.muted, marginTop: "2px",
                }}>{opt.sub}</div>
              </div>
              <div style={{
                fontSize: "20px", color: opt.color,
                fontWeight: "bold",
              }}>›</div>
            </div>
          ))}
        </div>

        {/* Cancel */}
        <button style={{
          width: "100%", marginTop: "16px",
          background: "transparent", border: "none",
          fontFamily: "'DM Sans',sans-serif",
          fontSize: "15px", color: C.muted,
          cursor: "pointer", padding: "10px",
        }} onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}