// Initialization is now handled by src/firebase/client.ts
// and consumed by src/firebase/client-provider.tsx.
// This file just exports the hooks and providers.

export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
