// src/utils/pushNotification.js
// Call this from anywhere in the app to send a real push notification
// It does two things:
// 1. Saves a Firestore notification doc (for the in-app bell)
// 2. Calls the Vercel serverless function to send a real phone push notification

import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const API_URL = "/api/send-notification";

// ── notification templates ────────────────────────────────────────────────────
export const NOTIF_TYPES = {
  BET_CHALLENGE:   "bet_challenge",
  PROOF_UPLOADED:  "proof_uploaded",
  BET_APPROVED:    "bet_approved",
  BET_DISPUTED:    "bet_disputed",
  FRIEND_REQUEST:  "friend_request",
  FRIEND_ACCEPTED: "friend_accepted",
  JURY_SELECTED:   "jury_selected",
  BET_ACCEPTED:    "bet_accepted",
  BET_DECLINED:    "bet_declined",
};

// ── main send function ────────────────────────────────────────────────────────
export async function sendPushNotification({
  toUserId,
  fromUserId,
  fromName,
  fromPhoto = null,
  type,
  title,
  body,
  url = "/",
  betId = null,
  videoId = null,
  extraData = {},
}) {
  if (!toUserId || toUserId === fromUserId) return; // never notify yourself

  // 1. Save to Firestore (in-app bell notification)
  try {
    await addDoc(collection(db, "notifications"), {
      toUserId,
      fromUserId,
      fromName,
      fromPhoto,
      type,
      message: body,
      title,
      link:    url,
      betId:   betId   || null,
      videoId: videoId || null,
      read:    false,
      createdAt: serverTimestamp(),
      ...extraData,
    });
  } catch(e) {
    console.warn("Firestore notification failed:", e);
  }

  // 2. Send real push notification via Vercel serverless function
  try {
    await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId, title, body, url }),
    });
  } catch(e) {
    // Non-critical — in-app notification already saved
    console.warn("Push notification failed (non-critical):", e);
  }
}

// ── convenience wrappers for each notification type ───────────────────────────

export const notifyBetChallenge = ({ toUserId, fromUserId, fromName, fromPhoto, betId, sport, forfeit, reps }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName, fromPhoto,
    type:  NOTIF_TYPES.BET_CHALLENGE,
    title: "⚔️ New Challenge!",
    body:  `${fromName} challenged you! Loser does ${reps} ${forfeit}. Accept or decline now.`,
    url:   "/",
    betId,
  });

export const notifyBetAccepted = ({ toUserId, fromUserId, fromName, fromPhoto, betId }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName, fromPhoto,
    type:  NOTIF_TYPES.BET_ACCEPTED,
    title: "✅ Challenge Accepted!",
    body:  `${fromName} accepted your challenge. Game on! 🔥`,
    url:   "/",
    betId,
  });

export const notifyBetDeclined = ({ toUserId, fromUserId, fromName, betId }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName,
    type:  NOTIF_TYPES.BET_DECLINED,
    title: "❌ Challenge Declined",
    body:  `${fromName} declined your challenge.`,
    url:   "/",
    betId,
  });

export const notifyProofUploaded = ({ toUserId, fromUserId, fromName, fromPhoto, betId, videoId }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName, fromPhoto,
    type:  NOTIF_TYPES.PROOF_UPLOADED,
    title: "🎥 Proof Uploaded!",
    body:  `${fromName} uploaded their forfeit video. Go approve or dispute it!`,
    url:   "/feed",
    betId, videoId,
  });

export const notifyBetApproved = ({ toUserId, fromUserId, fromName, betId }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName,
    type:  NOTIF_TYPES.BET_APPROVED,
    title: "✅ Forfeit Approved!",
    body:  `${fromName} approved your forfeit video. Honour score updated! 🏆`,
    url:   "/feed",
    betId,
  });

export const notifyBetDisputed = ({ toUserId, fromUserId, fromName, betId }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName,
    type:  NOTIF_TYPES.BET_DISPUTED,
    title: "⚠️ Forfeit Disputed!",
    body:  `${fromName} disputed your video. The jury has been selected — awaiting votes.`,
    url:   "/feed",
    betId,
  });

export const notifyJurySelected = ({ toUserId, fromUserId, fromName, betId, videoId }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName,
    type:  NOTIF_TYPES.JURY_SELECTED,
    title: "⚖️ You're a Juror!",
    body:  `You've been selected as a juror. Watch the video and vote LEGIT or FAKE within 48 hours.`,
    url:   "/feed",
    betId, videoId,
  });

export const notifyFriendRequest = ({ toUserId, fromUserId, fromName, fromPhoto }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName, fromPhoto,
    type:  NOTIF_TYPES.FRIEND_REQUEST,
    title: "👋 Friend Request!",
    body:  `${fromName} wants to be friends on SweatDebt.`,
    url:   `/profile/${fromUserId}`,
  });

export const notifyFriendAccepted = ({ toUserId, fromUserId, fromName, fromPhoto }) =>
  sendPushNotification({
    toUserId, fromUserId, fromName, fromPhoto,
    type:  NOTIF_TYPES.FRIEND_ACCEPTED,
    title: "🤝 Friend Request Accepted!",
    body:  `${fromName} accepted your friend request. Challenge them now! ⚔️`,
    url:   `/profile/${fromUserId}`,
  });