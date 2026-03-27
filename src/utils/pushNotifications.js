import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

// ── Save notification to Firestore (shows in bell) ──
async function saveNotif({ toUserId, fromUserId, fromName, type, title, body, path }) {
  if (!toUserId) return;
  try {
    await addDoc(collection(db,"notifications"),{
      toUserId, fromUserId, fromName, type, title, body,
      path: path||"/bets", read:false, createdAt:serverTimestamp(),
    });
  } catch(e) { console.error(e); }
}

export const notifyBetChallenge = ({ toUserId, fromUser, betDescription, forfeit, reps }) =>
  saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"bet_challenge",
    title:`⚔️ ${fromUser.displayName} challenged you!`,
    body:`"${betDescription}" — forfeit: ${reps} ${forfeit}`, path:"/bets" });

export const notifyBetAccepted = ({ toUserId, fromUser, betDescription }) =>
  saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"bet_accepted",
    title:`✅ ${fromUser.displayName} accepted your bet!`,
    body:`"${betDescription}" — game on!`, path:"/bets" });

export const notifyProofUploaded = ({ toUserId, fromUser, betDescription }) =>
  saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"proof_uploaded",
    title:`📹 ${fromUser.displayName} uploaded their proof!`,
    body:`Review their forfeit for "${betDescription}"`, path:"/bets" });

export const notifyProofApproved = ({ toUserId, fromUser, betDescription }) =>
  saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"proof_approved",
    title:`🏆 ${fromUser.displayName} approved your forfeit!`,
    body:`"${betDescription}" — honour score updated`, path:"/feed" });

export const notifyProofDisputed = ({ toUserId, fromUser, betDescription }) =>
  saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"proof_disputed",
    title:`⚠️ ${fromUser.displayName} disputed your proof`,
    body:`"${betDescription}" — going to community jury`, path:"/bets" });

export const notifyComment = ({ toUserId, fromUser, commentText }) => {
  if (toUserId===fromUser.uid) return;
  return saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"comment",
    title:`💬 ${fromUser.displayName} commented on your video`,
    body:commentText.slice(0,60), path:"/feed" });
};

export const notifyLike = ({ toUserId, fromUser }) => {
  if (toUserId===fromUser.uid) return;
  return saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"like",
    title:`❤️ ${fromUser.displayName} liked your forfeit video`,
    body:"They're watching 👀", path:"/feed" });
};

export const notifyFriendRequest = ({ toUserId, fromUser }) =>
  saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"friend_request",
    title:`👋 ${fromUser.displayName} wants to be friends`,
    body:"Accept their request to challenge them", path:"/bets" });

export const notifyFriendAccepted = ({ toUserId, fromUser }) =>
  saveNotif({ toUserId, fromUserId:fromUser.uid, fromName:fromUser.displayName, type:"friend_accepted",
    title:`🤝 ${fromUser.displayName} accepted your friend request!`,
    body:"Now challenge them to a bet", path:"/bets" });

export const checkOverdueBets = async userId => {
  try {
    const now = new Date();
    const snap = await getDocs(query(collection(db,"bets"),where("opponentEmail","==",userId),where("status","==","pending")));
    snap.docs.forEach(async d => {
      const bet = d.data();
      const deadline = bet.deadline?.toDate?.();
      if (!deadline) return;
      const hoursLeft = (deadline-now)/3600000;
      if (hoursLeft>0 && hoursLeft<6) {
        await saveNotif({ toUserId:userId, fromUserId:"system", fromName:"SweatDebt", type:"debt_reminder",
          title:`⏰ Debt due in ${Math.floor(hoursLeft)}h!`,
          body:`"${bet.description}" — upload your proof now`, path:`/upload/${d.id}` });
      }
    });
  } catch(e) {}
};