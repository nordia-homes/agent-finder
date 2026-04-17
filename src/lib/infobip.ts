import 'server-only';

import { getRequiredInfobipConfig } from '@/lib/env.server';
import { mapInfobipTemplateStatus } from '@/lib/whatsapp';

type InfobipMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function infobipRequest<TResponse>(
  path: string,
  init?: {
    method?: InfobipMethod;
    body?: unknown;
  }
): Promise<TResponse> {
  const { baseUrl, apiKey } = getRequiredInfobipConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `App ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Infobip request failed (${response.status}): ${details}`);
  }

  return (await response.json()) as TResponse;
}

export type CreateInfobipTemplateInput = {
  sender: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  bodyText: string;
  footerText?: string;
  headerText?: string;
  headerType?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE';
  headerMediaUrl?: string;
  examples?: string[];
  buttons?: Array<{ type: string; text: string; url?: string; payload?: string }>;
};

export async function createInfobipTemplate(input: CreateInfobipTemplateInput) {
  const placeholderMatches = input.bodyText.match(/{{\d+}}/g) ?? [];
  const body: Record<string, unknown> = {
    text: input.bodyText,
  };

  if (placeholderMatches.length > 0 && input.examples && input.examples.length > 0) {
    body.examples = input.examples.slice(0, placeholderMatches.length);
  }

  const structure: Record<string, unknown> = {
    body,
  };

  if (input.footerText) {
    structure.footer = { text: input.footerText };
  }

  if (input.headerText && input.headerType === 'TEXT') {
    structure.header = { format: 'TEXT', text: input.headerText };
  }

  if (input.headerType && ['IMAGE', 'DOCUMENT', 'VIDEO'].includes(input.headerType) && input.headerMediaUrl) {
    structure.header = {
      format: input.headerType,
      example: input.headerMediaUrl,
    };
  }

  if (input.buttons?.length) {
    const normalizedButtons = input.buttons
      .map((button) => {
        if (!button.text?.trim()) return null;

        if (button.type === 'QUICK_REPLY') {
          return {
            type: 'QUICK_REPLY',
            text: button.text.trim(),
          };
        }

        if (button.type === 'URL' && button.url?.trim()) {
          return {
            type: 'URL',
            text: button.text.trim(),
            url: button.url.trim(),
          };
        }

        if (button.type === 'PHONE_NUMBER' && button.payload?.trim()) {
          return {
            type: 'PHONE_NUMBER',
            text: button.text.trim(),
            phoneNumber: button.payload.trim(),
          };
        }

        return null;
      })
      .filter(Boolean);

    if (normalizedButtons.length > 0) {
      structure.buttons = normalizedButtons;
    }
  }

  const response = await infobipRequest<any>(`/whatsapp/2/senders/${encodeURIComponent(input.sender)}/templates`, {
    method: 'POST',
    body: {
      name: input.name,
      language: input.language,
      category: input.category,
      allowCategoryChange: false,
      structure,
    },
  });

  return {
    raw: response,
    remoteId: response?.id ?? response?.templateId ?? null,
    approvalStatus: mapInfobipTemplateStatus(response?.status),
  };
}

export async function listInfobipTemplates(sender?: string) {
  const { sender: defaultSender } = getRequiredInfobipConfig();
  const activeSender = sender ?? defaultSender;
  const response = await infobipRequest<any[]>(
    `/whatsapp/2/senders/${encodeURIComponent(activeSender)}/templates`
  );

  return response.map((template) => ({
    remoteId: template.id ?? template.templateId ?? template.name,
    name: template.name,
    language: template.language,
    category: template.category,
    status: mapInfobipTemplateStatus(template.status),
    raw: template,
  }));
}

export type SendInfobipTemplateInput = {
  sender: string;
  to: string;
  templateName: string;
  language: string;
  bodyParameters?: string[];
  notifyUrl?: string;
};

export async function sendInfobipTemplate(input: SendInfobipTemplateInput) {
  const response = await infobipRequest<any>('/whatsapp/1/message/template', {
    method: 'POST',
    body: {
      from: input.sender,
      to: input.to,
      messageId: crypto.randomUUID(),
      content: {
        templateName: input.templateName,
        templateData: {
          body: {
            placeholders: input.bodyParameters ?? [],
          },
        },
        language: input.language,
      },
      notifyUrl: input.notifyUrl,
    },
  });

  return {
    raw: response,
    messageId: response?.messages?.[0]?.messageId ?? response?.messageId ?? null,
    status: response?.messages?.[0]?.status?.groupName ?? 'sent',
  };
}

export async function sendInfobipTextMessage(input: {
  sender: string;
  to: string;
  text: string;
  notifyUrl?: string;
}) {
  const response = await infobipRequest<any>('/whatsapp/1/message/text', {
    method: 'POST',
    body: {
      from: input.sender,
      to: input.to,
      content: {
        text: input.text,
      },
      notifyUrl: input.notifyUrl,
    },
  });

  return {
    raw: response,
    messageId: response?.messages?.[0]?.messageId ?? response?.messageId ?? null,
    status: response?.messages?.[0]?.status?.groupName ?? 'sent',
  };
}
