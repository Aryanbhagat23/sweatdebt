import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserSearch from "./UserSearch";

export default function FindFriends({ user }) {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSelectUser = (foundUser) => {
    setSelectedUser(foundUser);
  };

  const handleChallenge = () => {
    if (selectedUser) {
      // Navigate to create bet with pre-filled opponent
      navigate("/create", { state: { opponent: selectedUser } });
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.back} onClick={() => navigate("/bets")}>←</button>
        <div style={S.title}>Find Friends</div>
      </div>

      {selectedUser ? (
        // Selected user — confirm challenge
        <div style={S.selectedWrap}>
          <div style={S.selectedCard}>
            // In selectedCard section replace the selectedAvatar div:
{selectedUser.photoURL ? (
  <img src={selectedUser.photoURL} alt={selectedUser.displayName}
    style={{width:"80px",height:"80px",borderRadius:"50%",objectFit:"cover",border:"3px solid #d4ff00",margin:"0 auto 16px",display:"block"}}
  />
) : (
  <div style={S.selectedAvatar}>
    {selectedUser.displayName?.charAt(0)?.toUpperCase()}
  </div>
)}
{selectedUser.bio && (
  <div style={{fontSize:"14px",color:"#666",marginBottom:"16px",lineHeight:"1.5"}}>
    "{selectedUser.bio}"
  </div>
)}
            <div style={S.selectedName}>{selectedUser.displayName}</div>
            <div style={S.selectedHandle}>@{selectedUser.username}</div>

            <div style={S.selectedStats}>
              <div style={S.selectedStat}>
                <div style={S.selectedStatNum}>{selectedUser.wins||0}</div>
                <div style={S.selectedStatLabel}>Wins</div>
              </div>
              <div style={S.selectedStat}>
                <div style={{...S.selectedStatNum,color:"#ff4444"}}>{selectedUser.losses||0}</div>
                <div style={S.selectedStatLabel}>Losses</div>
              </div>
              <div style={S.selectedStat}>
                <div style={{...S.selectedStatNum,color:"#d4ff00"}}>{selectedUser.honour||100}</div>
                <div style={S.selectedStatLabel}>Honour</div>
              </div>
            </div>

            <div style={S.selectedEmail}>
              {selectedUser.email}
            </div>
          </div>

          <button style={S.challengeBtn} onClick={handleChallenge}>
            ⚔️ CHALLENGE {selectedUser.displayName?.split(" ")[0]?.toUpperCase()}
          </button>
          <button style={S.backToSearch} onClick={() => setSelectedUser(null)}>
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
  page:{minHeight:"100vh",background:"#111",paddingBottom:"40px"},
  header:{display:"flex",alignItems:"center",gap:"12px",padding:"52px 16px 8px"},
  back:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"50%",width:"44px",height:"44px",color:"#f5f0e8",fontSize:"20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  title:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:"#f5f0e8",letterSpacing:"0.04em"},
  selectedWrap:{padding:"24px 20px"},
  selectedCard:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"24px",padding:"32px 24px",textAlign:"center",marginBottom:"16px"},
  selectedAvatar:{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:"#000",margin:"0 auto 16px"},
  selectedName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:"#f5f0e8",marginBottom:"4px",letterSpacing:"0.03em"},
  selectedHandle:{fontFamily:"'DM Mono',monospace",fontSize:"14px",color:"#666",marginBottom:"20px"},
  selectedStats:{display:"flex",justifyContent:"center",gap:"32px",marginBottom:"20px"},
  selectedStat:{textAlign:"center"},
  selectedStatNum:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:"#f5f0e8",lineHeight:1},
  selectedStatLabel:{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:"#666",marginTop:"4px",letterSpacing:"0.08em"},
  selectedEmail:{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:"#444"},
  challengeBtn:{width:"100%",background:"#d4ff00",border:"none",borderRadius:"16px",padding:"18px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",letterSpacing:"0.06em",color:"#000",cursor:"pointer",marginBottom:"12px",minHeight:"58px"},
  backToSearch:{width:"100%",background:"transparent",border:"1px solid #333",borderRadius:"16px",padding:"14px",fontFamily:"'DM Sans',sans-serif",fontSize:"16px",color:"#666",cursor:"pointer"},
};