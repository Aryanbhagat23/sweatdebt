// api/send-notification.js
// Vercel serverless function — sends FCM push notifications securely
// Called from the React app whenever a notification needs to be sent

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// ── init Firebase Admin (once) ────────────────────────────────────────────────
function initAdmin() {
  if (getApps().length > 0) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
}

// ── main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { toUserId, title, body, url, data } = req.body;

  if (!toUserId || !title || !body) {
    return res.status(400).json({ error: "Missing required fields: toUserId, title, body" });
  }

  try {
    initAdmin();
    const db = getFirestore();

    // Look up the recipient's FCM token
    const userSnap = await db.collection("users").doc(toUserId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const fcmToken = userSnap.data()?.fcmToken;
    if (!fcmToken) {
      // User hasn't granted notification permission yet — not an error
      return res.status(200).json({ sent: false, reason: "No FCM token for user" });
    }

    // Send the push notification via FCM
    const messaging = getMessaging();
    const message = {
      token: fcmToken,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: url || "https://sweatdebt.vercel.app" },
        notification: {
          title,
          body,
          icon:  "/android-chrome-192x192.png",
          badge: "/android-chrome-192x192.png",
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: { url: url || "/", ...(data || {}) },
        },
      },
      data: { url: url || "/", ...(data || {}) },
    };

    await messaging.send(message);
    return res.status(200).json({ sent: true });

  } catch(e) {
    console.error("send-notification error:", e);
    // If token is invalid/expired, clear it from Firestore
    if (e.code === "messaging/registration-token-not-registered") {
      try {
        initAdmin();
        const db = getFirestore();
        await db.collection("users").doc(toUserId).update({ fcmToken: null });
      } catch(_) {}
      return res.status(200).json({ sent: false, reason: "Token expired, cleared" });
    }
    return res.status(500).json({ error: e.message });
  }
}