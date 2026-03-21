// src/utils/scoreUpdater.js
// Call these functions whenever a bet outcome is decided

import { db } from "../firebase";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";

// When a bet is WON by someone
export const recordWin = async (userId) => {
  if (!userId) return;
  try {
    await updateDoc(doc(db, "users", userId), {
      wins: increment(1),
      honour: increment(5),   // honour goes up for winning
    });
  } catch (e) {
    console.error("recordWin error:", e);
  }
};

// When a bet is LOST and forfeit is APPROVED
export const recordLossApproved = async (userId) => {
  if (!userId) return;
  try {
    await updateDoc(doc(db, "users", userId), {
      losses: increment(1),
      honour: increment(3),   // honour goes UP for completing forfeit honestly
    });
  } catch (e) {
    console.error("recordLossApproved error:", e);
  }
};

// When a forfeit is DISPUTED (loser didn't complete it properly)
export const recordDisputed = async (userId) => {
  if (!userId) return;
  try {
    await updateDoc(doc(db, "users", userId), {
      losses: increment(1),
      honour: increment(-15), // honour drops for disputing/cheating
    });
  } catch (e) {
    console.error("recordDisputed error:", e);
  }
};

// Call this from the Approve button in Feed.jsx
// winnerId = person who won the bet (challenger)
// loserId = person who uploaded the video proof
export const settleBet = async (betId, winnerId, loserId, wasDisputed = false) => {
  try {
    // Update bet status
    await updateDoc(doc(db, "bets", betId), {
      status: wasDisputed ? "disputed" : "completed",
      winnerId,
      loserId,
      settledAt: new Date(),
    });

    if (wasDisputed) {
      await recordDisputed(loserId);
    } else {
      await recordWin(winnerId);
      await recordLossApproved(loserId);
    }
  } catch (e) {
    console.error("settleBet error:", e);
  }
};