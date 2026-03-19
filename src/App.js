import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { auth, provider } from "./firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import Feed from "./pages/Feed";
import Bets from "./pages/Bets";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import CreateBet from "./pages/CreateBet";
import UploadProof from "./pages/UploadProof";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div style={S.center}>
      <div style={S.logo}>Sweat<span style={{color:"#d4ff00"}}>Debt</span></div>
    </div>
  );

  if (!user) return (
    <div style={S.center}>
      <div style={S.logo}>Sweat<span style={{color:"#d4ff00"}}>Debt</span></div>
      <p style={S.sub}>Lose the bet. Do the workout. Post the proof.</p>
      <button style={S.btn} onClick={login}>Sign in with Google</button>
    </div>
  );

  return (
    <BrowserRouter>
      <div style={{background:"#111", minHeight:"100vh"}}>
        <Routes>
          <Route path="/" element={<Feed user={user}/>}/>
          <Route path="/bets" element={<Bets user={user}/>}/>
          <Route path="/leaderboard" element={<Leaderboard user={user}/>}/>
          <Route path="/profile" element={<Profile user={user}/>}/>
          <Route path="/create" element={<CreateBet user={user}/>}/>
          <Route path="/upload/:betId" element={<UploadProof user={user}/>}/>
          <Route path="/upload" element={<UploadProof user={user}/>}/>
        </Routes>

        {/* Bottom Nav */}
        <nav style={S.nav}>
          <NavLink to="/" style={({isActive}) => ({...S.navItem, color: isActive ? "#d4ff00" : "#555"})}>
            <div style={S.navIcon}>▶</div>
            <div style={S.navLabel}>FEED</div>
          </NavLink>
          <NavLink to="/bets" style={({isActive}) => ({...S.navItem, color: isActive ? "#d4ff00" : "#555"})}>
            <div style={S.navIcon}>⚔️</div>
            <div style={S.navLabel}>BETS</div>
          </NavLink>
          <NavLink to="/leaderboard" style={({isActive}) => ({...S.navItem, color: isActive ? "#d4ff00" : "#555"})}>
            <div style={S.navIcon}>🏆</div>
            <div style={S.navLabel}>RANKS</div>
          </NavLink>
          <NavLink to="/profile" style={({isActive}) => ({...S.navItem, color: isActive ? "#d4ff00" : "#555"})}>
            <div style={S.navIcon}>👤</div>
            <div style={S.navLabel}>ME</div>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}

const S = {
  center:{minHeight:"100vh",background:"#0a0a0a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px"},
  logo:{fontFamily:"sans-serif",fontSize:"48px",fontWeight:"700",color:"#f5f0e8",letterSpacing:"2px"},
  sub:{color:"#666",fontSize:"16px",textAlign:"center",maxWidth:"300px"},
  btn:{background:"#d4ff00",color:"#000",border:"none",padding:"14px 32px",fontSize:"16px",fontWeight:"600",cursor:"pointer",borderRadius:"8px"},
  nav:{position:"fixed",bottom:0,left:0,right:0,height:"64px",background:"rgba(17,17,17,0.95)",borderTop:"1px solid #222",display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100},
  navItem:{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",textDecoration:"none",flex:1},
  navIcon:{fontSize:"20px"},
  navLabel:{fontSize:"9px",letterSpacing:"0.08em",fontWeight:"500"},
};

export default App;