import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCeTY89i4763jkw7jebB8KuiTyOS-q361E",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "lbricol-6a023.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "lbricol-6a023",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "lbricol-6a023.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "732991989736",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:732991989736:web:d24baee999803a892de65d",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-1MB6FPCQN0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
export const storage = getStorage(app);

// Initialize Messaging only in browser
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export default app;

