import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "my-store-6a861",
  appId: "1:562504670976:web:7239c138556bb7346b9de5",
  storageBucket: "my-store-6a861.firebasestorage.app",
  apiKey: "AIzaSyCPiBojeZPe_NGE_aqYG4We2yLD6tdzIRU",
  authDomain: "my-store-6a861.firebaseapp.com",
  messagingSenderId: "562504670976",
  measurementId: "G-FNKZB3R289"
};

// Prevent duplicate initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  } catch (error) {
    console.error("[Auth] Google Sign-In Error:", error.code, error.message);
    throw error;
  }
};

export const logout = () => {
  return signOut(auth);
};

export { auth, db, storage };
