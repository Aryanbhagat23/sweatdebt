import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { auth, provider } from "./firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import Feed from "./pages/Feed";
import Bets from "./pages/Bets";
import Leaderboard from "./pages/Leaderboard";
import CreateBet from "./pages/CreateBet";
import UploadProof from "./pages/UploadProof";
import ProfileOverlay from "./pages/ProfileOverlay";

function NavBar({ user, onProfileOpen }) {
  const location = useLocation();
  const hideNav = ["/create", "/upload"].some(p => location.pathname.startsWith(p));
  if (hideNav) return null;
  return (
    <nav style={S.nav}>
      <NavLink to="/" end style={({isActive}) => ({...S.navItem, color: isActive ? "#d4ff00" : "#444"})}>
        <div style={S.navIcon}>▶</div>
        <div style={S.navLabel}>FEED</div>
      </NavLink>
      <NavLink to="/bets" style={({isActive}) => ({...S.navItem, color: isActive ? "#d4ff00" : "#444"})}>
        <div style={S.navIcon}>⚔️</div>
        <div style={S.navLabel}>BETS</div>
      </NavLink>
      <NavLink to="/leaderboard" style={({isActive}) => ({...S.navItem, color: isActive ? "#d4ff00" : "#444"})}>
        <div style={S.navIcon}>🏆</div>
        <div style={S.navLabel}>RANKS</div>
      </NavLink>
      {/* Profile button — top right floating */}
      <div style={S.navItem} onClick={onProfileOpen}>
        <div style={S.profileCircle}>
          {user?.displayName?.charAt(0) || "?"}
        </div>
        <div style={S.navLabel}>ME</div>
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { console.error(e); }
  };

  if (loading) return (
    <div style={S.splash}>
      <div style={S.splashLogo}>Sweat<span style={{color:"#d4ff00"}}>Debt</span></div>
    </div>
  );

  if (!user) return (
    <div style={S.splash}>
      <div style={S.splashEmoji}>🔥</div>
      <div style={S.splashLogo}>Sweat<span style={{color:"#d4ff00"}}>Debt</span></div>
      <div style={S.splashTagline}>Lose the bet.</div>
      <div style={S.splashTagline}>Do the workout.</div>
      <div style={S.splashTagline2}>Post the proof.</div>
      <button style={S.loginBtn} onClick={login}>
        <span style={{fontSize:"20px",fontWeight:"900"}}>G</span>
        Sign in with Google
      </button>
      <div style={S.loginNote}>Free forever. No credit card.</div>
    </div>
  );

  return (
    <BrowserRouter>
      <div style={S.app}>
        <Routes>
          <Route path="/" element={<Feed user={user}/>}/>
          <Route path="/bets" element={<Bets user={user}/>}/>
          <Route path="/leaderboard" element={<Leaderboard user={user}/>}/>
          <Route path="/create" element={<CreateBet user={user}/>}/>
          <Route path="/upload/:betId" element={<UploadProof user={user}/>}/>
          <Route path="/upload" element={<UploadProof user={user}/>}/>
        </Routes>
        <NavBar user={user} onProfileOpen={() => setProfileOpen(true)}/>
        <ProfileOverlay
          user={user}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      </div>
    </BrowserRouter>
  );
}

const S = {
  app:{ minHeight:"100vh", background:"#111", position:"relative" },
  splash:{ minHeight:"100vh", background:"#0a0a0a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px", padding:"40px 24px" },
  splashEmoji:{ fontSize:"64px", marginBottom:"8px" },
  splashLogo:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"56px", color:"#f5f0e8", letterSpacing:"2px", lineHeight:1 },
  splashTagline:{ fontSize:"22px", fontWeight:"300", color:"#555", letterSpacing:"0.05em" },
  splashTagline2:{ fontSize:"22px", fontWeight:"500", color:"#f5f0e8", letterSpacing:"0.05em", marginBottom:"16px" },
  loginBtn:{ width:"100%", maxWidth:"320px", background:"#d4ff00", border:"none", borderRadius:"16px", padding:"18px 24px", fontSize:"18px", fontWeight:"700", color:"#000", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", marginTop:"8px" },
  loginNote:{ fontSize:"12px", color:"#444", fontFamily:"monospace", marginTop:"4px" },
  nav:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", height:"72px", background:"rgba(10,10,10,0.97)", backdropFilter:"blur(20px)", borderTop:"1px solid #222", display:"flex", alignItems:"flex-start", justifyContent:"space-around", paddingTop:"10px", paddingBottom:"env(safe-area-inset-bottom)", zIndex:1000 },
  navItem:{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", textDecoration:"none", flex:1, padding:"4px 0", transition:"color 0.2s", cursor:"pointer" },
  navIcon:{ fontSize:"22px", lineHeight:1 },
  navLabel:{ fontSize:"9px", letterSpacing:"0.08em", fontWeight:"500", fontFamily:"monospace" },
  profileCircle:{ width:"30px", height:"30px", borderRadius:"50%", background:"linear-gradient(135deg,#d4ff00,#ff5c1a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:"700", color:"#000", lineHeight:1 },
};

export default App;