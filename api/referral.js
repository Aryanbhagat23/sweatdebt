// api/referral.js
// Called when a new user signs up with a referral code
// Awards +10 honour to both the referrer and the new user

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function initAdmin() {
  if (getApps().length > 0) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { referrerUid, newUserUid, newUserName } = req.body;

  if (!referrerUid || !newUserUid) {
    return res.status(400).json({ error: "Missing referrerUid or newUserUid" });
  }

  // Can't refer yourself
  if (referrerUid === newUserUid) {
    return res.status(400).json({ error: "Cannot refer yourself" });
  }

  try {
    initAdmin();
    const db = getFirestore();

    // ── Check referral hasn't already been claimed ────────────────────────────
    const newUserDoc = await db.collection("users").doc(newUserUid).get();
    if (!newUserDoc.exists) {
      return res.status(404).json({ error: "New user not found" });
    }
    if (newUserDoc.data().referredBy) {
      return res.status(200).json({ already: true, message: "Referral already claimed" });
    }

    // ── Check referrer exists ─────────────────────────────────────────────────
    const referrerDoc = await db.collection("users").doc(referrerUid).get();
    if (!referrerDoc.exists) {
      return res.status(404).json({ error: "Referrer not found" });
    }

    const referrerData  = referrerDoc.data();
    const referrerName  = referrerData.displayName || "Your friend";

    // ── Award +10 honour to both ──────────────────────────────────────────────
    const BONUS = 10;

    await db.collection("users").doc(newUserUid).update({
      honourScore: (newUserDoc.data().honourScore || 0) + BONUS,
      referredBy:  referrerUid,  // mark so it can't be claimed twice
    });

    await db.collection("users").doc(referrerUid).update({
      honourScore:   (referrerData.honourScore || 0) + BONUS,
      referralCount: (referrerData.referralCount || 0) + 1,
    });

    // ── Save referral record ──────────────────────────────────────────────────
    await db.collection("referrals").add({
      referrerUid,
      newUserUid,
      newUserName:  newUserName || "Someone",
      bonus:        BONUS,
      createdAt:    new Date(),
    });

    // ── Notify referrer in-app ────────────────────────────────────────────────
    await db.collection("notifications").add({
      toUserId:   referrerUid,
      fromUserId: newUserUid,
      fromName:   newUserName || "Someone",
      type:       "referral_success",
      message:    `🎉 ${newUserName || "Someone"} joined SweatDebt using your invite link! You both earned +${BONUS} honour 💪`,
      title:      "🎉 Referral Bonus!",
      link:       "/leaderboard",
      read:       false,
      createdAt:  new Date(),
    });

    // ── Send push notification to referrer ────────────────────────────────────
    const fcmToken = referrerData.fcmToken;
    if (fcmToken) {
      try {
        const messaging = getMessaging();
        await messaging.send({
          token: fcmToken,
          notification: {
            title: "🎉 Referral Bonus!",
            body:  `${newUserName || "Someone"} joined using your link! You both got +${BONUS} honour 💪`,
          },
          webpush: {
            fcmOptions: { link: "https://sweatdebt.vercel.app/leaderboard" },
            notification: {
              icon:  "/android-chrome-192x192.png",
              badge: "/android-chrome-192x192.png",
            },
          },
        });
      } catch(e) {
        // Non-critical — notification already saved to Firestore
        console.warn("Push notification failed:", e);
      }
    }

    return res.status(200).json({
      success: true,
      bonus: BONUS,
      referrerName,
    });

  } catch(e) {
    console.error("Referral error:", e);
    return res.status(500).json({ error: e.message });
  }
}