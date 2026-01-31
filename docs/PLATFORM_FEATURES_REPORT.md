# Revive Clinic Hub — Platform Features Report

A detailed inventory of all features implemented in the Revive Clinic Hub (Cliniker) platform. Generated from codebase analysis.

---

## 1. Overview

**Revive Clinic Hub** is a clinic management system for therapy practices. It provides appointment scheduling, client and therapist management, finance tracking, payroll by commission, Mexican CFDI invoicing (Facturapi), Google Calendar sync, and Stripe-based subscriptions. The app is built with **React 18**, **TypeScript**, **Vite**, **Supabase** (PostgreSQL + Auth), **TanStack Query**, and **shadcn/ui**.

---

## 2. Authentication & Access

| Feature | Description |
|--------|-------------|
| **Email/password sign-in** | Sign in with email and password via Supabase Auth. |
| **Email/password sign-up** | New user registration; creates profile and links to clinic. |
| **Password reset** | Request reset email and confirm new password (`/auth/reset-password`). |
| **Password change** | Logged-in users can change password from Settings → Security. |
| **Protected routes** | All app routes (except `/`, `/auth`, `/auth/reset-password`, `/google-auth-callback`) require authentication; unauthenticated users redirect to `/auth`. |
| **Session persistence** | Supabase session; auth state listener keeps user/profile/clinic in sync. |
| **User roles** | Profiles have `role`: `admin`, `therapist`, `reception`. |
| **Clinic-scoped data** | Profile has `clinic_id`; all main data is filtered by clinic. |
| **Session management** | View active sessions (device, IP, user agent); sign out current device or all devices. Stored in `user_sessions`. |
| **Login history** | Login attempts (success/failure) logged in `login_history`. |
| **Security settings** | DB support for 2FA, backup codes, session timeout, login/suspicious-activity notifications (UI for 2FA/notifications is commented out). |

---

## 3. Landing & Public Pages

| Feature | Description |
|--------|-------------|
| **Landing page** (`/`) | Marketing page with features, steps, CTA; language selector; links to Login and Sign up. |
| **Auth page** (`/auth`) | Tabs: Sign In, Sign Up; email/password forms; link to password reset. |
| **Password reset** | Request reset and confirm new password. |
| **404** | `NotFound` component for unknown routes. |

---

## 4. Dashboard

| Feature | Description |
|--------|-------------|
| **Dashboard** (`/app`, `/dashboard`) | Main hub after login; same content as Index. |
| **Today’s revenue** | Sum of payments received today (clinic currency). |
| **Clients with appointments today** | Count of distinct clients with appointments today. |
| **Today’s appointments** | Count of appointments today. |
| **Next appointment** | Next upcoming appointment (time, client). |
| **Upcoming appointments list** | List of upcoming appointments; click opens details. |
| **Quick actions** | Shortcuts (e.g. New appointment, New client). |
| **Appointment details modal** | From dashboard: view/edit appointment, payment, sync status, notes. |

---

## 5. Appointments

| Feature | Description |
|--------|-------------|
| **Appointments page** (`/appointments`) | Central place to view and manage appointments. |
| **Views** | **Daily**: appointments by date, grouped by therapist. **Weekly**: week view. **Monthly**: calendar month. |
| **Date navigation** | Date picker / period selector for day/week/month. |
| **New appointment** | Form: client, therapist, treatment, date, time, duration, amount, notes. Optional URL `?showForm=true` to open form. |
| **Therapist availability** | Before saving, checks therapist availability (existing appointments + optional schedule rules) and shows conflicts or “available”. |
| **Treatment-based duration & price** | Treatments have default duration and price; form can use them. |
| **Edit appointment** | From table or details: change time, therapist, treatment, status, payment, notes. |
| **Appointment status** | `scheduled`, `completed`, `cancelled`, `no_show`. |
| **Payment on appointment** | Optional payment amount, date, method, status on the appointment. |
| **Search/filter** | Search by client name in daily view. |
| **Appointment details modal** | Full details, edit, delete, payment info, **Google Calendar** sync status and “Sync to Google Calendar” action. |
| **Google Calendar sync** | On create/update/delete, events are created/updated/deleted in the connected Google Calendar (when integration is configured). Manual “Sync” for failed or older appointments. |
| **Sync status** | Per-appointment: synced / not synced / error; stored in DB (`sync_status`, `last_synced_at`, `sync_error_message`). |

