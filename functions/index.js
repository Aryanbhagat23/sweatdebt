const functions = require("firebase-functions");
const admin     = require("firebase-admin");

admin.initializeApp();

const db        = admin.firestore();
const messaging = admin.messaging();

// ── Trigger: fires when a new notification doc is created ─────────────────────
exports.sendPushNotification = functions.firestore
  .document("notifications/{notifId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data || !data.toUserId) return null;

    try {
      // 1. Get the recipient's FCM token
      const userSnap = await db.collection("users").doc(data.toUserId).get();
      if (!userSnap.exists) return null;

      const fcmToken = userSnap.data().fcmToken;
      if (!fcmToken) {
        console.log("No FCM token for user:", data.toUserId);
        return null;
      }

      // 2. Build notification content based on type
      const messages = {
        bet_challenge:    { title:"⚔️ New Challenge!", body:`${data.fromName} challenged you to a bet!` },
        bet_accepted:     { title:"🔥 Bet Accepted!",  body:`${data.fromName} accepted your challenge. It's on!` },
        bet_declined:     { title:"❌ Bet Declined",   body:`${data.fromName} declined your challenge.` },
        proof_uploaded:   { title:"📹 Proof Uploaded", body:`${data.fromName} uploaded forfeit proof — approve or dispute!` },
        proof_approved:   { title:"✅ Proof Approved!", body:`Your forfeit was approved by ${data.fromName}. +5 honour!` },
        jury_selected:    { title:"⚖️ Jury Duty!",     body:"You've been selected as a juror. Vote LEGIT or FAKE!" },
        direct_message:   { title:`💬 ${data.fromName}`, body: data.message || "You have a new message" },
        friend_request:   { title:"👥 Friend Request", body:`${data.fromName} wants to be your friend!` },
        group_bet_invite: { title:"👥 Group Bet Invite", body:`${data.fromName} invited you to a group bet!` },
      };

      const notif = messages[data.type] || {
        title: "SweatDebt ⚔️",
        body:  data.message || "You have a new notification!",
      };

      // 3. Send the push notification
      const message = {
        token: fcmToken,
        notification: {
          title: notif.title,
          body:  notif.body,
        },
        webpush: {
          notification: {
            title:   notif.title,
            body:    notif.body,
            icon:    "https://sweatdebt.vercel.app/android-chrome-192x192.png",
            badge:   "https://sweatdebt.vercel.app/android-chrome-192x192.png",
            vibrate: [200, 100, 200],
            data: {
              url: data.link || "/",
            },
          },
          fcmOptions: {
            link: `https://sweatdebt.vercel.app${data.link || "/"}`,
          },
        },
        android: {
          notification: {
            icon:  "ic_notification",
            color: "#10b981",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
      };

      await messaging.send(message);
      console.log("✅ Push sent to:", data.toUserId, "type:", data.type);
      return null;

    } catch (err) {
      console.error("❌ Push failed:", err.message);
      return null;
    }
  });