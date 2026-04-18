# Vapi AI Call Campaigns: Complete Implementation Plan

## Goal

Build a production-ready AI outbound calling system in the `Campaigns` page, under the `AI Call Campaigns` tab, using the Vapi API for call initiation and Vapi server events for call lifecycle tracking.

The system should let users:

- create AI call campaigns from selected leads
- choose a Vapi assistant and outbound phone number
- send campaigns immediately or schedule them
- track recipient-level call status in real time
- store outcomes, transcripts, recordings, summaries, and costs
- retry no-answer and failed calls safely
- connect AI call outcomes to lead lifecycle and future WhatsApp/email follow-up

## Current Repo Reality

The current AI Call tab is mock UI in `src/app/(app)/campaigns/page.tsx`.

The repo already has a strong production pattern for communications in the WhatsApp flow:

- server business logic in `src/lib/whatsapp-server.ts`
- API routes in `src/app/api/whatsapp/**`
- dashboard UI in `src/components/whatsapp/whatsapp-dashboard.tsx`
- environment handling in `src/lib/env.server.ts`
- Firestore via `firebase-admin`

The AI call implementation should mirror those patterns closely instead of introducing a parallel architecture style.

## Delivery Strategy

Implement in phases, but with the data model designed for the full system from day one.

### Phase 1

- Vapi config/env
- AI call Firestore types
- local Vapi client
- local AI call server module
- campaign creation
- immediate dispatch
- scheduled dispatch
- Vapi webhook ingestion
- dashboard list + metrics
- campaign recipients and outcomes

### Phase 2

- richer assistant management
- retry automation
- pause/resume workflows
- campaign detail page
- transcript and recording review UX
- lead-level AI call panel

### Phase 3

- cross-channel orchestration
- AI call result-driven automations
- assistant versioning and A/B testing
- deeper compliance controls

## Functional Scope

### In Scope

- outbound phone campaigns using Vapi `/call`
- campaign creation from leads in Firestore
- one-call-per-recipient orchestration for control and personalization
- scheduled calls via Vapi `schedulePlan` and local scheduled jobs
- webhook processing for:
  - status updates
  - end-of-call reports
  - transcript storage
  - recording URL capture
  - outcome capture
- campaign dashboard in the AI Call tab
- recipient-level metrics and error handling

### Out of Scope for First Pass

- full Vapi assistant builder UI
- full Vapi phone-number onboarding/import UI
- deep analytics dashboards
- multi-tenant account management
- advanced live call control

## Architecture

### Core Principle

Keep AI calls as a dedicated communication subsystem, parallel to WhatsApp, not forced into a generic abstraction too early.

### Main Modules

- `src/lib/vapi.ts`
  - low-level Vapi HTTP client
  - create/list/get calls
  - optional assistant/phone number listing

- `src/lib/ai-call-server.ts`
  - campaign creation
  - audience validation
  - dispatch logic
  - webhook ingestion
  - summary/dashboard loaders
  - local assistant profile management

- `src/app/api/ai-calls/**`
  - route layer

- `src/components/ai-calls/**`
  - dashboard and campaign UI

- `src/hooks/use-ai-call-dashboard.ts`
  - client fetch hook

## Firestore Data Model

### Collection: `ai_call_campaigns`

Purpose: one document per AI call campaign.

Recommended fields:

- `name`
- `description`
- `status`: `draft | scheduled | active | paused | completed | failed`
- `assistantRefId`
- `assistantId`
- `phoneNumberId`
- `sendMode`: `manual | send_now | scheduled`
- `scheduledAt`
- `timezone`
- `ownerId`
- `segmentSnapshot`
- `leadIds`
- `leadCount`
- `queuedCount`
- `ringingCount`
- `inProgressCount`
- `answeredCount`
- `completedCount`
- `failedCount`
- `voicemailCount`
- `interestedCount`
- `notInterestedCount`
- `callbackRequestedCount`
- `noAnswerCount`
- `busyCount`
- `lastDispatchedAt`
- `lastWebhookAt`
- `createdAt`
- `updatedAt`

### Collection: `ai_call_campaign_recipients`

Purpose: one document per lead enrolled in a campaign.

Recommended fields:

- `campaignId`
- `leadId`
- `phone`
- `status`: `queued | scheduled | ringing | in_progress | ended | failed | skipped`
- `outcome`: `interested | not_interested | callback_requested | voicemail | no_answer | busy | failed | unknown`
- `assistantId`
- `phoneNumberId`
- `vapiCallId`
- `attemptCount`
- `failureReason`
- `queuedAt`
- `scheduledAt`
- `startedAt`
- `answeredAt`
- `endedAt`
- `lastEventAt`
- `durationSeconds`
- `endedReason`
- `summary`
- `transcript`
- `messages`
- `recordingUrl`
- `stereoRecordingUrl`
- `cost`
- `customer`
- `metadata`

### Collection: `ai_call_assistants`

Purpose: local references to reusable Vapi assistants and outbound phone configuration.

Recommended fields:

