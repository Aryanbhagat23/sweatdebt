import React, { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, provider, facebookProvider } from "../firebase";

const C = { bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a", cyan:"#00d4ff", red:"#ff4d6d", border1:"#1e3a5f", purple:"#a855f7" };

const friendly = (code) => ({ "auth/user-not-found":"No account found with this email", "auth/wrong-password":"Incorrect password", "auth/email-already-in-use":"An account with this email already exists", "auth/invalid-email":"Please enter a valid email", "auth/weak-password":"Password needs at least 6 characters", "auth/too-many-requests":"Too many attempts — try again later", "auth/popup-closed-by-user":"", "auth/cancelled-popup-request":"" }[code] || "Something went wrong. Please try again.");

export default function AuthScreen() {
  const [mode, setMode] = useState("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const clr = () => setError("");

  const go = async (fn) => { setLoading(true); clr(); try { await fn(); } catch (e) { setError(friendly(e.code)); } setLoading(false); };

  if (mode === "landing") return (
    <div style={S.page}>
      <div style={S.glow} />
      <div style={{ fontSize:"56px", marginBottom:"4px" }}>🔥</div>
      <div style={S.logo}>Sweat<span style={{ color:C.cyan }}>Debt</span></div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"19px", fontWeight:"300", color:C.muted }}>Lose the bet.</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"19px", fontWeight:"300", color:C.muted }}>Do the workout.</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"19px", fontWeight:"500", color:C.white, marginBottom:"28px" }}>Post the proof.</div>
      <div style={{ width:"100%", maxWidth:"340px", display:"flex", flexDirection:"column", gap:"10px" }}>
        <SocBtn label="Continue with Google" icon="G" bg={C.cyan} tc="#000" onClick={() => go(() => signInWithPopup(auth, provider))} loading={loading} />
        <SocBtn label="Continue with Facebook" icon="f" bg="#1877F2" tc="#fff" onClick={() => go(() => signInWithPopup(auth, facebookProvider))} loading={loading} />
        <div style={S.or}><div style={S.line} /><span style={S.ort}>or</span><div style={S.line} /></div>
        <button style={S.outBtn} onClick={() => { clr(); setMode("login"); }}>Sign in with email</button>
        <button style={S.ghostBtn} onClick={() => { clr(); setMode("signup"); }}>Create new account</button>
      </div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.dim, marginTop:"20px" }}>Free forever · No credit card</div>
    </div>
  );

  if (mode === "login") return (
    <div style={S.page}>
      <button style={S.back} onClick={() => { clr(); setMode("landing"); }}>←</button>
      <div style={{ ...S.logo, fontSize:"34px", marginBottom:"6px" }}>Welcome back</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:C.muted, marginBottom:"24px" }}>Sign in to your account</div>
      <form onSubmit={e => { e.preventDefault(); if (!email || !password) { setError("Please fill in all fields"); return; } go(() => signInWithEmailAndPassword(auth, email.trim(), password)); }} style={S.form}>
        <Fld label="Email" val={email} set={v => { setEmail(v); clr(); }} type="email" ph="you@example.com" />
        <PFld label="Password" val={password} set={v => { setPassword(v); clr(); }} show={showPass} tog={() => setShowPass(p => !p)} />
        {error && <Err msg={error} />}
        <GBtn label={loading ? "Signing in..." : "Sign In"} dis={loading} />
      </form>
      <div style={S.or}><div style={S.line} /><span style={S.ort}>or</span><div style={S.line} /></div>
      <div style={{ width:"100%", maxWidth:"340px", display:"flex", flexDirection:"column", gap:"8px" }}>
        <SocBtn label="Sign in with Google" icon="G" bg={C.cyan} tc="#000" onClick={() => go(() => signInWithPopup(auth, provider))} loading={loading} />
        <SocBtn label="Sign in with Facebook" icon="f" bg="#1877F2" tc="#fff" onClick={() => go(() => signInWithPopup(auth, facebookProvider))} loading={loading} />
      </div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginTop:"20px" }}>Don't have an account? <span style={{ color:C.cyan, cursor:"pointer" }} onClick={() => { clr(); setMode("signup"); }}>Sign up</span></div>
    </div>
  );

  return (
    <div style={S.page}>
      <button style={S.back} onClick={() => { clr(); setMode("landing"); }}>←</button>
      <div style={{ ...S.logo, fontSize:"34px", marginBottom:"6px" }}>Create account</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:C.muted, marginBottom:"24px" }}>Join SweatDebt for free</div>
      <form onSubmit={e => {
        e.preventDefault();
        if (!name.trim()) { setError("Please enter your name"); return; }
        if (!email) { setError("Please enter your email"); return; }
        if (password.length < 6) { setError("Password needs at least 6 characters"); return; }
        if (password !== confirm) { setError("Passwords don't match"); return; }
        go(async () => { const c = await createUserWithEmailAndPassword(auth, email.trim(), password); await updateProfile(c.user, { displayName: name.trim() }); });
      }} style={S.form}>
        <Fld label="Full name" val={name} set={v => { setName(v); clr(); }} type="text" ph="Your name" />
        <Fld label="Email" val={email} set={v => { setEmail(v); clr(); }} type="email" ph="you@example.com" />
        <PFld label="Password" val={password} set={v => { setPassword(v); clr(); }} show={showPass} tog={() => setShowPass(p => !p)} hint="At least 6 characters" />
        <PFld label="Confirm password" val={confirm} set={v => { setConfirm(v); clr(); }} show={showPass} tog={() => setShowPass(p => !p)} />
        {error && <Err msg={error} />}
        <GBtn label={loading ? "Creating..." : "Create Account"} dis={loading} />
      </form>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.muted, marginTop:"20px" }}>Already have an account? <span style={{ color:C.cyan, cursor:"pointer" }} onClick={() => { clr(); setMode("login"); }}>Sign in</span></div>
    </div>
  );
}

