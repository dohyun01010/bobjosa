import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
  authDomain: "bobjosa-project.firebaseapp.com",
  projectId: "bobjosa-project",
  storageBucket: "bobjosa-project.appspot.com",
  messagingSenderId: "1058291829",
  appId: "1:1058291829:web:bobjosaprojectapp"
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
