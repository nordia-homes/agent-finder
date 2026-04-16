
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

function initializeFirebase() {
    let app: FirebaseApp, auth: Auth, firestore: Firestore;
    if (getApps().length) {
        app = getApp();
    } else {
        app = initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
    firestore = getFirestore(app);
    return { app, auth, firestore };
}

export { initializeFirebase };

export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
