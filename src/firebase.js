import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const db = getFirestore(app);

// Check if username already taken
export const isUsernameTaken = async (username) => {
  const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
  return snap.exists();
};

// Save user profile on first login
export const saveUserProfile = async (user, extraData = {}) => {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    const defaultUsername = (user.displayName?.toLowerCase().replace(/\s+/g,"") || user.email?.split("@")[0] || "user") + Math.floor(Math.random()*1000);
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
    return { isNew: false, needsOnboarding: existing.data().needsOnboarding || false };
  }
};

// Called after onboarding completes
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

// Send a notification to another user
export const sendNotification = async ({ toUserId, fromUserId, fromName, fromPhoto, type, message, link }) => {
  try {
    await setDoc(doc(db, "notifications", `${toUserId}_${type}_${fromUserId}_${Date.now()}`), {
      toUserId, fromUserId, fromName, fromPhoto: fromPhoto || null,
      type, message, link: link || null, read: false, createdAt: serverTimestamp(),
    });
  } catch (e) { console.error("sendNotification error:", e); }
};