import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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