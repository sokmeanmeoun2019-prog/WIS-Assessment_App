import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBOQAp6gAEka9U_t6z2r4hJjgEBgrAOsWg",
  authDomain: "wis-assessment.firebaseapp.com",
  projectId: "wis-assessment",
  storageBucket: "wis-assessment.firebasestorage.app",
  messagingSenderId: "486589351229",
  appId: "1:486589351229:web:27b1575da8850b74d57154",
  measurementId: "G-WNBJ3K5SYL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app);

export { db, auth, googleProvider, storage };
