import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import { auth, saveUserProfile, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";

import AuthScreen from "./pages/AuthScreen";
import Onboarding from "./pages/Onboarding";
import Feed from "./pages/Feed";
import Bets from "./pages/Bets";
import Leaderboard from "./pages/Leaderboard";
import CreateBet from "./pages/CreateBet";
import UploadProof from "./pages/UploadProof";
import ProfileOverlay from "./pages/ProfileOverlay";
import EditProfile from "./pages/EditProfile";
import FindFriends from "./pages/FindFriends";
import UserProfile from "./pages/UserProfile";
import InboxScreen from "./pages/InboxScreen";
import ChatScreen from "./pages/ChatScreen";
import NewChat from "./pages/NewChat";
import NotificationCenter from "./components/NotificationCenter";
import Toast from "./components/Toast";

const C = {
  bg0:"#070d1a",bg1:"#0d1629",bg2:"#111f38",
  white:"#e0f2fe",muted:"#64748b",dim:"#3d5a7a",
  cyan:"#00d4ff",coral:"#ff6b4a",border1:"#1e3a5f",
  purple:"#a855f7",red:"#ff4d6d",
};

function NavBar({ user, livePhotoURL, unreadDMs, onProfileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = ["/create","/upload","/edit-profile","/friends","/profile/","/inbox/"]
    .some(p => location.pathname.startsWith(p));
  if (hideNav) return null;

  return (
    <nav style={{
      position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",maxWidth:"480px",height:"64px",
      background:"rgba(7,13,26,0.97)",backdropFilter:"blur(20px)",
      borderTop:`1px solid ${C.border1}`,
      display:"flex",alignItems:"flex-start",justifyContent:"space-around",
      paddingTop:"10px",paddingBottom:"env(safe-area-inset-bottom)",
      zIndex:1000,
    }}>
      {/* BETS — home */}
      <NavLink to="/" end style={({isActive})=>({...NI,color:isActive?C.cyan:C.dim})}>
        <div style={NIcon}>⚔️</div>
        <div style={NLbl}>BETS</div>
      </NavLink>

      {/* FEED */}
      <NavLink to="/feed" style={({isActive})=>({...NI,color:isActive?C.cyan:C.dim})}>
        <div style={NIcon}>▶</div>
        <div style={NLbl}>FEED</div>
      </NavLink>

      {/* INBOX — messages with unread badge */}
      <NavLink to="/inbox" style={({isActive})=>({...NI,color:isActive?C.cyan:C.dim})}>
        <div style={{...NIcon,position:"relative"}}>
          💬
          {unreadDMs > 0 && (
            <div style={{position:"absolute",top:"-4px",right:"-6px",width:"16px",height:"16px",borderRadius:"50%",background:C.red,border:`2px solid ${C.bg0}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",fontSize:"9px",fontWeight:"700",color:"#fff"}}>
              {unreadDMs > 9 ? "9+" : unreadDMs}
            </div>
          )}
        </div>
        <div style={NLbl}>CHAT</div>
      </NavLink>

      {/* RANKS */}
      <NavLink to="/leaderboard" style={({isActive})=>({...NI,color:isActive?C.cyan:C.dim})}>
        <div style={NIcon}>🏆</div>
        <div style={NLbl}>RANKS</div>
      </NavLink>

      {/* ME */}
      <div style={{...NI,color:C.dim,cursor:"pointer"}} onClick={onProfileOpen}>
        <div style={{...NIcon,position:"relative"}}>
          {livePhotoURL ? (
            <img src={livePhotoURL} alt="" style={{width:"26px",height:"26px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.cyan}`}}/>
          ) : (
            <div style={{width:"26px",height:"26px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700",color:"#000",fontFamily:"'Bebas Neue',sans-serif"}}>
              {user?.displayName?.charAt(0)||"?"}
            </div>
          )}
        </div>
        <div style={NLbl}>ME</div>
      </div>
    </nav>
  );
}

const NI = {display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",textDecoration:"none",flex:1,padding:"4px 0",transition:"color 0.2s"};
const NIcon = {fontSize:"20px",lineHeight:1};
const NLbl = {fontSize:"9px",letterSpacing:"0.1em",fontWeight:"500",fontFamily:"'DM Mono',monospace"};

function AppContent({ user, needsOnboarding, onOnboardingComplete }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [livePhotoURL, setLivePhotoURL] = useState(user?.photoURL || null);
  const [unreadDMs, setUnreadDMs] = useState(0);

  // Live profile photo
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db,"users",user.uid), snap => {
      if (snap.exists()) setLivePhotoURL(snap.data().photoURL || user?.photoURL || null);
    });
    return () => unsub();
  }, [user]);

  // Live unread DM count
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db,"conversations"), where("participants","array-contains",user.uid));
    const unsub = onSnapshot(q, snap => {
      let total = 0;
      snap.docs.forEach(d => { total += d.data().unreadCount?.[user.uid] || 0; });
      setUnreadDMs(total);
    }, () => {});
    return () => unsub();
  }, [user]);

  if (needsOnboarding) return <Onboarding user={user} onComplete={onOnboardingComplete}/>;

  return (
    <>
      <Routes>
        <Route path="/" element={<Bets user={user}/>}/>
        <Route path="/feed" element={<Feed user={user} onBellClick={()=>setNotifOpen(true)}/>}/>
        <Route path="/leaderboard" element={<Leaderboard user={user}/>}/>
        <Route path="/create" element={<CreateBet user={user}/>}/>
        <Route path="/upload/:betId" element={<UploadProof user={user}/>}/>
        <Route path="/upload" element={<UploadProof user={user}/>}/>
        <Route path="/edit-profile" element={<EditProfile user={user}/>}/>
        <Route path="/friends" element={<FindFriends user={user}/>}/>
        <Route path="/profile/:userId" element={<UserProfile currentUser={user}/>}/>
        {/* Messaging routes */}
        <Route path="/inbox" element={<InboxScreen user={user}/>}/>
        <Route path="/inbox/new" element={<NewChat user={user}/>}/>
        <Route path="/inbox/:conversationId" element={<ChatScreen user={user}/>}/>
      </Routes>

      <NavBar
        user={user}
        livePhotoURL={livePhotoURL}
        unreadDMs={unreadDMs}
        onProfileOpen={()=>setProfileOpen(true)}
      />

      <ProfileOverlay user={user} isOpen={profileOpen} onClose={()=>setProfileOpen(false)}/>
      <NotificationCenter user={user} isOpen={notifOpen} onClose={()=>setNotifOpen(false)}/>
      {toast && <Toast toast={toast} onClose={()=>setToast(null)}/>}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    document.body.style.background = C.bg0;
    document.body.style.color = C.white;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const result = await saveUserProfile(u);
        setUser(u);
        setNeedsOnboarding(result?.needsOnboarding || result?.isNew || false);
      } else {
        setUser(null);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });
    return () => unsub();
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

  if (!user) return <AuthScreen/>;

  return (
    <BrowserRouter>
      <div style={{background:C.bg0,minHeight:"100vh"}}>
        <AppContent
          user={user}
          needsOnboarding={needsOnboarding}
          onOnboardingComplete={()=>setNeedsOnboarding(false)}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;