'use client';
import { useEffect, useMemo, ReactNode } from 'react';
import { app, auth, firestore } from './client';
import { FirebaseProvider } from './provider';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
    const value = useMemo(() => ({ app, auth, firestore }), []);
    
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        // Use a flag to ensure sign-in is only attempted once per component mount.
        let isSigningIn = false;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user && !isSigningIn) {
                isSigningIn = true; // Set flag to prevent re-entry
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous sign in failed", error);
                });
            }
        });

        return () => unsubscribe();
    }, []); // The empty dependency array ensures this setup runs only once.

    return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}
