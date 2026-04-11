// api/weekly-recap.js
// Vercel Cron Job — runs every Monday at 9:00 AM UTC
// Sends personalised weekly recap push notifications to all active users

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function initAdmin() {
  if (getApps().length > 0) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
}

// ── Build a personalised recap message ────────────────────────────────────────
function buildRecapMessage({ displayName, wins, losses, activeBets, rank, honour }) {
  const firstName = displayName?.split(" ")[0] || "Athlete";

  if (activeBets > 0 && wins > 0) {
    return {
      title: `⚔️ Weekly Recap — ${firstName}`,
      body:  `${wins}W · ${losses}L this week · ${activeBets} active bet${activeBets !== 1 ? "s" : ""} live · Rank #${rank} · ${honour} honour 🔥`,
    };
  }
  if (activeBets > 0) {
    return {
      title: `⚔️ ${activeBets} bet${activeBets !== 1 ? "s" : ""} waiting, ${firstName}`,
      body:  `You have ${activeBets} active bet${activeBets !== 1 ? "s" : ""} right now. Don't let them expire! 💀`,
    };
  }
  if (wins > 0) {
    return {
      title: `🏆 Great week, ${firstName}!`,
      body:  `${wins} win${wins !== 1 ? "s" : ""} this week · Rank #${rank} · ${honour} honour pts. Keep the streak going ⚔️`,
    };
  }
  // Inactive user — nudge them back
  return {
    title: `👋 Miss you, ${firstName}`,
    body:  `No bets this week? Your friends are sweating without you. Come back and challenge someone! ⚔️`,
  };
}

export default async function handler(req, res) {
  // Vercel cron calls with GET, protect with a secret header too
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Optional: protect with a secret so only Vercel cron can call this
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers["authorization"] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    initAdmin();
    const db         = getFirestore();
    const messaging  = getMessaging();

    // ── Get all users with FCM tokens ──────────────────────────────────────────
    const usersSnap = await db.collection("users").where("fcmToken", "!=", null).get();
    if (usersSnap.empty) {
      return res.status(200).json({ sent: 0, message: "No users with FCM tokens" });
    }

    // ── Get this week's date range ─────────────────────────────────────────────
    const now       = new Date();
    const weekAgo   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Get all bets created in the last week ──────────────────────────────────
    const betsSnap = await db.collection("bets")
      .where("createdAt", ">=", weekAgo)
      .get();
    const allBets = betsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ── Get leaderboard ranking (by honour score) ──────────────────────────────
    const allUsersSnap = await db.collection("users")
      .orderBy("honourScore", "desc")
      .get();
    const rankMap = {};
    allUsersSnap.docs.forEach((d, i) => { rankMap[d.id] = i + 1; });

    // ── Send personalised notification to each user ────────────────────────────
    let sent = 0, failed = 0, skipped = 0;
    const batch = [];

    for (const userDoc of usersSnap.docs) {
      const u         = userDoc.data();
      const uid       = userDoc.id;
      const fcmToken  = u.fcmToken;
      if (!fcmToken) { skipped++; continue; }

      // Calculate this user's weekly stats
      const myBets = allBets.filter(b =>
        b.createdBy === uid || b.opponentUid === uid
      );
      const wins = myBets.filter(b =>
        (b.status === "approved" || b.status === "won") && b.winner === uid
      ).length;
      const losses = myBets.filter(b =>
        (b.status === "lost" || b.status === "disputed") &&
        (b.createdBy === uid || b.opponentUid === uid) &&
        b.winner !== uid
      ).length;

      // Active bets (all time, not just this week)
      const activeBetsSnap = await db.collection("bets")
        .where("participants", "array-contains", uid)
        .where("status", "in", ["pending", "accepted"])
        .get();
      const activeBets = activeBetsSnap.size;

      const rank   = rankMap[uid] || 999;
      const honour = u.honourScore || u.honour || 0;

      const { title, body } = buildRecapMessage({
        displayName: u.displayName,
        wins, losses, activeBets, rank, honour,
      });

      // Queue the message
      batch.push({
        token: fcmToken,
        uid,
        message: {
          token: fcmToken,
          notification: { title, body },
          webpush: {
            fcmOptions: { link: "https://sweatdebt.vercel.app/" },
            notification: {
              title, body,
              icon:  "/android-chrome-192x192.png",
              badge: "/android-chrome-192x192.png",
              vibrate: [200, 100, 200],
              requireInteraction: false,
            },
          },
        },
      });
    }

    // ── Send in batches of 100 (FCM limit) ────────────────────────────────────
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100);
      const results = await Promise.allSettled(
        chunk.map(item => messaging.send(item.message))
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "fulfilled") {
          sent++;
          // Also save a Firestore notification doc so it shows in the bell
          db.collection("notifications").add({
            toUserId:   chunk[j].uid,
            fromUserId: "system",
            fromName:   "SweatDebt",
            type:       "weekly_recap",
            message:    batch[i + j].message.notification.body,
            title:      batch[i + j].message.notification.title,
            link:       "/",
            read:       false,
            createdAt:  new Date(),
          }).catch(() => {});
        } else {
          failed++;
          // Clear expired tokens
          const err = results[j].reason;
          if (err?.code === "messaging/registration-token-not-registered") {
            db.collection("users").doc(chunk[j].uid)
              .update({ fcmToken: null }).catch(() => {});
          }
        }
      }
    }

    console.log(`Weekly recap: ${sent} sent, ${failed} failed, ${skipped} skipped`);
    return res.status(200).json({ sent, failed, skipped, total: batch.length });

  } catch(e) {
    console.error("Weekly recap error:", e);
    return res.status(500).json({ error: e.message });
  }
}