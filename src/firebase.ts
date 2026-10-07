import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBx15fWwiEvVdNwRPKvzLwE8gX89pRQ3Ig",
  authDomain: "f1-formula-one.firebaseapp.com",
  projectId: "f1-formula-one",
  storageBucket: "f1-formula-one.firebasestorage.app",
  messagingSenderId: "16304897170",
  appId: "1:16304897170:web:e2d8560ad8255a62413a4b",
  measurementId: "G-D0Z2X59E14"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize optional services (exported so you can use them in components)
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
