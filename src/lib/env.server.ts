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
  VAPI_BASE_URL: optionalUrlString,
  VAPI_API_KEY: optionalNonEmptyString,
  VAPI_WEBHOOK_SECRET: optionalNonEmptyString,
  VAPI_WEBHOOK_AUTH_TOKEN: optionalNonEmptyString,
  VAPI_WEBHOOK_HMAC_SECRET: optionalNonEmptyString,
  VAPI_DEFAULT_ASSISTANT_ID: optionalNonEmptyString,
  VAPI_DEFAULT_PHONE_NUMBER_ID: optionalNonEmptyString,
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

export function hasVapiConfig() {
  return Boolean(serverEnv.VAPI_API_KEY);
}

export function getRequiredVapiConfig() {
  if (!hasVapiConfig()) {
    throw new Error('Missing Vapi configuration. Set VAPI_API_KEY.');
  }

  return {
    baseUrl: serverEnv.VAPI_BASE_URL ?? 'https://api.vapi.ai',
    apiKey: serverEnv.VAPI_API_KEY!,
    webhookSecret: serverEnv.VAPI_WEBHOOK_SECRET ?? '',
    webhookAuthToken: serverEnv.VAPI_WEBHOOK_AUTH_TOKEN ?? '',
    webhookHmacSecret: serverEnv.VAPI_WEBHOOK_HMAC_SECRET ?? '',
    defaultAssistantId: serverEnv.VAPI_DEFAULT_ASSISTANT_ID ?? '',
    defaultPhoneNumberId: serverEnv.VAPI_DEFAULT_PHONE_NUMBER_ID ?? '',
  };
}