---

## 6. Clients

| Feature | Description |
|--------|-------------|
| **Clients page** (`/clients`) | List of clients with search and filters. |
| **Client list** | Table: name, contact, age (from birth date), balance, tags, CFDI info indicator; optional “include archived”. |
| **Search** | Multi-field search (name, email, phone, address, emergency contact, tags). |
| **New client** | Form: first/last name, email, phone, address, birth date, gender, emergency contact, medical notes, tags, default charge amount. |
| **CFDI (billing) fields** | RFC, tax regime, CFDI use, CFDI email; optional Facturapi customer id. Shown when clinic uses Facturapi. |
| **Edit client** | Edit all fields; archive/unarchive. |
| **Archive / unarchive** | Toggle `archived`; filter to include or hide archived. |
| **Client details modal** | Tabs: **Overview** (contact, balance, CFDI), **Payment history**, **Pending appointments** (completed, unpaid), **Appointments history**, **Documents**. |
| **Client balance** | Balance from payments vs charges (e.g. appointment amounts); shown in list and details. |
| **Add payment** | From client details: record payment (amount, date, method, description). |
| **New appointment** | From client details: open appointment form with client pre-selected. |
| **Documents** | Document section: list of document instances (templates + client/appointment); create, fill, view, download PDF. |
| **CFDI upload** | Modal to upload CFDI (XML) for the client. |

---

## 7. Therapists

| Feature | Description |
|--------|-------------|
| **Therapists page** (`/therapists`) | List of therapists; subscription limit enforced. |
| **Therapist list** | Table: name, email, license, specialties, calendar color, commission %, status; optional “include archived”. |
| **Search** | By name, license, specialties. |
| **New therapist** | Form: name, email, license, specialties, commission %, **calendar color** (Google Calendar color id), optional **schedule rules** (weekday, start/end time, active). |
| **Edit therapist** | Edit all fields; archive/unarchive. |
| **Archive / unarchive** | Toggle `archived`; filter to include archived. |
| **Subscription limit** | Adding a therapist checks plan limit (e.g. max therapists); toast + link to upgrade if over limit. |
| **Calendar colors** | Palette of Google Calendar–style colors for calendar display. |
| **Schedule rules** | Per-weekday working hours (start/end) used for availability in appointment form. |

---

## 8. Finance

| Feature | Description |
|--------|-------------|
| **Finance page** (`/finance`) | Tabs: **Daily finance**, **Monthly finance**. |
| **Add payment** | Button opens payment form (amount, date, method, client, appointment, description). Optional `?showPaymentForm=true`. |
| **Add expense** | Button opens expense form (amount, date, category, description). Optional `?showExpenseForm=true`. |
| **Export** | Export button (UI only; implementation not wired in code). |

### 8.1 Daily Finance

| Feature | Description |
|--------|-------------|
| **Date filter** | Select a day; payments and expenses for that day. |
| **Show all payments** | Toggle to show all payments (ignore date filter). |
| **Payments table** | Date, client, amount, method, appointment/therapist, invoice state; clinic currency. |
| **Expenses table** | Date, category, description, amount. |
| **Daily totals** | Revenue and expenses for the selected day. |

### 8.2 Monthly Finance

| Feature | Description |
|--------|-------------|
| **Period** | Current month, previous month, or custom month/year. |
| **Search** | Filter payments by client/description. |
| **Payments list** | Payments in range with client, amount, method, date, invoice state. |
| **Totals** | Revenue, expenses, net for the period. |
| **Global CFDI (Facturapi)** | Issue global (monthly) CFDI for the period; button when Facturapi is configured. |
| **CFDI upload** | Upload CFDI XML for the period (e.g. issued outside app). |