function Fld({ label, val, set, type, ph }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <label style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>{label}</label>
      <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width:"100%", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 16px", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
    </div>
  );
}
function PFld({ label, val, set, show, tog, hint }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <label style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input type={show?"text":"password"} value={val} onChange={e => set(e.target.value)} placeholder="••••••••" style={{ width:"100%", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 48px 14px 16px", color:C.white, fontSize:"16px", fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
        <div style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", cursor:"pointer", color:C.muted, fontSize:"13px", fontFamily:"'DM Sans',sans-serif" }} onClick={tog}>{show?"Hide":"Show"}</div>
      </div>
      {hint && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:C.dim, marginTop:"4px" }}>{hint}</div>}
    </div>
  );
}
function Err({ msg }) { return msg ? <div style={{ background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:"12px", padding:"12px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:C.red, marginBottom:"12px" }}>{msg}</div> : null; }
function GBtn({ label, dis }) { return <button type="submit" disabled={dis} style={{ width:"100%", background:dis?"#222":`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"0.06em", color:dis?C.muted:"#000", cursor:dis?"not-allowed":"pointer", marginBottom:"8px" }}>{label}</button>; }
function SocBtn({ label, icon, bg, tc, onClick, loading }) { return <button onClick={onClick} disabled={loading} style={{ width:"100%", background:bg, border:"none", borderRadius:"14px", padding:"14px 20px", fontSize:"16px", fontWeight:"600", fontFamily:"'DM Sans',sans-serif", color:tc, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", opacity:loading?0.6:1 }}><span style={{ fontSize:"18px", fontWeight:"900" }}>{icon}</span>{label}</button>; }

const S = {
  page:{ minHeight:"100vh", background:C.bg0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", position:"relative" },
  glow:{ position:"absolute", top:"25%", left:"50%", transform:"translate(-50%,-50%)", width:"300px", height:"300px", borderRadius:"50%", background:"radial-gradient(circle,rgba(0,212,255,0.06) 0%,transparent 70%)", pointerEvents:"none" },
  logo:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"52px", color:C.white, letterSpacing:"0.02em", lineHeight:1, marginBottom:"12px" },
  form:{ width:"100%", maxWidth:"340px" },
  or:{ display:"flex", alignItems:"center", gap:"12px", margin:"8px 0", width:"100%", maxWidth:"340px" },
  line:{ flex:1, height:"0.5px", background:C.border1 },
  ort:{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:C.muted, letterSpacing:"0.08em" },
  outBtn:{ width:"100%", background:"transparent", border:`1px solid ${C.border1}`, borderRadius:"14px", padding:"14px 20px", fontSize:"16px", fontFamily:"'DM Sans',sans-serif", color:C.white, cursor:"pointer" },
  ghostBtn:{ width:"100%", background:"transparent", border:"none", padding:"12px", fontSize:"15px", fontFamily:"'DM Sans',sans-serif", color:C.muted, cursor:"pointer" },
  back:{ position:"absolute", top:"52px", left:"20px", background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
};