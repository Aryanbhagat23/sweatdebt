import { db } from "../firebase";
import {
  collection, query, where, getDocs,
  doc, updateDoc, addDoc, serverTimestamp, increment,
} from "firebase/firestore";

/* ─────────────────────────────────────────────────────────────
   PENALTY SYSTEM
   Call checkAndApplyPenalties(uid) when:
   - User opens the app (in App.js useEffect)
   - User opens the Bets page
   It finds all bets where:
   - status = "lost" (loser declared)
   - proofDeadline has passed
   - proof NOT uploaded yet
   Then applies the penalty automatically.
─────────────────────────────────────────────────────────────── */

const PENALTY_HONOUR    = 15;   // honour lost for dodging a forfeit
const NORMAL_HONOUR     = 5;    // honour lost for normal miss
const PROOF_WINDOW_HRS  = 24;   // hours to upload after losing

export async function checkAndApplyPenalties(uid) {
  if (!uid) return;
  try {
    const betsRef = collection(db, "bets");

    // Find bets this user LOST and hasn't uploaded proof for
    const q = query(
      betsRef,
      where("createdBy", "==", uid),
      where("status", "==", "lost")
    );
    const snap = await getDocs(q);
    const now  = new Date();

    const promises = snap.docs.map(async d => {
      const bet = { id: d.id, ...d.data() };

      // skip if already penalised or proof uploaded
      if (bet.penalised)    return;
      if (bet.proofUploaded) return;

      // work out when the proof window expires
      const lostAt       = bet.lostAt?.toDate?.() || bet.updatedAt?.toDate?.() || null;
      if (!lostAt) return;

      const deadline = new Date(lostAt.getTime() + PROOF_WINDOW_HRS * 3600 * 1000);
      if (now < deadline) return; // still has time

      // ── APPLY PENALTY ──
      const hoursOverdue = Math.floor((now - deadline) / 3600000);
      const extraPenalty = hoursOverdue >= 48 ? 10 : 0; // double dodge after 48h
      const totalPenalty = PENALTY_HONOUR + extraPenalty;

      // 1. Mark bet as penalised
      await updateDoc(doc(db, "bets", bet.id), {
        penalised:     true,
        penalisedAt:   serverTimestamp(),
        penaltyPoints: totalPenalty,
        status:        "forfeit_dodged",
      });

      // 2. Drop honour score on user doc
      await updateDoc(doc(db, "users", uid), {
        honour: increment(-totalPenalty),
      });

      // 3. Send notification to opponent
      const opponentUid = bet.opponentUid || bet.createdByOpponent || null;
      if (opponentUid) {
        await addDoc(collection(db, "notifications"), {
          toUserId:   opponentUid,
          fromUserId: uid,
          type:       "forfeit_dodged",
          message:    `Your opponent dodged their forfeit! Their honour dropped by ${totalPenalty}.`,
          betId:      bet.id,
          read:       false,
          createdAt:  serverTimestamp(),
        });
      }

      // 4. Create a "Debt Dodger" badge entry if overdue 48h+
      if (hoursOverdue >= 48) {
        await updateDoc(doc(db, "users", uid), {
          debtDodgerBadge: true,
        });
      }

      console.log(`Penalty applied to ${uid}: -${totalPenalty} honour for bet ${bet.id}`);
    });

    await Promise.all(promises);
  } catch(e) {
    console.error("Penalty check error:", e);
  }
}

/* ─────────────────────────────────────────────────────────────
   Mark a bet as "lost" with a proof deadline
   Call this when a bet result is decided (opponent wins)
─────────────────────────────────────────────────────────────── */
export async function markBetLost(betId, loserUid) {
  try {
    const deadline = new Date(Date.now() + PROOF_WINDOW_HRS * 3600 * 1000);
    await updateDoc(doc(db, "bets", betId), {
      status:         "lost",
      loserUid,
      lostAt:         serverTimestamp(),
      proofDeadline:  deadline,
      proofUploaded:  false,
      penalised:      false,
    });
  } catch(e) {
    console.error("markBetLost error:", e);
  }
}

/* ─────────────────────────────────────────────────────────────
   Mark proof as uploaded — clears the debt
   Call this after a video is uploaded for a lost bet
─────────────────────────────────────────────────────────────── */
export async function markProofUploaded(betId, uploaderUid) {
  try {
    await updateDoc(doc(db, "bets", betId), {
      proofUploaded: true,
      proofUploadedAt: serverTimestamp(),
    });
    // Reward honour for completing honestly
    await updateDoc(doc(db, "users", uploaderUid), {
      honour: increment(5), // +5 for completing forfeit on time
    });
  } catch(e) {
    console.error("markProofUploaded error:", e);
  }
}

/* ─────────────────────────────────────────────────────────────
   Get pending debts for a user (to show in the UI)
   Returns array of bets with time remaining
─────────────────────────────────────────────────────────────── */
export async function getPendingDebts(uid) {
  if (!uid) return [];
  try {
    const q = query(
      collection(db, "bets"),
      where("createdBy", "==", uid),
      where("status", "==", "lost"),
      where("proofUploaded", "==", false),
      where("penalised", "==", false)
    );
    const snap = await getDocs(q);
    const now  = new Date();

    return snap.docs.map(d => {
      const bet = { id: d.id, ...d.data() };
      const lostAt   = bet.lostAt?.toDate?.() || now;
      const deadline = new Date(lostAt.getTime() + PROOF_WINDOW_HRS * 3600 * 1000);
      const msLeft   = deadline - now;
      const hrsLeft  = Math.max(0, Math.floor(msLeft / 3600000));
      const minLeft  = Math.max(0, Math.floor((msLeft % 3600000) / 60000));
      const expired  = msLeft <= 0;

      return {
        ...bet,
        deadline,
        hrsLeft,
        minLeft,
        expired,
        timeLabel: expired
          ? "EXPIRED ☠️"
          : hrsLeft > 0
            ? `${hrsLeft}h ${minLeft}m left`
            : `${minLeft}m left`,
        urgent: !expired && hrsLeft < 6,
      };
    }).sort((a,b) => a.hrsLeft - b.hrsLeft); // most urgent first
  } catch(e) {
    console.error("getPendingDebts error:", e);
    return [];
  }
}