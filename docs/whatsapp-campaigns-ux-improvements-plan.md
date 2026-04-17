# WhatsApp Campaigns UX Improvements

## Goal

Turn the `Campaigns > WhatsApp Campaigns` tab into an operational workspace that helps the team launch, monitor, troubleshoot, and optimize WhatsApp outreach instead of only managing entities.

## Key Improvements

### 1. Operational overview

- Add an `Overview` tab as the default entry point
- Show health indicators for provider, sender, webhooks, approved templates, and scheduler readiness
- Add recent activity, scheduled work, and action-required warnings

### 2. Clickable metrics

- Make top metrics interactive so users can jump into the relevant section
- Use semantic coloring and clearer status cues for high-signal metrics

### 3. Better onboarding

- Replace basic empty states with a step-by-step activation checklist
- Guide users through template creation, approval, campaign creation, and sending

### 4. Stronger template workspace

- Add quick filters for approved, pending, rejected, and draft templates
- Show category, language, sync freshness, rejection reasons, and variable previews
- Add a sample lead preview so users understand how variables resolve before launching

### 5. Stronger campaign workspace

- Add a list view optimized for delivery operations
- Show funnel metrics: queued, sent, delivered, seen, replies, failures
- Add faster actions: dispatch, refresh, filter by state, and review scheduled campaigns

### 6. Better audience builder

- Add eligibility insights during campaign creation
- Show total leads, selected leads, eligible leads, missing phones, and filtered audiences
- Add audience filters like city, classification, minimum score, and owner

### 7. Better automation workspace

- Make automations feel like rules, not just records
- Show trigger, delay, schedule, state, and next-action intent clearly
- Include starter guidance and operational hints

### 8. Better live inbox

- Make inbox searchable and triage-friendly
- Highlight unread threads, session-window status, and last activity
- Help users spot conversations that need human action

## Implementation Plan

1. Extend the WhatsApp dashboard data payload with recent events and scheduled jobs
2. Add health-state derivation and action-required warnings
3. Redesign the dashboard header and metric cards for operational use
4. Add a new `Overview` tab with onboarding, health, activity, and scheduled jobs
5. Add template filters and sample lead preview
6. Add campaign filters, funnel summaries, and better campaign cards
7. Upgrade campaign creation with eligibility-aware audience filtering
8. Improve automation and inbox sections for scanning and triage
9. Run typecheck and fix regressions

## Acceptance Criteria

- Users land on an actionable overview, not an empty manager view
- Metric cards navigate to the relevant filtered workflow
- Empty states guide setup in the correct order
- Campaign creation exposes lead eligibility before save
- Templates, campaigns, automations, and inbox sections are easier to scan and operate
