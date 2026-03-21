# Shomer App — Current State

## Version: 1.1.0
## Last Updated: 2026-03-22

---

## Current Features

### Reception
- Check-in flow (search/register owner + pet, select doctor, assign token)
- Queue view (all visits today, real-time updates)
- Check-out/billing (mark billed, WhatsApp summary link)
- Home dashboard (stats, doctor cards, recent completions)
- Settings (duty roster, catalogs: diagnoses, medicines, services)
- Branch name shown in sidebar (static label or dropdown switcher for multi-branch)
- Stacked notification toasts with sound: "Call Patient" (in-progress) and "Consultation Complete" (completed)

### Vet Console
- Queue sidebar (waiting patients, real-time)
- Consultation form (diagnosis, prescription, vaccines, services, notes)
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
- Staff management: invite receptionists/admins the same way
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

### Token System
- Branch-wide sequential counter (`tokenCounters/{date}` under branch)
- Token prefix = last 3 chars of doctor's last name (e.g. `ESH-0001`)
- Resets daily; counter doc auto-created on first check-in

---

## Changelog

| Version | Date       | Changes |
|---------|------------|---------|
| 1.1.0   | 2026-03-22 | Multi-branch support, admin panel, token overhaul (branch-wide sequential + name prefix), enhanced toasts with sound, consultation summary page (public/white-label), backend API for user management, diagnosisCatalog/medicinesCatalog collection renames |
| 1.0.0   | 2026-03-22 | Initial documented state — reception check-in, vet console, auth |