---

## 9. Payroll

| Feature | Description |
|--------|-------------|
| **Payroll page** (`/payroll`) | Therapist earnings by period. |
| **Periods** | Bi-monthly: 1st–15th and 16th–end of month; selector for current and past periods (e.g. 12 months). |
| **Per-therapist stats** | For selected period: appointments count, revenue, revenue before IVA, IVA, **commission %**, therapist earnings, clinic earnings. |
| **Commission** | Each therapist has `commission_percentage`; earnings = (revenue before IVA) × (commission %). |
| **IVA handling** | Payments can have `iva_amount` and `facturado`; payroll uses amount before IVA for commission. |
| **Payout dialog** | Record payout to therapist (amount, method, date, notes); stored in `therapist_payouts`. |
| **Totals** | Total revenue, total therapist earnings, total clinic earnings, total appointments. |
| **Export** | Export button (UI only). |

---

## 10. Settings

| Feature | Description |
|--------|-------------|
| **Settings page** (`/settings`) | Tabs: General, Clinic, Security, Integrations, Subscription, Data export. |

### 10.1 General

| Feature | Description |
|--------|-------------|
| **Language** | English / Spanish (i18n). |
| **Currency** | USD, EUR, MXN (clinic default). |
| **Timezone** | UTC, US, Mexico City, etc. |
| **Theme** | Light, dark, system. |
| **Calendar view default** | Day, week, month. |
| **Dashboard options** | Show quick stats, show recent activity, show past appointments (some toggles commented in UI). |
| **Save** | Persist preferences to `user_preferences` and clinic to `clinics`. |

### 10.2 Clinic

| Feature | Description |
|--------|-------------|
| **Clinic info** | Name, address, phone, email. |
| **Treatments (catalog)** | List of treatments with name, price, duration, **SAT product service code**, **SAT unit code**, **VAT exempt**. Used in appointments and CFDI. |
| **Add treatment** | New treatment with tax codes. |
| **Edit treatment** | Edit tax codes and basic fields. |

### 10.3 Security

| Feature | Description |
|--------|-------------|
| **Change password** | Current password + new password (Supabase). |
| **Session management** | List sessions; sign out current device or all devices. |
| **2FA / notifications** | DB and hooks present; 2FA and security notification toggles are commented out in UI. |

### 10.4 Integrations

| Feature | Description |
|--------|-------------|
| **Google Calendar** | Connect with OAuth; choose calendar; sync settings. Appointments sync create/update/delete. |
| **Facturapi (CFDI)** | Connect with test/live API keys; webhook for invoice events. Used for individual/global invoices and credit notes. |

### 10.5 Subscription

| Feature | Description |
|--------|-------------|
| **Subscription management** | Current plan, status, trial end; upgrade/cancel via Stripe. Rendered by `SubscriptionManagement` component. |

### 10.6 Data export

| Feature | Description |
|--------|-------------|
| **Export / backup / import** | Buttons for export data, backup settings, import data (UI only; no backend wired). |

---

## 11. Subscription & Billing

| Feature | Description |
|--------|-------------|
| **Subscription page** (`/subscription`) | Shown when user has no valid subscription (e.g. after signup); plans and checkout. |
| **Subscription plans** | Loaded from `subscription_plans` (name, slug, monthly/yearly price, max therapists, features, Stripe price ids). |
| **Billing cycle** | Monthly or yearly; yearly can show discount. |
| **Checkout** | “Select plan” creates Stripe Checkout session; redirect to Stripe; return to `/subscription?success=true` or `?canceled=true`. |
| **Post-checkout** | Poll subscription status until active/trialing then redirect to dashboard. |
| **Back / logout** | From subscription page, back logs out and goes to `/auth`. |
| **Subscription guard** | `useSubscriptionRedirect` (or similar) can redirect to `/subscription` if clinic has no active subscription. |
| **Limits** | Therapist count checked against plan’s `max_therapists`. |
| **Stripe** | Checkout, customer, subscription, invoices; webhook for subscription events. |

