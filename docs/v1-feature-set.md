# Shomer App — V1 Feature Set

An inventory of the features currently shipped in the Shomer web app (`apps/shomer-app`), grouped by console. Built as a reference for strategising next steps.

**Tech stack:** React 19 + TypeScript + Vite, React Router 7, TanStack Query, Tailwind 4. Backend is Firebase (Auth, Firestore with real-time listeners, Storage) with direct client reads/writes; a separate Bun/Elysia API on Railway handles staff/doctor user creation and invites.

---

## 1. Reception Console

### 1.1 Front Desk Pulse (Home)
Live today-at-a-glance for reception.

- KPI cards: total, waiting, in-progress, completed
- Per-doctor duty cards with "Now Serving" token + queue counts
- No-doctors-on-duty warning banner, recent completions feed

### 1.2 FastTrack Check-in (Check-in wizard)
Register and queue a patient in two steps.

- Owner lookup by phone (+91) or pet name/species/breed; results grouped by owner
- New owner + pet registration (species, breed picker, DOB, microchip, etc.)
- Service selection, complaint tags (preset + custom), on-duty doctor assignment, emergency toggle
- Auto token generation (doctor-prefixed, e.g. ESH-0004); session resume if interrupted
- Confirmation screen with token + shareable queue link via WhatsApp

### 1.3 Live Queue Board (Queue)
Real-time table of all of today's visits.

- Filters by doctor and payment method; status chips (waiting / in-progress / billed / completed / cancelled)
- Visit detail side panel; change payment method on billed visits
- Reception override: force "Mark as Complete" on stuck visits

### 1.4 Smart Checkout (Checkout)
Billing desk with carry-over awareness.

- Grouped worklist: pinned billing defaults, pending from earlier days, today
- Read-only clinical summary + editable services & bill with quantities
- Cash / Card / UPI, split and partial payments, immutable payment ledger
- WhatsApp bill/summary link; inline pet/owner name edits; draft autosave

### 1.5 Visit History & Earnings (History)
Searchable past-visit records with revenue stats.

- Date range + presets, text search, multi-select service filter, payment filter (incl. Partial)
- Total earned (ledger-based), visit count, per-method breakdown

### 1.6 Clinic Day Setup (Settings)
Daily operational controls.

- Doctors-on-duty roster (auto-resets at midnight)
- Manage diagnoses, medicines (tablet/syrup/injection), and priced services lists

---

## 2. Vet Console

### 2.1 Doctor's Live Queue
Standalone full-screen console for doctors.

- Real-time queue of assigned patients (emergency-first), waiting count, live indicator
- Branch switcher for multi-branch doctors; History and Settings as full-screen overlays

### 2.2 Call Patient Flow
Controlled patient intake.

- "Ready to call?" gate → Call Patient; blocks calling a second patient while one is in progress
- Reassign to another on-duty doctor before or during consultation; Pause returns patient to queue

### 2.3 Consultation Workbench
The full clinical record form.

- Vitals (weight, temperature), multi-diagnosis with notes (custom entries auto-added to catalog)
- Structured prescriptions: dose by medicine type, morning/afternoon/evening/night, days, before/after food
- Vaccine entry with batch no. + next-due date ("Next Year" one-tap); auto-adds vaccine service to bill
- Services availed with quantities; itemized confirm dialog on Mark Complete
- Silent draft autosave every 30s; draft survives pause/reassign

### 2.4 Patient Memory
Historical context at a glance.

- Collapsible "Last Visit" card: vitals, diagnoses, meds, vaccines (with Overdue flags), bill + payments
- "View N earlier visits" modal, each opening the full visit summary
- "New Patient" indicator for first-timers

---

## 3. Admin Console

### 3.1 Multi-Clinic Command
Manage every clinic from one panel.

- Clinic directory + Add Clinic; per-clinic contextual nav (branches, doctors, staff, owners, catalogs)
- Dashboard is currently a placeholder landing page

