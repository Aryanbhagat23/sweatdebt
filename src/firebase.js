import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
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
export const db = getFirestore(app);

// Only init messaging in browser (not during SSR)
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// Your VAPID key from Firebase Console → Project Settings → Cloud Messaging
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";

export const saveUserProfile = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    const username = user.displayName?.toLowerCase().replace(/\s+/g,"") || user.email.split("@")[0];
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      username: username,
      photoURL: user.photoURL || null,
      bio: "",
      createdAt: serverTimestamp(),
      honour: 100,
      wins: 0,
      losses: 0,
      fcmToken: null,
    });
  }
};

// Request notification permission and save FCM token
export const requestNotificationPermission = async (userId) => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await updateDoc(doc(db, "users", userId), { fcmToken: token });
      console.log("FCM token saved");
    }
    return token;
  } catch (error) {
    console.error("FCM error:", error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  if (!messaging) return;
  return onMessage(messaging, callback);
};