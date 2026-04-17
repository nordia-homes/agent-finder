import 'server-only';

import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional()
);

const optionalUrlString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional()
);

const serverEnvSchema = z.object({
  INFOBIP_BASE_URL: optionalUrlString,
  INFOBIP_API_KEY: optionalNonEmptyString,
  INFOBIP_WHATSAPP_SENDER: optionalNonEmptyString,
  INFOBIP_WEBHOOK_SECRET: optionalNonEmptyString,
  FIREBASE_ADMIN_PROJECT_ID: optionalNonEmptyString,
  FIREBASE_ADMIN_CLIENT_EMAIL: optionalNonEmptyString,
  FIREBASE_ADMIN_PRIVATE_KEY: optionalNonEmptyString,
  FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON: optionalNonEmptyString,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalNonEmptyString,
});

const parsedEnv = serverEnvSchema.parse(process.env);

export const serverEnv = {
  ...parsedEnv,
  FIREBASE_ADMIN_PRIVATE_KEY: parsedEnv.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export function hasInfobipConfig() {
  return Boolean(
    serverEnv.INFOBIP_BASE_URL &&
      serverEnv.INFOBIP_API_KEY &&
      serverEnv.INFOBIP_WHATSAPP_SENDER
  );
}

export function getRequiredInfobipConfig() {
  if (!hasInfobipConfig()) {
    throw new Error(
      'Missing Infobip configuration. Set INFOBIP_BASE_URL, INFOBIP_API_KEY, and INFOBIP_WHATSAPP_SENDER.'
    );
  }

  return {
    baseUrl: serverEnv.INFOBIP_BASE_URL!,
    apiKey: serverEnv.INFOBIP_API_KEY!,
    sender: serverEnv.INFOBIP_WHATSAPP_SENDER!,
    webhookSecret: serverEnv.INFOBIP_WEBHOOK_SECRET ?? '',
  };
}
