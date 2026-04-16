
'use client';
import { ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// This check prevents re-initializing the app on every render.
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
  } catch (e) {
    console.error("Failed to initialize Firebase", e)
  }
} else {
  app = getApp();
  auth = getAuth(app);
  firestore = getFirestore(app);
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
    const value = { app, auth, firestore };

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}
