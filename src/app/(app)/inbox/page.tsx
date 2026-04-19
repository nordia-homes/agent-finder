'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  Bot,
  Clock3,
  Inbox,
  Mail,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Reply,
  Search,
  Send,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { useWhatsAppDashboard } from '@/hooks/use-whatsapp-dashboard';
import { useAICallDashboard } from '@/hooks/use-ai-call-dashboard';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/types';

type TimestampLike = { _seconds?: number; seconds?: number; toDate?: () => Date } | null | undefined;

type WhatsAppDashboardPayload = {
  conversations: Array<{
    id: string;
    leadId: string;
    phone?: string;
    unreadCount?: number;
    lastInboundAt?: TimestampLike;
    lastOutboundAt?: TimestampLike;
    lastMessagePreview?: string;
    sessionWindowClosesAt?: TimestampLike;
    status?: string;
  }>;
};

type AICallDashboardPayload = {
  recipients: Array<{
    id: string;
    leadId: string;
    phone?: string;
    outcome?: string;
    status?: string;
    summary?: string | null;
    nextStepChannel?: 'whatsapp' | 'email' | 'manual' | null;
    lastEventAt?: TimestampLike;
  }>;
};

type InboxItem = {
  id: string;
  leadId: string;
  sourceId?: string;
  leadName: string;
  companyName?: string;
  phone?: string;
  city?: string;
  channel: 'whatsapp' | 'ai_call' | 'email';
  bucket: 'needs_reply' | 'waiting' | 'callback_requested' | 'recent';
  statusLabel: string;
  preview: string;
  updatedAt: TimestampLike;
};

function asDate(value: TimestampLike) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const seconds = value.seconds ?? value._seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

function formatRelative(value: TimestampLike) {
  const date = asDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now';
}

function getLeadDisplayName(lead?: Lead) {
  return lead?.full_name || lead?.company_name || 'Unknown lead';
}

function channelIcon(channel: InboxItem['channel']) {
  if (channel === 'whatsapp') return MessageSquare;
  if (channel === 'ai_call') return PhoneCall;
  return Mail;
}

function channelLabel(channel: InboxItem['channel']) {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'ai_call') return 'AI Call';
  return 'Email';
}

function bucketLabel(bucket: InboxItem['bucket']) {
  if (bucket === 'needs_reply') return 'Needs reply';
  if (bucket === 'waiting') return 'Waiting on lead';
  if (bucket === 'callback_requested') return 'Callback requested';
  return 'Recent touchpoint';
}