- `name`
- `description`
- `status`: `active | paused | draft`
- `assistantId`
- `phoneNumberId`
- `firstMessage`
- `objective`
- `language`
- `voice`
- `serverUrl`
- `metadata`
- `createdAt`
- `updatedAt`
- `ownerId`

### Collection: `ai_call_events`

Purpose: append-only raw event log from Vapi for debugging/audit.

Recommended fields:

- `type`
- `campaignId`
- `recipientId`
- `leadId`
- `vapiCallId`
- `eventAt`
- `payload`
- `source`

### Collection: `ai_call_scheduled_jobs`

Purpose: local scheduler support for dispatch and retry.

Recommended fields:

- `jobType`: `campaign_dispatch | recipient_retry`
- `status`: `pending | processing | completed | failed | cancelled`
- `campaignId`
- `recipientId`
- `leadId`
- `runAt`
- `timezone`
- `payload`
- `attemptCount`
- `lastAttemptAt`
- `error`

## Type System

Extend `src/lib/types.ts` with:

- `AICallCampaignStatus`
- `AICallRecipientStatus`
- `AICallOutcome`
- `AICallAssistantStatus`
- `AICallJobStatus`
- `AICallCampaign`
- `AICallCampaignRecipient`
- `AICallAssistant`
- `AICallEvent`
- `AICallScheduledJob`

## Environment Variables

Add to `src/lib/env.server.ts` and `.env.example`:

- `VAPI_API_KEY`
- `VAPI_BASE_URL` defaulting to `https://api.vapi.ai`
- `VAPI_WEBHOOK_SECRET`
- `VAPI_DEFAULT_ASSISTANT_ID`
- `VAPI_DEFAULT_PHONE_NUMBER_ID`

Health checks should expose whether:

- Vapi API key exists
- default assistant exists
- default phone number exists
- webhook activity is present

## Vapi Integration

### Call Creation

Use Vapi `POST /call`.

For campaign recipients, prefer one API call per recipient because it allows:

- recipient-specific metadata
- simple retry logic
- easier webhook mapping
- future personalization

Payload shape should include:

- `assistantId`
- `phoneNumberId`
- `customer.number`
- `customer.name` when available
- `name` for internal traceability
- `metadata` with:
  - `campaignId`
  - `recipientId`
  - `leadId`
  - `ownerId`
- `schedulePlan.earliestAt` when scheduled

### Why Not Batch First

Vapi supports `customers`, but single-recipient dispatch is safer initially because:

- it simplifies transcript/result mapping
- makes retries deterministic
- lets us inject per-lead metadata
- gives better observability per failure

## Server Logic

### `createAICallCampaign`

Responsibilities:

- validate payload with `zod`
- load selected assistant profile or env defaults
- load selected leads
- normalize and validate phone numbers
- exclude leads without phones
- create campaign document
- create recipient documents
- create scheduled job if needed
- optionally dispatch immediately

### `dispatchAICallCampaign`

Responsibilities:

- load campaign
- load queued recipients
- create Vapi call per eligible recipient
- persist `vapiCallId`
- update campaign counters
- track failures safely

### `dispatchDueAICallJobs`

Responsibilities:

- load pending local jobs due now
- dispatch campaign or retry recipient
- update job status and attempt count

### `processVapiWebhook`

Responsibilities:

- accept server events from Vapi
- store raw event in `ai_call_events`
- update recipient status on `status-update`
- update transcript/recording/summary on `end-of-call-report`
- recalculate aggregate campaign counters
- write lead activities

## Outcome Mapping

### Technical Status vs Business Outcome

We need both:

- technical status: ringing, in-progress, ended, failed
- business outcome: interested, callback requested, voicemail, etc.

### First-Pass Outcome Sources

Outcome should be resolved from:

1. explicit metadata on the call if present
2. end-of-call report fields
3. transcript/message analysis heuristics
4. fallback to `unknown`

### Recommended Future Improvement

Configure the Vapi assistant to call a tool like `capture_call_outcome` near the end of successful calls, so business outcomes become explicit instead of inferred.

## Lead and Activity Integration

On meaningful call completion:

- update `leads.last_contact_at`
- create `activities` entry
- optionally update `lead_status`
- later create `tasks` for callback/manual follow-up

Suggested activity examples:

- `AI call connected`
- `AI call ended with voicemail`
- `AI call requested callback`
- `AI call marked lead interested`

## API Surface

### Routes

- `GET /api/ai-calls/dashboard`
- `GET /api/ai-calls/campaigns`
- `POST /api/ai-calls/campaigns`
- `GET /api/ai-calls/campaigns/[id]`
- `POST /api/ai-calls/campaigns/[id]/dispatch`
- `POST /api/ai-calls/assistants`
- `GET /api/ai-calls/assistants`
- `POST /api/ai-calls/webhook`
- `POST /api/ai-calls/dispatch-due`

### Response Rules

- mirror the WhatsApp route style
- return friendly, UI-ready JSON
- include clear error messages

## UI Plan

### Replace Mock AI Tab

Replace the static `CampaignsGrid` for `ai_call` with a live dashboard component.

