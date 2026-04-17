# Shomer App — Current State

## Version: 1.1.8
## Last Updated: 2026-04-18

---

## Current Features

### Reception
- Check-in flow (search/register owner + pet, select doctor, assign token)
  - Search by Pet Name (required), Breed (optional), and Owner Phone (optional — +91 prefix hardcoded, exact 10-digit match)
  - Phone entered in search pre-fills the phone field when registering a new patient
- Queue view (all visits today, real-time updates); right panel shows Diagnosis → Consultation Notes → Prescription → Vaccines → Services; click empty space to close panel
- Check-out/billing (mark billed, WhatsApp summary link with clinic name and production URL)
- Home dashboard (stats, doctor cards, recent completions)
- Settings (duty roster, catalogs: diagnoses, medicines, services)
- Branch name shown in sidebar (static label or dropdown switcher for multi-branch)
- Stacked notification toasts with sound: "Call Patient" (in-progress) and "Consultation Complete" (completed)

### Vet Console
- Queue sidebar (waiting patients, real-time)
- Consultation form (diagnosis, prescription, vaccines, services, notes)
  - Medicine catalog has `type` field: `tablet` | `syrup` | `injection` (injections include vaccines)
  - Prescription card: full-width Morning/Afternoon/Evening/Night toggle buttons; Quantity + Duration side-by-side
  - Tablet quantity: Full / Half / 1/3 / 1/4 dropdown
  - Syrup quantity: ml dropdown (2.5 → 30 ml)
  - Injection quantity: free numeric input (ml/units)
  - Vaccine "Next Year" toggle — auto-sets next due date to same day next year
- Mark in-progress / pause / complete
- Last visit summary
- Branch name shown in top bar (switcher for multi-branch)

### Auth & Routing
- Email + password login
- Google OAuth
- Role-based routing: doctor → `/vet`, receptionist → `/reception/home`, admin/owner → `/admin`
- Multi-branch selector screen (`/select-branch`) for staff assigned to multiple branches
- Legacy staff docs without `role` field handled gracefully

### Admin Panel
- `/admin` dashboard
- Clinic management: create/edit clinics with white-label branding (colors, logo, tagline)
- Branch management: add/edit branches per clinic
- Doctor management: invite doctors via backend API (Firebase Auth + Firestore + invite link)
- Staff management: invite receptionists via backend API; staff page reads from `clinics/{clinicId}/staff` subcollection and displays the list; role is always Receptionist
- Catalog management (4 tabs): Diagnoses, Medicines, Services, Grooming

### Consultation Summary Page
- Public route: `/visit/:visitId/summary?clinicId=...&branchId=...`
- White-label branding from clinic config
- Shows diagnosis, prescriptions, vaccines, consultation notes
- Print button
- WhatsApp checkout message includes the summary link

### Backend API (`apps/backend`)
- Bun + Elysia layered architecture
- `POST /api/admin/users` — create Firebase Auth user + staff doc + doctor doc, returns invite link
- `PUT /api/admin/users/:uid` — update branchIds/role/isActive
- `DELETE /api/admin/users/:uid` — disable user
- Auth middleware: verifies Firebase ID token, checks admin/owner role

### Firestore Security
- Public read access on visits, clinic branding, branch info, and visit subcollections — enables unauthenticated owners to open queue and summary links on mobile
- All other paths (petOwners, pets, catalogs, staff, tokenCounters) require authentication
- Rules live in `firestore.rules` at repo root, deployed via `firebase deploy --only firestore:rules`

### Token System
- Branch-wide sequential counter (`tokenCounters/{date}` under branch)
- Token prefix = last 3 chars of doctor's last name (e.g. `ESH-0001`)
- Resets daily; counter doc auto-created on first check-in

---

## Changelog

