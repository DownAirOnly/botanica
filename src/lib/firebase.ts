import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase web-app identifiers are public client configuration, not credentials.
// Business inventory access is enforced by the deployed Firestore security rules.
// Optional VITE_FIREBASE_* variables allow this project to be pointed at a separate
// test instance without modifying the source file.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDnfWSU4AlpwLcpzm_HwCw-8wQ4LbYVnyg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'botanica-45e4b.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'botanica-45e4b',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'botanica-45e4b.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '816640501787',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:816640501787:web:4f997f4d1d034e305030be',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-T66NVNPWBX',
};

export const firebaseConfigured = Object.values(config).every(v => typeof v === 'string' && v.trim().length > 0);
const firebaseApp: FirebaseApp | null = firebaseConfigured ? (getApps()[0] ?? initializeApp(config)) : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
