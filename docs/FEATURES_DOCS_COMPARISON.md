# Features Documentation — Comparative Analysis

Comparison of **PLATFORM_FEATURES_REPORT.md** with other project `.md` files that describe features, setup, or system scope. Use this to align docs, find gaps, and prioritize updates.

---

## 1. Documents Compared

| Document | Purpose | Audience | Feature depth |
|----------|---------|----------|----------------|
| **PLATFORM_FEATURES_REPORT.md** | Full feature inventory + tech debt + half-baked | Devs, product, onboarding | Exhaustive (codebase-derived) |
| **README.md** | Project intro, setup, high-level features | New devs, contributors | High-level only |
| **GOOGLE_CALENDAR_SETUP.md** | Google Calendar setup + feature checklist | Devs, ops | Integration + phase list |
| **NETLIFY_DEPLOYMENT.md** | Deploy to Netlify + Stripe webhooks | Ops, deploy | No feature list |
| **STRIPE_SETUP.md** | Stripe keys, products, webhooks | Devs, ops | No feature list |
| **.kiro/specs/.../requirements.md** | Spec: DB, i18n, Auth UX, subscription perf | Devs, QA | Improvement requirements |
| **.kiro/specs/.../design.md** | Design for same 4 improvements | Devs | Implementation design |
| **.kiro/specs/.../tasks.md** | Task list for those improvements | Devs | Implementation tasks |

Only **PLATFORM_FEATURES_REPORT**, **README**, and **GOOGLE_CALENDAR_SETUP** explicitly list product features; the rest are setup or improvement specs.

---

## 2. Feature Coverage Comparison

### 2.1 Core product areas

| Area | PLATFORM_FEATURES_REPORT | README | GOOGLE_CALENDAR_SETUP |
|------|---------------------------|--------|-------------------------|
| **Appointments** | ✅ Full (views, form, availability, sync, status) | ✅ “Schedule, reschedule, manage” | — |
| **Clients** | ✅ Full (CRUD, balance, CFDI, documents) | ✅ “Complete client profiles, medical history” | — |
| **Therapists** | ✅ Full (CRUD, commission, schedule, colors) | ✅ “Manage therapist profiles and schedules” | — |
| **Finance** | ✅ Full (daily/monthly, payments, expenses) | ✅ “Payment processing and expense management” | — |
| **Payroll** | ✅ Full (periods, commission, payouts) | ❌ Not mentioned | — |
| **Dashboard** | ✅ Full (stats, upcoming, quick actions) | ❌ Not mentioned | — |
| **Settings** | ✅ Full (tabs, clinic, security, integrations) | ❌ Not mentioned | — |
| **Subscription / billing** | ✅ Full (plans, Stripe, limits) | ❌ Not mentioned | — |
| **Auth** | ✅ Full (sign-in/up, reset, sessions, 2FA backend) | ❌ Not mentioned | — |
| **Landing / public** | ✅ Full | ❌ Not mentioned | — |
| **Reports** | ✅ As “Coming Soon” + half-baked | ❌ Not mentioned | — |
| **i18n** | ✅ Full | ✅ “English and Spanish” | — |
| **Google Calendar** | ✅ Full (OAuth, sync, manual, colors, availability) | ✅ Dedicated section + checklist | ✅ Phase 1 + future phases |
| **CFDI / Facturapi** | ✅ Full (individual/global, credit notes, upload) | ❌ Not mentioned | — |
| **Documents** | ✅ Full (templates, instances, PDF, email) | ❌ Not mentioned | — |
| **Tech debt / half-baked** | ✅ Sections 19–20 | ❌ Not mentioned | — |

**Summary:** README is a short, marketing-style overview; it omits Payroll, Dashboard, Settings, Subscription, Auth details, Reports, CFDI, Documents, and any tech-debt/half-baked view. PLATFORM_FEATURES_REPORT is the only doc that lists all of these and calls out incomplete features.

---

## 3. README vs PLATFORM_FEATURES_REPORT

### 3.1 What README adds (and report doesn’t contradict)

- **Tech stack:** React 18, TypeScript, Vite, Tailwind, shadcn/ui, Supabase, TanStack Query, Google Calendar API — report doesn’t repeat this; both are consistent.
- **Project structure:** High-level `src/` layout — report doesn’t duplicate; useful for new devs.
- **Install/setup:** Clone, install, env vars, DB push, dev server — report references README for “setup and run”; no conflict.

### 3.2 What README omits (present in report)

- Payroll, Dashboard, Settings, Subscription flow, Auth (reset, sessions), Reports (as Coming Soon).
- CFDI/Facturapi, Documents, Stripe subscription flow, Netlify functions.
- Any mention of tech debt or half-baked features (export, reports, notifications/2FA UI, etc.).

### 3.3 Naming

- README uses **“Cliniker Hub”**; report uses **“Revive Clinic Hub (Cliniker)”**. Same product; report clarifies the “Revive” name.

**Recommendation:** Either add a short “Features” subsection in README that links to PLATFORM_FEATURES_REPORT for the full list, or add 2–3 bullets for Payroll, Subscription, and CFDI so README stays accurate at a glance.

---

## 4. GOOGLE_CALENDAR_SETUP vs PLATFORM_FEATURES_REPORT

### 4.1 Alignment

- **Phase 1 (current):** OAuth, create/update/delete events, token refresh, basic sync settings — matches report’s Google Calendar section (OAuth, sync on create/update/delete, manual sync, calendar selection).
- **Sync status / manual sync:** Both mention manual sync and status/error handling.
- **Colors / calendar choice:** Report describes therapist colors and calendar selection; setup doc doesn’t detail colors but doesn’t conflict.

### 4.2 Gaps and differences