### Dashboard Sections

- health strip
- top metrics
- assistant profiles
- campaign list
- recent call outcomes
- scheduled jobs
- create campaign dialog

### Create Campaign Dialog

Fields:

- campaign name
- description
- assistant profile
- send mode
- schedule/timezone
- audience filters
- selected leads

### Campaign Cards

Each card should show:

- status
- assistant used
- phone number used
- lead count
- queued/in-progress/completed/failed
- answer and interest indicators
- last dispatch time
- actions: dispatch, refresh

## Campaign Detail Page

Upgrade `src/app/(app)/campaigns/[id]/page.tsx` later to show:

- summary
- recipient table
- filters
- transcript preview
- recording links
- retry controls
- outcome distribution

## Compliance and Guardrails

Must include:

- lead-level do-not-call support
- consent-aware dispatch checks
- quiet hours by timezone
- rate limiting per lead
- opt-out handling
- retry caps

If those fields do not exist yet on `Lead`, implementation should still leave extension points for them.

## Observability

Track:

- last webhook received time
- campaign failure counts
- per-recipient failure reasons
- raw Vapi payloads for debugging
- basic campaign health on dashboard

## Testing and Verification

### Required Checks

- typecheck
- route compile sanity
- dashboard render sanity
- payload validation errors

### Manual Scenarios

- create draft campaign
- create immediate campaign
- create scheduled campaign
- simulate status-update webhook
- simulate end-of-call-report webhook
- ensure counters update correctly

## Concrete Build Order

1. Extend types
2. Extend env parsing and `.env.example`
3. Add `src/lib/vapi.ts`
4. Add `src/lib/ai-call-server.ts`
5. Add AI call API routes
6. Add `use-ai-call-dashboard`
7. Add `AICallDashboard`
8. Swap mock AI tab to real dashboard
9. Typecheck
10. Iterate on any route/UI compile issues

## Notes for This Repo

- follow the same server-only + Firestore Admin approach already used in WhatsApp
- keep the AI call implementation isolated under `ai_call_*` collections
- do not replace the WhatsApp dashboard patterns; reuse them
- prefer small composable helpers over one giant route file
- keep metadata rich on outbound calls so webhook reconciliation stays easy

## Phase 2 Execution Plan

### Campaign Detail Page

Build a real campaign detail page in `src/app/(app)/campaigns/[id]/page.tsx` that:

- loads the campaign and recipients through `/api/ai-calls/campaigns/[id]`
- shows summary metrics and retry policy
- renders recipient-level rows with:
  - lead link
  - phone
  - current status
  - business outcome
  - attempt count
  - duration
  - summary
  - transcript preview
  - recording link
- supports manual recipient retry

### Retry Automation and Pause/Resume

Extend the campaign model and create/update flow with:

- `retryEnabled`
- `retryDelayMinutes`
- `maxAttempts`
- `retryOutcomes`

Behavior:

- pause sets campaign status to `paused` and cancels pending scheduled jobs for that campaign
- resume sets campaign back to `scheduled` or `active` and recreates dispatch/retry jobs when needed
- retry automation should create `recipient_retry` jobs when a completed call lands in a retry-eligible outcome and attempts remain
- manual retry endpoint should clear a failed/ended recipient back to `queued` and dispatch or schedule it

### Smarter Outcome Mapping

Support `tool-calls` webhook events so Vapi assistants can call custom functions such as:

- `capture_call_outcome`
- `request_callback`
- `mark_interested`
- `mark_do_not_call`
- `send_follow_up`

Server behavior:

- accept `tool-calls`
- parse `toolCallList`
- apply side effects to recipient/lead/campaign
- respond with `results` in the response body for each tool call

Fallback behavior:

- if no tool call exists, keep transcript-based heuristics
- prefer explicit tool call results over heuristic inference

### Webhook Validation

Implement a validation strategy that supports the current official Vapi guidance:

- Bearer token auth via `Authorization`
- legacy `X-Vapi-Secret`
- optional HMAC signature validation using `X-Vapi-Signature`

Important note:

- the exact scheme depends on how the user configured server authentication inside their Vapi account
- until the account-specific credential is confirmed, implementation should support all three and accept whichever matches the configured env values

### Deep Lead and Task Integration

On final outcomes:

- update `lead_status` more aggressively:
  - `interested` => `qualified`
  - `callback_requested` => `contacted`
  - `not_interested` => `closed_lost`
- update `outreach_status`:
  - active campaign => `in_sequence`
  - meaningful completion => `completed`
- create tasks automatically:
  - `callback_requested` => `call`
  - `interested` => `follow_up`
  - `voicemail/no_answer/busy` after final retry exhaustion => `follow_up`
- create richer activities with transcript/outcome context

### Cross-Channel Follow-Up Scaffolding

Implement server-side scaffolding, not full autonomous sends:

- store suggested next-step channel in recipient metadata
- create an activity entry recommending:
  - WhatsApp follow-up after `interested`
  - email follow-up after `callback_requested`
  - manual human review after repeated failures
- keep this compatible with future WhatsApp automation trigger creation
