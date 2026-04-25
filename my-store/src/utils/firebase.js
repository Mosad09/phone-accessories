import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

console.log("[Firebase] Initializing Firebase...");

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
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

console.log("[Firebase] Initialization complete.");

export const loginWithGoogle = async () => {
  try {
    console.log("[Auth] Starting Google Sign-In...");
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    console.log("[Auth] Google Sign-In successful!", {
      uid: result.user.uid,
      email: result.user.email
    });
    return { user: result.user, token };
  } catch (error) {
    console.error("[Auth] Google Sign-In Error:", error.code, error.message);
    throw error;
  }
};

export const logout = () => {
  console.log("[Auth] User signing out...");
  return signOut(auth);
};
export { auth, db };