export default function InboxPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const { data: whatsappData, loading: whatsappLoading, refresh: refreshWhatsApp } =
    useWhatsAppDashboard<WhatsAppDashboardPayload>();
  const { data: aiCallData, loading: aiCallLoading, refresh: refreshAICalls } =
    useAICallDashboard<AICallDashboardPayload>();
  const [query, setQuery] = useState('');
  const [activeBucket, setActiveBucket] = useState<InboxItem['bucket'] | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const leadMap = useMemo(
    () => new Map((leads ?? []).map((lead) => [lead.id, lead])),
    [leads]
  );

  const inboxItems = useMemo(() => {
    const items: InboxItem[] = [];

    for (const conversation of whatsappData?.conversations ?? []) {
      const lead = leadMap.get(conversation.leadId);
      if (!lead || lead.archived_at || lead.lead_status === 'merged') continue;

      const lastInbound = asDate(conversation.lastInboundAt)?.getTime() ?? 0;
      const lastOutbound = asDate(conversation.lastOutboundAt)?.getTime() ?? 0;
      const unreadCount = Number(conversation.unreadCount ?? 0);
      const bucket: InboxItem['bucket'] =
        unreadCount > 0 || lastInbound > lastOutbound
          ? 'needs_reply'
          : lastOutbound > 0
            ? 'waiting'
            : 'recent';

      items.push({
        id: `wa-${conversation.id}`,
        leadId: conversation.leadId,
        sourceId: conversation.id,
        leadName: getLeadDisplayName(lead),
        companyName: lead.company_name,
        phone: conversation.phone || lead.phone,
        city: lead.city,
        channel: 'whatsapp',
        bucket,
        statusLabel: unreadCount > 0 ? `${unreadCount} unread` : conversation.status || 'Active',
        preview: conversation.lastMessagePreview || 'Open the thread to review the latest WhatsApp exchange.',
        updatedAt: conversation.lastInboundAt || conversation.lastOutboundAt,
      });
    }

    for (const recipient of aiCallData?.recipients ?? []) {
      const lead = leadMap.get(recipient.leadId);
      if (!lead || lead.archived_at || lead.lead_status === 'merged') continue;
      if (!['callback_requested', 'interested'].includes(String(recipient.outcome ?? ''))) continue;

      items.push({
        id: `ai-${recipient.id}`,
        leadId: recipient.leadId,
        sourceId: recipient.id,
        leadName: getLeadDisplayName(lead),
        companyName: lead.company_name,
        phone: recipient.phone || lead.phone,
        city: lead.city,
        channel: 'ai_call',
        bucket: recipient.outcome === 'callback_requested' ? 'callback_requested' : 'recent',
        statusLabel:
          recipient.outcome === 'callback_requested' ? 'Call back requested' : 'Interested outcome',
        preview:
          recipient.summary ||
          (recipient.outcome === 'callback_requested'
            ? 'Lead asked for a follow-up call from a human.'
            : 'AI call marked this lead as interested.'),
        updatedAt: recipient.lastEventAt,
      });
    }

    return items.sort((a, b) => {
      const aTime = asDate(a.updatedAt)?.getTime() ?? 0;
      const bTime = asDate(b.updatedAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [aiCallData?.recipients, leadMap, whatsappData?.conversations]);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredItems = useMemo(() => {
    return inboxItems.filter((item) => {
      const matchesBucket = activeBucket === 'all' || item.bucket === activeBucket;
      const haystack = [
        item.leadName,
        item.companyName,
        item.phone,
        item.city,
        item.preview,
        item.statusLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
      return matchesBucket && matchesQuery;
    });
  }, [activeBucket, deferredQuery, inboxItems]);

  const counts = useMemo(() => {
    return {
      all: inboxItems.length,
      needs_reply: inboxItems.filter((item) => item.bucket === 'needs_reply').length,
      waiting: inboxItems.filter((item) => item.bucket === 'waiting').length,
      callback_requested: inboxItems.filter((item) => item.bucket === 'callback_requested').length,
      recent: inboxItems.filter((item) => item.bucket === 'recent').length,
    };
  }, [inboxItems]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedItemId(null);
      return;
    }

    const selectedStillVisible = filteredItems.some((item) => item.id === selectedItemId);
    if (!selectedStillVisible) {
      setSelectedItemId(filteredItems[0].id);
    }
  }, [filteredItems, selectedItemId]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null,
    [filteredItems, selectedItemId]
  );
  const selectedLead = selectedItem ? leadMap.get(selectedItem.leadId) : null;

  useEffect(() => {
    setReplyDraft('');
  }, [selectedItemId]);

  const isLoading = userLoading || leadsLoading || whatsappLoading || aiCallLoading;

  const handleSendWhatsAppReply = async () => {
    if (!selectedItem || selectedItem.channel !== 'whatsapp' || !replyDraft.trim()) return;

    setIsSendingReply(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedItem.leadId,
          conversationId: selectedItem.sourceId,
          text: replyDraft.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not send WhatsApp message.');
      }

      toast({
        title: 'Reply queued',
        description: `Your WhatsApp reply to ${selectedItem.leadName} was queued successfully.`,
      });
      setReplyDraft('');
      await refreshWhatsApp();
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Unexpected WhatsApp send error.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(241,246,253,0.98)_62%,_rgba(248,251,255,0.98))] px-8 py-7 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deeb] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61739a] shadow-[0_8px_20px_rgba(33,51,84,0.06)]">
                <Sparkles className="h-3.5 w-3.5" />
                Conversational inbox
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#152033]">Inbox</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#667691]">
                  Stay on top of WhatsApp replies, AI call callbacks, and every conversation thread that needs a follow-up.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-fit rounded-full border-[#d6e0ed] bg-white/90 px-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]"
              onClick={() => {
                void refreshWhatsApp();
                void refreshAICalls();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh inbox
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-[26px] border-[#dbe3ef] bg-[linear-gradient(135deg,_rgba(244,248,253,0.98),_rgba(232,240,251,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Open threads</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : counts.all}</p>
                <p className="mt-2 text-sm text-slate-500">All active conversation items currently surfaced in the inbox.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[26px] border-[#dce5ef] bg-[linear-gradient(135deg,_rgba(245,251,247,0.98),_rgba(233,246,238,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Needs reply</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : counts.needs_reply}</p>
                <p className="mt-2 text-sm text-slate-500">Threads where inbound activity arrived and a human response is likely needed.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[26px] border-[#e1e0ef] bg-[linear-gradient(135deg,_rgba(248,246,252,0.98),_rgba(238,235,248,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Waiting on lead</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : counts.waiting}</p>
                <p className="mt-2 text-sm text-slate-500">Recent outbound touches that have not received a reply yet.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[26px] border-[#dbe2ef] bg-[linear-gradient(135deg,_rgba(244,247,253,0.98),_rgba(227,236,250,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Callback requested</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : counts.callback_requested}</p>
                <p className="mt-2 text-sm text-slate-500">AI calls that ended with a clear request for human follow-up.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] p-6 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7083a8]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by lead, company, phone, city, or conversation preview..."
                className="h-14 rounded-[22px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.96),_rgba(246,249,255,0.96))] pl-12 pr-4 text-sm text-[#152033] shadow-[0_14px_30px_rgba(33,51,84,0.07)] placeholder:text-[#7d8aa3]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'needs_reply', 'waiting', 'callback_requested', 'recent'] as const).map((bucket) => (
                <button
                  key={bucket}
                  type="button"
                  onClick={() => setActiveBucket(bucket)}
                  className={cn(
                    'rounded-full border px-4 py-2.5 text-sm font-medium transition-all',
                    activeBucket === bucket
                      ? 'border-[#9db2d4] bg-[#152033] text-white shadow-[0_12px_24px_rgba(21,32,51,0.18)]'
                      : 'border-[#d8e1ee] bg-white/90 text-[#526684] hover:border-[#b9c9e1] hover:text-[#1d2d49]'
                  )}
                >
                  {bucket === 'all' ? 'All items' : bucketLabel(bucket)} ({counts[bucket]})
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.78fr)]">
            {!isLoading && filteredItems.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-[#d8deea] bg-[#fafcff] p-10 text-center xl:col-span-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3fb] text-[#5f7399]">
                  <Inbox className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">Inbox is clear</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667691]">
                  No conversations match this view right now. Try another filter or refresh the inbox.
                </p>
              </div>
            ) : null}

            {filteredItems.length > 0 ? (
              <>
                <div className="space-y-4">
                  {filteredItems.map((item) => {
                    const Icon = channelIcon(item.channel);
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className="block w-full text-left"
                      >
                        <Card
                          className={cn(
                            'rounded-[28px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_44px_rgba(33,51,84,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c4d5eb] hover:shadow-[0_24px_56px_rgba(33,51,84,0.10)]',
                            isSelected && 'border-[#9db2d4] shadow-[0_24px_56px_rgba(33,51,84,0.12)] ring-2 ring-[#dbe6f5]'
                          )}
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3fb] text-[#5f7399]">
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-xl font-semibold tracking-[-0.04em] text-[#152033]">
                                        {item.leadName}
                                      </h3>
                                      <Badge variant="outline" className="rounded-full border-[#d8e1ee] bg-white/90 text-[#526684]">
                                        {channelLabel(item.channel)}
                                      </Badge>
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          'rounded-full border px-3 py-1 text-xs font-medium',
                                          item.bucket === 'needs_reply' && 'border-amber-200 bg-amber-50 text-amber-900',
                                          item.bucket === 'waiting' && 'border-sky-200 bg-sky-50 text-sky-800',
                                          item.bucket === 'callback_requested' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                                          item.bucket === 'recent' && 'border-slate-200 bg-slate-50 text-slate-700'
                                        )}
                                      >
                                        {bucketLabel(item.bucket)}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-[#667691]">
                                      {item.companyName || item.phone || 'Conversation thread'}
                                    </p>
                                  </div>
                                </div>

                                <p className="mt-4 line-clamp-2 max-w-4xl text-base leading-7 text-[#40516f]">
                                  {item.preview}
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#6a7993]">
                                  {item.city ? <span>{item.city}</span> : null}
                                  {item.phone ? <span>{item.phone}</span> : null}
                                  <span>{item.statusLabel}</span>
                                  <span>{formatRelative(item.updatedAt)}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}
                </div>

                <div className="xl:sticky xl:top-6 xl:self-start">
                  {selectedItem ? (
                    <Card className="rounded-[30px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,249,253,0.98))] shadow-[0_20px_48px_rgba(33,51,84,0.08)]">
                      <CardContent className="p-6">
                        <div className="space-y-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e1ee] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#61739a]">
                                {selectedItem.channel === 'whatsapp' ? <MessageSquare className="h-3.5 w-3.5" /> : selectedItem.channel === 'ai_call' ? <Bot className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                                {channelLabel(selectedItem.channel)}
                              </div>
                              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">
                                {selectedItem.leadName}
                              </h2>
                              <p className="mt-1 text-sm text-[#667691]">
                                {selectedItem.companyName || selectedItem.phone || 'Conversation thread'}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium',
                                selectedItem.bucket === 'needs_reply' && 'border-amber-200 bg-amber-50 text-amber-900',
                                selectedItem.bucket === 'waiting' && 'border-sky-200 bg-sky-50 text-sky-800',
                                selectedItem.bucket === 'callback_requested' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                                selectedItem.bucket === 'recent' && 'border-slate-200 bg-slate-50 text-slate-700'
                              )}
                            >
                              {bucketLabel(selectedItem.bucket)}
                            </Badge>
                          </div>

                          <div className="rounded-[24px] border border-[#dbe4f0] bg-[linear-gradient(145deg,_rgba(244,248,254,0.96),_rgba(255,255,255,0.9))] p-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8aa3]">Preview</p>
                            <p className="mt-3 text-base leading-7 text-[#40516f]">
                              {selectedItem.preview}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Status</p>
                              <p className="mt-2 text-sm font-semibold text-[#152033]">{selectedItem.statusLabel}</p>
                            </div>
                            <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Last activity</p>
                              <p className="mt-2 text-sm font-semibold text-[#152033]">{formatRelative(selectedItem.updatedAt)}</p>
                            </div>
                            <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Phone</p>
                              <p className="mt-2 text-sm font-semibold text-[#152033]">{selectedItem.phone || 'No phone available'}</p>
                            </div>
                            <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">City</p>
                              <p className="mt-2 text-sm font-semibold text-[#152033]">{selectedItem.city || 'Unknown city'}</p>
                            </div>
                          </div>

                          {selectedLead ? (
                            <div className="rounded-[24px] border border-[#dbe4f0] bg-[#f8fbff] p-5">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8aa3]">Lead context</p>
                              <div className="mt-3 space-y-2 text-sm text-[#536684]">
                                <p>Classification: <span className="font-semibold text-[#152033]">{selectedLead.classification.replace('_', ' ')}</span></p>
                                <p>Independent score: <span className="font-semibold text-[#152033]">{selectedLead.independent_score}</span></p>
                                <p>Lead status: <span className="font-semibold text-[#152033]">{selectedLead.lead_status}</span></p>
                              </div>
                            </div>
                          ) : null}

                          {selectedItem.channel === 'whatsapp' ? (
                            <div className="rounded-[24px] border border-[#dbe4f0] bg-[linear-gradient(145deg,_rgba(244,248,254,0.96),_rgba(255,255,255,0.92))] p-5">
                              <div className="flex items-center gap-2 text-[#5f7399]">
                                <MessageSquare className="h-4 w-4" />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8aa3]">Quick reply</p>
                              </div>
                              <Textarea
                                value={replyDraft}
                                onChange={(event) => setReplyDraft(event.target.value)}
                                placeholder={`Write a fast WhatsApp reply to ${selectedItem.leadName}...`}
                                className="mt-4 min-h-[130px] rounded-[18px] border-[#d8deea] bg-white text-[#1b2435]"
                              />
                              <div className="mt-4 flex items-center justify-between gap-3">
                                <p className="max-w-xs text-xs leading-5 text-[#7c89a1]">
                                  Best for quick human follow-up directly from the inbox preview.
                                </p>
                                <Button
                                  type="button"
                                  className="rounded-full bg-[#152033] text-white hover:bg-[#101827]"
                                  onClick={() => void handleSendWhatsAppReply()}
                                  disabled={isSendingReply || !replyDraft.trim()}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  {isSendingReply ? 'Sending...' : 'Send reply'}
                                </Button>
                              </div>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-3">
                            <Button asChild className="rounded-full bg-[#152033] text-white hover:bg-[#101827]">
                              <Link href={`/leads/${selectedItem.leadId}`}>
                                Open lead
                                <ArrowUpRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                            {selectedItem.phone ? (
                              <Button asChild variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90">
                                <a href={`tel:${selectedItem.phone}`}>
                                  Call
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-[28px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-[#5f7399]">
              <MessageSquare className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">WhatsApp</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#667691]">
              Best for active replies, unread messages, and session-window follow-up.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-[#5f7399]">
              <Bot className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">AI Call Follow-up</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#667691]">
              Surfaces interested outcomes and callback requests that deserve a human next step.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-[#5f7399]">
              <Reply className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">Email</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#667691]">
              Email follow-up can slot into this inbox next, once threaded email events are connected in the workspace.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