---

## 12. Integrations

### 12.1 Supabase

| Feature | Description |
|--------|-------------|
| **Database** | PostgreSQL; tables for clinics, profiles, clients, therapists, appointments, treatments, payments, expenses, shifts, daily_cash_summary, cfdi_invoices, cfdi_invoice_payments, document_templates, document_instances, user_sessions, login_history, security_settings, user_preferences, subscription_plans, clinic_subscriptions, subscription_usage, subscription_invoices, therapist_payouts, sync_logs, suppliers. |
| **Auth** | Email/password; session; RLS for clinic-scoped access. |
| **Realtime** | Not required for current features; data via TanStack Query. |

### 12.2 Google Calendar

| Feature | Description |
|--------|-------------|
| **OAuth** | Netlify function `google-oauth.js`; redirect to Google; callback at `/google-auth-callback`; exchange code and store tokens in `clinics.google_calendar_auth`. |
| **Calendar choice** | User picks which calendar to sync; stored in `clinics.google_calendar_selected_id`. |
| **Sync** | Create/update/delete events from appointments; therapist color; optional meeting link. |
| **Availability** | Fetch events from Google for therapist/date to detect conflicts and show availability. |
| **Sync settings** | Reminders, etc. in `clinics.google_calendar_sync_settings`. |

### 12.3 Facturapi (CFDI Mexico)

| Feature | Description |
|--------|-------------|
| **Config** | Test/live API keys and webhook secret in Settings → Integrations. |
| **Individual invoices** | Issue CFDI for a single payment (ingreso); link payment to `cfdi_invoices` / `cfdi_invoice_payments`. |
| **Global invoices** | Monthly (or period) global CFDI from Finance → Monthly. |
| **Credit notes** | Issue credit note (egreso) linked to original CFDI. |
| **Upload XML** | Upload existing CFDI XML for a client or period. |
| **Customer** | Client can have `facturapi_customer_id`; RFC, regime, CFDI use, email for invoicing. |
| **Netlify** | `facturapi.js`, `facturapi-config.js`, `facturapi-webhook.js` server-side. |

### 12.4 Stripe

| Feature | Description |
|--------|-------------|
| **Checkout** | Create session with plan and billing cycle; success/cancel URLs. |
| **Customer** | Clinic has `stripe_customer_id`; subscription and invoices. |
| **Webhook** | `stripe-webhook.js` for subscription/invoice events; update `clinic_subscriptions`, `subscription_invoices`. |
| **Plans** | Stored in DB with `stripe_monthly_price_id`, `stripe_yearly_price_id`. |

---

## 13. Documents

| Feature | Description |
|--------|-------------|
| **Templates** | `document_templates`: slug, name, type, category, language, version, schema (field definitions). |
| **Instances** | `document_instances`: template + version, client, optional appointment, status, data (field values), rendered_pdf_url. |
| **Document section** | In Client details: list instances; create from template; fill fields (text, textarea, date, number, checkbox, signature); view/download PDF. |
| **Schema-driven forms** | Fields and sections from template schema; prefill from client/appointment. |
| **Email** | Netlify `send-document-email.js` for sending documents by email (if used). |

---

## 14. Internationalization (i18n)

| Feature | Description |
|--------|-------------|
| **Languages** | English (`en`), Spanish (`es`). |
| **Locales** | `src/i18n/locales/en.json`, `es.json`. |
| **Usage** | `useTranslation()` across pages and components. |
| **Language selector** | On landing and in app (e.g. sidebar or settings); persisted in user preferences. |
| **Date/number** | Date-fns locale (enUS, es); currency formatting by clinic currency. |

---

## 15. UI/UX

| Feature | Description |
|--------|-------------|
| **Layout** | Sidebar (collapsible) with nav: Dashboard, Appointments, Clients, Therapists, Finance, Payroll, Settings; clinic name; user and logout. |
| **Theme** | Light/dark/system via ThemeProvider/ThemeToggle. |
| **Components** | shadcn/ui (buttons, cards, tables, dialogs, tabs, forms, etc.). |
| **Toasts** | Sonner + custom toaster for success/error messages. |
| **Loading** | Skeleton loaders and spinners for async data. |
| **Responsive** | Grid and layout classes for mobile/desktop. |
| **Translation debugger** | Optional `TranslationDebugger` component for missing keys. |

