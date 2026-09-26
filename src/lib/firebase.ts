import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB0QAp6gAEka9U_t6z2r4hJjgEBgrAOsWg",
  authDomain: "wis-assessment.firebaseapp.com",
  projectId: "wis-assessment",
  storageBucket: "wis-assessment.firebasestorage.app",
  messagingSenderId: "486589351229",
  appId: "1:486589351229:web:3c5f28738d83a96cd57154",
  measurementId: "G-X4LFV7F7LF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
