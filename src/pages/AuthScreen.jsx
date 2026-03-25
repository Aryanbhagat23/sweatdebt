import React, { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, provider, facebookProvider } from "../firebase";
import T from "../theme";

const friendly = c => ({
  "auth/user-not-found":       "No account with this email",
  "auth/wrong-password":       "Incorrect password",
  "auth/invalid-credential":   "Incorrect email or password",
  "auth/email-already-in-use": "Account already exists",
  "auth/invalid-email":        "Please enter a valid email",
  "auth/weak-password":        "Password needs 6+ characters",
  "auth/too-many-requests":    "Too many attempts — try later",
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
}[c] || "Something went wrong.");

const S = {
  page:  { minHeight: "100vh", background: T.bg0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "6px" },
  input: { width: "100%", background: T.bg1, border: `1.5px solid ${T.border}`, borderRadius: T.r14, padding: "14px 16px", color: T.textDark, fontSize: "15px", fontFamily: T.fontBody, outline: "none", boxShadow: T.shadowSm, caretColor: T.accent },
  label: { fontFamily: T.fontMono, fontSize: "11px", fontWeight: "700", color: T.textMuted, letterSpacing: "0.08em", marginBottom: "6px", textTransform: "uppercase", display: "block" },
};

function Fld({ label, val, set, type = "text", ph }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={ph} style={S.input} />
    </div>
  );
}
function PFld({ label, val, set, show, tog }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input value={val} onChange={e => set(e.target.value)} type={show ? "text" : "password"} placeholder="••••••••" style={{ ...S.input }} />
        <button type="button" onClick={tog} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontFamily: T.fontMono, fontSize: "11px", color: T.textMuted }}>{show ? "HIDE" : "SHOW"}</button>
      </div>
    </div>
  );
}
function Err({ msg }) {
  if (!msg) return null;
  return <div style={{ background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: T.r12, padding: "10px 14px", fontFamily: T.fontBody, fontSize: "13px", color: T.red, marginBottom: "12px" }}>{msg}</div>;
}
function SocBtn({ label, icon, onClick, loading, primary }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: primary ? T.panel : T.bg1, border: primary ? "none" : `1.5px solid ${T.borderMid}`, borderRadius: T.r16, padding: "14px 18px", cursor: "pointer", boxShadow: primary ? T.shadowMd : T.shadowSm, transition: "opacity 0.15s", opacity: loading ? 0.5 : 1 }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: primary ? "rgba(16,185,129,0.15)" : T.bg3, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontSize: "14px", color: primary ? T.accent : T.panel, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontFamily: T.fontBody, fontSize: "15px", fontWeight: "600", color: primary ? T.accent : T.textDark }}>{label}</span>
    </button>
  );
}
function OrDiv() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0" }}>
      <div style={{ flex: 1, height: "1px", background: T.border }} />
      <span style={{ fontFamily: T.fontMono, fontSize: "10px", color: T.textMuted, letterSpacing: "0.06em" }}>OR</span>
      <div style={{ flex: 1, height: "1px", background: T.border }} />
    </div>
  );
}
function BkBtn({ onClick }) {
  return <button onClick={onClick} style={{ position: "absolute", top: "52px", left: "16px", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: T.panel, cursor: "pointer", boxShadow: T.shadowSm }}>←</button>;
}

