'use client';
import { useMemo, ReactNode } from 'react';
import { app, auth, firestore } from './client';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
    const value = useMemo(() => ({ app, auth, firestore }), []);
    
    return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}
