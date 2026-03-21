import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { auth, provider, saveUserProfile } from "./firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import Feed from "./pages/Feed";
import Bets from "./pages/Bets";
import Leaderboard from "./pages/Leaderboard";
import CreateBet from "./pages/CreateBet";
import UploadProof from "./pages/UploadProof";
import ProfileOverlay from "./pages/ProfileOverlay";
import EditProfile from "./pages/EditProfile";
import FindFriends from "./pages/FindFriends";
import Toast from "./components/Toast";
import NotificationBell from "./components/NotificationBell";
import NotificationCenter from "./components/NotificationCenter";
import UserProfile from "./pages/UserProfile";

const C = {
  bg0:"#070d1a",bg1:"#0d1629",bg2:"#111f38",
  white:"#e0f2fe",muted:"#64748b",dim:"#3d5a7a",
  cyan:"#00d4ff",coral:"#ff6b4a",border1:"#1e3a5f",
};

function NavBar({ user, onProfileOpen, onBellOpen }) {
  const location = useLocation();
  const hideNav = ["/create", "/upload", "/edit-profile", "/friends", "/profile/"].some(p => location.pathname.startsWith(p));
  if (hideNav) return null;

  return (
    <nav style={{
      position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",maxWidth:"480px",
      height:"64px",
      background:"rgba(7,13,26,0.97)",
      backdropFilter:"blur(20px)",
      borderTop:`1px solid ${C.border1}`,
      display:"flex",alignItems:"flex-start",justifyContent:"space-around",
      paddingTop:"10px",
      paddingBottom:"env(safe-area-inset-bottom)",
      zIndex:1000,
    }}>
      <NavLink to="/" end style={({isActive})=>({...navItem, color:isActive?C.cyan:C.dim})}>
        <div style={navIcon}>▶</div>
        <div style={navLabel}>FEED</div>
      </NavLink>
      <NavLink to="/bets" style={({isActive})=>({...navItem, color:isActive?C.cyan:C.dim})}>
        <div style={navIcon}>⚔️</div>
        <div style={navLabel}>BETS</div>
      </NavLink>
      <NavLink to="/leaderboard" style={({isActive})=>({...navItem, color:isActive?C.cyan:C.dim})}>
        <div style={navIcon}>🏆</div>
        <div style={navLabel}>RANKS</div>
      </NavLink>
      <div style={{...navItem, color:C.dim, cursor:"pointer"}} onClick={onProfileOpen}>
        <div style={{...navIcon, position:"relative"}}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" style={{width:"26px",height:"26px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.cyan}`}}/>
          ) : (
            <div style={{
              width:"26px",height:"26px",borderRadius:"50%",
              background:"linear-gradient(135deg,#00d4ff,#a855f7)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"11px",fontWeight:"700",color:"#000",
              fontFamily:"'Bebas Neue',sans-serif",
            }}>{user?.displayName?.charAt(0)||"?"}</div>
          )}
        </div>
        <div style={{...navLabel, color:C.dim}}>ME</div>
      </div>
    </nav>
  );
}

const navItem = {
  display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
  textDecoration:"none",flex:1,padding:"4px 0",transition:"color 0.2s",
};
const navIcon = { fontSize:"20px", lineHeight:1 };
const navLabel = {
  fontSize:"9px",letterSpacing:"0.1em",fontWeight:"500",
  fontFamily:"'DM Mono',monospace",
};

function AppContent({ user }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState(null);

  return (
    <>
      <Routes>
        <Route path="/" element={<Feed user={user} onBellClick={()=>setNotifOpen(true)}/>}/>
        <Route path="/bets" element={<Bets user={user}/>}/>
        <Route path="/leaderboard" element={<Leaderboard user={user}/>}/>
        <Route path="/create" element={<CreateBet user={user}/>}/>
        <Route path="/upload/:betId" element={<UploadProof user={user}/>}/>
        <Route path="/upload" element={<UploadProof user={user}/>}/>
        <Route path="/edit-profile" element={<EditProfile user={user}/>}/>
        <Route path="/friends" element={<FindFriends user={user}/>}/>
        <Route path="/profile/:userId" element={<UserProfile currentUser={user}/>}/>
      </Routes>

      <NavBar user={user} onProfileOpen={()=>setProfileOpen(true)} onBellOpen={()=>setNotifOpen(true)}/>

      <ProfileOverlay user={user} isOpen={profileOpen} onClose={()=>setProfileOpen(false)}/>

      <NotificationCenter user={user} isOpen={notifOpen} onClose={()=>setNotifOpen(false)}/>

      {toast && <Toast toast={toast} onClose={()=>setToast(null)}/>}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) { await saveUserProfile(u); setUser(u); }
      else setUser(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { console.error(e); }
  };

  // Apply global body color
  useEffect(() => {
    document.body.style.background = C.bg0;
    document.body.style.color = C.white;
  }, []);

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"40px",height:"40px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:C.white,letterSpacing:"0.04em"}}>
        Sweat<span style={{color:C.cyan}}>Debt</span>
      </div>
    </div>
  );

  if (!user) return (
    <div style={{
      minHeight:"100vh",background:C.bg0,
      display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",
      gap:"14px",padding:"40px 24px",
    }}>
      {/* Glow effect */}
      <div style={{
        position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",
        width:"300px",height:"300px",borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,212,255,0.08) 0%,transparent 70%)",
        pointerEvents:"none",
      }}/>

      <div style={{fontSize:"64px",marginBottom:"8px"}}>🔥</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"56px",color:C.white,letterSpacing:"0.02em",lineHeight:1}}>
        Sweat<span style={{color:C.cyan}}>Debt</span>
      </div>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"20px",fontWeight:"300",color:C.muted}}>Lose the bet.</div>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"20px",fontWeight:"300",color:C.muted}}>Do the workout.</div>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"20px",fontWeight:"500",color:C.white,marginBottom:"16px"}}>Post the proof.</div>

      <button style={{
        width:"100%",maxWidth:"320px",
        background:`linear-gradient(135deg,${C.cyan},#a855f7)`,
        border:"none",borderRadius:"16px",
        padding:"18px 24px",
        fontSize:"18px",fontWeight:"700",
        fontFamily:"'DM Sans',sans-serif",
        color:"#000",cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",
      }} onClick={login}>
        <span style={{fontSize:"20px",fontWeight:"900"}}>G</span>
        Sign in with Google
      </button>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.dim,marginTop:"4px"}}>
        Free forever. No credit card.
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <div style={{background:C.bg0,minHeight:"100vh"}}>
        <AppContent user={user}/>
      </div>
    </BrowserRouter>
  );
}

export default App;