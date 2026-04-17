# WhatsApp + Infobip Implementation Plan

## Goal

Build a production-oriented WhatsApp workspace inside the existing `Campaigns` area that lets the team:

- Create WhatsApp templates and submit them for Infobip/WhatsApp approval
- Track template approval status and sync updates from Infobip
- Build campaigns from approved templates and existing leads
- Schedule one-time sends
- Configure recurring and event-driven automations
- Track outbound delivery, seen, reply, and failure events
- View lead-level WhatsApp conversation history and send follow-up messages

## Product Scope

### In scope

- WhatsApp template manager
- WhatsApp campaigns dashboard
- Lead audience selection from Firestore `leads`
- One-time scheduled campaigns
- Rule-based automations stored in Firestore
- Infobip API integration for template management and outbound sends
- Webhook ingestion for inbound messages and delivery status updates
- Lead-level conversation panel in the lead detail page
- Firestore-backed analytics cards and campaign metrics

### Out of scope for this delivery

- Full permissions/rules hardening for Firestore and server endpoints
- Distributed worker queues beyond a scheduler-driven dispatcher
- Rich media upload workflows to external storage
- Multi-tenant separation
- Full Infobip product parity for Broadcast/Moments/Conversations UI

## Architecture

### Core principle

Use Infobip as the messaging provider and approval authority, while keeping application state, campaign state, scheduling, and analytics inside Firestore.

### Layers

1. UI layer in Next.js client components
2. Server routes in Next App Router for Infobip integration
3. Firestore collections for internal state and reporting
4. Scheduled dispatcher for due jobs and automations
5. Webhook endpoints for inbound and delivery lifecycle events

## Data Model

### `whatsapp_templates`

- `name`
- `language`
- `category`
- `status`
- `sender`
- `headerType`
- `headerText`
- `bodyText`
- `footerText`
- `buttons`
- `variables`
- `structure`
- `infobipTemplateId`
- `rejectionReason`
- `lastSyncedAt`
- `createdAt`
- `updatedAt`
- `createdBy`

### `whatsapp_campaigns`

- `name`
- `description`
- `templateId`
- `templateName`
- `templateLanguage`
- `sender`
- `status`
- `sendMode`
- `scheduledAt`
- `timezone`
- `segmentSnapshot`
- `leadIds`
- `leadCount`
- `queuedCount`
- `sentCount`
- `deliveredCount`
- `seenCount`
- `replyCount`
- `failedCount`
- `lastDispatchedAt`
- `createdAt`
- `updatedAt`
- `ownerId`

### `whatsapp_campaign_recipients`

- `campaignId`
- `leadId`
- `phone`
- `templateParams`
- `status`
- `infobipMessageId`
- `failureReason`
- `attemptCount`
- `queuedAt`
- `sentAt`
- `deliveredAt`
- `seenAt`
- `repliedAt`
- `lastEventAt`

### `whatsapp_messages`

- `leadId`
- `campaignId`
- `conversationId`
- `direction`
- `messageType`
- `templateId`
- `templateName`
- `contentPreview`
- `rawPayload`
- `status`
- `infobipMessageId`
- `inReplyTo`
- `sentAt`
- `deliveredAt`
- `seenAt`
- `createdAt`

### `whatsapp_conversations`

- `leadId`
- `phone`
- `lastInboundAt`
- `lastOutboundAt`
- `lastMessagePreview`
- `sessionWindowClosesAt`
- `unreadCount`
- `status`

### `whatsapp_events`

- `type`
- `leadId`
- `campaignId`
- `messageId`
- `eventAt`
- `payload`
- `source`

### `whatsapp_automations`

- `name`
- `description`
- `status`
- `triggerType`
- `triggerConfig`
- `templateId`
- `sender`
- `delayMinutes`
- `schedule`
- `timezone`
- `filters`
- `stopConditions`
- `createdAt`
- `updatedAt`
- `ownerId`

### `whatsapp_scheduled_jobs`

- `jobType`
- `status`
- `campaignId`
- `automationId`
- `leadId`
- `runAt`
- `timezone`
- `payload`
- `lastAttemptAt`
- `attemptCount`
- `error`

## Server Components To Build

### Infobip integration library

Create `src/lib/infobip.ts` and related helpers for:

- authenticated request handling
- template CRUD
- template sync
- outbound template send
- free-form send inside active session window
- webhook payload normalization

### Validation and env parsing

Create `src/lib/env.server.ts` for:

- `INFOBIP_BASE_URL`
- `INFOBIP_API_KEY`
- `INFOBIP_WHATSAPP_SENDER`
- `INFOBIP_WEBHOOK_SECRET`
- optional scheduling configuration

### API routes

Create:

- `src/app/api/whatsapp/templates/route.ts`
- `src/app/api/whatsapp/templates/[id]/sync/route.ts`
- `src/app/api/whatsapp/campaigns/route.ts`
- `src/app/api/whatsapp/campaigns/[id]/dispatch/route.ts`
- `src/app/api/whatsapp/automations/route.ts`
- `src/app/api/whatsapp/send/route.ts`
- `src/app/api/whatsapp/webhooks/inbound/route.ts`
- `src/app/api/whatsapp/webhooks/status/route.ts`
- `src/app/api/whatsapp/dispatch-due/route.ts`

### Scheduler

Preferred production shape:

- Cloud Scheduler or scheduled Cloud Function triggers a dispatcher endpoint
- dispatcher scans `whatsapp_scheduled_jobs`
- due jobs are sent in controlled batches
- job status is updated atomically

For the repo delivery:

- define the storage model and dispatcher route
- document the production scheduler hookup

## UI Components To Build

### Campaigns page

Replace mock WhatsApp tab with:

- overview cards
- template management tab
- campaigns tab
- automations tab
- recent activity panel

### Template management

- template list with status badges
- create template dialog/form
- edit draft template
- submit and sync actions
- approval error visibility

### Campaign management

- campaign list with progress metrics
- create campaign dialog
- lead selector sourced from existing Firestore leads
- schedule controls
- dispatch action

### Automation management

- rule list
- create/edit automation form
- trigger type selector
- delay/schedule controls
- stop condition configuration

### Lead detail page

Replace placeholder WhatsApp card with:

- conversation summary
- recent message thread
- session window status
- quick send form
- template send action

## Implementation Sequence

1. Extend shared types for WhatsApp entities
2. Add server env parsing and Infobip client
3. Add Firestore admin-compatible helpers or server-safe payload helpers
4. Add template, campaign, automation, send, and webhook API routes
5. Add reusable client hooks for Firestore-backed WhatsApp collections
6. Implement WhatsApp dashboard components for Campaigns
7. Implement lead-level WhatsApp conversation UI
8. Add dispatcher route and document scheduler integration
9. Run validation and type checks
10. Document setup requirements and operational follow-ups

## Operational Requirements

- valid Infobip account and WhatsApp sender
- API key with template and messaging permissions
- public webhook URLs reachable by Infobip
- Firestore collections and security rules updated
- scheduled trigger configured in production

## Acceptance Criteria

- user can create a WhatsApp template in the app
- template can be submitted and later synced to show approval status
- user can create a campaign from an approved template and existing leads
- user can schedule or immediately dispatch a campaign
- webhook events update message and campaign lifecycle metrics
- user can define automation rules stored in Firestore
- lead detail page shows WhatsApp history and send actions