### 3.2 White-Label Branding
Per-clinic identity for owner-facing pages.

- Logo URL, tagline, 4 brand colors (primary/accent/background/text)
- Applied to the public visit summary page

### 3.3 Team Onboarding
Doctor and staff account management.

- Add doctor/receptionist via backend API → copyable invite link
- Doctor profiles: specialization, bio, photo upload (shown on public queue page), branch assignment
- Edit details + branch assignment; Active/Invited status

### 3.4 Branch Management
Multi-location support.

- Add branches (name, address, phone); Active/Inactive display

### 3.5 Pet Owner Directory
Clinic-wide customer database.

- Server-side phone search, paginated (50/page), expandable pet lists
- Inline edit of owner and pet records

### 3.6 Master Catalogs
Central clinical and billing lists.

- 4 tabs: diagnoses, medicines, priced services, priced grooming services
- Soft remove/restore (nothing hard-deleted)

---

## 4. Pet-Owner Facing (Public Pages)

### 4.1 My Turn Tracker
Live queue status for the pet owner, no login — shared via WhatsApp at check-in.

- "Now consulting / It's your turn / N patients ahead" states in real time
- Doctor profile card (photo, specialization, bio)
- Anonymized view of other tokens; "consultation complete — proceed to reception" state

### 4.2 Digital Visit Summary
Shareable, white-labelled consultation record.

- Clinic-branded header; visit meta (token, doctor, pet, weight)
- Diagnoses, prescription table, vaccines with next-due, notes
- Itemized bill + paid-via breakdown or "payment pending" notice; print button

---

## 5. Cross-Cutting

### 5.1 Roles & Access
Email/Google login; doctor, receptionist, admin, owner roles with route guards and role-based landing.

### 5.2 Multi-Branch Operations
Branch selector at login, per-branch data, branch switchers in reception and vet shells.

### 5.3 Real-Time Everything
Firestore live listeners across all queues/lists; reception toasts + sound when a patient is called or completed.

### 5.4 Token System
Transactional daily counter, doctor-prefixed tokens, emergency-first ordering everywhere.

---

## 6. Partially Built / Stubs

- **Grooming flow** — Full grooming catalog in admin + data plumbing throughout, but check-in filters grooming out of the service dropdown and always submits an empty list. No groomer role or grooming mode; grooming visits can't actually be created via UI.
- **Email confirmations** — Check-in confirmation email is a console.log stub with a TODO to move to a backend endpoint (SendGrid key must be server-side).
- **PDF download** — "Download PDF" on the visit summary just calls the browser print dialog; no real PDF generation.
- **Legacy dashboard** — `features/dashboard/dashboard-page.tsx` is unreachable (route redirects); only its detail panel and completed-visits hook are still used.
- **Cancelled status** — Rendered in queue/history status chips, but no UI action can cancel or mark a no-show.

---

## 7. Known Bugs & Gaps

- Vet-side `billAmount` ignores service quantity (`complete-visit.ts`) — under-counts until checkout recomputes
- Neither add-service UI sets `serviceType`, yet the check-in dropdown and bill grouping depend on it (currently works via seeded data)
- No discounts, tax/GST, or invoice numbers in billing
- No CSV/Excel export in history
- Reception "Mark as Complete" creates a completed visit with no clinical record and ₹0 bill
- WhatsApp sharing is desktop-web-only (`web.whatsapp.com`, no `wa.me` fallback); no SMS
- `VITE_APP_BASE_URL` falls back to a test host — shared links point to test if unset in prod
- Token counter is branch-wide but prefix is per-doctor, so numbering interleaves across doctors
- Back/forward buttons are deliberately trapped after login (AuthGuard popstate hack)
- Hardcoded +91 / English only — India-only by construction
- Duplicated visit-detail panels (noted in TODOS.md); dead code: `owner-search-step`, `pet-results` state, `use-grooming-services`
