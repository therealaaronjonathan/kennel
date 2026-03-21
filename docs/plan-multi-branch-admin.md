# Implementation Plan: Multi-Branch Support + Admin Panel

> **Status:** Approved for execution
> **Date:** 2026-03-22
> **Scope:** Multi-branch login, token overhaul, enhanced toasts, consultation summary page, admin panel, backend API, hooks

---

## Pre-requisites Before Execution

1. **Rename Firestore collections** (manual or via migration script):
   - `clinics/{clinicId}/diagnosis` → `clinics/{clinicId}/diagnosisCatalog`
   - `clinics/{clinicId}/medicines` → `clinics/{clinicId}/medicinesCatalog`
   - Update all frontend code referencing the old collection names
2. **Seed first admin user** — see [Section 12: Data Seeding](#section-12-data-seeding-required)
3. **Download Firebase service account key** — see [Section 7: Backend API](#section-7-backend-api)
4. **Add `role` field to all existing `staff/{uid}` docs** — `'doctor'` if `doctorId` exists, `'receptionist'` otherwise

---

## Execution Order

```
1. Rename collections (diagnosisCatalog, medicinesCatalog) + update all references
2. Backend setup (Section 7)
3. Data model skill rewrite (Section 9)
4. ClinicProvider refactor + branch selector (Section 1)
5. Login/auth flow updates (Section 8)
6. Branch-aware UI labels (Section 2)
7. Token generation overhaul (Section 3)
8. Admin panel frontend (Section 6)
9. Enhanced toasts with sound (Section 4) — can parallelize with 8
10. Consultation summary page (Section 5) — can parallelize with 8
11. CLAUDE.md rule + Stop hook + app-updates.md (Section 10)
12. Testing checklist (Section 11)
```

---

## Section 1: Multi-Branch Selection Flow

### What changes
`use-clinic.tsx` currently auto-selects `branchIds[0]`. Add an intermediate branch selector screen and store the selection in context with a switcher.

### Data model used
- Reads: `staff/{uid}` → `branchIds[]`, `role`, `doctorId`
- Reads: `clinics/{clinicId}/branches/{branchId}` → `name`, `address`, `phone`

### UX — Branch Selector Screen (`/select-branch`)
1. User logs in → app reads `staff/{uid}` → gets `branchIds[]`
2. If `branchIds.length === 1` → auto-select, skip to role-based destination (`/vet`, `/reception/home`, or `/admin`)
3. If `branchIds.length > 1` → redirect to `/select-branch`
4. Screen shows a card for each branch: **branch name**, address, phone
5. User clicks a card → branch stored in `ClinicProvider` state → redirect to role-based destination
6. This screen is protected by `AuthGuard` (must be logged in)

### UX — Branch Switcher (Doctor top bar)
- Small dropdown in the vet page top bar showing current branch name
- Only visible if `branchIds.length > 1`
- Clicking another branch triggers a full re-fetch (resets vet page state, re-queries queue for new branch)

### UX — Branch Switcher (Receptionist sidebar)
- Below the logo in the sidebar, show current branch name
- If `branchIds.length > 1`, it's a clickable dropdown to switch
- If `branchIds.length === 1`, it's just a static label (no dropdown affordance)
- Switching triggers full re-fetch of all receptionist data

### Changes to `ClinicProvider`
```ts
interface ClinicContextValue {
  clinicId: string | null
  branchId: string | null
  branchIds: string[]         // NEW — full list
  branchName: string | null   // NEW — display name of selected branch
  doctorId: string | null
  role: string | null         // NEW — 'doctor' | 'receptionist' | 'admin' | 'owner'
  loading: boolean
  error: string | null
  selectBranch: (branchId: string) => void  // NEW — setter
}
```

After reading `staff/{uid}`, the provider fetches branch docs to resolve names. `selectBranch()` updates `branchId` + `branchName` in state. No persistence — session-level only.

### What could break
- Every feature currently calls `useClinic()` and gets `branchId`. This still works — `branchId` is always set before any feature page renders (the selector or auto-select happens first). No downstream changes needed.
- The login redirect logic changes (currently in `login-page.tsx`). Must now check: single branch → go to destination; multi-branch → go to `/select-branch`.

---

## Section 2: Branch-Aware UI Labels

### Vet Page
- Top bar currently shows clinic/doctor info. Add **branch name** prominently.
- Format: `Dr. Rajesh · Koramangala Branch`

### Receptionist Pages
- Sidebar shows branch name below logo (Section 1 covers the switcher)
- Reception Home dashboard header: add branch name (e.g., "Today at Koramangala Branch")

### No data model changes
Just reading `branchName` from `ClinicProvider`.

---

## Section 3: Token Generation Overhaul

### What changes
- Token number becomes **branch-wide sequential** (shared counter across all doctors in the branch)
- Token prefix becomes **last 3 letters of doctor's name** (uppercase)
- **Remove** `queues/{doctorId}_{date}` docs entirely to avoid confusion

### Data model — new branch-level counter doc
```
clinics/{clinicId}/branches/{branchId}/tokenCounters/{date}
```
```ts
interface TokenCounter {
  date: string          // YYYY-MM-DD (also the doc ID)
  currentToken: number  // branch-wide counter, resets daily
  updatedAt: Timestamp
}
```

### Token generation logic
```
Doctor name: "Dr. Rajesh" → last word "Rajesh" → last 3 → "ESH"
Doctor name: "Dr. Kumar"  → last word "Kumar"  → last 3 → "MAR"

Branch-wide counter: 1, 2, 3, 4, 5...

Results:
  Patient 1 → Dr. Rajesh → ESH-0001
  Patient 2 → Dr. Kumar  → MAR-0002
  Patient 3 → Dr. Rajesh → ESH-0003
```

Prefix derivation: `doctorName.split(/\s+/).pop()!.slice(-3).toUpperCase()`
If doctor name is fewer than 3 chars in last word, use whatever is available (e.g., "Dr. Li" → "LI-0001").

### Changes to `checkin-service.ts`
- Transaction reads `tokenCounters/{date}` instead of `queues/{doctorId}_{date}`
- Creates the counter doc if it doesn't exist (first checkin of the day)
- Increments branch-wide counter atomically
- `tokenDisplay = \`${prefix}-${String(nextToken).padStart(4, '0')}\``
- Remove ALL code that reads/writes `queues/{doctorId}_{date}` docs
- Also update `registerAndCheckin` — same token logic applies

### What could break
- **On deployment day:** Branch-wide counter starts at 0. Deploy at start of day before any checkins.
- **Old visits:** `tokenDisplay` is denormalized on the visit doc, so existing visits display their original token format. Safe.
- **Any code reading `queues/{doctorId}_{date}`** must be found and removed/updated.

### Data seeding required
None. `tokenCounters/{date}` is created automatically on first checkin of the day.

---

## Section 4: Enhanced Notification Toasts with Sound

### What changes
- Two toast types: "Call Patient" (status → in-progress) and "Consultation Complete" (status → completed)
- Toasts include: token, pet name, doctor name
- Multiple toasts stack simultaneously
- Ping sound on each toast

### UX — Toast Design

**"Call Patient" toast (status → in-progress):**
```
🩺 Call Patient
ESH-0003 — Bella (Dr. Rajesh)
```
Purple left-border accent.

**"Consultation Complete" toast (status → completed):**
```
✓ Consultation Complete
ESH-0003 — Bella (Dr. Rajesh) is done
```
Green left-border accent.

### Toast stacking
- Toasts stack vertically from top-right
- Each auto-dismisses after 6 seconds
- State: `useState<Toast[]>` instead of `useState<string | null>`
- Queue toasts if fired simultaneously — show up to 3, remaining appear as earlier ones dismiss

### Sound
- Add `public/sounds/notification.mp3` (short royalty-free ping)
- Play via `new Audio('/sounds/notification.mp3').play()` when a toast fires
- Wrap in try-catch (browser autoplay restrictions — works after user interaction)

### Changes to `receptionist-layout.tsx`
- Track both `in-progress` and `completed` transitions via `seenIds` refs
- Push to a `toasts[]` array state instead of single string
- Render multiple toast components with offset positioning
- Each toast calls `removeToast(id)` on dismiss
- Visit data already has `doctorName` on the visit doc — no extra reads needed

### What could break
- Refactor from single toast to array-based must preserve "seed on first load" behavior — don't toast existing in-progress visits on page load.
- Sound may not play if browser hasn't received user interaction yet — acceptable for v1.

---

## Section 5: Consultation Summary Page (White-Label)

### What changes
- New public route: `/visit/:visitId/summary`
- Query params: `clinicId`, `branchId`
- No auth required — anyone with the link can view
- White-label branding from clinic config
- Printable + PDF download (client-side)

### Data model — add branding to clinic doc
```
clinics/{clinicId}
```
```ts
interface ClinicBranding {
  primaryColor: string    // default: "#9979FF"
  accentColor: string     // default: "#FAE8C7"
  backgroundColor: string // default: "#FEFAFF"
  textColor: string       // default: "#1A1825"
  tagline?: string        // e.g., "Compassionate Care for Your Pets"
}

// Added to existing clinic doc:
interface Clinic {
  // ... existing fields ...
  logoUrl?: string
  branding?: ClinicBranding
}
```

### Data reads for the page
1. `clinics/{clinicId}` → name, logoUrl, branding
2. `clinics/{clinicId}/branches/{branchId}` → branch name, address, phone
3. `clinics/{clinicId}/branches/{branchId}/visits/{visitId}` → visit details (petName, ownerName, ownerPhone, doctorName, tokenDisplay, consultationNotes, date, doctorId)
4. `clinics/{clinicId}/branches/{branchId}/visits/{visitId}/diagnoses` → all diagnoses
5. `clinics/{clinicId}/branches/{branchId}/visits/{visitId}/prescriptions` → all prescriptions
6. `clinics/{clinicId}/branches/{branchId}/visits/{visitId}/vaccines` → all vaccines
7. `clinics/{clinicId}/doctors/{doctorId}` → doctor details (name, specialization, phone)

### UX — Page Layout
```
┌─────────────────────────────────────────────┐
│  [Clinic Logo]     CLINIC NAME              │
│                    Branch Name · Address     │
│                    Phone                     │
├─────────────────────────────────────────────┤
│  CONSULTATION SUMMARY                       │
│  Date: 21 Mar 2026     Token: ESH-0003      │
│  Doctor: Dr. Rajesh    Pet: Bella (Dog)      │
│  Owner: John Smith     Phone: +91 98765...   │
├─────────────────────────────────────────────┤
│  DIAGNOSIS                                  │
│  • Skin Allergy — Notes from vet here       │
│  • Ear Infection                            │
├─────────────────────────────────────────────┤
│  PRESCRIPTIONS                              │
│  ┌──────────────┬───┬───┬───┬───┬──────┐   │
│  │ Medicine     │ M │ A │ E │ N │ Days │   │
│  ├──────────────┼───┼───┼───┼───┼──────┤   │
│  │ Amoxicillin  │ ✓ │   │ ✓ │   │  5   │   │
│  │ Cetirizine   │   │ ✓ │   │ ✓ │  7   │   │
│  └──────────────┴───┴───┴───┴───┴──────┘   │
├─────────────────────────────────────────────┤
│  VACCINES                                   │
│  • Rabies — Batch: RB2024 — Next: 21 Sep 26│
├─────────────────────────────────────────────┤
│  CONSULTATION NOTES                         │
│  "Pet is recovering well. Follow-up in..."  │
├─────────────────────────────────────────────┤
│  [Download PDF]   [Print]                   │
│  (hidden when printing)                     │
└─────────────────────────────────────────────┘
```

### White-label rendering
- On page load, fetch `clinic.branding` config
- Apply as CSS variables on a wrapper div: `--clinic-primary`, `--clinic-accent`, `--clinic-bg`, `--clinic-text`
- All elements use these variables instead of the app's design tokens
- Logo loaded from `clinic.logoUrl` (any URL — Firebase Storage or external)
- If `branding` is absent, fall back to Shomer defaults (#9979FF, #FAE8C7, #FEFAFF, #1A1825)

### PDF + Print
- Add `html2pdf.js` as a dependency
- "Download PDF" button: `html2pdf().from(element).save()`
- "Print" button: `window.print()`
- Both buttons hidden via `@media print { .no-print { display: none } }`

### WhatsApp message update
- In `checkout-page.tsx`, update the pre-filled WhatsApp message to include the summary link
- Domain from environment variable:
  - `VITE_APP_DOMAIN=shomer-app-test` (test)
  - `VITE_APP_DOMAIN=shomer-app-prod` (production)
- Link format: `https://${VITE_APP_DOMAIN}.web.app/visit/${visitId}/summary?clinicId=${clinicId}&branchId=${branchId}`

### What could break
Nothing — new route, additive WhatsApp message change.

### Data seeding required
Add `branding` object + `logoUrl` to existing clinic doc(s). Falls back to defaults if absent.

---

## Section 6: Admin Panel (Frontend)

### What changes
- New route group: `/admin/*`
- Protected by `AuthGuard` + role check (`role === 'admin'` or `role === 'owner'`)
- Separate layout from receptionist (own sidebar, own navigation)
- Frontend route within `apps/shomer-app`

### Routing
```
/admin                          → Dashboard (overview)
/admin/clinics                  → List clinics
/admin/clinics/:id              → Clinic detail + edit branding
/admin/clinics/:id/branches     → List/add branches
/admin/clinics/:id/doctors      → List/add doctors
/admin/clinics/:id/staff        → List/add staff (receptionists, admins)
/admin/clinics/:id/catalogs     → Tabs: Diagnoses | Medicines | Services | Grooming
```

### UX — Admin Sidebar
```
┌──────────────┐
│ [Shomer Logo]│
│              │
│ Dashboard    │
│ Clinics      │
│              │
│ ── Clinic ── │  (context section, appears after selecting a clinic)
│ Branches     │
│ Doctors      │
│ Staff        │
│ Catalogs     │
│              │
│ [Sign out]   │
└──────────────┘
```

### UX — Add Clinic Flow
1. Admin at `/admin/clinics` clicks "Add Clinic"
2. Form: Name, Logo upload (optional), Branding colors (color pickers with Shomer defaults pre-filled), Tagline (optional)
3. Submits → creates `clinics/{id}` doc directly from frontend (simple Firestore write)

**Firestore result:**
```
clinics/{clinicId}
  ├── name: "Happy Paws Clinic"
  ├── logoUrl: "https://storage.googleapis.com/..."
  ├── branding: { primaryColor, accentColor, backgroundColor, textColor, tagline }
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### UX — Add Branch Flow
1. Admin at `/admin/clinics/:id/branches` clicks "Add Branch"
2. Form: Name, Address, Phone
3. Submits → creates `clinics/{clinicId}/branches/{id}` doc

**Firestore result:**
```
clinics/{clinicId}/branches/{branchId}
  ├── name: "Koramangala Branch"
  ├── address: "123 Main St, Koramangala"
  ├── phone: "+91 9876543210"
  ├── isActive: true
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### UX — Add Doctor Flow
1. Admin navigates to `/admin/clinics/:id/doctors`
2. Sees table of existing doctors: name, email, branches, status (active/invited)
3. Clicks "Add Doctor"
4. Form: Name, Email, Phone, Specialization, Branch assignment (multi-select from clinic's branches)
5. Submits → calls backend `POST /api/admin/users`
6. Backend:
   a. Creates Firebase Auth user with email + display name
   b. Creates root `staff/{uid}` doc
   c. Creates `clinics/{clinicId}/doctors/{uid}` doc
   d. Generates password reset link
7. Response returns the password reset link
8. UI shows a **"Copy Invite Link"** button — admin copies and shares with the doctor (WhatsApp, email, etc.)
9. Doctor appears in the table with status "Invited"

**Firestore result:**
```
staff/{uid}
  ├── clinicId: "clinic_001"
  ├── branchIds: ["branch_A", "branch_B"]
  ├── doctorId: "{uid}"
  ├── role: "doctor"
  └── email: "rajesh@example.com"

clinics/clinic_001/doctors/{uid}
  ├── clinicId: "clinic_001"
  ├── branchIds: ["branch_A", "branch_B"]
  ├── name: "Dr. Rajesh"
  ├── phone: "+91 9876543210"
  ├── specialization: "General"
  ├── isActive: true
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

**Doctor's first login flow:**
1. Doctor receives invite link from admin
2. Clicks link → Firebase's "Set Password" page
3. Sets password → redirected to app login page
4. Logs in with email + password → `staff/{uid}` found → role is `doctor`
5. If `branchIds.length > 1` → branch selector → selects branch → `/vet`
6. If `branchIds.length === 1` → auto-select → `/vet`
7. OR if doctor uses Google OAuth with same email → Firebase auto-links provider → same flow

### UX — Add Receptionist / Admin Staff Flow
1. Admin navigates to `/admin/clinics/:id/staff`
2. Sees table: name, email, role, branches, status
3. Clicks "Add Staff"
4. Form: Name, Email, Phone, Role dropdown (receptionist / admin), Branch assignment (multi-select)
5. Submits → calls backend `POST /api/admin/users`
6. Same backend flow as doctor, but no `clinics/{clinicId}/doctors/{uid}` doc created, no `doctorId` on staff doc
7. "Copy Invite Link" shown

**Firestore result (receptionist):**
```
staff/{uid}
  ├── clinicId: "clinic_001"
  ├── branchIds: ["branch_A"]
  ├── role: "receptionist"
  └── email: "priya@example.com"
```

**Firestore result (admin):**
```
staff/{uid}
  ├── clinicId: "clinic_001"
  ├── branchIds: ["branch_A", "branch_B"]
  ├── role: "admin"
  └── email: "admin@example.com"
```

### UX — Catalogs (Diagnoses, Medicines, Services, Grooming)
- Tabbed interface at `/admin/clinics/:id/catalogs`
- 4 tabs: **Diagnoses** | **Medicines** | **Services** | **Grooming**
- Each tab: searchable list with add/edit/soft-delete (set `isActive: false`)
- Grooming services: same shape as regular services (`name`, `price`, `isActive`)

**Firestore paths:**
```
clinics/{clinicId}/diagnosisCatalog/{id}    → { name, isActive }
clinics/{clinicId}/medicinesCatalog/{id}    → { name, isActive }
clinics/{clinicId}/services/{id}            → { name, price, isActive }
clinics/{clinicId}/groomingServices/{id}    → { name, price, isActive }
```

### What could break
- **Login redirect logic** — `getDestination()` in `login-page.tsx` changes. Must handle `role` field. If existing staff doc lacks `role`, fall back to: `doctorId` exists → doctor, otherwise → receptionist.
- **Root staff doc schema** — adding `role` field. Existing docs without `role` must be handled gracefully.

---

## Section 7: Backend API (`apps/backend`)

### What changes
- Create `apps/backend/` from scratch following `.claude/rules/backend.md`
- Elysia + Bun, layered architecture (routes → service → repository)
- Firebase Admin SDK for user management

### Structure
```
apps/backend/src/
├── app.ts                  # Elysia app factory
├── index.ts                # Entry point (.listen())
├── features/
│   └── admin/
│       ├── routes.ts       # POST /api/admin/users, PUT, DELETE
│       ├── service.ts      # Business logic
│       ├── repository.ts   # Firestore writes via Admin SDK
│       └── models.ts       # TypeBox validation schemas
├── middleware/
│   ├── auth.ts             # Verify Firebase ID token, check admin role
│   └── error-handler.ts    # Consistent { success, data?, error? } responses
├── lib/
│   ├── firebase-admin.ts   # Firebase Admin SDK initialization
│   └── response.ts         # Response shape helper
└── types/
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/admin/users` | Create Firebase Auth user + staff doc + doctor doc (if applicable). Returns invite link. |
| `PUT` | `/api/admin/users/:uid` | Update user (branchIds, role, isActive) |
| `DELETE` | `/api/admin/users/:uid` | Disable user (set `isActive: false`, disable Firebase Auth account) |

### Auth middleware
- Frontend sends Firebase ID token in `Authorization: Bearer <token>` header
- Backend verifies token via Admin SDK `auth.verifyIdToken(token)`
- Reads caller's `staff/{uid}.role` — must be `admin` or `owner`
- Rejects with `403 Forbidden` if not admin

### `POST /api/admin/users` — request body
```ts
{
  clinicId: string
  branchIds: string[]
  name: string
  email: string
  phone: string
  role: 'doctor' | 'receptionist' | 'admin'
  specialization?: string  // doctors only
}
```

### `POST /api/admin/users` — service logic
```
1. Create Firebase Auth user: admin.auth().createUser({ email, displayName: name })
2. Get uid from created user
3. Create staff/{uid}: { clinicId, branchIds, role, email, doctorId: uid if role==='doctor' else omit }
4. If role === 'doctor':
   Create clinics/{clinicId}/doctors/{uid}: { clinicId, branchIds, name, phone, specialization, isActive: true, createdAt, updatedAt }
5. Generate password reset link: admin.auth().generatePasswordResetLink(email)
6. Return { success: true, data: { uid, email, role, inviteLink } }
```

### `POST /api/admin/users` — response
```ts
{
  success: true,
  data: {
    uid: "abc123",
    email: "rajesh@example.com",
    role: "doctor",
    inviteLink: "https://shomer-app.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=..."
  }
}
```

### Environment variables (`apps/backend/.env`)
```
FIREBASE_SERVICE_ACCOUNT_PATH=./shomer-xxxxx-firebase-adminsdk-xxxxx.json
PORT=3000
```

### Firebase service account setup
1. Go to Firebase Console → select Shomer project
2. Gear icon (⚙️) → Project settings → Service accounts tab
3. Click "Generate new private key" → confirm → JSON downloads
4. Move JSON to `apps/backend/` directory
5. Add to `apps/backend/.gitignore`: `*-firebase-adminsdk-*.json`
6. Set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`

### Response shape (all endpoints)
```ts
// Success
{ success: true, data: T }

// Error
{ success: false, error: "Human-readable error message" }
```

---

## Section 8: Auth Flow Updates

### Login page changes

**Current flow:**
1. User signs in (email+password or Google OAuth)
2. App checks `staff/{uid}` for `doctorId` → routes to `/vet` or `/reception/home`

**Updated flow:**
1. User signs in (email+password or Google OAuth)
2. App reads `staff/{uid}`:
   - Doc doesn't exist → show error: "No account found. Contact your administrator."
   - `role === 'admin' || role === 'owner'` → check branch count → `/admin` or `/select-branch`
   - `role === 'doctor'` (or legacy: `doctorId` exists but no `role` field) → check branch count → `/vet` or `/select-branch`
   - `role === 'receptionist'` (or legacy: no `doctorId` and no `role`) → check branch count → `/reception/home` or `/select-branch`

**Branch count check (applied after role determination):**
- `branchIds.length === 1` → auto-select branch, go to role destination
- `branchIds.length > 1` → go to `/select-branch` (which then redirects to role destination after selection)

### Legacy staff doc handling (no `role` field)
```ts
function resolveRole(staffDoc: StaffDoc): string {
  if (staffDoc.role) return staffDoc.role
  // Legacy fallback
  return staffDoc.doctorId ? 'doctor' : 'receptionist'
}
```

### Google OAuth auto-linking
- Admin creates user with email via Admin SDK
- If user logs in with Google OAuth using same email → Firebase auto-links providers
- `user.uid` matches → `staff/{uid}` lookup works
- No special handling needed

### What could break
- Existing users without `role` field — handled by `resolveRole()` fallback
- Existing login flow must still work during transition period

---

## Section 9: Data Model Skill Rewrite

Rewrite `.claude/skills/data-model/SKILL.md` to reflect ALL current state:

### Changes to document
- Add `role` field to root `staff/{uid}` doc (values: `'doctor' | 'receptionist' | 'admin' | 'owner'`)
- Add `branding` object and `logoUrl` to `clinics/{clinicId}` doc
- Add `tokenCounters/{date}` subcollection under branch
- Add `groomingServices` subcollection under clinic
- **Rename** `diagnosis` → `diagnosisCatalog` at clinic level
- **Rename** `medicines` → `medicinesCatalog` at clinic level
- Remove `queues/{doctorId}_{date}` — replaced by branch-wide `tokenCounters/{date}`
- Update token numbering description (branch-wide sequential + last-3-letter prefix)
- Update auth flow description (admin creates users via backend, password reset link shared manually)
- Document the admin role and routing logic
- Add `VITE_APP_DOMAIN` env variable documentation

---

## Section 10: CLAUDE.md Rule + Stop Hook + App Updates

### 10a: Data model sync — CLAUDE.md rule (zero cost)

Add to `/Users/aj/Shomer/kennel/CLAUDE.md`:

```markdown
## Rules
- When you modify Firestore collection paths, document fields, or data model structures,
  update `.claude/skills/data-model/SKILL.md` to reflect the change before ending the session.
```

### 10b: Session summary — Stop hook (prompt-based)

Add to `.claude/settings.json` (project-level):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if the stop_hook_active field is true in the input. If it is, respond with {\"ok\": true}. Otherwise, look at the conversation context. Were any significant code changes made (new features, bug fixes, refactors, data model changes)? If yes, respond with {\"ok\": false, \"reason\": \"Session produced code changes. Summarize what was built or changed to the user and ask if they want to update docs/app-updates.md with a new changelog entry and bump the version.\"}. If the session was only discussion or planning with no code written, respond with {\"ok\": true}."
          }
        ]
      }
    ]
  }
}
```

### 10c: `docs/app-updates.md` — structure

```markdown
# Shomer App — Current State

