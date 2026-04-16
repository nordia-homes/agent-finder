'use client';

import { FirebaseClientProvider } from '@/firebase';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <FirebaseClientProvider>{children}</FirebaseClientProvider>;
}
