'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, PhoneCall, PlusCircle } from 'lucide-react';

import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type TimestampLike = { _seconds?: number; seconds?: number; toDate?: () => Date } | null | undefined;
type PanelPayload = {
  recipients: Array<Record<string, any>>;
  campaigns: Record<string, Record<string, any>>;
  assistants: Array<Record<string, any>>;
};

function asDate(value: TimestampLike) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const seconds = value.seconds ?? value._seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

function formatRelative(value: TimestampLike) {
  const date = asDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : 'N/A';
}

export function LeadAICallPanel({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const [data, setData] = useState<PanelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    assistantRefId: '',
  });

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-calls/leads/${lead.id}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not load AI call history for this lead.');
      }
      setData(payload as PanelPayload);
    } catch (error) {
      toast({
        title: 'AI call data unavailable',
        description: error instanceof Error ? error.message : 'Unexpected load error.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [lead.id]);

  const sortedRecipients = useMemo(
    () => [...(data?.recipients ?? [])].sort((a, b) => (b.lastEventAt?._seconds ?? 0) - (a.lastEventAt?._seconds ?? 0)),
    [data]
  );

  async function handleCreateSingleLeadCampaign() {
    setSubmitting(true);
    try {
      const response = await fetch('/api/ai-calls/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || `Lead AI call - ${lead.full_name || lead.company_name || lead.id}`,
          description: form.description || 'Single-lead AI call campaign created from the lead profile.',
          assistantRefId: form.assistantRefId,
          leadIds: [lead.id],
          sendMode: 'send_now',
          timezone: 'Europe/Bucharest',
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not start a single-lead AI call.');
      }

      setDialogOpen(false);
      setForm({ name: '', description: '', assistantRefId: '' });
      toast({ title: 'AI call started', description: 'A single-lead AI call campaign was created and dispatched.' });
      await loadData();
    } catch (error) {
      toast({
        title: 'AI call failed',
        description: error instanceof Error ? error.message : 'Unexpected start error.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              AI Call History
            </CardTitle>
            <CardDescription>Review recent call outcomes for this lead or launch a focused AI call.</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New AI Call
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start AI Call For This Lead</DialogTitle>
                <DialogDescription>Create and dispatch a one-lead AI call campaign from the lead profile.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Assistant Profile</Label>
                  <Select value={form.assistantRefId} onValueChange={(value) => setForm((current) => ({ ...current, assistantRefId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a saved AI assistant" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.assistants ?? []).map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id}>
                          {assistant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => void handleCreateSingleLeadCampaign()} disabled={submitting || !form.assistantRefId}>
                  Start Call
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading AI call history...
          </div>
        ) : sortedRecipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI calls have been captured for this lead yet.</p>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {sortedRecipients.map((recipient) => {
                const campaign = data?.campaigns?.[String(recipient.campaignId ?? '')];
                return (
                  <div key={recipient.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{campaign?.name || 'AI Call Campaign'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {String(recipient.outcome || 'unknown').replace(/_/g, ' ')} · {recipient.phone}
                        </p>
                      </div>
                      <Badge variant="outline">{recipient.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{recipient.summary || 'No summary yet.'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last event {formatRelative(recipient.lastEventAt)} {recipient.nextStepChannel ? `· next ${recipient.nextStepChannel}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
