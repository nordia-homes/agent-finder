'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  CalendarClock,
  CheckCheck,
  Clock3,
  Loader2,
  MessageCircleMore,
  MessageSquareShare,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import type { Lead, WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function asDate(value?: { toDate?: () => Date; _seconds?: number; seconds?: number } | null) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const seconds = value.seconds ?? value._seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

function formatAbsolute(value?: { toDate?: () => Date; _seconds?: number; seconds?: number } | null) {
  const date = asDate(value);
  return date ? format(date, 'dd MMM yyyy, HH:mm') : 'N/A';
}

function formatRelative(value?: { toDate?: () => Date; _seconds?: number; seconds?: number } | null) {
  const date = asDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : 'N/A';
}

function statusTone(status?: string) {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('seen')) return 'border-emerald-200 bg-emerald-50';
  if (value.includes('deliver')) return 'border-sky-200 bg-sky-50';
  if (value.includes('fail')) return 'border-rose-200 bg-rose-50';
  if (value.includes('repl')) return 'border-violet-200 bg-violet-50';
  return 'border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))]';
}

function InfoCard({
  label,
  value,
  tone = 'neutral',
  compact = false,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warning';
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        compact ? 'rounded-[20px] border px-4 py-2.5 shadow-[0_10px_20px_rgba(33,51,84,0.05)]' : 'rounded-[22px] border px-4 py-3 shadow-[0_12px_26px_rgba(33,51,84,0.06)]',
        tone === 'positive' && 'border-emerald-200 bg-emerald-50/85',
        tone === 'warning' && 'border-amber-200 bg-amber-50/85',
        tone === 'neutral' && 'border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))]'
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#7c89a1]">{label}</p>
      <p className={cn(compact ? 'mt-1 text-sm font-semibold text-[#172033]' : 'mt-2 text-base font-semibold text-[#172033]')}>{value}</p>
    </div>
  );
}

