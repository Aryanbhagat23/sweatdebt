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
import useNotifications from "./hooks/useNotifications";

function NavBar({ user, onProfileOpen, onBellOpen }) {
  const location = useLocation();
  const hideNav = ["/create","/upload","/edit-profile","/friends"].some(p=>location.pathname.startsWith(p));
  if (hideNav) return null;
  return (
    <nav style={S.nav}>
      <NavLink to="/" end style={({isActive})=>({...S.navItem,color:isActive?"#d4ff00":"#444"})}>
        <div style={S.navIcon}>▶</div>
        <div style={S.navLabel}>FEED</div>
      </NavLink>
      <NavLink to="/bets" style={({isActive})=>({...S.navItem,color:isActive?"#d4ff00":"#444"})}>
        <div style={S.navIcon}>⚔️</div>
        <div style={S.navLabel}>BETS</div>
      </NavLink>
      <NavLink to="/leaderboard" style={({isActive})=>({...S.navItem,color:isActive?"#d4ff00":"#444"})}>
        <div style={S.navIcon}>🏆</div>
        <div style={S.navLabel}>RANKS</div>
      </NavLink>
      <div style={S.navItem} onClick={onProfileOpen}>
        <div style={{...S.navIcon,position:"relative"}}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" style={{width:"26px",height:"26px",borderRadius:"50%",objectFit:"cover",border:"2px solid #d4ff00"}}/>
          ) : (
            <div style={S.profileCircle}>{user?.displayName?.charAt(0)||"?"}</div>
          )}
        </div>
        <div style={S.navLabel}>ME</div>
      </div>
    </nav>
  );
}

function AppContent({ user }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (t) => { setToast(t); };

  useNotifications(user, showToast);

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
      </Routes>

      <NavBar
        user={user}
        onProfileOpen={()=>setProfileOpen(true)}
        onBellOpen={()=>setNotifOpen(true)}
      />

      <ProfileOverlay
        user={user}
        isOpen={profileOpen}
        onClose={()=>setProfileOpen(false)}
      />

      <NotificationCenter
        user={user}
        isOpen={notifOpen}
        onClose={()=>setNotifOpen(false)}
      />

      <Toast toast={toast} onClose={()=>setToast(null)}/>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        await saveUserProfile(u);
        setUser(u);
      } else {
        setUser(null);
      }
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
      <div style={{fontSize:"64px",marginBottom:"8px"}}>🔥</div>
      <div style={S.splashLogo}>Sweat<span style={{color:"#d4ff00"}}>Debt</span></div>
      <div style={{fontSize:"22px",fontWeight:"300",color:"#555"}}>Lose the bet.</div>
      <div style={{fontSize:"22px",fontWeight:"300",color:"#555"}}>Do the workout.</div>
      <div style={{fontSize:"22px",fontWeight:"500",color:"#f5f0e8",marginBottom:"16px"}}>Post the proof.</div>
      <button style={S.loginBtn} onClick={login}>
        <span style={{fontSize:"20px",fontWeight:"900"}}>G</span>
        Sign in with Google
      </button>
      <div style={{fontSize:"12px",color:"#444",fontFamily:"monospace",marginTop:"4px"}}>Free forever. No credit card.</div>
    </div>
  );

  return (
    <BrowserRouter>
      <div style={{background:"#111",minHeight:"100vh"}}>
        <AppContent user={user}/>
      </div>
    </BrowserRouter>
  );
}

const S = {
  splash:{minHeight:"100vh",background:"#0a0a0a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px",padding:"40px 24px"},
  splashLogo:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"56px",color:"#f5f0e8",letterSpacing:"2px",lineHeight:1},
  loginBtn:{width:"100%",maxWidth:"320px",background:"#d4ff00",border:"none",borderRadius:"16px",padding:"18px 24px",fontSize:"18px",fontWeight:"700",color:"#000",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",marginTop:"8px"},
  nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",height:"72px",background:"rgba(10,10,10,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid #222",display:"flex",alignItems:"flex-start",justifyContent:"space-around",paddingTop:"10px",paddingBottom:"env(safe-area-inset-bottom)",zIndex:1000},
  navItem:{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",textDecoration:"none",flex:1,padding:"4px 0",transition:"color 0.2s",cursor:"pointer"},
  navIcon:{fontSize:"22px",lineHeight:1},
  navLabel:{ fontSize:"9px", letterSpacing:"0.1em", fontWeight:"500", fontFamily:"'DM Mono',monospace" },
  profileCircle:{width:"26px",height:"26px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700",color:"#000"},
};

export default App;