## Version: 1.0.0
## Last Updated: 2026-03-22

---

## Current Features

### Reception
- Check-in flow (search/register owner + pet, select doctor, assign token)
- Queue view (all visits today, real-time updates)
- Check-out/billing (mark billed, WhatsApp summary link)
- Home dashboard (stats, doctor cards, recent completions)
- Settings (duty roster, catalogs)

### Vet Console
- Queue sidebar (waiting patients, real-time)
- Consultation form (diagnosis, prescription, vaccines, services, notes)
- Mark in-progress / pause / complete
- Last visit summary

### Auth
- Email + password login
- Google OAuth
- Role-based routing (vet / receptionist)

---

## Changelog

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0.0   | 2026-03-22 | Initial documented state — reception check-in, vet console, auth |
```

When the Stop hook fires and user approves:
- Claude updates "Current Features" if features were added/changed
- Claude adds a new row to the Changelog table
- Claude bumps the version (user confirms major/minor/patch)
- Claude updates "Last Updated" date

---

## Section 11: Breaking Changes & Testing Checklist

| # | Test | Risk | Why |
|---|------|------|-----|
| 1 | Single-branch doctor login | Medium | Must auto-skip branch selector, go straight to `/vet` |
| 2 | Multi-branch doctor login | High | New flow — branch selector must appear, selection must propagate |
| 3 | Single-branch receptionist login | Medium | Must auto-skip selector, sidebar shows static branch name |
| 4 | Multi-branch receptionist login | High | Selector + sidebar switcher must work, full re-fetch on switch |
| 5 | Admin login | High | New flow — must route to `/admin`, not `/reception` |
| 6 | Existing user without `role` field | High | Must not crash — resolveRole() fallback must work |
| 7 | New token format on checkins | High | Verify `ESH-0001` format, branch-wide sequential |
| 8 | Old visits display | Medium | Old `D-0001` tokens still display correctly (denormalized) |
| 9 | Two simultaneous toast notifications | Medium | Both show, stacked, with sound |
| 10 | Consultation summary page loads | Medium | All sections render, branding applies |
| 11 | Consultation summary PDF download | Medium | Clean PDF, no action buttons |
| 12 | Consultation summary print | Low | Clean print layout |
| 13 | WhatsApp message with summary link | Low | Link correct, opens summary page |
| 14 | Admin creates doctor | High | Auth user + staff doc + doctor doc created, invite link returned |
| 15 | New doctor first login (password reset) | High | Sets password → login → branch selector → vet page |
| 16 | New doctor Google OAuth login | High | Auto-links → staff doc found → works |
| 17 | Branch switcher re-fetch (vet) | Medium | Switching shows new branch's queue, clears stale data |
| 18 | Branch switcher re-fetch (receptionist) | Medium | Same as above for receptionist data |
| 19 | Catalog CRUD from admin | Medium | All 4 tabs: diagnoses, medicines, services, grooming |
| 20 | Collection rename: diagnosisCatalog | High | All existing references updated, no broken queries |
| 21 | Collection rename: medicinesCatalog | High | All existing references updated, no broken queries |
| 22 | Admin creates admin user | Medium | New admin can log in and access `/admin` |
| 23 | Receptionist with no branch configured | Low | Edge case — should show error, not crash |

---

## Section 12: Data Seeding Required

| What | Where | When | How |
|------|-------|------|-----|
| First admin user | Firebase Auth Console + Firestore | Before admin panel | 1. Create user in Firebase Auth Console. 2. Add `staff/{uid}` doc: `{ clinicId: "...", branchIds: [...], role: "admin", email: "..." }` |
| `role` field on existing staff docs | Firestore `staff/{uid}` | Before deployment | Add `role: 'doctor'` where `doctorId` exists, `role: 'receptionist'` otherwise |
| `branding` on clinic doc | Firestore `clinics/{clinicId}` | Optional (defaults work) | Add `branding: { primaryColor: "#9979FF", accentColor: "#FAE8C7", backgroundColor: "#FEFAFF", textColor: "#1A1825" }` |
| `logoUrl` on clinic doc | Firestore `clinics/{clinicId}` | Optional | Upload logo to Firebase Storage, add URL to clinic doc |
| `groomingServices` collection | Firestore `clinics/{clinicId}/groomingServices/{id}` | When needed | Seed via admin panel once built, or manually add docs |
| Firebase service account key | `apps/backend/.env` | Before backend runs | Download from Firebase Console → Project Settings → Service Accounts |
| Notification sound file | `apps/shomer-app/public/sounds/notification.mp3` | Before toast sound | Add a royalty-free notification ping MP3 |
| `VITE_APP_DOMAIN` env var | `apps/shomer-app/.env` | Before WhatsApp links work | `VITE_APP_DOMAIN=shomer-app-test` (test) or `VITE_APP_DOMAIN=shomer-app-prod` (production) |
| Rename `diagnosis` → `diagnosisCatalog` | Firestore | Before deployment | Migrate docs from old to new collection path |
| Rename `medicines` → `medicinesCatalog` | Firestore | Before deployment | Migrate docs from old to new collection path |
