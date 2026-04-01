import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import { auth, saveUserProfile, db } from "./firebase";
import { requestNotificationPermission, onForegroundMessage } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import T from "./theme";

import AuthScreen       from "./pages/AuthScreen";
import Onboarding       from "./pages/Onboarding";
import Feed             from "./pages/Feed";
import Bets             from "./pages/Bets";
import Leaderboard      from "./pages/Leaderboard";
import CreateBet        from "./pages/CreateBet";
import UploadProof      from "./pages/UploadProof";
import ProfileOverlay   from "./pages/ProfileOverlay";
import EditProfile      from "./pages/EditProfile";
import FindFriends      from "./pages/FindFriends";
import UserProfile      from "./pages/UserProfile";
import InboxScreen      from "./pages/InboxScreen";
import ChatScreen       from "./pages/ChatScreen";
import NewChat          from "./pages/NewChat";
import NotificationCenter from "./components/NotificationCenter";
import GroupBets        from "./pages/GroupBets";
import CreateGroupBet   from "./pages/CreateGroupBet";
import GroupBetRoom     from "./pages/GroupBetRoom";
import Seasons          from "./pages/Seasons";
import ChangePassword   from "./pages/ChangePassword";
import AdminDashboard   from "./pages/AdminDashboard";
import SweatCard        from "./pages/Sweatcard";
import ChallengePage    from "./pages/Challengepage";
import JuryVote         from "./pages/Juryvote";

// ── Logout page — signs out then redirects to auth ────────────────────────────
function LogoutPage() {
  const navigate = useNavigate();
  useEffect(() => {
    signOut(auth).then(() => navigate("/", { replace: true }));
  }, [navigate]);
  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:T.bg0, fontFamily:T.fontDisplay, fontSize:"24px", color:T.panel,
    }}>
      Signing out…
    </div>
  );
}

