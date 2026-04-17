'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, MessageSquareShare, Send, ShieldAlert } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import type { Lead, WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

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

  const approvedTemplates = (templates ?? []).filter((template) => template.status === 'approved');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareShare className="h-5 w-5" />
          WhatsApp Communication
        </CardTitle>
        <CardDescription>
          Review the thread, send approved templates, or send a free-form reply inside the active session window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline">{lead.phone || 'No phone on lead'}</Badge>
          <Badge variant="secondary">
            Session {conversation?.sessionWindowClosesAt ? 'active' : 'unknown'}
          </Badge>
          <Badge variant="secondary">
            Unread {conversation?.unreadCount ?? 0}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border p-4">
            <p className="text-sm font-medium">Send approved template</p>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
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
            <Button onClick={() => void dispatchTemplateCampaign()} disabled={sending || !selectedTemplateId}>
              <Send className="mr-2 h-4 w-4" />
              Send Template
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border p-4">
            <p className="text-sm font-medium">Send free-form message</p>
            <Textarea
              rows={4}
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Write a direct reply to this lead."
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Use free-form messages only when the WhatsApp session window is open.
              </p>
              <Button onClick={() => void sendFreeFormMessage()} disabled={sending || !messageText.trim()}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Recent conversation</p>
            {conversation?.sessionWindowClosesAt ? (
              <p className="text-xs text-muted-foreground">
                Session closes {format(conversation.sessionWindowClosesAt.toDate(), 'MMM d, yyyy HH:mm')}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <ShieldAlert className="h-4 w-4" />
                No inbound session timestamp yet
              </div>
            )}
          </div>

          <ScrollArea className="h-80 rounded-2xl border p-4">
            <div className="space-y-3">
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No WhatsApp messages captured yet. Once outbound sends or inbound webhooks start arriving, the thread
                  will appear here.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      message.direction === 'outbound'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto bg-muted'
                    }`}
                  >
                    <p>{message.contentPreview}</p>
                    <p className="mt-2 text-[11px] opacity-70">
                      {message.messageType} · {message.status}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
