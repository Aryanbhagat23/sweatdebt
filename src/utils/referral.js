// src/utils/referral.js
// Handles the full referral flow:
// 1. Saves referral code from URL to localStorage
// 2. Claims referral credit after signup

// ── Save referral code when user lands on the app ─────────────────────────────
export function captureReferralCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref    = params.get("ref");
    if (ref && ref.length > 5) {
      // Save to localStorage so it survives through the auth flow
      localStorage.setItem("sweatdebt_ref", ref);
      // Clean the URL so it doesn't look messy
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  } catch(e) {}
}

// ── Get saved referral code ───────────────────────────────────────────────────
export function getSavedReferralCode() {
  try { return localStorage.getItem("sweatdebt_ref") || null; }
  catch(e) { return null; }
}

// ── Clear referral code after it's been claimed ───────────────────────────────
export function clearReferralCode() {
  try { localStorage.removeItem("sweatdebt_ref"); }
  catch(e) {}
}

// ── Claim referral credit — call after new user signs up ─────────────────────
export async function claimReferral(newUserUid, newUserName) {
  const referrerUid = getSavedReferralCode();
  if (!referrerUid) return null;  // no referral code — nothing to do

  try {
    const res = await fetch("/api/referral", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ referrerUid, newUserUid, newUserName }),
    });
    const data = await res.json();
    if (data.success || data.already) {
      clearReferralCode(); // clear so it can't be claimed twice
    }
    return data;
  } catch(e) {
    console.warn("Referral claim failed (non-critical):", e);
    return null;
  }
}

// ── Generate referral link for sharing ───────────────────────────────────────
export function getReferralLink(uid) {
  return `https://sweatdebt.vercel.app/?ref=${uid}`;
}

// ── Generate WhatsApp share message ──────────────────────────────────────────
export function getReferralWhatsAppMsg(displayName, uid) {
  const link = getReferralLink(uid);
  return `💪 ${displayName || "I"} challenged you to join SweatDebt!\n\nBet your friends on sports. Lose the bet → film yourself doing the forfeit 💀\n\nJoin using my link and we BOTH get +10 honour bonus:\n${link}`;
}