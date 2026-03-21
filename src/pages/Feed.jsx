import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, query, onSnapshot,
  doc, updateDoc, increment, addDoc,
  serverTimestamp, where
} from "firebase/firestore";
import NotificationBell from "../components/NotificationBell";
import { FeedSkeleton, SkeletonComment } from "../components/Skeleton";

export default function Feed({ user, onBellClick }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forYou");

  useEffect(() => {
    // No orderBy — sort client side to avoid index errors
    const q = query(collection(db, "videos"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setVideos(data);
      setLoading(false);
    }, err => {
      console.error("Feed error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <FeedSkeleton />;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logo}>Sweat<span style={{ color: "#d4ff00" }}>Debt</span></div>
        <NotificationBell user={user} onClick={onBellClick} />
      </div>

      <div style={S.tabs}>
        {["forYou", "friends", "trending"].map(tab => (
          <div key={tab} style={{
            ...S.tab,
            color: activeTab === tab ? "#d4ff00" : "#666",
            borderBottom: activeTab === tab ? "2px solid #d4ff00" : "2px solid transparent"
          }} onClick={() => setActiveTab(tab)}>
            {tab === "forYou" ? "For You" : tab === "friends" ? "Friends" : "Trending"}
          </div>
        ))}
      </div>

      {videos.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>🎥</div>
          <div style={S.emptyTitle}>No forfeits yet</div>
          <div style={S.emptySub}>Be the first to lose a bet 😤</div>
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
  const [approved, setApproved] = useState(video.approved || false);
  const [disputed, setDisputed] = useState(video.disputed || false);
  const [approving, setApproving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(video.comments || 0);

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "just now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const handleLike = async () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
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

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `SweatDebt — ${video.uploadedByName}'s forfeit`,
        text: `Check out this forfeit on SweatDebt! 😤`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  };

  return (
    <div style={S.card}>
      <div style={S.videoWrap}>
        <video src={video.videoUrl} style={S.video} controls playsInline preload="metadata" />
        <div style={S.videoOverlay}>
          {approved && <div style={{ ...S.tag, background: "#00e676", color: "#000" }}>APPROVED ✓</div>}
          {disputed && <div style={{ ...S.tag, background: "#ff4444" }}>DISPUTED ✗</div>}
          {!approved && !disputed && <div style={S.tag}>FORFEIT 💀</div>}
        </div>
      </div>

      <div style={S.userRow}>
        <div style={S.avatarWrap}>
          {video.uploaderPhoto ? (
            <img src={video.uploaderPhoto} alt="" style={S.avatarImg} />
          ) : (
            <div style={S.avatar}>{video.uploadedByName?.charAt(0) || "?"}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={S.username}>@{video.uploadedByName?.toLowerCase().replace(/\s/g, "")}</div>
          <div style={S.timestamp}>{timeAgo(video.createdAt)}</div>
        </div>
        <div style={S.actionBtns}>
          <button style={{ ...S.actionBtn, color: liked ? "#ff4444" : "#888" }} onClick={handleLike}>
            {liked ? "❤️" : "🤍"} {likes}
          </button>
          <button
            style={{ ...S.actionBtn, color: showComments ? "#d4ff00" : "#888" }}
            onClick={() => setShowComments(!showComments)}
          >
            💬 {commentCount}
          </button>
          <button style={S.actionBtn} onClick={handleShare}>↗</button>
        </div>
      </div>

      {!approved && !disputed && (
        <div style={S.verdictWrap}>
          <div style={S.verdictTitle}>Did they complete it properly?</div>
          <div style={S.verdictBtns}>
            <button style={{ ...S.approveBtn, opacity: approving ? 0.5 : 1 }} onClick={handleApprove} disabled={approving}>
              ✓ APPROVE
            </button>
            <button style={{ ...S.disputeBtn, opacity: approving ? 0.5 : 1 }} onClick={handleDispute} disabled={approving}>
              ✗ DISPUTE
            </button>
          </div>
        </div>
      )}

      {approved && <div style={S.approvedMsg}>✓ Forfeit approved!</div>}
      {disputed && <div style={S.disputedMsg}>⚠ Disputed — going to jury...</div>}

      <div style={S.rematchWrap}>
        <button style={S.rematchBtn}>
          ⚔️ Challenge {video.uploadedByName?.split(" ")[0]} to a rematch
        </button>
      </div>

      {showComments && (
        <CommentsSection
          videoId={video.id}
          currentUser={currentUser}
          onCountChange={setCommentCount}
        />
      )}
    </div>
  );
}

function CommentsSection({ videoId, currentUser, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    // No orderBy — sort client side
    const q = query(collection(db, "videos", videoId, "comments"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0));
      setComments(data);
      onCountChange(data.length);
      setLoading(false);
    }, err => {
      console.error("Comments error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [videoId]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      listRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [comments]);

  const postComment = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const newComment = text.trim();
    setText("");
    try {
      await addDoc(collection(db, "videos", videoId, "comments"), {
        text: newComment,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhoto: currentUser.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
      });
      await updateDoc(doc(db, "videos", videoId), {
        comments: increment(1)
      });
    } catch (e) {
      console.error(e);
      setText(newComment);
    }
    setPosting(false);
  };

  const timeAgo = (ts) => {
    if (!ts?.toDate) return "now";
    const s = Math.floor((new Date() - ts.toDate()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  const quickReactions = ["😂", "🔥", "💀", "😤", "👑", "🫡"];

  return (
    <div style={CS.wrap}>
      <div style={CS.header}>
        <span style={CS.headerTitle}>Comments</span>
        <span style={CS.headerCount}>{comments.length}</span>
      </div>

      <div style={CS.quickRow}>
        {quickReactions.map(emoji => (
          <button key={emoji} style={CS.quickBtn} onClick={() => {
            setText(prev => prev + emoji);
            inputRef.current?.focus();
          }}>{emoji}</button>
        ))}
      </div>

      <div ref={listRef} style={CS.list}>
        {loading ? (
          <div>
            {[...Array(3)].map((_, i) => <SkeletonComment key={i} />)}
          </div>
        ) : comments.length === 0 ? (
          <div style={CS.emptyComments}>
            <div style={{ fontSize: "28px", marginBottom: "6px" }}>💬</div>
            <div style={CS.emptyText}>No comments yet</div>
            <div style={CS.emptySubText}>Be the first to roast them 😂</div>
          </div>
        ) : (
          comments.map((c, i) => (
            <CommentItem
              key={c.id}
              comment={c}
              videoId={videoId}
              currentUser={currentUser}
              timeAgo={timeAgo}
              isLast={i === comments.length - 1}
            />
          ))
        )}
      </div>

      <div style={CS.inputRow}>
        {currentUser?.photoURL ? (
          <img src={currentUser.photoURL} alt="" style={CS.inputAvatar} />
        ) : (
          <div style={CS.inputAvatarFallback}>
            {currentUser?.displayName?.charAt(0) || "?"}
          </div>
        )}
        <div style={CS.inputWrap}>
          <input
            ref={inputRef}
            style={CS.input}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            onKeyDown={e => e.key === "Enter" && postComment()}
            maxLength={200}
          />
          {text.trim().length > 0 && (
            <button style={{ ...CS.sendBtn, opacity: posting ? 0.5 : 1 }} onClick={postComment} disabled={posting}>
              {posting ? "..." : "↑"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, videoId, currentUser, timeAgo, isLast }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [posting, setPosting] = useState(false);
  const isOwn = comment.userId === currentUser?.uid;

  useEffect(() => {
    if (!showReplies) return;
    // No orderBy on replies either
    const q = query(collection(db, "videos", videoId, "comments", comment.id, "replies"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0));
      setReplies(data);
    });
    return () => unsub();
  }, [showReplies]);

  const likeComment = async () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    await updateDoc(doc(db, "videos", videoId, "comments", comment.id), {
      likes: increment(liked ? -1 : 1)
    });
  };

  const postReply = async () => {
    if (!replyText.trim() || posting) return;
    setPosting(true);
    const text = replyText.trim();
    setReplyText("");
    setShowReplies(true);
    await addDoc(collection(db, "videos", videoId, "comments", comment.id, "replies"), {
      text,
      userId: currentUser.uid,
      userName: currentUser.displayName,
      userPhoto: currentUser.photoURL || null,
      createdAt: serverTimestamp(),
    });
    setShowReply(false);
    setPosting(false);
  };

  return (
    <div style={{ ...CS.commentWrap, borderBottom: isLast ? "none" : "1px solid #1a1a1a" }}>
      <div style={CS.comment}>
        {comment.userPhoto ? (
          <img src={comment.userPhoto} alt="" style={CS.commentAvatar} />
        ) : (
          <div style={CS.commentAvatarFallback}>
            {comment.userName?.charAt(0) || "?"}
          </div>
        )}
        <div style={CS.commentBody}>
          <div style={CS.commentHeader}>
            <span style={CS.commentName}>{isOwn ? "You" : comment.userName}</span>
            <span style={CS.commentTime}>{timeAgo(comment.createdAt)}</span>
          </div>
          <div style={CS.commentText}>{comment.text}</div>
          <div style={CS.commentActions}>
            <button style={{ ...CS.commentAction, color: liked ? "#ff4444" : "#555" }} onClick={likeComment}>
              {liked ? "❤️" : "♡"} {likes > 0 ? likes : ""}
            </button>
            <button style={CS.commentAction} onClick={() => setShowReply(!showReply)}>
              Reply
            </button>
            {(replies.length > 0 || showReplies) && (
              <button style={{ ...CS.commentAction, color: "#d4ff00" }} onClick={() => setShowReplies(!showReplies)}>
                {showReplies ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>

          {showReply && (
            <div style={CS.replyInputRow}>
              <input
                style={CS.replyInput}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.userName}...`}
                onKeyDown={e => e.key === "Enter" && postReply()}
                autoFocus
                maxLength={150}
              />
              <button
                style={{ ...CS.replySendBtn, opacity: posting || !replyText.trim() ? 0.4 : 1 }}
                onClick={postReply}
                disabled={posting || !replyText.trim()}
              >↑</button>
            </div>
          )}

          {showReplies && replies.length > 0 && (
            <div style={CS.repliesList}>
              {replies.map(r => (
                <div key={r.id} style={CS.reply}>
                  {r.userPhoto ? (
                    <img src={r.userPhoto} alt="" style={CS.replyAvatar} />
                  ) : (
                    <div style={CS.replyAvatarFallback}>{r.userName?.charAt(0) || "?"}</div>
                  )}
                  <div style={CS.replyBody}>
                    <span style={CS.replyName}>{r.userId === currentUser?.uid ? "You" : r.userName} </span>
                    <span style={CS.replyText}>{r.text}</span>
                    <div style={CS.replyTime}>{timeAgo(r.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#111", paddingBottom: "90px" },
  header: { padding: "52px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "32px", color: "#f5f0e8", letterSpacing: "0.04em" },
  tabs: { display: "flex", padding: "0 16px", borderBottom: "1px solid #222", marginBottom: "4px" },
  tab: { padding: "12px 16px", fontSize: "15px", fontWeight: "500", cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "14px", padding: "24px" },
  emptyIcon: { fontSize: "56px" },
  emptyTitle: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", color: "#666", letterSpacing: "0.04em" },
  emptySub: { fontFamily: "'DM Sans',sans-serif", fontSize: "15px", color: "#444", textAlign: "center" },
  feed: { display: "flex", flexDirection: "column", gap: "8px" },
  card: { background: "#1a1a1a", marginBottom: "4px" },
  videoWrap: { position: "relative", background: "#000" },
  video: { width: "100%", maxHeight: "60vh", display: "block", objectFit: "cover", background: "#000" },
  videoOverlay: { position: "absolute", top: "12px", left: "12px" },
  tag: { background: "#ff5c1a", color: "#fff", fontSize: "11px", fontWeight: "700", padding: "5px 12px", borderRadius: "6px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" },
  userRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" },
  avatarWrap: { flexShrink: 0 },
  avatarImg: { width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "2px solid #d4ff00" },
  avatar: { width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg,#d4ff00,#ff5c1a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "15px", color: "#000" },
  username: { fontFamily: "'DM Sans',sans-serif", fontSize: "15px", fontWeight: "500", color: "#f5f0e8" },
  timestamp: { fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#555" },
  actionBtns: { display: "flex", gap: "0", marginLeft: "auto" },
  actionBtn: { background: "none", border: "none", color: "#888", fontSize: "14px", cursor: "pointer", padding: "8px 10px", minHeight: "44px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "'DM Sans',sans-serif" },
  verdictWrap: { margin: "0 16px 12px", background: "#222", borderRadius: "16px", padding: "14px" },
  verdictTitle: { fontFamily: "'DM Sans',sans-serif", fontSize: "13px", color: "#888", marginBottom: "10px", textAlign: "center" },
  verdictBtns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  approveBtn: { background: "#00e676", border: "none", borderRadius: "12px", padding: "14px", fontFamily: "'Bebas Neue',sans-serif", fontSize: "20px", letterSpacing: "0.06em", color: "#000", cursor: "pointer", minHeight: "50px" },
  disputeBtn: { background: "transparent", border: "2px solid #ff4444", borderRadius: "12px", padding: "14px", fontFamily: "'Bebas Neue',sans-serif", fontSize: "20px", letterSpacing: "0.06em", color: "#ff4444", cursor: "pointer", minHeight: "50px" },
  approvedMsg: { margin: "0 16px 12px", background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", borderRadius: "12px", padding: "12px", fontFamily: "'DM Sans',sans-serif", fontSize: "14px", color: "#00e676", textAlign: "center" },
  disputedMsg: { margin: "0 16px 12px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "12px", padding: "12px", fontFamily: "'DM Sans',sans-serif", fontSize: "14px", color: "#ff4444", textAlign: "center" },
  rematchWrap: { padding: "0 16px 14px" },
  rematchBtn: { width: "100%", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "12px", fontFamily: "'Bebas Neue',sans-serif", fontSize: "18px", letterSpacing: "0.06em", color: "#555", cursor: "pointer", minHeight: "48px" },
};

const CS = {
  wrap: { background: "#111", borderTop: "1px solid #222", paddingBottom: "8px" },
  header: { display: "flex", alignItems: "center", gap: "8px", padding: "14px 16px 8px" },
  headerTitle: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "20px", color: "#f5f0e8", letterSpacing: "0.04em" },
  headerCount: { fontFamily: "'DM Mono',monospace", fontSize: "12px", color: "#555", background: "#222", padding: "2px 8px", borderRadius: "10px" },
  quickRow: { display: "flex", gap: "8px", padding: "0 16px 12px", overflowX: "auto" },
  quickBtn: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "6px 12px", fontSize: "18px", cursor: "pointer", flexShrink: 0, minHeight: "36px" },
  list: { maxHeight: "320px", overflowY: "auto", padding: "0 16px" },
  emptyComments: { textAlign: "center", padding: "24px 0" },
  emptyText: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "22px", color: "#444", letterSpacing: "0.04em" },
  emptySubText: { fontFamily: "'DM Sans',sans-serif", fontSize: "13px", color: "#333", marginTop: "4px" },
  inputRow: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderTop: "1px solid #1a1a1a" },
  inputAvatar: { width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  inputAvatarFallback: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#d4ff00,#ff5c1a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "14px", color: "#000", flexShrink: 0 },
  inputWrap: { flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "24px", padding: "8px 14px" },
  input: { flex: 1, background: "none", border: "none", outline: "none", color: "#f5f0e8", fontSize: "15px", fontFamily: "'DM Sans',sans-serif" },
  sendBtn: { background: "#d4ff00", border: "none", borderRadius: "50%", width: "30px", height: "30px", fontFamily: "'Bebas Neue',sans-serif", fontSize: "16px", color: "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentWrap: { paddingBottom: "4px", marginBottom: "4px" },
  comment: { display: "flex", gap: "10px", padding: "10px 0" },
  commentAvatar: { width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid #2a2a2a" },
  commentAvatarFallback: { width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#d4ff00,#ff5c1a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "13px", color: "#000", flexShrink: 0 },
  commentBody: { flex: 1, minWidth: 0 },
  commentHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" },
  commentName: { fontFamily: "'DM Sans',sans-serif", fontSize: "13px", fontWeight: "600", color: "#f5f0e8" },
  commentTime: { fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#444" },
  commentText: { fontFamily: "'DM Sans',sans-serif", fontSize: "14px", color: "#ccc", lineHeight: "1.5", marginBottom: "6px", wordBreak: "break-word" },
  commentActions: { display: "flex", gap: "16px" },
  commentAction: { background: "none", border: "none", color: "#555", fontFamily: "'DM Sans',sans-serif", fontSize: "12px", cursor: "pointer", padding: "2px 0" },
  replyInputRow: { display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" },
  replyInput: { flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "8px 14px", color: "#f5f0e8", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" },
  replySendBtn: { background: "#d4ff00", border: "none", borderRadius: "50%", width: "28px", height: "28px", fontFamily: "'Bebas Neue',sans-serif", fontSize: "14px", color: "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  repliesList: { marginTop: "8px", paddingLeft: "4px", borderLeft: "2px solid #222" },
  reply: { display: "flex", gap: "8px", padding: "6px 0 6px 8px" },
  replyAvatar: { width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  replyAvatarFallback: { width: "24px", height: "24px", borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "10px", color: "#888", flexShrink: 0 },
  replyBody: { flex: 1 },
  replyName: { fontFamily: "'DM Sans',sans-serif", fontSize: "12px", fontWeight: "600", color: "#f5f0e8" },
  replyText: { fontFamily: "'DM Sans',sans-serif", fontSize: "13px", color: "#aaa" },
  replyTime: { fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#444", marginTop: "2px" },
};