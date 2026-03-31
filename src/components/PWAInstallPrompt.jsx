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

    // Dismissed within last 3 days — don't show
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 3 * 86400000) return;

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
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
      setShow(false);
    } else if (isIOS) {
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

        {/* iOS steps (shown after tapping Install on iOS) */}
        {showIOSSteps && (
          <div style={{padding:"16px 24px",borderBottom:"1px solid #f3f4f6"}}>
            {[
              {num:"1", icon:"⬆️", text:'Tap the Share button at the bottom of Safari'},
              {num:"2", icon:"➕", text:'"Add to Home Screen"'},
              {num:"3", icon:"✅", text:'Tap "Add" — done!'},
            ].map(s=>(
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
          <button onClick={handleInstall} style={{
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


export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner,     setShowBanner]     = useState(false);
  const [installed,      setInstalled]      = useState(false);
  const [showIOSGuide,   setShowIOSGuide]   = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 86400000) return;

    // Android/Chrome — listen for beforeinstallprompt
    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari — show manual guide
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandalone = window.navigator.standalone;
    if (isIOS && !isInStandalone) {
      setTimeout(() => setShowBanner(true), 3000);
    }

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android — native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
    } else {
      // iOS — show manual guide
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  if (installed || !showBanner) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <>
      {/* iOS guide modal */}
      {showIOSGuide && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          zIndex:10000, display:"flex", alignItems:"flex-end", justifyContent:"center",
        }} onClick={() => setShowIOSGuide(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background:WHITE, borderRadius:"24px 24px 0 0",
            padding:"24px 24px 40px", width:"100%", maxWidth:"480px",
          }}>
            <div style={{ width:"40px", height:"4px", background:"#e5e7eb", borderRadius:"2px", margin:"0 auto 20px" }}/>
            <div style={{ fontFamily:"monospace", fontSize:"20px", fontWeight:"700", color:CHALK, marginBottom:"16px" }}>
              Add to Home Screen
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
              {[
                { num:"1", text:"Tap the Share button", icon:"⬆️", sub:"at the bottom of Safari" },
                { num:"2", text:"Scroll down and tap",  icon:"➕", sub:'"Add to Home Screen"' },
                { num:"3", text:"Tap Add",              icon:"✅", sub:"SweatDebt appears on your home screen" },
              ].map(s => (
                <div key={s.num} style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                  <div style={{
                    width:"36px", height:"36px", borderRadius:"50%",
                    background:CHALK, display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"monospace", fontSize:"16px", fontWeight:"700", color:ACCENT, flexShrink:0,
                  }}>{s.num}</div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <span style={{ fontSize:"18px" }}>{s.icon}</span>
                      <span style={{ fontFamily:"system-ui", fontSize:"15px", fontWeight:"500", color:CHALK }}>{s.text}</span>
                    </div>
                    <div style={{ fontFamily:"system-ui", fontSize:"13px", color:"#6b7280", marginTop:"2px" }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowIOSGuide(false)} style={{
              width:"100%", marginTop:"24px", padding:"14px",
              background:CHALK, border:"none", borderRadius:"14px",
              fontFamily:"monospace", fontSize:"16px", fontWeight:"700",
              color:ACCENT, cursor:"pointer", letterSpacing:"0.06em",
            }}>GOT IT</button>
          </div>
        </div>
      )}

      {/* Install banner */}
      <div style={{
        position:"fixed", bottom:"80px", left:"50%", transform:"translateX(-50%)",
        width:"calc(100% - 32px)", maxWidth:"440px",
        background:CHALK, borderRadius:"18px",
        padding:"14px 16px", zIndex:9000,
        display:"flex", alignItems:"center", gap:"12px",
        boxShadow:"0 8px 32px rgba(0,0,0,0.3)",
        animation:"slideUp 0.3s ease",
      }}>
        <style>{`@keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`}</style>

        {/* App icon */}
        <div style={{
          width:"46px", height:"46px", borderRadius:"12px",
          overflow:"hidden", flexShrink:0,
        }}>
          <img src="/android-chrome-192x192.png" alt="SweatDebt" style={{width:"100%",height:"100%"}}/></div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"monospace", fontSize:"14px", fontWeight:"700", color:WHITE, letterSpacing:"0.04em" }}>
            Install SweatDebt
          </div>
          <div style={{ fontFamily:"system-ui", fontSize:"12px", color:"rgba(255,255,255,0.6)", marginTop:"2px" }}>
            {isIOS ? "Add to home screen for the full experience" : "Install the app — works offline too"}
          </div>
        </div>

        <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
          <button onClick={handleDismiss} style={{
            background:"rgba(255,255,255,0.1)", border:"none",
            borderRadius:"8px", padding:"8px 10px",
            color:"rgba(255,255,255,0.6)", fontSize:"12px",
            cursor:"pointer", fontFamily:"system-ui",
          }}>Later</button>
          <button onClick={handleInstall} style={{
            background:ACCENT, border:"none",
            borderRadius:"8px", padding:"8px 14px",
            color:CHALK, fontSize:"12px", fontWeight:"700",
            cursor:"pointer", fontFamily:"monospace", letterSpacing:"0.04em",
          }}>INSTALL</button>
        </div>
      </div>
    </>
  );
}