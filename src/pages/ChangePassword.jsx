import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import T from "../theme";

const C = {
  page:"#f0fdf4", card:"#ffffff", border:"#d1fae5",
  heading:"#052e16", muted:"#6b7280", accent:"#10b981",
  chalkboard:"#2C4A3E", danger:"#ef4444",
};

export default function ChangePassword({ user }) {
  const navigate = useNavigate();
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!current) { setError("Please enter your current password."); return; }
    if (next.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, next);
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setError("Current password is incorrect.");
      } else {
        setError("Something went wrong. Try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.page }}>
      {/* header */}
      <div style={{
        background:C.chalkboard, padding:"16px",
        display:"flex", alignItems:"center", gap:"12px",
      }}>
        <button onClick={() => navigate(-1)} style={{
          width:"36px", height:"36px", borderRadius:"50%",
          background:"rgba(255,255,255,0.15)", border:"none",
          color:"#fff", fontSize:"18px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>‹</button>
        <span style={{ fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.04em", color:"#fff" }}>
          Change Password
        </span>
      </div>

      <div style={{ padding:"24px 16px" }}>
        {success ? (
          <div style={{
            background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.4)",
            borderRadius:"16px", padding:"24px", textAlign:"center",
          }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>✅</div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading }}>Password Updated!</div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:C.muted, marginTop:"8px" }}>
              Redirecting you home…
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{
              background:C.card, borderRadius:"16px",
              border:`1px solid ${C.border}`, overflow:"hidden",
            }}>
              {[
                { label:"Current Password", value:current, onChange:setCurrent, placeholder:"Enter current password" },
                { label:"New Password",     value:next,    onChange:setNext,    placeholder:"At least 6 characters" },
                { label:"Confirm Password", value:confirm, onChange:setConfirm, placeholder:"Repeat new password" },
              ].map((f, i, arr) => (
                <div key={f.label} style={{ borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ padding:"10px 16px 2px", fontFamily:T.fontMono, fontSize:"10px", color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                    {f.label}
                  </div>
                  <input
                    type="password"
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    style={{
                      width:"100%", padding:"8px 16px 14px",
                      background:"transparent", border:"none", outline:"none",
                      fontFamily:T.fontBody, fontSize:"15px", color:C.heading,
                      boxSizing:"border-box",
                    }}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)",
                borderRadius:"12px", padding:"12px 16px",
                fontFamily:T.fontBody, fontSize:"13px", color:C.danger,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width:"100%", padding:"16px", borderRadius:"16px",
                background: loading ? "#e5e7eb" : C.chalkboard,
                border:"none", fontFamily:T.fontDisplay, fontSize:"20px",
                letterSpacing:"0.06em", color: loading ? C.muted : C.accent,
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "UPDATING…" : "UPDATE PASSWORD"}
            </button>

            <p style={{ fontFamily:T.fontBody, fontSize:"12px", color:C.muted, textAlign:"center" }}>
              You'll stay logged in after changing your password.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}