export function LeadWhatsAppPanel({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<WhatsAppConversation | null>(null);
  const [allMessages, setAllMessages] = useState<WhatsAppMessage[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  async function loadLeadWhatsAppData() {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/leads/${lead.id}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not load WhatsApp data for this lead.');
      }
      setConversation(payload.conversation as WhatsAppConversation | null);
      setAllMessages((payload.messages ?? []) as WhatsAppMessage[]);
      setTemplates((payload.templates ?? []) as WhatsAppTemplate[]);
    } catch (error) {
      toast({
        title: 'WhatsApp data unavailable',
        description: error instanceof Error ? error.message : 'Unexpected load error.',
        variant: 'destructive',
      });
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    void loadLeadWhatsAppData();
  }, [lead.id]);

  const messages = useMemo(
    () => (allMessages ?? []).filter((message) => message.leadId === lead.id),
    [allMessages, lead.id]
  );

  const approvedTemplates = (templates ?? []).filter((template) => template.status === 'approved');
  const outboundCount = messages.filter((message) => message.direction === 'outbound').length;
  const inboundCount = messages.filter((message) => message.direction === 'inbound').length;
  const lastMessage = messages[0] ?? null;

  async function sendFreeFormMessage() {
    if (!messageText.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          conversationId: conversation?.id,
          text: messageText.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not send WhatsApp message.');
      }

      toast({
        title: 'WhatsApp message queued',
        description: 'The free-form message was sent through Infobip.',
      });
      setMessageText('');
      await loadLeadWhatsAppData();
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Unexpected send error.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  async function dispatchTemplateCampaign() {
    if (!selectedTemplateId) return;

    setSending(true);
    try {
      const selectedTemplate = templates?.find((template) => template.id === selectedTemplateId);
      const response = await fetch('/api/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Lead follow-up - ${lead.full_name || lead.company_name || lead.id}`,
          description: `Single-lead WhatsApp template send from lead profile.`,
          templateId: selectedTemplateId,
          leadIds: [lead.id],
          sendMode: 'send_now',
          ownerId: lead.owner_id || 'system',
          timezone: 'Europe/Bucharest',
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not trigger template send.');
      }

      toast({
        title: 'Template campaign sent',
        description: selectedTemplate
          ? `Template "${selectedTemplate.name}" was sent to this lead.`
          : 'Template was sent to this lead.',
      });
      setSelectedTemplateId('');
      await loadLeadWhatsAppData();
    } catch (error) {
      toast({
        title: 'Template send failed',
        description: error instanceof Error ? error.message : 'Unexpected send error.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-[30px] border border-[#d7dcea] bg-[linear-gradient(180deg,_#fcfaf6_0%,_#f7f9fc_100%)] shadow-[0_22px_55px_rgba(36,52,86,0.10)]">
      <CardHeader className="border-b border-[#e3e8f1] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(249,251,255,0.84))]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dce3ef] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7b95] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#66789b]" />
              Conversation Hub
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#111827]">
                <MessageSquareShare className="h-6 w-6 text-[#5f7299]" />
                WhatsApp Communication
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-base leading-6 text-[#55657f]">
                Full thread context for this lead, including session state, approved template actions, outbound follow-up, and the live message timeline.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <InfoCard label="Phone" value={lead.phone || 'No phone on lead'} />
          <InfoCard
            label="Session"
            value={conversation?.sessionWindowClosesAt ? 'Active' : 'Unknown'}
            tone={conversation?.sessionWindowClosesAt ? 'positive' : 'warning'}
          />
          <InfoCard label="Unread" value={String(conversation?.unreadCount ?? 0)} />
          <InfoCard label="Approved Templates" value={String(approvedTemplates.length)} />
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <InfoCard label="Last Inbound" value={formatRelative(conversation?.lastInboundAt)} />
          <InfoCard label="Last Outbound" value={formatRelative(conversation?.lastOutboundAt)} />
          <InfoCard label="Inbound Messages" value={String(inboundCount)} />
          <InfoCard label="Outbound Messages" value={String(outboundCount)} />
        </div>

        <div className="grid items-stretch gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <div className="rounded-[26px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] p-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-[#5f7299]" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d7b95]">Template Dispatch</p>
              </div>
              <div className="mt-4 space-y-3">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-11 rounded-[18px] border-[#d8deea] bg-white text-[#172033]">
                    <SelectValue placeholder="Choose an approved template" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full rounded-[18px] bg-[#536591] text-white hover:bg-[#46567b]"
                  onClick={() => void dispatchTemplateCampaign()}
                  disabled={sending || !selectedTemplateId}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Template
                </Button>
                <p className="text-xs leading-5 text-[#7c89a1]">
                  Best for restarting conversations outside the open session window or sending structured follow-ups.
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] p-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
              <div className="flex items-center gap-2">
                <MessageCircleMore className="h-4 w-4 text-[#5f7299]" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d7b95]">Direct Reply</p>
              </div>
              <Textarea
                rows={5}
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Write a direct WhatsApp reply for this lead."
                className="mt-4 min-h-[140px] rounded-[18px] border-[#d8deea] bg-white text-[#1b2435] shadow-sm"
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="max-w-xs text-xs leading-5 text-[#7c89a1]">
                  Use free-form messages only when the session window is active.
                </p>
                <Button
                  className="rounded-[18px] bg-[#536591] text-white hover:bg-[#46567b]"
                  onClick={() => void sendFreeFormMessage()}
                  disabled={sending || !messageText.trim()}
                >
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] p-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[#5f7299]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d7b95]">Conversation Context</p>
                </div>
                {conversation?.sessionWindowClosesAt ? (
                  <div className="text-xs text-[#7c89a1]">
                    Closes {formatAbsolute(conversation.sessionWindowClosesAt)}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <ShieldAlert className="h-4 w-4" />
                    No active inbound session
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCard label="Conversation Status" value={conversation?.status || 'No messages'} compact />
                <InfoCard label="Latest Message" value={lastMessage ? formatRelative(lastMessage.createdAt) : 'N/A'} compact />
              </div>
              <p className="mt-4 text-sm leading-6 text-[#55657f]">
                {conversation?.lastMessagePreview || 'No last message preview captured yet.'}
              </p>
            </div>
          </div>

          <div className="h-full min-h-[720px] overflow-hidden rounded-[26px] border border-[#d8deea] bg-[linear-gradient(180deg,_#f8fbff,_#f3f7fc)] p-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquareShare className="h-4 w-4 text-[#5f7299]" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d7b95]">Recent Conversation</p>
              </div>
              {conversation?.sessionWindowClosesAt ? (
                <div className="text-xs text-[#7c89a1]">
                  Session closes {formatAbsolute(conversation.sessionWindowClosesAt)}
                </div>
              ) : null}
            </div>

            <ScrollArea className="mt-4 h-[calc(100%-3.75rem)] rounded-[22px] border border-[#dbe2ef] bg-white p-4 shadow-inner">
              <div className="space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[#7c89a1]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#d8deea] bg-[#fafcff] p-6 text-center text-sm text-[#7c89a1]">
                    No WhatsApp messages captured yet. Once outbound sends or inbound webhooks start arriving, the thread will appear here.
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'max-w-[88%] rounded-[22px] border px-4 py-3 shadow-sm',
                        message.direction === 'outbound'
                          ? 'ml-auto border-[#cdd7ea] bg-[linear-gradient(180deg,_#5a6b97,_#4c5d88)] text-white'
                          : 'mr-auto border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] text-[#172033]'
                      )}
                    >
                      <p className="text-sm leading-6">{message.contentPreview}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] opacity-80">
                        <span>{message.messageType}</span>
                        <span>·</span>
                        <span>{message.status}</span>
                        <span>·</span>
                        <span>{formatRelative(message.createdAt)}</span>
                      </div>
                      {message.templateName ? (
                        <p className="mt-2 text-[11px] opacity-70">Template: {message.templateName}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator className="bg-[#e4e9f2]" />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#7c89a1]">
          <span>Conversation ID: {conversation?.id || 'N/A'}</span>
          <span>Lead status: {lead.lead_status}</span>
        </div>
      </CardContent>
    </Card>
  );
}
