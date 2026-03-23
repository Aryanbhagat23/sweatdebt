// src/utils/streaks.js
// Call these functions whenever a bet is won, lost, or forfeit completed

import { db } from "../firebase";
import { doc, updateDoc, getDoc, increment, serverTimestamp } from "firebase/firestore";

// ─── Badge definitions ────────────────────────────────────────────────────────
export const BADGES = {
  // Win streak badges
  on_fire:       { id:"on_fire",       icon:"🔥", label:"On Fire",       desc:"Win 3 bets in a row",                condition: s => s.currentWinStreak >= 3  },
  unstoppable:   { id:"unstoppable",   icon:"⚡", label:"Unstoppable",   desc:"Win 5 bets in a row",                condition: s => s.currentWinStreak >= 5  },
  god_mode:      { id:"god_mode",      icon:"👑", label:"God Mode",      desc:"Win 10 bets in a row",               condition: s => s.currentWinStreak >= 10 },

  // Honesty badges
  honest_3:      { id:"honest_3",      icon:"🤝", label:"Honest 3",      desc:"Complete 3 forfeits honestly",       condition: s => s.forfeitsCompleted >= 3  },
  honest_7:      { id:"honest_7",      icon:"💎", label:"Diamond Hands", desc:"Complete 7 forfeits honestly",       condition: s => s.forfeitsCompleted >= 7  },
  honest_20:     { id:"honest_20",     icon:"🏅", label:"Legend",        desc:"Complete 20 forfeits honestly",      condition: s => s.forfeitsCompleted >= 20 },

  // Total bets badges
  rookie:        { id:"rookie",        icon:"🥊", label:"Rookie",        desc:"Place your first bet",               condition: s => s.totalBets >= 1  },
  competitor:    { id:"competitor",    icon:"⚔️", label:"Competitor",    desc:"Place 10 bets",                      condition: s => s.totalBets >= 10 },
  veteran:       { id:"veteran",       icon:"🎖️", label:"Veteran",       desc:"Place 50 bets",                      condition: s => s.totalBets >= 50 },

  // Daily challenge badges
  daily_5:       { id:"daily_5",       icon:"📅", label:"Consistent",    desc:"Complete 5 daily challenges",        condition: s => s.dailyChallengesCompleted >= 5  },
  daily_30:      { id:"daily_30",      icon:"🗓️", label:"Dedicated",     desc:"Complete 30 daily challenges",       condition: s => s.dailyChallengesCompleted >= 30 },

  // Honour badges
  trusted:       { id:"trusted",       icon:"✅", label:"Trusted",       desc:"Reach 100 honour score",             condition: s => (s.honour || 0) >= 100 },
  elite:         { id:"elite",         icon:"💫", label:"Elite",         desc:"Reach 150 honour score",             condition: s => (s.honour || 0) >= 150 },

  // Social badges
  social_bet:    { id:"social_bet",    icon:"👥", label:"Social",        desc:"Bet against 5 different people",     condition: s => (s.uniqueOpponents || 0) >= 5 },
};

// ─── Check and award any new badges ──────────────────────────────────────────
export const checkAndAwardBadges = async (uid, stats) => {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const userData = snap.data();
    const existingBadges = userData.badges || [];
    const newBadges = [];

    for (const badge of Object.values(BADGES)) {
      if (!existingBadges.includes(badge.id) && badge.condition(stats)) {
        newBadges.push(badge.id);
      }
    }

    if (newBadges.length > 0) {
      await updateDoc(userRef, {
        badges: [...existingBadges, ...newBadges],
      });
    }

    return newBadges; // return newly earned badges so caller can show toast
  } catch (e) {
    console.error("checkAndAwardBadges error:", e);
    return [];
  }
};

// ─── Called when user WINS a bet ─────────────────────────────────────────────
export const recordWin = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const newStreak = (data.currentWinStreak || 0) + 1;
    const bestStreak = Math.max(newStreak, data.bestWinStreak || 0);
    const totalBets = (data.totalBets || 0) + 1;
    const wins = (data.wins || 0) + 1;

    await updateDoc(userRef, {
      wins: wins,
      totalBets: totalBets,
      currentWinStreak: newStreak,
      bestWinStreak: bestStreak,
      honour: increment(5),
      lastBetDate: serverTimestamp(),
    });

    const newStats = { ...data, wins, totalBets, currentWinStreak: newStreak, bestWinStreak: bestStreak, honour: (data.honour || 100) + 5 };
    return await checkAndAwardBadges(uid, newStats);
  } catch (e) {
    console.error("recordWin error:", e);
  }
};

// ─── Called when user LOSES a bet (forfeit approved) ─────────────────────────
export const recordLossApproved = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const forfeitsCompleted = (data.forfeitsCompleted || 0) + 1;
    const totalBets = (data.totalBets || 0) + 1;
    const losses = (data.losses || 0) + 1;

    await updateDoc(userRef, {
      losses: losses,
      totalBets: totalBets,
      currentWinStreak: 0, // streak breaks on loss
      forfeitsCompleted: forfeitsCompleted,
      honour: increment(3), // honest completion = +3 honour
      lastBetDate: serverTimestamp(),
    });

    const newStats = { ...data, losses, totalBets, currentWinStreak: 0, forfeitsCompleted, honour: (data.honour || 100) + 3 };
    return await checkAndAwardBadges(uid, newStats);
  } catch (e) {
    console.error("recordLossApproved error:", e);
  }
};

// ─── Called when forfeit is DISPUTED (loser didn't complete properly) ─────────
export const recordDisputed = async (uid) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      losses: increment(1),
      totalBets: increment(1),
      currentWinStreak: 0,
      honour: increment(-15),
    });
  } catch (e) {
    console.error("recordDisputed error:", e);
  }
};

// ─── Streak display helper ────────────────────────────────────────────────────
export const getStreakDisplay = (streak) => {
  if (!streak || streak === 0) return null;
  if (streak >= 10) return { icon:"👑", label:`${streak} streak`, color:"#a855f7" };
  if (streak >= 5)  return { icon:"⚡", label:`${streak} streak`, color:"#00d4ff" };
  if (streak >= 3)  return { icon:"🔥", label:`${streak} streak`, color:"#f59e0b" };
  return { icon:"💪", label:`${streak} streak`, color:"#64748b" };
};

// ─── Get badge display info ───────────────────────────────────────────────────
export const getBadgeInfo = (badgeId) => BADGES[badgeId] || null;