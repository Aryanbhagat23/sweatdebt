import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBMajR3LpxZhR0KUm9XeT-ZJa_ePqywZEM",
  authDomain: "sweatdebt-3ef55.firebaseapp.com",
  projectId: "sweatdebt-3ef55",
  storageBucket: "sweatdebt-3ef55.firebasestorage.app",
  messagingSenderId: "242841715698",
  appId: "1:242841715698:web:3626e9d81621f36b06216b",
  measurementId: "G-SWJHVV2SY4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const db = getFirestore(app);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// ─── VAPID Key ─────────────────────────────────────────────────────────────────
// Get this from: Firebase Console → Project Settings → Cloud Messaging
// → Web Push certificates → Key pair
const VAPID_KEY = "BNBjCh5qdB8_gvlGqD0tjYlYq9UTz0j2BWNevcQAMTLmPokHteb_u1ZKUnN0srqNVtNJ7ChWYJX-M5M8ZRDnDDo"; // ← paste your key here

// ─── Username helpers ──────────────────────────────────────────────────────────
export const isUsernameTaken = async (username) => {
  const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
  return snap.exists();
};

// ─── User profile ──────────────────────────────────────────────────────────────
export const saveUserProfile = async (user, extraData = {}) => {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    const defaultUsername =
      (user.displayName?.toLowerCase().replace(/\s+/g, "") ||
        user.email?.split("@")[0] ||
        "user") + Math.floor(Math.random() * 1000);

    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || extraData.displayName || "",
      email: user.email,
      username: extraData.username || defaultUsername,
      photoURL: user.photoURL || extraData.photoURL || null,
      bio: "",
      createdAt: serverTimestamp(),
      honour: 100,
      wins: 0,
      losses: 0,
      fcmToken: null,
      needsOnboarding: true,
      ...extraData,
    });

    const uname = extraData.username || defaultUsername;
    await setDoc(doc(db, "usernames", uname.toLowerCase()), { uid: user.uid });

    return { isNew: true, needsOnboarding: true };
  } else {
    await updateDoc(userRef, { lastSeen: serverTimestamp() });
    return {
      isNew: false,
      needsOnboarding: existing.data().needsOnboarding || false,
    };
  }
};

export const completeOnboarding = async (uid, { displayName, username, photoURL, bio }) => {
  await updateDoc(doc(db, "users", uid), {
    displayName,
    username: username.toLowerCase(),
    photoURL: photoURL || null,
    bio: bio || "",
    needsOnboarding: false,
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "usernames", username.toLowerCase()), { uid });
};

// ─── Notifications ─────────────────────────────────────────────────────────────
export const requestNotificationPermission = async (userId) => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token && userId) {
      await updateDoc(doc(db, "users", userId), { fcmToken: token });
      console.log("✅ FCM token saved:", token.slice(0, 20) + "...");
    }
    return token;
  } catch (error) {
    console.error("FCM error:", error);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  if (!messaging) return;
  return onMessage(messaging, callback);
};

export const sendNotification = async ({
  toUserId, fromUserId, fromName, fromPhoto, type, message, link,
}) => {
  try {
    await setDoc(
      doc(db, "notifications", `${toUserId}_${type}_${fromUserId}_${Date.now()}`),
      {
        toUserId, fromUserId, fromName,
        fromPhoto: fromPhoto || null,
        type, message,
        link: link || null,
        read: false,
        createdAt: serverTimestamp(),
      }
    );
  } catch (e) {
    console.error("sendNotification error:", e);
  }
};