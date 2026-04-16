
'use client';
import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from '../provider';

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // Try to get user from a mock/anonymous sign in for dev
      const getAnonUser = async () => {
        const { signInAnonymously } = await import('firebase/auth');
        try {
            const userCredential = await signInAnonymously(auth!);
            setUser(userCredential.user);
        } catch(e) {
            console.error("Anonymous sign in failed", e);
        } finally {
            setLoading(false);
        }
      }
      if (process.env.NODE_ENV === 'development') {
        getAnonUser();
      } else {
         setLoading(false);
         return;
      }
    }

    if (auth) {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }
  }, [auth]);

  return { user, loading };
}
