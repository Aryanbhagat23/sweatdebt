import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import T from "../theme";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/daf3vs5n6/image/upload";
const UPLOAD_PRESET  = "jrmodcfe";

const STEPS = [
  { title: "Your username",  sub: "Pick a unique @handle" },
  { title: "Your photo",     sub: "Add a profile picture" },
  { title: "Your sports",    sub: "What do you bet on?" },
];
const SPORTS = ["🏏 Cricket","⚽ Football","🎮 Gaming","🏀 Basketball","🎾 Tennis","🏊 Swimming","🚴 Cycling","🥊 MMA","♟️ Chess","🎯 Custom"];

export default function Onboarding({ user, onComplete }) {
  const [step,     setStep]     = useState(0);
  const [username, setUsername] = useState("");
  const [photo,    setPhoto]    = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [sports,   setSports]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const progress = ((step + 1) / STEPS.length) * 100;

  const next = async () => {
    setError("");
    if (step === 0) {
      if (!username.trim() || username.length < 3) { setError("Username must be 3+ characters"); return; }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError("Letters, numbers and _ only"); return; }
    }
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }

    // Final submit
    setLoading(true);
    try {
      let photoURL = user.photoURL || null;

      // Upload photo to Cloudinary if selected
      if (photo) {
        const fd = new FormData();
        fd.append("file", photo);
        fd.append("upload_preset", UPLOAD_PRESET);
        const res  = await fetch(CLOUDINARY_URL, { method: "POST", body: fd });
        const data = await res.json();
        photoURL   = data.secure_url;
      }

      await updateDoc(doc(db, "users", user.uid), {
        username:           username.toLowerCase().trim(),
        photoURL,
        sports,
        onboardingComplete: true,
        updatedAt:          serverTimestamp(),
      });
      await setDoc(doc(db, "usernames", username.toLowerCase().trim()), { uid: user.uid }, { merge: true });
      onComplete?.();
    } catch (e) { setError(e.message || "Something went wrong."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", flexDirection: "column", padding: "52px 20px 40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "36px", color: T.panel, letterSpacing: "0.02em", fontStyle: "italic" }}>
          Sweat<span style={{ color: T.accent }}>Debt</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "4px", background: T.border, borderRadius: "2px", marginBottom: "8px" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: T.accent, borderRadius: "2px", transition: "width 0.35s ease" }} />
      </div>
      <div style={{ fontFamily: T.fontMono, fontSize: "10px", color: T.textMuted, letterSpacing: "0.08em", marginBottom: "28px" }}>
        STEP {step + 1} OF {STEPS.length}
      </div>

      {/* Step header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "34px", color: T.panel, letterSpacing: "0.02em", fontStyle: "italic", lineHeight: 1 }}>{STEPS[step].title}</div>
        <div style={{ fontFamily: T.fontBody, fontSize: "15px", color: T.textMuted, marginTop: "6px" }}>{STEPS[step].sub}</div>
      </div>

      {/* ── STEP 0: Username ── */}
      {step === 0 && (
        <div>
          <div style={{ background: T.bg1, border: `1.5px solid ${T.border}`, borderRadius: T.r16, padding: "0 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: T.shadowSm }}>
            <span style={{ fontFamily: T.fontMono, fontSize: "18px", color: T.textMuted }}>@</span>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setError(""); }}
              placeholder="coolname123"
              maxLength={20}
              style={{ flex: 1, background: "transparent", border: "none", padding: "16px 0", color: T.textDark, fontSize: "18px", fontFamily: T.fontBody, fontWeight: "600", outline: "none", caretColor: T.accent }}
            />
          </div>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.textMuted, marginTop: "8px", letterSpacing: "0.06em" }}>
            Letters, numbers, underscores. Min 3 chars.
          </div>
        </div>
      )}

      {/* ── STEP 1: Photo ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{ width: "120px", height: "120px", borderRadius: "50%", background: preview ? "transparent" : T.bg3, border: `3px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", boxShadow: T.shadowMd }}
            onClick={() => document.getElementById("ob-photo")?.click()}
          >
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ textAlign: "center" }}><div style={{ fontSize: "40px" }}>📷</div><div style={{ fontFamily: T.fontMono, fontSize: "10px", color: T.textMuted, marginTop: "4px" }}>TAP</div></div>
            }
          </div>
          <input id="ob-photo" type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files[0]; if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)); } }} />
          <button onClick={() => document.getElementById("ob-photo")?.click()}
            style={{ background: "transparent", border: `1.5px solid ${T.borderMid}`, borderRadius: T.rFull, padding: "10px 22px", fontFamily: T.fontBody, fontSize: "14px", fontWeight: "600", color: T.panel, cursor: "pointer" }}>
            {preview ? "Change photo" : "Choose photo"}
          </button>
          <button onClick={next} style={{ background: "transparent", border: "none", fontFamily: T.fontBody, fontSize: "14px", color: T.textMuted, cursor: "pointer", padding: "6px" }}>
            Skip for now →
          </button>
        </div>
      )}

      {/* ── STEP 2: Sports ── */}
      {step === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {SPORTS.map(s => {
            const sel = sports.includes(s);
            return (
              <div key={s}
                style={{ background: sel ? T.panel : T.bg1, border: `1.5px solid ${sel ? T.accent : T.border}`, borderRadius: T.r14, padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "all 0.15s", boxShadow: T.shadowSm }}
                onClick={() => setSports(p => sel ? p.filter(x => x !== s) : [...p, s])}>
                <span style={{ fontSize: "20px" }}>{s.split(" ")[0]}</span>
                <span style={{ fontFamily: T.fontBody, fontSize: "14px", fontWeight: "600", color: sel ? T.accent : T.panel }}>{s.split(" ").slice(1).join(" ")}</span>
                {sel && <div style={{ marginLeft: "auto", color: T.accent, fontSize: "16px" }}>✓</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: T.r12, padding: "10px 14px", fontFamily: T.fontBody, fontSize: "13px", color: T.red, marginTop: "16px" }}>{error}</div>
      )}

      {/* CTA */}
      <div style={{ marginTop: "auto", paddingTop: "24px" }}>
        {step !== 1 && (
          <button onClick={next} disabled={loading}
            style={{ width: "100%", background: T.panel, border: "none", borderRadius: T.r16, padding: "16px", fontFamily: T.fontDisplay, fontSize: "22px", letterSpacing: "0.05em", color: T.accent, cursor: "pointer", boxShadow: T.shadowMd, opacity: loading ? 0.5 : 1 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${T.accentLight}`, borderTop: `2px solid ${T.accent}`, animation: "spin 0.8s linear infinite" }} />
                Saving...
              </span>
            ) : step < STEPS.length - 1 ? "Continue →" : "Start Sweating 🔥"}
          </button>
        )}
        {step === 1 && !preview && (
          <button onClick={next} disabled={loading}
            style={{ width: "100%", background: T.panel, border: "none", borderRadius: T.r16, padding: "16px", fontFamily: T.fontDisplay, fontSize: "22px", letterSpacing: "0.05em", color: T.accent, cursor: "pointer", boxShadow: T.shadowMd }}>
            Continue →
          </button>
        )}
        {step === 1 && preview && (
          <button onClick={next} disabled={loading}
            style={{ width: "100%", background: T.panel, border: "none", borderRadius: T.r16, padding: "16px", fontFamily: T.fontDisplay, fontSize: "22px", letterSpacing: "0.05em", color: T.accent, cursor: "pointer", boxShadow: T.shadowMd, opacity: loading ? 0.5 : 1 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${T.accentLight}`, borderTop: `2px solid ${T.accent}`, animation: "spin 0.8s linear infinite" }} />
                Uploading...
              </span>
            ) : "Continue →"}
          </button>
        )}
      </div>
    </div>
  );
}