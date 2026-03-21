import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserSearch from "./UserSearch";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  green:"#00e676", border1:"#1e3a5f", purple:"#a855f7",
};

export default function FindFriends({ user }) {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSelectUser = (foundUser) => setSelectedUser(foundUser);

  const handleChallenge = () => {
    if (selectedUser) {
      navigate("/create", {
        state: {
          opponent: {
            email: selectedUser.email,
            displayName: selectedUser.displayName,
            uid: selectedUser.id || selectedUser.uid,
          }
        }
      });
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.back} onClick={()=>navigate(-1)}>←</button>
        <div style={S.title}>Find <span style={{color:C.cyan}}>Friends</span></div>
      </div>

      {selectedUser ? (
        <div style={S.selectedWrap}>
          <div style={S.selectedCard}>
            {/* Glow */}
            <div style={{position:"absolute",top:"-40px",left:"50%",transform:"translateX(-50%)",width:"120px",height:"120px",borderRadius:"50%",background:`radial-gradient(circle,${C.cyanDim},transparent)`,pointerEvents:"none"}}/>

            {selectedUser.photoURL?(
              <img src={selectedUser.photoURL} alt={selectedUser.displayName} style={{width:"88px",height:"88px",borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.cyan}`,margin:"0 auto 16px",display:"block"}}/>
            ):(
              <div style={S.selectedAvatar}>{selectedUser.displayName?.charAt(0)?.toUpperCase()}</div>
            )}

            <div style={S.selectedName}>{selectedUser.displayName}</div>
            <div style={S.selectedHandle}>@{selectedUser.username}</div>

            {selectedUser.bio&&(
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.muted,marginBottom:"16px",lineHeight:"1.5",fontStyle:"italic"}}>
                "{selectedUser.bio}"
              </div>
            )}

            <div style={S.selectedStats}>
              <div style={S.selectedStat}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:C.green,lineHeight:1}}>{selectedUser.wins||0}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted,marginTop:"4px",letterSpacing:"0.08em"}}>WINS</div>
              </div>
              <div style={S.selectedStat}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:"#ff4d6d",lineHeight:1}}>{selectedUser.losses||0}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted,marginTop:"4px",letterSpacing:"0.08em"}}>LOSSES</div>
              </div>
              <div style={S.selectedStat}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:C.cyan,lineHeight:1}}>{selectedUser.honour||100}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:C.muted,marginTop:"4px",letterSpacing:"0.08em"}}>HONOUR</div>
              </div>
            </div>
          </div>

          <button style={S.challengeBtn} onClick={handleChallenge}>
            ⚔️ CHALLENGE {selectedUser.displayName?.split(" ")[0]?.toUpperCase()}
          </button>
          <button style={S.backToSearch} onClick={()=>setSelectedUser(null)}>
            ← Search again
          </button>
        </div>
      ) : (
        <UserSearch
          currentUser={user}
          onSelectUser={handleSelectUser}
        />
      )}
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:C.bg0, paddingBottom:"40px" },
  header:{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 8px" },
  back:{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  title:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em" },
  selectedWrap:{ padding:"24px 20px" },
  selectedCard:{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"24px", padding:"32px 24px", textAlign:"center", marginBottom:"16px", position:"relative", overflow:"hidden" },
  selectedAvatar:{ width:"88px", height:"88px", borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:"#000", margin:"0 auto 16px", border:`3px solid ${C.cyan}` },
  selectedName:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, marginBottom:"4px", letterSpacing:"0.03em" },
  selectedHandle:{ fontFamily:"'DM Mono',monospace", fontSize:"14px", color:C.muted, marginBottom:"16px" },
  selectedStats:{ display:"flex", justifyContent:"center", gap:"32px", marginBottom:"8px" },
  selectedStat:{ textAlign:"center" },
  challengeBtn:{ width:"100%", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"16px", padding:"18px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", letterSpacing:"0.06em", color:"#000", cursor:"pointer", marginBottom:"12px", minHeight:"58px" },
  backToSearch:{ width:"100%", background:"transparent", border:`1px solid ${C.border1}`, borderRadius:"16px", padding:"14px", fontFamily:"'DM Sans',sans-serif", fontSize:"16px", color:C.muted, cursor:"pointer" },
};