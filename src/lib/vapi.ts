import 'server-only';

import { getRequiredVapiConfig } from '@/lib/env.server';

type VapiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: Record<string, unknown>;
};

async function vapiRequest<T>(path: string, options: VapiRequestOptions = {}) {
  const config = getRequiredVapiConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | { message?: string; error?: string }) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : `Vapi request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export async function createVapiCall(payload: Record<string, unknown>) {
  return vapiRequest<Record<string, unknown>>('/call', { method: 'POST', body: payload });
}

export async function getVapiCall(callId: string) {
  return vapiRequest<Record<string, unknown>>(`/call/${callId}`);
}

export async function listVapiCalls() {
  return vapiRequest<Array<Record<string, unknown>>>('/call');
}

export async function listVapiAssistants() {
  return vapiRequest<Array<Record<string, unknown>>>('/assistant');
}

export async function getVapiAssistant(assistantId: string) {
  return vapiRequest<Record<string, unknown>>(`/assistant/${assistantId}`);
}

export async function updateVapiAssistant(assistantId: string, payload: Record<string, unknown>) {
  return vapiRequest<Record<string, unknown>>(`/assistant/${assistantId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function listVapiPhoneNumbers() {
  return vapiRequest<Array<Record<string, unknown>>>('/phone-number');
}

export async function updateVapiPhoneNumber(phoneNumberId: string, payload: Record<string, unknown>) {
  return vapiRequest<Record<string, unknown>>(`/phone-number/${phoneNumberId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function listVapiTools() {
  return vapiRequest<Array<Record<string, unknown>>>('/tool');
}
