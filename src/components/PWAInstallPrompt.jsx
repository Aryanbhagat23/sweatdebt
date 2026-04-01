import React, { useState, useEffect } from "react";

const CHALK  = "#2C4A3E";
const ACCENT = "#10b981";
const WHITE  = "#ffffff";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show,           setShow]           = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);
  const [showIOSSteps,   setShowIOSSteps]   = useState(false);
  const [installed,      setInstalled]      = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone) {
      setInstalled(true);
      return;
    }

    // TEMP: clear dismissed flag so it always shows during testing
    // Remove this line when you go to production
    localStorage.removeItem('pwa-dismissed');

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // Show iOS guide after 1.5s
      setTimeout(() => setShow(true), 1500);
    } else {
      // Android — wait for browser prompt event
      const handler = e => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', handler);

      // Force show after 2s even if event hasn't fired yet (for testing)
      const timer = setTimeout(() => setShow(true), 2000);

      window.addEventListener('appinstalled', () => {
        setInstalled(true);
        setShow(false);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android native install prompt available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
      setShow(false);
    } else if (isIOS) {
      // iOS — show manual steps
      setShowIOSSteps(true);
    } else {
      // Android but prompt not ready yet — show manual instructions
      setShowIOSSteps(true);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setShowIOSSteps(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  if (installed || !show) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleDismiss} style={{
        position:"fixed", inset:0,
        background:"rgba(0,0,0,0.55)",
        zIndex:9998,
        backdropFilter:"blur(2px)",
      }}/>

      {/* Modal */}
      <div style={{
        position:"fixed",
        bottom:0, left:"50%",
        transform:"translateX(-50%)",
        width:"100%", maxWidth:"480px",
        background:WHITE,
        borderRadius:"24px 24px 0 0",
        zIndex:9999,
        padding:"0 0 env(safe-area-inset-bottom, 24px)",
        animation:"slideUp 0.35s cubic-bezier(0.32,0.72,0,1)",
      }}>
        <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>

        {/* Drag handle */}
        <div style={{width:"40px",height:"4px",background:"#e5e7eb",borderRadius:"2px",margin:"12px auto 0"}}/>

        {/* App info */}
        <div style={{
          display:"flex", alignItems:"center", gap:"16px",
          padding:"20px 24px 0",
        }}>
          <img
            src="/android-chrome-192x192.png"
            alt="SweatDebt"
            style={{width:"64px",height:"64px",borderRadius:"16px",flexShrink:0}}
          />
          <div>
            <div style={{fontFamily:"monospace",fontSize:"20px",fontWeight:"700",color:CHALK,letterSpacing:"0.02em"}}>
              SweatDebt
            </div>
            <div style={{fontFamily:"system-ui",fontSize:"13px",color:"#6b7280",marginTop:"3px"}}>
              sweatdebt.vercel.app
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"4px",marginTop:"5px"}}>
              {"⭐⭐⭐⭐⭐".split("").map((s,i)=>(
                <span key={i} style={{fontSize:"12px"}}>{s}</span>
              ))}
              <span style={{fontFamily:"system-ui",fontSize:"11px",color:"#9ca3af",marginLeft:"4px"}}>
                Free
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{
          padding:"16px 24px",
          fontFamily:"system-ui", fontSize:"14px",
          color:"#374151", lineHeight:"1.6",
          borderBottom:"1px solid #f3f4f6",
        }}>
          Challenge friends to bets. Lose the bet — pay in sweat. Upload your forfeit video as proof. No money, just accountability.
        </div>

        {/* Manual install steps (iOS or Android fallback) */}
        {showIOSSteps && (
          <div style={{padding:"16px 24px",borderBottom:"1px solid #f3f4f6"}}>
            <div style={{fontFamily:"monospace",fontSize:"11px",color:"#9ca3af",letterSpacing:"0.08em",marginBottom:"12px"}}>
              {isIOS ? "ON SAFARI (iOS)" : "ON CHROME (ANDROID)"}
            </div>
            {(isIOS ? [
              {num:"1", icon:"⬆️", text:"Tap the Share button at the bottom"},
              {num:"2", icon:"➕", text:'Tap "Add to Home Screen"'},
              {num:"3", icon:"✅", text:'Tap "Add" — done!'},
            ] : [
              {num:"1", icon:"⋮",  text:"Tap the 3-dot menu in Chrome (top right)"},
              {num:"2", icon:"➕", text:'Tap "Add to Home screen" or "Install app"'},
              {num:"3", icon:"✅", text:'Tap "Install" — done!'},
            ]).map(s=>(
              <div key={s.num} style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                <div style={{
                  width:"28px",height:"28px",borderRadius:"50%",
                  background:CHALK,display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"monospace",fontSize:"13px",fontWeight:"700",color:ACCENT,flexShrink:0,
                }}>{s.num}</div>
                <div style={{fontFamily:"system-ui",fontSize:"13px",color:"#374151"}}>
                  <span style={{fontSize:"16px",marginRight:"6px"}}>{s.icon}</span>
                  {s.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{
          display:"flex", gap:"12px",
          padding:"16px 24px 24px",
        }}>
          <button onClick={handleDismiss} style={{
            flex:1, padding:"14px",
            background:"#f3f4f6", border:"none",
            borderRadius:"14px",
            fontFamily:"system-ui", fontSize:"15px",
            fontWeight:"500", color:"#6b7280",
            cursor:"pointer",
          }}>
            Not now
          </button>
          <button onClick={showIOSSteps ? handleDismiss : handleInstall} style={{
            flex:2, padding:"14px",
            background:CHALK, border:"none",
            borderRadius:"14px",
            fontFamily:"monospace", fontSize:"17px",
            fontWeight:"700", letterSpacing:"0.05em",
            color:ACCENT, cursor:"pointer",
          }}>
            {showIOSSteps ? "GOT IT ✓" : "INSTALL APP"}
          </button>
        </div>
      </div>
    </>
  );
}