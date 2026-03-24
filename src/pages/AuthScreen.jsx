import React, { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, provider, facebookProvider } from "../firebase";
import T, { gradientText, btnPrimary } from "../theme";

const friendly = (code) => ({
  "auth/user-not-found":     "No account found with this email",
  "auth/wrong-password":     "Incorrect password",
  "auth/email-already-in-use": "An account with this email already exists",
  "auth/invalid-email":      "Please enter a valid email",
  "auth/weak-password":      "Password needs at least 6 characters",
  "auth/too-many-requests":  "Too many attempts — try again later",
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
}[code] || "Something went wrong. Please try again.");

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

  const go = async (fn) => {
    setLoading(true); clr();
    try { await fn(); }
    catch (e) { setError(friendly(e.code)); }
    setLoading(false);
  };

  // ── Landing ──────────────────────────────────────────────────
  if (mode === "landing") return (
    <div style={S.page}>
      {/* Background glow */}
      <div style={{ position:"absolute", top:"20%", left:"50%", transform:"translate(-50%,-50%)", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle,rgba(255,45,85,0.08) 0%,transparent 65%)", pointerEvents:"none" }} />

      <div style={{ position:"relative", textAlign:"center", marginBottom:"40px" }}>
        <div style={{ fontSize:"64px", marginBottom:"12px", lineHeight:1 }}>🔥</div>
        <div style={{ fontFamily: T.fontDisplay, fontSize:"64px", color: T.white, letterSpacing:"0.02em", lineHeight:0.9, marginBottom:"16px" }}>
          Sweat<span style={gradientText}>Debt</span>
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize:"18px", fontWeight:"300", color: T.muted, lineHeight:"1.6" }}>
          Lose the bet.<br/>Do the workout.<br/><span style={{ color: T.white, fontWeight:"500" }}>Post the proof.</span>
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:"340px", display:"flex", flexDirection:"column", gap:"10px" }}>
        <SocBtn label="Continue with Google"   icon="G" onClick={() => go(() => signInWithPopup(auth, provider))}          loading={loading} primary />
        <SocBtn label="Continue with Facebook" icon="f" onClick={() => go(() => signInWithPopup(auth, facebookProvider))}  loading={loading} />

        <div style={S.or}><div style={S.line} /><span style={S.ort}>or</span><div style={S.line} /></div>

        <button style={{ ...S.outBtn }} onClick={() => { clr(); setMode("login"); }}>Sign in with email</button>
        <button style={{ ...S.ghostBtn }} onClick={() => { clr(); setMode("signup"); }}>Create new account</button>
      </div>

      <div style={{ fontFamily: T.fontMono, fontSize:"11px", color: T.dim, marginTop:"24px" }}>Free forever · No credit card</div>
    </div>
  );

  // ── Login ────────────────────────────────────────────────────
  if (mode === "login") return (
    <div style={S.page}>
      <BkBtn onClick={() => { clr(); setMode("landing"); }} />
      <div style={{ textAlign:"center", marginBottom:"28px" }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize:"40px", color: T.white, letterSpacing:"0.02em" }}>Welcome back</div>
        <div style={{ fontFamily: T.fontBody, fontSize:"15px", color: T.muted, marginTop:"4px" }}>Sign in to your account</div>
      </div>
      <form onSubmit={e => { e.preventDefault(); if (!email||!password){ setError("Please fill in all fields"); return; } go(() => signInWithEmailAndPassword(auth, email.trim(), password)); }} style={{ width:"100%", maxWidth:"340px" }}>
        <Fld label="Email"    val={email}    set={v=>{setEmail(v);clr();}}    type="email"    ph="you@example.com" />
        <PFld label="Password" val={password} set={v=>{setPassword(v);clr();}} show={showPass} tog={()=>setShowPass(p=>!p)} />
        {error && <Err msg={error} />}
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading?0.5:1 }}>{loading?"Signing in...":"Sign In"}</button>
      </form>
      <div style={S.or2}><div style={S.line}/><span style={S.ort}>or</span><div style={S.line}/></div>
      <div style={{ width:"100%", maxWidth:"340px", display:"flex", flexDirection:"column", gap:"8px" }}>
        <SocBtn label="Sign in with Google"   icon="G" onClick={() => go(() => signInWithPopup(auth, provider))}         loading={loading} primary />
        <SocBtn label="Sign in with Facebook" icon="f" onClick={() => go(() => signInWithPopup(auth, facebookProvider))} loading={loading} />
      </div>
      <div style={S.switchLine}>Don't have an account? <span style={S.link} onClick={()=>{clr();setMode("signup");}}>Sign up</span></div>
    </div>
  );

  // ── Signup ───────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <BkBtn onClick={() => { clr(); setMode("landing"); }} />
      <div style={{ textAlign:"center", marginBottom:"28px" }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize:"40px", color: T.white, letterSpacing:"0.02em" }}>Create account</div>
        <div style={{ fontFamily: T.fontBody, fontSize:"15px", color: T.muted, marginTop:"4px" }}>Join SweatDebt for free</div>
      </div>
      <form onSubmit={e => {
        e.preventDefault();
        if (!name.trim())         { setError("Please enter your name"); return; }
        if (!email)               { setError("Please enter your email"); return; }
        if (password.length < 6)  { setError("Password needs at least 6 characters"); return; }
        if (password !== confirm)  { setError("Passwords don't match"); return; }
        go(async () => { const c = await createUserWithEmailAndPassword(auth, email.trim(), password); await updateProfile(c.user, { displayName: name.trim() }); });
      }} style={{ width:"100%", maxWidth:"340px" }}>
        <Fld label="Full name" val={name}     set={v=>{setName(v);clr();}}     type="text"     ph="Your name" />
        <Fld label="Email"     val={email}    set={v=>{setEmail(v);clr();}}    type="email"    ph="you@example.com" />
        <PFld label="Password"         val={password} set={v=>{setPassword(v);clr();}} show={showPass} tog={()=>setShowPass(p=>!p)} hint="At least 6 characters" />
        <PFld label="Confirm password" val={confirm}  set={v=>{setConfirm(v);clr();}}  show={showPass} tog={()=>setShowPass(p=>!p)} />
        {error && <Err msg={error} />}
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading?0.5:1 }}>{loading?"Creating...":"Create Account"}</button>
      </form>
      <div style={S.switchLine}>Already have an account? <span style={S.link} onClick={()=>{clr();setMode("login");}}>Sign in</span></div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function BkBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ position:"absolute", top:"52px", left:"20px", background: T.bg2, border:`1px solid ${T.border}`, borderRadius:"50%", width:"44px", height:"44px", color: T.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
  );
}
function Fld({ label, val, set, type, ph }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <label style={{ fontFamily: T.fontMono, fontSize:"11px", color: T.muted, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>{label}</label>
      <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
        style={{ width:"100%", background: T.bg2, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px 16px", color: T.white, fontSize:"16px", fontFamily: T.fontBody, outline:"none", caretColor: T.pink, WebkitTextFillColor: T.white }} />
    </div>
  );
}
function PFld({ label, val, set, show, tog, hint }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <label style={{ fontFamily: T.fontMono, fontSize:"11px", color: T.muted, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input type={show?"text":"password"} value={val} onChange={e => set(e.target.value)} placeholder="••••••••"
          style={{ width:"100%", background: T.bg2, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px 48px 14px 16px", color: T.white, fontSize:"16px", fontFamily: T.fontBody, outline:"none", caretColor: T.pink, WebkitTextFillColor: T.white }} />
        <div style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", cursor:"pointer", color: T.muted, fontSize:"13px", fontFamily: T.fontBody }} onClick={tog}>{show?"Hide":"Show"}</div>
      </div>
      {hint && <div style={{ fontFamily: T.fontBody, fontSize:"12px", color: T.dim, marginTop:"4px" }}>{hint}</div>}
    </div>
  );
}
function Err({ msg }) {
  return msg ? <div style={{ background: T.redDim, border:`1px solid ${T.redBorder}`, borderRadius:"12px", padding:"12px 16px", fontFamily: T.fontBody, fontSize:"14px", color: T.red, marginBottom:"12px" }}>{msg}</div> : null;
}
function SocBtn({ label, icon, onClick, loading, primary }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width:"100%",
      background: primary ? T.gradPrimary : T.bg2,
      border: primary ? "none" : `1px solid ${T.border}`,
      borderRadius:"14px", padding:"14px 20px",
      fontSize:"16px", fontWeight:"600", fontFamily: T.fontBody,
      color: T.white, cursor: loading?"not-allowed":"pointer",
      display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
      opacity: loading ? 0.6 : 1,
    }}>
      <span style={{ fontSize:"18px", fontWeight:"900" }}>{icon}</span>{label}
    </button>
  );
}

const S = {
  page:{ minHeight:"100vh", background: T.bg0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", position:"relative", overflow:"hidden" },
  or:{ display:"flex", alignItems:"center", gap:"12px", margin:"4px 0", width:"100%", maxWidth:"340px" },
  or2:{ display:"flex", alignItems:"center", gap:"12px", margin:"16px 0 12px", width:"100%", maxWidth:"340px" },
  line:{ flex:1, height:"0.5px", background: T.border },
  ort:{ fontFamily: T.fontMono, fontSize:"11px", color: T.muted, letterSpacing:"0.08em" },
  outBtn:{ width:"100%", maxWidth:"340px", background:"transparent", border:`1px solid ${T.borderMid}`, borderRadius:"14px", padding:"14px 20px", fontSize:"16px", fontFamily: T.fontBody, color: T.white, cursor:"pointer" },
  ghostBtn:{ width:"100%", maxWidth:"340px", background:"transparent", border:"none", padding:"12px", fontSize:"15px", fontFamily: T.fontBody, color: T.muted, cursor:"pointer" },
  switchLine:{ fontFamily: T.fontBody, fontSize:"14px", color: T.muted, marginTop:"20px" },
  link:{ color: T.pink, cursor:"pointer", fontWeight:"500" },
};