import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment } from "firebase/firestore";

export default function Feed({ user }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forYou");

  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logo}>Sweat<span style={{color:"#d4ff00"}}>Debt</span></div>
        <div style={S.notif}>🔔</div>
      </div>
      <div style={S.tabs}>
        {["forYou","friends","trending"].map(tab => (
          <div key={tab} style={{...S.tab, color:activeTab===tab?"#d4ff00":"#666", borderBottom:activeTab===tab?"2px solid #d4ff00":"2px solid transparent"}} onClick={()=>setActiveTab(tab)}>
            {tab==="forYou"?"For You":tab==="friends"?"Friends":"Trending"}
          </div>
        ))}
      </div>
      {loading ? (
        <div style={S.center}><div style={S.loadingText}>Loading feed...</div></div>
      ) : videos.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>🎥</div>
          <div style={S.emptyTitle}>No forfeits yet</div>
          <div style={S.emptySub}>Be the first to lose a bet and post the proof 😤</div>
        </div>
      ) : (
        <div style={S.feed}>
          {videos.map(video => (
            <VideoCard key={video.id} video={video} currentUser={user} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, currentUser }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(video.likes || 0);
  const [showComment, setShowComment] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(video.approved || false);
  const [disputed, setDisputed] = useState(video.disputed || false);

  const timeAgo = (ts) => {
    if (!ts) return "just now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const handleLike = async () => {
    setLiked(!liked);
    setLikes(liked ? likes-1 : likes+1);
    await updateDoc(doc(db, "videos", video.id), {
      likes: increment(liked ? -1 : 1)
    });
  };

  const handleApprove = async () => {
    setApproving(true);
    await updateDoc(doc(db, "videos", video.id), { approved: true, disputed: false });
    if (video.betId && video.betId !== "general") {
      await updateDoc(doc(db, "bets", video.betId), { status: "lost" });
    }
    setApproved(true);
    setApproving(false);
  };

  const handleDispute = async () => {
    setApproving(true);
    await updateDoc(doc(db, "videos", video.id), { disputed: true, approved: false });
    if (video.betId && video.betId !== "general") {
      await updateDoc(doc(db, "bets", video.betId), { status: "disputed" });
    }
    setDisputed(true);
    setApproving(false);
  };

  return (
    <div style={S.card}>
      <div style={S.videoWrap}>
        <video src={video.videoUrl} style={S.video} controls playsInline preload="metadata"/>
        <div style={S.videoOverlay}>
          {approved && <div style={{...S.tag, background:"#00e676", color:"#000"}}>APPROVED ✓</div>}
          {disputed && <div style={{...S.tag, background:"#ff4444"}}>DISPUTED ✗</div>}
          {!approved && !disputed && <div style={S.tag}>FORFEIT 💀</div>}
        </div>
      </div>

      <div style={S.actions}>
        <div style={S.actionLeft}>
          <div style={S.avatar}>{video.uploadedByName?.charAt(0)||"?"}</div>
          <div>
            <div style={S.username}>@{video.uploadedByName?.toLowerCase().replace(" ","")}</div>
            <div style={S.timestamp}>{timeAgo(video.createdAt)}</div>
          </div>
        </div>
        <div style={S.actionRight}>
          <button style={{...S.actionBtn, color:liked?"#ff4444":"#888"}} onClick={handleLike}>
            {liked?"❤️":"🤍"} {likes}
          </button>
          <button style={S.actionBtn} onClick={()=>setShowComment(!showComment)}>
            💬 {video.comments||0}
          </button>
          <button style={S.actionBtn}>↗ Share</button>
        </div>
      </div>

      {showComment && (
        <div style={S.commentWrap}>
          <input style={S.commentInput} placeholder="Add a comment... 😂"/>
          <button style={S.commentBtn}>Send</button>
        </div>
      )}

      {/* Approve/Dispute — shown to bet creator */}
      {!approved && !disputed && (
        <div style={S.verdictWrap}>
          <div style={S.verdictTitle}>Did they complete the forfeit properly?</div>
          <div style={S.verdictBtns}>
            <button
              style={{...S.approveBtn, opacity:approving?0.5:1}}
              onClick={handleApprove}
              disabled={approving}
            >
              ✓ APPROVE
            </button>
            <button
              style={{...S.disputeBtn, opacity:approving?0.5:1}}
              onClick={handleDispute}
              disabled={approving}
            >
              ✗ DISPUTE
            </button>
          </div>
        </div>
      )}

      {approved && (
        <div style={S.approvedMsg}>✓ You approved this forfeit — honour score updated!</div>
      )}
      {disputed && (
        <div style={S.disputedMsg}>⚠ Disputed — going to community jury...</div>
      )}

      <div style={S.rematchWrap}>
        <button style={S.rematchBtn}>
          ⚔️ Challenge {video.uploadedByName?.split(" ")[0]} to a rematch
        </button>
      </div>
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"80px"},
  header:{padding:"52px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"},
  logo:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:"#f5f0e8"},
  notif:{fontSize:"24px",cursor:"pointer",padding:"8px"},
  tabs:{display:"flex",padding:"0 16px",borderBottom:"1px solid #222",marginBottom:"4px"},
  tab:{padding:"12px 16px",fontSize:"15px",fontWeight:"500",cursor:"pointer",transition:"all 0.2s"},
  center:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"50vh"},
  loadingText:{color:"#555",fontSize:"14px",fontFamily:"monospace"},
  empty:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:"14px",padding:"24px"},
  emptyIcon:{fontSize:"56px"},
  emptyTitle:{color:"#666",fontSize:"20px",fontWeight:"600"},
  emptySub:{color:"#444",fontSize:"15px",textAlign:"center",lineHeight:"1.5"},
  feed:{display:"flex",flexDirection:"column",gap:"2px"},
  card:{background:"#1a1a1a",marginBottom:"8px"},
  videoWrap:{position:"relative",background:"#000"},
  video:{width:"100%",height:"auto",maxHeight:"60vh",display:"block",objectFit:"cover",background:"#000"},
  videoOverlay:{position:"absolute",top:"12px",left:"12px"},
  tag:{background:"#ff5c1a",color:"#fff",fontSize:"12px",fontWeight:"700",padding:"5px 12px",borderRadius:"6px",fontFamily:"monospace",letterSpacing:"0.05em"},
  actions:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px"},
  actionLeft:{display:"flex",alignItems:"center",gap:"12px"},
  avatar:{width:"40px",height:"40px",borderRadius:"50%",background:"#2a2a2a",border:"1px solid #444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",fontWeight:"600",color:"#f5f0e8",flexShrink:0},
  username:{fontSize:"15px",fontWeight:"500",color:"#f5f0e8"},
  timestamp:{fontSize:"12px",color:"#555",fontFamily:"monospace"},
  actionRight:{display:"flex",gap:"0"},
  actionBtn:{background:"none",border:"none",color:"#888",fontSize:"14px",cursor:"pointer",padding:"8px 10px",borderRadius:"8px",minWidth:"44px",minHeight:"44px",display:"flex",alignItems:"center",justifyContent:"center"},
  commentWrap:{display:"flex",gap:"8px",padding:"0 16px 12px"},
  commentInput:{flex:1,background:"#222",border:"1px solid #333",borderRadius:"24px",padding:"12px 16px",color:"#f5f0e8",fontSize:"16px",outline:"none"},
  commentBtn:{background:"#d4ff00",border:"none",borderRadius:"24px",padding:"12px 20px",fontSize:"15px",fontWeight:"600",color:"#000",cursor:"pointer",minHeight:"44px"},
  verdictWrap:{margin:"0 16px 12px",background:"#222",borderRadius:"16px",padding:"16px"},
  verdictTitle:{fontSize:"14px",color:"#888",marginBottom:"12px",textAlign:"center"},
  verdictBtns:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"},
  approveBtn:{background:"#00e676",border:"none",borderRadius:"12px",padding:"16px",fontSize:"16px",fontWeight:"700",color:"#000",cursor:"pointer",minHeight:"52px"},
  disputeBtn:{background:"transparent",border:"2px solid #ff4444",borderRadius:"12px",padding:"16px",fontSize:"16px",fontWeight:"700",color:"#ff4444",cursor:"pointer",minHeight:"52px"},
  approvedMsg:{margin:"0 16px 12px",background:"rgba(0,230,118,0.1)",border:"1px solid rgba(0,230,118,0.3)",borderRadius:"12px",padding:"12px",fontSize:"14px",color:"#00e676",textAlign:"center"},
  disputedMsg:{margin:"0 16px 12px",background:"rgba(255,68,68,0.1)",border:"1px solid rgba(255,68,68,0.3)",borderRadius:"12px",padding:"12px",fontSize:"14px",color:"#ff4444",textAlign:"center"},
  rematchWrap:{padding:"0 16px 16px"},
  rematchBtn:{width:"100%",background:"transparent",border:"1px solid #333",borderRadius:"12px",padding:"14px",fontSize:"15px",color:"#888",cursor:"pointer",minHeight:"52px"},
};