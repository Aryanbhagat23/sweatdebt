// src/utils/notificationHelpers.js
// Call these functions from Feed.jsx, Bets.jsx etc whenever events happen
// Each one writes a notification doc to Firestore — auto-deleted after 24h by Bets.jsx

import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const send = async (toUserId, fromUser, type, message, link = null) => {
  if (!toUserId || !fromUser) return;
  try {
    const id = `${toUserId}_${type}_${fromUser.uid}_${Date.now()}`;
    await setDoc(doc(db, "notifications", id), {
      toUserId,
      fromUserId: fromUser.uid,
      fromName:   fromUser.displayName || "Someone",
      fromPhoto:  fromUser.photoURL || null,
      type,
      message,
      link,
      read:  false,
      createdAt: serverTimestamp(),
    });
  } catch (e) { console.error("notif error:", e); }
};

// Someone liked your comment
export const notifyCommentLike = (toUserId, fromUser) =>
  send(toUserId, fromUser, "comment_like", `${fromUser.displayName} liked your comment`, "/feed");

// Someone replied to your comment
export const notifyCommentReply = (toUserId, fromUser) =>
  send(toUserId, fromUser, "comment_reply", `${fromUser.displayName} replied to your comment`, "/feed");

// Someone challenged you to a bet
export const notifyBetChallenge = (toUserId, fromUser, betDesc) =>
  send(toUserId, fromUser, "bet_challenge", `${fromUser.displayName} challenged you: "${betDesc}"`, "/");

// Someone accepted your bet
export const notifyBetAccepted = (toUserId, fromUser) =>
  send(toUserId, fromUser, "bet_accepted", `${fromUser.displayName} accepted your challenge! ⚔️`, "/");

// Your forfeit video was approved
export const notifyVideoApproved = (toUserId, fromUser) =>
  send(toUserId, fromUser, "bet_approved", `${fromUser.displayName} approved your forfeit! ✅ +3 honour`, "/feed");

// Your forfeit video was disputed
export const notifyVideoDisputed = (toUserId, fromUser) =>
  send(toUserId, fromUser, "bet_disputed", `${fromUser.displayName} disputed your forfeit ⚠️ −15 honour`, "/feed");

// You earned a new badge
export const notifyBadgeEarned = (userId, badgeLabel, badgeIcon) =>
  send(userId, { uid: userId, displayName: "SweatDebt", photoURL: null }, "badge_earned",
    `${badgeIcon} You earned the "${badgeLabel}" badge!`, null);

// Friend request sent
export const notifyFriendRequest = (toUserId, fromUser) =>
  send(toUserId, fromUser, "friend_request", `${fromUser.displayName} sent you a friend request 👋`, `/profile/${fromUser.uid}`);

// Friend request accepted
export const notifyFriendAccepted = (toUserId, fromUser) =>
  send(toUserId, fromUser, "friend_accepted", `${fromUser.displayName} accepted your friend request 🤝`, `/profile/${fromUser.uid}`);