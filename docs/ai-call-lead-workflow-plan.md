## AI call -> lead workflow implementation plan

### Objective

Capture structured sales signals from AI calls and update the lead automatically so the team can immediately see:

- whether the lead already uses another CRM
- whether the lead wants a free demo
- whether the lead accepted receiving the free demo on WhatsApp
- what the next lead status should be

### Lead data model

Add the following lead fields:

- `lead_status`
  - pipeline: `new`, `contacted`, `demo_sent`, `trial_waiting`, `trial_started`
  - dropdown outcomes: `won`, `lost`, `not_interested`, `pause_lead`
- `uses_other_crm`
- `other_crm_name`
- `accepted_demo_on_whatsapp`
- `demo_sent_at`
- `last_ai_call_outcome`
- `ai_call_summary`
- `ai_call_transcript`
- `ai_call_last_synced_at`

### AI call ingestion

On each end-of-call webhook:

1. Save transcript, summary, outcome, timing, and recording metadata on the call recipient.
2. Extract commercial insights from:
   - structured tool calls, when the assistant emits them
   - fallback transcript and summary parsing, when tool output is missing
3. Persist those insights onto the lead record.

### Lead status automation

Rules implemented:

1. If a call successfully connects and ends without a negative outcome, move `new -> contacted`.
2. If the lead is interested and wants the free demo, keep the lead in the main pipeline.
3. If the lead accepts the demo on WhatsApp, queue WhatsApp automation and move the lead to `demo_sent` after the template is dispatched.
4. If the lead declines interest, move the lead to `not_interested`.

### WhatsApp automation

Implemented event-driven automation support for `lead_status_changed`:

1. Store active automations in `whatsapp_automations`.
2. When the lead status changes, evaluate matching automations.
3. Support trigger filters for:
   - `fromStatuses`
   - `toStatuses`
   - `requireAcceptedDemoOnWhatsApp`
4. Queue an `automation_dispatch` job in `whatsapp_scheduled_jobs`.
5. When the dispatcher runs, send the selected template to the lead and stamp `demo_sent_at`.

### UI changes

Implemented:

- updated lead lifecycle pipeline
- dropdown outcomes for `won`, `lost`, `not_interested`, `pause_lead`
- normalized status badges across lead tables and dashboard widgets
- new lead detail fields for CRM usage and demo consent
- WhatsApp automation form support for lead-status triggers

### Recommended Vapi prompt/tooling

To maximize extraction quality, the assistant should be instructed to capture these fields explicitly at the end of each relevant conversation:

- `usesOtherCrm`
- `otherCrmName`
- `acceptedDemoOnWhatsApp`
- `outcome`
- `summary`

The backend already supports consuming those values from tool calls when they are provided.
