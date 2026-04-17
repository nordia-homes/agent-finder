# WhatsApp Infobip Setup

## 1. Environment setup

Copy values from `.env.example` into your local `.env` and replace the placeholders.

Required values for the WhatsApp implementation:

- `INFOBIP_BASE_URL`
- `INFOBIP_API_KEY`
- `INFOBIP_WHATSAPP_SENDER`
- `INFOBIP_WEBHOOK_SECRET`

Required values for server-side Firestore access:

- `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`

Alternative admin setup if you do not want the JSON blob:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## 2. Public webhook URLs

Before configuring Infobip, deploy the app to a public HTTPS URL.

Expected endpoints in this project:

- Inbound messages:
  `https://your-domain.example/api/whatsapp/webhooks/inbound`
- Delivery and seen reports:
  `https://your-domain.example/api/whatsapp/webhooks/status`

These routes expect the header:

- `Authorization: Bearer <INFOBIP_WEBHOOK_SECRET>`

## 3. Configure inbound message forwarding in Infobip

According to Infobip's official WhatsApp inbound documentation, inbound messages are delivered to your webhook endpoint as HTTPS `POST` requests and you should secure the endpoint with authorization headers.

Official source:
- [WhatsApp inbound messages](https://www.infobip.com/docs/whatsapp/message-types-and-templates/inbound-messages)

Recommended setup flow in the Infobip web interface:

1. Open the Infobip web interface.
2. Go to `Channels and Numbers`.
3. Open your WhatsApp sender configuration.
4. Find the inbound or message forwarding section for the sender.
5. Set the webhook URL to:
   `https://your-domain.example/api/whatsapp/webhooks/inbound`
6. Add the authorization header:
   `Authorization: Bearer <INFOBIP_WEBHOOK_SECRET>`
7. Save the configuration.

## 4. Configure delivery and seen reports

Infobip's official reports documentation states that delivery and seen reports can be sent to a global webhook URL or overridden per message using `notifyURL`.

Official source:
- [WhatsApp reports and insights](https://www.infobip.com/docs/whatsapp/reports)
- [Subscriptions management overview](https://www.infobip.com/docs/cpaas-x/subscriptions-management)
- [Create and manage subscriptions](https://www.infobip.com/docs/cpaas-x/subscriptions-management/create-manage-subscriptions)

Recommended setup in the Infobip web interface:

1. Open `Developer Tools > Subscriptions Management`.
2. Create a notification profile that points to:
   `https://your-domain.example/api/whatsapp/webhooks/status`
3. Add the header:
   `Authorization: Bearer <INFOBIP_WEBHOOK_SECRET>`
4. Create a subscription for WhatsApp events that includes delivery and seen events.
5. Save and enable the subscription.

## 5. Notes about this project

- Template submission and sync are handled by the app through the Infobip API.
- Campaign sending is handled by the app through the Infobip API.
- Scheduled jobs are stored in Firestore and processed through:
  `POST /api/whatsapp/dispatch-due`
- In production, trigger that dispatcher from Cloud Scheduler or a scheduled Cloud Function.

## 6. What to verify after setup

1. Create a template in the app and submit it for approval.
2. Sync the template status after Infobip/WhatsApp review.
3. Create a single-lead campaign and send it.
4. Confirm that outbound delivery updates appear in the dashboard.
5. Reply from WhatsApp and confirm the lead thread updates in the CRM.