---

## 16. Reports (Planned)

| Feature | Description |
|--------|-------------|
| **Reports route** | `/reports` shows **Coming Soon** (title/description from i18n). No report logic yet. |

---

## 17. Data Model Summary

| Area | Main tables |
|------|-------------|
| **Identity** | `profiles`, `user_sessions`, `login_history`, `security_settings`, `user_preferences` |
| **Clinic** | `clinics` |
| **Core** | `clients`, `therapists`, `treatments`, `appointments` |
| **Finance** | `payments`, `expenses`, `daily_cash_summary`, `shifts` |
| **CFDI** | `cfdi_invoices`, `cfdi_invoice_payments` |
| **Payroll** | `therapist_payouts` (referenced in Payroll page) |
| **Documents** | `document_templates`, `document_instances` |
| **Billing** | `subscription_plans`, `clinic_subscriptions`, `subscription_usage`, `subscription_invoices` |
| **Sync** | `sync_logs` (Google Calendar sync log) |

---

## 18. Netlify Functions

| Function | Purpose |
|----------|---------|
| `google-oauth.js` | Google OAuth token exchange. |
| `facturapi.js` | Facturapi API actions (issue individual/global invoice, credit note, etc.). |
| `facturapi-config.js` | Get/update Facturapi config. |
| `facturapi-webhook.js` | Facturapi webhook. |
| `stripe-service.js` | Stripe checkout/session. |
| `stripe-webhook.js` | Stripe webhooks. |
| `send-document-email.js` | Send document email. |

---

## 19. Tech Debt

Issues that add maintenance cost, increase risk, or make the codebase harder to change. Based on current codebase state.

### 19.1 Logging and debugging in production

| Item | Location | Notes |
|------|----------|--------|
| **console.log in auth flow** | `useAuth.tsx` | `getClinicId`, auth state change, profile/clinic fetch, and initial session check log to console. |
| **console.log in subscription** | `useSubscriptionRedirect.ts`, `SubscriptionPlans.tsx` | Redirect logic and checkout start log plan/clinic/billing and redirect decisions. |
| **console.log in appointments** | `AppointmentForm.tsx`, `useAppointments.ts` | Availability check and create/sync steps log payloads and outcomes. |
| **console.log in Google Calendar** | `useGoogleCalendar.ts` | Auto-sync and delete steps log to console. |
| **Debug logging in security** | `useSecurity.ts` | Session object, expires_at, token presence logged for debugging. |

**Recommendation:** Remove or gate behind `import.meta.env.DEV` (or a small logger utility) so production builds do not log sensitive or noisy data.

### 19.2 Duplicate or dead code

| Item | Notes |
|------|--------|
| **Two toast systems** | Both `Toaster` (shadcn) and `Toaster as Sonner` are mounted in `App.tsx`. Standardizing on one reduces bundle and avoids two overlapping UX patterns. |
| **TranslationDebugger in production** | Rendered unconditionally in `App.tsx`. Intended for missing translation keys; should be disabled in production or behind a feature flag. |
| **Legacy Google Calendar path** | `useGoogleCalendar`, `GoogleCalendarSelector`, and `GoogleCalendarConnect` exist; Settings uses `useClinicGoogleCalendar` and `ClinicGoogleCalendarConnect` / `ClinicGoogleCalendarSelector`. The non-`Clinic*` components appear unused and can be removed or clearly marked legacy. |

### 19.3 Commented-out UI and “placeholder” behavior