| Topic | GOOGLE_CALENDAR_SETUP | PLATFORM_FEATURES_REPORT |
|-------|------------------------|---------------------------|
| **Meeting links** | “Optional Google Meet” in future | Report states optional meeting link in sync options |
| **Two-way sync** | Future phase | Report describes **app → Google** sync; pull from Google is used for **availability** (fetch events for conflicts). Not full “Google → app” two-way; setup doc’s “two-way” is a broader future idea. |
| **Recurring appointments** | Future | Report: not implemented; appointments are one-off. |
| **Availability / conflicts** | Not in setup doc | Report: fetch Google events for therapist availability and conflict detection. |

So: setup doc is correct for “what to configure”; report adds how the app uses the integration (availability, conflicts, manual sync). No contradiction; report is more precise on “two-way” (availability pull only).

**Recommendation:** In GOOGLE_CALENDAR_SETUP, add one line that “the app also uses the API to check therapist availability and detect conflicts.” Optionally add “Full two-way sync (Google → app) and recurring events are planned.”

---

## 5. .kiro Specs (requirements, design, tasks) vs Report

These specs focus on **four improvements**, not the full product feature set:

1. Database schema cleanup / migration optimization  
2. Internationalization completeness  
3. Authentication UX (password visibility, forgot password, reset flow)  
4. Subscription flow performance  

### 5.1 Consistency with report

- **Auth UX:** Design said “No password reset functionality implemented.” The report (and codebase) now describe password reset request + confirm and “Forgot Password?” link. So the **design doc is outdated**; the **requirements/tasks** are implemented (tasks.md shows them done). Report is current.
- **i18n:** Specs aim for 100% coverage and fallbacks; report lists i18n (en/es, selector, fallbacks). Aligned.
- **Subscription performance:** Specs aim for fast plan load, caching, loading states; report doesn’t detail performance but lists subscription and Stripe. No conflict.
- **DB migrations:** Specs describe consolidating to a small set of migration files; report doesn’t describe migration strategy. No overlap.

### 5.2 What the report adds vs specs

- Full list of **product** features (appointments, clients, finance, payroll, CFDI, documents, etc.). Specs don’t enumerate these.
- **Tech debt** (logging, duplicate code, commented UI, type drift, roles) — specs don’t cover this.
- **Half-baked features** (export, reports, notifications/2FA UI, etc.) — specs don’t list these.

So: specs = “how we improved four areas”; report = “what the product does + what’s incomplete or messy.” Complementary.

**Recommendation:** Update design.md to state that password reset and Auth UX enhancements are implemented (and optionally point to report §2 for current auth features). Keep requirements/tasks as-is; they’re historical record of what was done.

---

## 6. NETLIFY_DEPLOYMENT and STRIPE_SETUP

- **NETLIFY_DEPLOYMENT.md:** Deploy steps, env vars, Stripe webhook URL, success/cancel URLs. No feature list. Report mentions Netlify functions (Stripe, Facturapi, Google OAuth, document email) in §18; deployment doc doesn’t list those functions. Useful add: one sentence like “See PLATFORM_FEATURES_REPORT §18 for the list of serverless functions.”
- **STRIPE_SETUP.md:** Keys, products/prices, webhook events, testing. No feature list. Report’s Subscription & Stripe sections describe what the app does with Stripe; setup doc describes how to configure it. Complementary.

---

## 7. Summary Table

| Document | Keep as-is | Update | Add |
|----------|------------|--------|-----|
| **PLATFORM_FEATURES_REPORT.md** | ✅ Single source of truth for features + tech debt + half-baked | — | — |
| **README.md** | Setup, tech stack, structure | Add 2–3 bullets or link for Payroll, Subscription, CFDI | Link to PLATFORM_FEATURES_REPORT for “full feature list” |
| **GOOGLE_CALENDAR_SETUP.md** | Prerequisites, OAuth, env, phases | — | One line: app uses API for availability/conflicts; optional note on two-way/recurring as future |
| **NETLIFY_DEPLOYMENT.md** | Deploy and webhook steps | — | Optional: reference report §18 for function list |
| **STRIPE_SETUP.md** | Keys, products, webhooks | — | — |
| **.kiro/.../requirements.md** | Acceptance criteria | — | — |
| **.kiro/.../design.md** | Architecture and components | Fix: “Password reset is now implemented” (and optional link to report) | — |
| **.kiro/.../tasks.md** | Task checklist | — | — |

---

## 8. Suggested Single Change Per Doc

1. **README.md** — In “Features”, add:  
   `For a full feature list, tech debt, and half-baked features, see [PLATFORM_FEATURES_REPORT.md](./docs/PLATFORM_FEATURES_REPORT.md).`  
   Optionally add bullets: Payroll, Subscription/billing, CFDI invoicing.

2. **GOOGLE_CALENDAR_SETUP.md** — In “Features” (Phase 1), add:  
   `- ✅ Therapist availability and conflict detection (uses Calendar API to fetch events).`

3. **.kiro/.../design.md** — In “Authentication UX Enhancement Architecture”, replace “No password reset functionality implemented” with:  
   `Password reset (request + confirm) and "Forgot Password?" link are implemented. See PLATFORM_FEATURES_REPORT §2.`

4. **NETLIFY_DEPLOYMENT.md** — Optional: in “Step 1” or “Monitoring”, add:  
   `For the list of serverless functions (Stripe, Facturapi, Google OAuth, etc.), see [PLATFORM_FEATURES_REPORT.md](./PLATFORM_FEATURES_REPORT.md) §18.`

---

*This comparison is based on the current contents of PLATFORM_FEATURES_REPORT.md and the other .md files listed above. Re-run or update this doc when the report or other docs change.*
