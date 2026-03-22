import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";

const C = {
  bg0:"#070d1a", bg1:"#0d1629", bg2:"#111f38", bg3:"#172847",
  white:"#e0f2fe", muted:"#64748b", dim:"#3d5a7a",
  cyan:"#00d4ff", cyanDim:"rgba(0,212,255,0.12)", cyanBorder:"rgba(0,212,255,0.3)",
  coral:"#ff6b4a", green:"#00e676", red:"#ff4d6d",
  border1:"#1e3a5f", purple:"#a855f7",
};

export default function FriendsList({ user }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "friends"),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a,b) => (a.displayName||"").localeCompare(b.displayName||""));
        setFriends(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const removeFriend = async (friendId) => {
    setRemoving(friendId);
    try {
      await deleteDoc(doc(db, "users", user.uid, "friends", friendId));
      await deleteDoc(doc(db, "users", friendId, "friends", user.uid));
    } catch(e){ console.error(e); }
    setRemoving(null);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.back} onClick={()=>navigate(-1)}>←</button>
        <div style={S.title}>My <span style={{color:C.cyan}}>Friends</span></div>
        <button style={S.addBtn} onClick={()=>navigate("/friends")}>+ Add</button>
      </div>

      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:"48px"}}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{width:"32px",height:"32px",borderRadius:"50%",border:`3px solid ${C.border1}`,borderTop:`3px solid ${C.cyan}`,animation:"spin 0.8s linear infinite"}}/>
        </div>
      ) : friends.length === 0 ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"64px 24px",gap:"16px"}}>
          <div style={{fontSize:"64px"}}>👥</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"26px",color:C.muted,letterSpacing:"0.04em",textAlign:"center"}}>No friends yet</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:C.dim,textAlign:"center"}}>Add friends to challenge them and see their forfeits</div>
          <div style={{background:`rgba(0,212,255,0.1)`,border:`1px solid ${C.cyanBorder}`,borderRadius:"14px",padding:"14px 24px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:C.cyan,letterSpacing:"0.04em"}} onClick={()=>navigate("/friends")}>
            🔍 FIND FRIENDS
          </div>
        </div>
      ) : (
        <div style={{padding:"0 16px"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:C.muted,letterSpacing:"0.1em",marginBottom:"12px",textTransform:"uppercase"}}>
            {friends.length} Friend{friends.length!==1?"s":""}
          </div>
          {friends.map(f => (
            <div key={f.id} style={S.card}>
              {/* Avatar + info — tap to see profile */}
              <div style={{display:"flex",alignItems:"center",gap:"14px",flex:1,cursor:"pointer"}} onClick={()=>navigate(`/profile/${f.id||f.uid}`)}>
                {f.photoURL ? (
                  <img src={f.photoURL} alt="" style={{width:"52px",height:"52px",borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.border1}`,flexShrink:0}}/>
                ) : (
                  <div style={{width:"52px",height:"52px",borderRadius:"50%",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:"#000",flexShrink:0}}>
                    {f.displayName?.charAt(0)||"?"}
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"16px",fontWeight:"600",color:C.white,marginBottom:"2px"}}>{f.displayName}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",color:C.muted}}>@{f.username||f.displayName?.toLowerCase().replace(/\s/g,"")}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{display:"flex",gap:"8px",flexShrink:0}}>
                <button style={{background:`rgba(0,212,255,0.1)`,border:`1px solid ${C.cyanBorder}`,borderRadius:"10px",padding:"8px 14px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"14px",color:C.cyan,cursor:"pointer",letterSpacing:"0.04em"}}
                  onClick={()=>navigate("/create",{state:{opponent:{email:f.email,displayName:f.displayName,uid:f.id||f.uid}}})}>
                  ⚔️ Bet
                </button>
                <button style={{background:"rgba(255,77,109,0.08)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:"10px",padding:"8px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:C.red,cursor:"pointer",opacity:removing===f.id?0.5:1}}
                  onClick={()=>removeFriend(f.id||f.uid)} disabled={removing===f.id}>
                  {removing===f.id?"...":"Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:C.bg0, paddingBottom:"40px" },
  header:{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" },
  back:{ background:C.bg2, border:`1px solid ${C.border1}`, borderRadius:"50%", width:"44px", height:"44px", color:C.white, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  title:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:C.white, letterSpacing:"0.04em", flex:1 },
  addBtn:{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, border:"none", borderRadius:"12px", padding:"10px 16px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", color:"#000", cursor:"pointer", letterSpacing:"0.04em" },
  card:{ display:"flex", alignItems:"center", gap:"12px", background:C.bg2, borderRadius:"16px", padding:"14px", marginBottom:"10px", border:`1px solid ${C.border1}` },
};