// ── Nav bar ───────────────────────────────────────────────────────────────────
function NavBar({ user, livePhoto, unreadDMs }) {
  const location = useLocation();

  const hideNav = [
    "/create", "/upload", "/edit-profile", "/friends",
    "/inbox/new", "/create-group-bet", "/change-password", "/admin", "/sweat-card",
  ];
  const hideNavPrefix = ["/profile/", "/group-bets/", "/inbox/"];

  const shouldHide =
    hideNav.includes(location.pathname) ||
    hideNavPrefix.some(p => location.pathname.startsWith(p));

  if (shouldHide) return null;

  return (
    <nav style={{
      position:"fixed", bottom:0,
      left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:"480px",
      height:"64px",
      background:"rgba(240,253,244,0.97)",
      backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
      borderTop:`1px solid ${T.border}`,
      display:"flex", alignItems:"flex-start", justifyContent:"space-around",
      paddingTop:"8px", paddingBottom:"env(safe-area-inset-bottom,0)",
      zIndex:1000,
    }}>
      {[
        { to:"/",  label:"BETS", icon: (c) => (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
            <path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/>
            <path d="M9.5 6.5L8 8l-3-3"/>
          </svg>
        )},
        { to:"/feed", label:"FEED", icon: (c) => (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )},
        { to:"/inbox", label:"CHAT", badge:unreadDMs, icon: (c) => (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )},
        { to:"/leaderboard", label:"RANKS", icon: (c) => (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h3"/>
            <path d="M16 21h3a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3"/>
            <path d="M12 21V7a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v14"/>
          </svg>
        )},
      ].map(item => (
        <NavLink key={item.to} to={item.to} end={item.to==="/"} style={({ isActive }) => ({
          display:"flex", flexDirection:"column", alignItems:"center", gap:"3px",
          textDecoration:"none", flex:1, padding:"2px 0",
          color: isActive ? T.accent : T.textMuted,
        })}>
          {({ isActive }) => (
            <>
              <div style={{ lineHeight:1, position:"relative" }}>
                {item.icon(isActive ? T.accent : T.textMuted)}
                {item.badge > 0 && (
                  <div style={{
                    position:"absolute", top:"-4px", right:"-6px",
                    width:"16px", height:"16px", borderRadius:"50%",
                    background:T.accent, border:`2px solid ${T.bg0}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:T.fontMono, fontSize:"9px", fontWeight:"700", color:"#fff",
                  }}>
                    {item.badge > 9 ? "9+" : item.badge}
                  </div>
                )}
              </div>
              <div style={{ fontFamily:T.fontMono, fontSize:"9px", fontWeight:"600", letterSpacing:"0.08em" }}>
                {item.label}
              </div>
            </>
          )}
        </NavLink>
      ))}

      {/* ME button */}
      <NavLink to="/me" style={({ isActive }) => ({
        display:"flex", flexDirection:"column", alignItems:"center", gap:"3px",
        flex:1, padding:"2px 0", cursor:"pointer", textDecoration:"none",
        color: isActive ? T.accent : T.textMuted,
      })}>
        {({ isActive }) => (
          <>
            <div style={{ lineHeight:1 }}>
              {livePhoto
                ? <img src={livePhoto} alt="" style={{
                    width:"24px", height:"24px", borderRadius:"50%",
                    objectFit:"cover",
                    border:`2px solid ${isActive ? T.accent : T.border}`,
                    display:"block",
                  }}/>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive ? T.accent : T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
              }
            </div>
            <div style={{ fontFamily:T.fontMono, fontSize:"9px", fontWeight:"600", letterSpacing:"0.08em" }}>
              ME
            </div>
          </>
        )}
      </NavLink>
    </nav>
  );
}

// ── App content (authenticated) ───────────────────────────────────────────────
function AppContent({ user, needsOnboarding, onOnboardingComplete }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [livePhoto, setLivePhoto] = useState(user?.photoURL || null);
  const [unreadDMs, setUnreadDMs] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) setLivePhoto(snap.data().photoURL || user.photoURL || null);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, "conversations"), where("participants", "array-contains", user.uid)),
      snap => {
        let n = 0;
        snap.docs.forEach(d => { n += d.data().unreadCount?.[user.uid] || 0; });
        setUnreadDMs(n);
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  if (needsOnboarding) return <Onboarding user={user} onComplete={onOnboardingComplete}/>;

  return (
    <>
      <Routes>
        {/* main tabs */}
        <Route path="/"                      element={<Bets user={user}/>}/>
        <Route path="/feed"                  element={<Feed user={user} onBellClick={()=>setNotifOpen(true)}/>}/>
        <Route path="/leaderboard"           element={<Leaderboard user={user}/>}/>
        <Route path="/me"                    element={<ProfileOverlay user={user}/>}/>

        {/* bets */}
        <Route path="/create"                element={<CreateBet user={user}/>}/>
        <Route path="/upload/:betId"         element={<UploadProof user={user}/>}/>
        <Route path="/upload"                element={<UploadProof user={user}/>}/>

        {/* group bets */}
        <Route path="/group-bets"            element={<GroupBets user={user}/>}/>
        <Route path="/group-bets/:id"        element={<GroupBetRoom user={user}/>}/>
        <Route path="/create-group-bet"      element={<CreateGroupBet user={user}/>}/>

        {/* profile */}
        <Route path="/profile/:userId"       element={<UserProfile user={user} currentUser={user}/>}/>
        <Route path="/profile"               element={<UserProfile user={user} currentUser={user}/>}/>
        <Route path="/edit-profile"          element={<EditProfile user={user}/>}/>
        <Route path="/friends"               element={<FindFriends user={user}/>}/>

        {/* chat */}
        <Route path="/inbox"                 element={<InboxScreen user={user}/>}/>
        <Route path="/inbox/new"             element={<NewChat user={user}/>}/>
        <Route path="/inbox/:conversationId" element={<ChatScreen user={user}/>}/>

        {/* other */}
        <Route path="/seasons"               element={<Seasons user={user}/>}/>
        <Route path="/jury/:videoId"         element={<JuryVote user={user}/>}/>
        <Route path="/change-password"       element={<ChangePassword user={user}/>}/>
        <Route path="/admin"                 element={<AdminDashboard user={user}/>}/>
        <Route path="/sweat-card"            element={<SweatCard user={user}/>}/>
        <Route path="/challenge/:betId"      element={<ChallengePage user={user}/>}/>
        <Route path="/logout"               element={<LogoutPage/>}/>
      </Routes>

      <NavBar user={user} livePhoto={livePhoto} unreadDMs={unreadDMs}/>
      <NotificationCenter user={user} isOpen={notifOpen} onClose={() => setNotifOpen(false)}/>
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,             setUser]             = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [needsOnboarding,  setNeedsOnboarding]  = useState(false);

  useEffect(() => { document.body.style.background = "#e8f5e9"; }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) {
        const r = await saveUserProfile(u);
        setUser(u);
        setNeedsOnboarding(r?.isNew || r?.needsOnboarding || false);
        // ✅ Request push notification permission after login
        requestNotificationPermission(u.uid).catch(() => {});
      } else {
        setUser(null);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{
      minHeight:"100vh", background:T.bg0,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px",
    }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      <div style={{
        width:"40px", height:"40px", borderRadius:"50%",
        border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`,
        animation:"spin 0.8s linear infinite",
      }}/>
      <div style={{
        fontFamily:T.fontDisplay, fontSize:"32px", color:T.panel,
        letterSpacing:"0.04em", fontStyle:"italic",
      }}>
        Sweat<span style={{color:T.accent}}>Debt</span>
      </div>
    </div>
  );

  if (!user) return <AuthScreen/>;

  return (
    <BrowserRouter>
      <div style={{ background:T.bg0, minHeight:"100vh" }}>
        <AppContent
          user={user}
          needsOnboarding={needsOnboarding}
          onOnboardingComplete={() => setNeedsOnboarding(false)}
        />
      </div>
    </BrowserRouter>
  );
}