| Item | Location | Notes |
|------|----------|--------|
| **Notifications tab** | Settings | Entire “Notifications” tab (email/push, appointment/payment reminders) is commented out. `user_preferences` and save handler exist; only UI is disabled. |
| **Two-factor authentication** | Settings → Security | 2FA toggle and method selector are commented out. DB and `useSecurity` support 2FA. |
| **Security notifications** | Settings → Security | Login notifications and suspicious-activity alerts toggles are commented out. |
| **General toggles** | Settings → General | “Default dashboard view” and “Show past appointments” selectors/switches are commented out. |
| **Notification save comment** | Settings | `handleSaveNotificationSettings` is documented as “placeholder for now” despite calling `updatePreferences`. |

Leaving large commented blocks in place makes it unclear whether the feature is deprecated or planned; either remove, re-enable, or track in a backlog and delete the dead UI.

### 19.4 Type and schema drift

| Item | Notes |
|------|--------|
| **therapist_payouts** | Used in Payroll page and in Supabase migrations; not defined in `src/integrations/supabase/types.ts`. Payroll uses raw Supabase calls; any type-safe helpers or generated types will be out of sync until the table is added to the shared types (or types are regenerated from DB). |

### 19.5 Role-based access

| Item | Notes |
|------|--------|
| **Roles not enforced in UI** | Profiles have `role` (`admin`, `therapist`, `reception`). There is no visible role-gating of routes or actions (e.g. Payroll, Settings, or destructive actions). If some areas are intended to be restricted, RLS or route guards are not clearly aligned with that. |

---

## 20. Half-Baked Features

Features that are partially implemented, UI-only, or explicitly placeholder. Useful for product/backlog prioritization.

### 20.1 Export and data portability

| Feature | Where | Current state |
|---------|--------|----------------|
| **Finance → Export** | Finance page header | “Export” button present; no click handler or implementation. |
| **Payroll → Export** | Payroll page | “Export Payroll” (or similar) button; no export logic. |
| **Settings → Data & Export** | Settings → Data & Export tab | “Export Data”, “Backup Settings”, “Import Data” buttons; no backend or file generation. |

Users see export/import options but cannot actually export or import data.

### 20.2 Reports

| Feature | Where | Current state |
|---------|--------|----------------|
| **Reports** | `/reports` | Renders Coming Soon only (title/description from i18n). No report definitions, filters, or downloads. |

### 20.3 Notifications and security (backend ready, UI off)

| Feature | Where | Current state |
|---------|--------|----------------|
| **Notification preferences** | Settings | DB and API support email/push, appointment/payment reminders. Tab and controls commented out; users cannot change these. |
| **Two-factor authentication** | Settings → Security | 2FA and backup codes supported in DB and hooks; UI to enable/configure is commented out. |
| **Security notifications** | Settings → Security | Login and suspicious-activity notification toggles exist in DB; UI commented out. |

### 20.4 Other partial or optional features

| Feature | Where | Current state |
|---------|--------|----------------|
| **Default dashboard view** | Settings → General | Preference exists in `user_preferences`; selector in UI is commented out. |
| **Show past appointments** | Settings → General | Same as above; toggle commented out. |
| **Performance monitor** | `PerformanceMonitorDashboard`, `performance-monitor.ts` | Implemented and tested; not linked from main nav or Layout. Unclear if product feature or dev-only; if product, it is unreachable. |
| **Document email** | `send-document-email.js` (Netlify) | Backend exists; DocumentSection has email dialog. Needs verification that the full flow (e.g. “Send by email” from UI to function) is wired and tested. |

### 20.5 Summary table

| Category | Count | Action idea |
|----------|--------|-------------|
| Export/import | 3 entry points | Implement CSV/JSON export (and optional import) or remove buttons. |
| Reports | 1 route | Define MVP reports (e.g. revenue, appointments) or keep as Coming Soon and track. |
| Notifications/security UI | 3 areas | Re-enable tabs/toggles or remove commented code and document as “planned”. |
| Dashboard/preference toggles | 2 | Re-enable or delete; keep types in sync. |
| Performance / document email | 2 | Expose Performance Monitor in nav if product feature; confirm document-email E2E. |

---

*Report generated from codebase analysis. For setup and run instructions, see ../README.md and NETLIFY_DEPLOYMENT.md.*