export default function AuthScreen() {
  const [mode,    setMode]    = useState("landing");
  const [email,   setEmail]   = useState("");
  const [password,setPassword]= useState("");
  const [confirm, setConfirm] = useState("");
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [showPass,setShowPass]= useState(false);
  const [showConf,setShowConf]= useState(false);
  const clr = () => setError("");
  const go  = async fn => { setLoading(true); clr(); try { await fn(); } catch (e) { setError(friendly(e.code)||""); } setLoading(false); };

  // ── LANDING ──────────────────────────────────────────────────
  if (mode === "landing") return (
    <div style={S.page}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: T.accentLight, border: `1.5px solid ${T.accent}`, borderRadius: T.rFull, padding: "4px 12px", fontFamily: T.fontMono, fontSize: "10px", fontWeight: "800", color: T.accentDark, letterSpacing: "0.1em", marginBottom: "16px" }}>✦ SWEATDEBT</div>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "64px", marginBottom: "8px", lineHeight: 1 }}>🔥</div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "56px", color: T.panel, letterSpacing: "0.02em", lineHeight: 0.9, fontStyle: "italic", marginBottom: "14px" }}>
          Sweat<span style={{ color: T.accent }}>Debt</span>
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize: "16px", color: T.textMuted, lineHeight: "1.7" }}>
          Lose the bet. Do the workout.<br /><span style={{ color: T.panel, fontWeight: "700" }}>Post the proof.</span>
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <SocBtn label="Continue with Google"   icon="G" onClick={() => go(() => signInWithPopup(auth, provider))}         loading={loading} primary />
        <SocBtn label="Continue with Facebook" icon="f" onClick={() => go(() => signInWithPopup(auth, facebookProvider))} loading={loading} />
        <OrDiv />
        <button style={{ width: "100%", background: "transparent", border: `1.5px solid ${T.borderMid}`, borderRadius: T.r16, padding: "14px", fontFamily: T.fontDisplay, fontSize: "18px", letterSpacing: "0.04em", color: T.panel, cursor: "pointer" }} onClick={() => { clr(); setMode("login"); }}>Sign in with email</button>
        <button style={{ width: "100%", background: "transparent", border: "none", borderRadius: T.r16, padding: "14px", fontFamily: T.fontBody, fontSize: "15px", fontWeight: "600", color: T.accent, cursor: "pointer" }} onClick={() => { clr(); setMode("signup"); }}>Create new account →</button>
      </div>
    </div>
  );

  // ── LOGIN ─────────────────────────────────────────────────────
  if (mode === "login") return (
    <div style={{ ...S.page, justifyContent: "flex-start", paddingTop: "80px", position: "relative" }}>
      <BkBtn onClick={() => { clr(); setMode("landing"); }} />
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "38px", color: T.panel, letterSpacing: "0.02em", fontStyle: "italic" }}>Welcome back</div>
        <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: T.textMuted, marginTop: "4px" }}>Sign in to your account</div>
      </div>
      <form onSubmit={e => { e.preventDefault(); if (!email || !password) { setError("Please fill in all fields"); return; } go(() => signInWithEmailAndPassword(auth, email.trim(), password)); }} style={{ width: "100%", maxWidth: "340px" }}>
        <Fld label="Email"    val={email}    set={v => { setEmail(v); clr(); }}    type="email" ph="you@example.com" />
        <PFld label="Password" val={password} set={v => { setPassword(v); clr(); }} show={showPass} tog={() => setShowPass(p => !p)} />
        <Err msg={error} />
        <button type="submit" disabled={loading} style={{ width: "100%", background: T.panel, border: "none", borderRadius: T.r16, padding: "15px", fontFamily: T.fontDisplay, fontSize: "20px", letterSpacing: "0.05em", color: T.accent, cursor: "pointer", boxShadow: T.shadowMd, opacity: loading ? 0.5 : 1, marginBottom: "12px" }}>{loading ? "Signing in..." : "Sign In"}</button>
        <button type="button" style={{ width: "100%", background: "transparent", border: "none", fontFamily: T.fontBody, fontSize: "14px", color: T.accent, cursor: "pointer", padding: "8px" }} onClick={() => { clr(); setMode("signup"); }}>No account? Create one →</button>
      </form>
    </div>
  );

  // ── SIGNUP ────────────────────────────────────────────────────
  return (
    <div style={{ ...S.page, justifyContent: "flex-start", paddingTop: "80px", position: "relative" }}>
      <BkBtn onClick={() => { clr(); setMode("landing"); }} />
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: "38px", color: T.panel, letterSpacing: "0.02em", fontStyle: "italic" }}>Create account</div>
        <div style={{ fontFamily: T.fontBody, fontSize: "14px", color: T.textMuted, marginTop: "4px" }}>Join the SweatDebt crew</div>
      </div>
      <form onSubmit={async e => {
        e.preventDefault(); clr();
        if (!name.trim())  { setError("Please enter your name"); return; }
        if (!email.trim()) { setError("Please enter your email"); return; }
        if (password.length < 6) { setError("Password needs 6+ characters"); return; }
        if (password !== confirm) { setError("Passwords don't match"); return; }
        go(async () => { const cred = await createUserWithEmailAndPassword(auth, email.trim(), password); await updateProfile(cred.user, { displayName: name.trim() }); });
      }} style={{ width: "100%", maxWidth: "340px" }}>
        <Fld label="Full Name" val={name}    set={v => { setName(v); clr(); }}     type="text"  ph="Your name" />
        <Fld label="Email"     val={email}   set={v => { setEmail(v); clr(); }}    type="email" ph="you@example.com" />
        <PFld label="Password" val={password} set={v => { setPassword(v); clr(); }} show={showPass} tog={() => setShowPass(p => !p)} />
        <PFld label="Confirm Password" val={confirm} set={v => { setConfirm(v); clr(); }} show={showConf} tog={() => setShowConf(p => !p)} />
        <Err msg={error} />
        <button type="submit" disabled={loading} style={{ width: "100%", background: T.panel, border: "none", borderRadius: T.r16, padding: "15px", fontFamily: T.fontDisplay, fontSize: "20px", letterSpacing: "0.05em", color: T.accent, cursor: "pointer", boxShadow: T.shadowMd, opacity: loading ? 0.5 : 1, marginBottom: "12px" }}>{loading ? "Creating..." : "Create Account 🔥"}</button>
        <button type="button" style={{ width: "100%", background: "transparent", border: "none", fontFamily: T.fontBody, fontSize: "14px", color: T.accent, cursor: "pointer", padding: "8px" }} onClick={() => { clr(); setMode("login"); }}>Have an account? Sign in →</button>
      </form>
    </div>
  );
}