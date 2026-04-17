import 'server-only';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin';

import { serverEnv } from '@/lib/env.server';

function getServiceAccount(): ServiceAccount | null {
  if (serverEnv.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(serverEnv.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    if (parsed.privateKey) {
      parsed.privateKey = parsed.privateKey.replace(/\\n/g, '\n');
    }
    return parsed;
  }

  if (
    serverEnv.FIREBASE_ADMIN_PROJECT_ID &&
    serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL &&
    serverEnv.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return {
      projectId: serverEnv.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: serverEnv.FIREBASE_ADMIN_PRIVATE_KEY,
    };
  }

  return null;
}

const adminApp =
  getApps()[0] ??
  initializeApp(
    getServiceAccount()
      ? {
          credential: cert(getServiceAccount()!),
          projectId:
            getServiceAccount()!.projectId ?? serverEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }
      : {
          projectId: serverEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }
  );

export const adminDb = getFirestore(adminApp);