| Version | Date       | Changes |
|---------|------------|---------|
| 1.1.8   | 2026-04-18 | Production URL fix: `VITE_APP_DOMAIN` renamed to `VITE_APP_BASE_URL` (full URL); `.env.production` now points to `https://shomer.app` so consultation summary links in WhatsApp messages use the correct production domain. WA message: "Thank you for choosing us" replaced with dynamic clinic name fetched from Firestore (`useClinicName` hook) — applies to both Queue/Dashboard and Checkout tabs. Staff listing fix: backend now writes non-doctor staff to `clinics/{clinicId}/staff/{uid}` subcollection on creation (in addition to root `staff/{uid}`); admin staff page reads from this subcollection and displays the list. Admin staff page simplified: role dropdown removed — staff created via this page are always Receptionist. Queue + Checkout right panel: consultation notes now shown as a separate section; vaccines split out from Prescription into their own section (Syringe icon); section order is Diagnosis → Consultation Notes → Prescription → Vaccines → Services. Clicking empty space in the left list on Queue or Checkout tabs now closes the right panel. `consultationNotes` added to `AllVisit` type and snapshot mapping so notes are available on the Queue tab. |
| 1.1.7   | 2026-04-12 | App: added `VITE_API_URL` to `.env.production` pointing to Railway backend — production builds were falling back to `localhost:3000`, silently breaking all admin invite actions. Rebuilt and redeployed to Firebase Hosting. |
| 1.1.6   | 2026-04-12 | Backend: fixed Firestore connectivity on Railway — switched to REST transport (`preferRest: true`) as gRPC fails silently in Railway's container environment. Added `ignoreUndefinedProperties: true` to prevent crashes on optional fields (e.g. `phone`). Added try/catch around Firestore call in auth middleware so failures return a clean 500 instead of an unhandled crash. Backend `POST /api/admin/users` end-to-end verified in production. |
| 1.1.5   | 2026-04-12 | Backend: fixed critical security bug in auth middleware — `onBeforeHandle` was not blocking unauthorized requests due to incorrect Elysia hook scope (`derive` replaced with `onBeforeHandle { as: 'scoped' }`). Fixed Railway deployment — `nixpacks.toml` updated to explicitly declare Bun via `nixPkgs`. Backend now live and verified at `shomer-backend-production-cee7.up.railway.app`. |
| 1.1.4   | 2026-04-12 | Check-in registration: pet Color/Markings (text) and owner Alternate Phone (+91, optional, same validation as primary) fields added. Services UI (vet + receptionist): replaced flat search with accordion grouped by `serviceType`; global search box (filters across all types); inline editable unit price and quantity (qty × price = line total, defaults 1×); type accordions are single-open with smooth scroll-to-top on expand. Doctor consultation: "Mark Complete" now opens a confirmation popup showing services, quantities, and total before saving. Receptionist checkout: same accordion UI with full add/remove/price/qty edit capability. Seeder script: `bun scripts/seed-services.ts --file path.xlsx --clinicId <id>` imports services from Excel with `serviceType` support. Data model: `ClinicService.serviceType` added; `ServiceLineItem.quantity` added; `Pet.color` added; `PetOwner.altPhone` added; `otherComplaintText` deprecated on Visit (all complaints now first-class strings in `complaints[]`). |
| 1.1.3   | 2026-04-12 | Check-in: complaints input replaced with typeahead tag-input (keyboard nav, filters predefined list on focus/type, custom free-text complaints via `+ Add` row, guards against empty/duplicate/exact-match). Removed `otherComplaintText` special case — custom complaints are now first-class strings in `complaints[]`. Registration: new fields for pet color (text) and owner alternate phone (+91, same validation as primary). Global: logout now shows confirmation dialog on all 4 views (receptionist, vet, admin, dashboard) with async error handling (dialog stays open on failure). |
| 1.1.2   | 2026-04-06 | Check-in: owner phone search field (+91 hardcoded, 10-digit exact match, AND with name/breed); phone pre-fills registration form for new patients. Vet: medicine `type` field (tablet/syrup/injection) on catalog; prescription card redesigned with full-width timing toggles and side-by-side qty/duration; tablet qty options Full/Half/1/3/1/4; syrup ml dropdown; injection free input; vaccine "Next Year" toggle auto-sets next-due to +1 year. Confirmation: removed email sent message. |
| 1.1.1   | 2026-03-31 | Bug fixes: check-in state persisted via sessionStorage (tab-switch safe), WhatsApp share replaced with web.whatsapp.com modal + phone validation, queue link mobile display fix + WA share on confirmation screen, doctor settings as overlay (no receptionist sidebar), Firestore public read rules for queue/summary pages (fixes mobile failures), medicine days input allows clearing |
| 1.1.0   | 2026-03-22 | Multi-branch support, admin panel, token overhaul (branch-wide sequential + name prefix), enhanced toasts with sound, consultation summary page (public/white-label), backend API for user management, diagnosisCatalog/medicinesCatalog collection renames |
| 1.0.0   | 2026-03-22 | Initial documented state — reception check-in, vet console, auth |
