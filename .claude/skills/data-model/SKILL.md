---
description: Firestore data model — entities, relationships, subcollection hierarchy, and field conventions for Shomer.
---

# Data Model

## Firestore Collection Hierarchy

```
staff/{staffId}                             # ROOT level — auth bootstrap only (see note below)

clinics/{clinicId}
├── doctors/{doctorId}                      # clinic-level — branchIds for assignment
├── staff/{staffId}                         # clinic-level — non-doctor staff (receptionist/admin); mirrors root staff doc for listing
├── petOwners/{ownerId}                     # clinic-level — branchIds for branches visited
├── pets/{petId}                            # clinic-level — not branch-specific
├── diagnosisCatalog/{diagnosisId}          # clinic-level — master diagnosis list
├── medicinesCatalog/{medicineId}           # clinic-level — master medicine list
├── services/{serviceId}                    # clinic-level — services with prices
├── groomingServices/{groomingServiceId}    # clinic-level — grooming services with prices
├── branches/{branchId}
│   ├── tokenCounters/{date}               # one doc per day — branch-wide token counter
│   └── visits/{visitId}                   # flat under branch for cross-cutting queries
│       ├── diagnoses/{diagnosisId}        # one doc per selected diagnosis
│       ├── prescriptions/{prescriptionId} # one doc per prescribed medicine
│       └── vaccines/{vaccineId}           # one doc per vaccine administered
```

**Root-level `staff/{uid}` — auth bootstrap**: A minimal lookup document exists at the root (outside any clinic) for every staff member. It contains `{ clinicId, branchIds, role, email, doctorId? }`. This solves the chicken-and-egg problem — the app needs `clinicId` to read anything under `clinics/{clinicId}`, but can't know `clinicId` before authenticating. On login, the app reads `staff/{uid}` directly by path (no query needed), gets `clinicId`, `branchIds`, and `role`, then uses those for all subsequent reads.

## Why This Shape

Firestore rewards nesting for ownership/security but punishes it for cross-cutting queries.

**Doctors, Pet Owners, and Staff at clinic level**: these entities can operate across multiple branches. A single source of truth at clinic level with a `branchIds` array avoids duplication and data drift.

**Master lists (diagnosisCatalog, medicinesCatalog, services, groomingServices) at clinic level**: shared across all branches. Each item has `isActive: boolean` for soft-delete.

**Visits under Branch**: three different roles query them:
- **Receptionist**: "all visits today at this branch" → query `visits` where `date == today`
- **Vet**: "my visits today" → query `visits` where `doctorId == me && date == today`
- **Pet owner**: "my pet's history" → query `visits` where `petId == x`

**Token counters under Branch**: `tokenCounters/{date}` holds the branch-wide sequential counter. All doctors in a branch share this counter, so token numbers are globally sequential per branch per day.

## Entity Definitions

### Clinic
Top-level entity. One per organization. Includes white-label branding.

```ts
interface Clinic {
  id: string
  name: string
  logoUrl?: string
  branding?: ClinicBranding
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface ClinicBranding {
  primaryColor: string      // default: "#9979FF"
  accentColor: string       // default: "#FAE8C7"
  backgroundColor: string   // default: "#FEFAFF"
  textColor: string         // default: "#1A1825"
  tagline?: string
}
```

### Branch
A physical location belonging to a clinic.

```ts
interface Branch {
  id: string
  clinicId: string
  name: string
  address: string
  phone: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Staff (root-level — auth bootstrap)
Root-level auth bootstrap document. Created by backend when admin adds a user.

```ts
interface StaffBootstrap {
  clinicId: string
  branchIds: string[]
  role: 'doctor' | 'receptionist' | 'admin' | 'owner'
  email: string
  doctorId?: string   // present only when role === 'doctor' (equals uid)
}
```

**Legacy staff docs** without a `role` field are handled by fallback logic: if `doctorId` is present → treat as `'doctor'`; otherwise → treat as `'receptionist'`.

### ClinicStaff (collection: `staff`, under clinic)
Clinic-level listing of non-doctor staff (receptionist/admin). Written by the backend at the same time as the root `staff/{uid}` doc. Used by the admin staff page to list staff without a full-collection scan.

```ts
interface ClinicStaffMember {
  clinicId: string
  branchIds: string[]
  role: 'receptionist' | 'admin'
  name: string
  email: string
  phone: string | null
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Doctor
Clinic-level. `branchIds` determines which branches the doctor is assigned to.

```ts
interface Doctor {
  id: string            // matches Firebase Auth UID
  clinicId: string
  branchIds: string[]
  name: string
  phone: string
  specialization?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Pet Owner
Clinic-level. `branchIds` tracks which branches the owner has visited.

```ts
interface PetOwner {
  id: string
  clinicId: string
  branchIds: string[]
  name: string
  phone: string          // +91 prefix + 10 digits
  altPhone?: string      // optional alternate contact, same format
  email?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Pet
Direct subcollection of Clinic — not branch-specific.

```ts
interface Pet {
  id: string
  clinicId: string
  ownerId: string
  name: string
  petNameLower: string    // lowercase for case-insensitive search
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  speciesName?: string    // when species === 'other'
  breed?: string
  dateOfBirth?: string    // YYYY-MM-DD; age is derived at display time via lib/age.ts
  color?: string          // coat color/markings, free text
  microchipNumber?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Legacy `age` field**: pre-existing pet docs created before v1.1.14 may have an `age?: number` field. The current code never reads it; new writes use `dateOfBirth` only. The legacy field can stay on old docs without affecting behaviour (display falls through to nothing if `dateOfBirth` is absent).

### DiagnosisCatalog (collection: `diagnosisCatalog`)
Clinic-level master list. Soft-deleted via `isActive`.

```ts
interface DiagnosisCatalogItem {
  id: string
  name: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### MedicinesCatalog (collection: `medicinesCatalog`)
Clinic-level master list. Managed via Settings page and Admin panel.

```ts
interface MedicinesCatalogItem {
  id: string
  name: string
  type: 'tablet' | 'syrup' | 'injection'  // drives quantity UI in prescription
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Why `type` lives on the catalog item**: The quantity control shown when prescribing a medicine depends entirely on its form — tablets use a fixed-choice dropdown (Full / Half / 1/3), syrups use an ml dropdown, and injections use a free numeric input. Storing `type` on the catalog item means the vet view doesn't need to guess or ask; it renders the right control automatically. `injection` also covers vaccines so the prescription subcollection has a single unified shape. Any catalog document missing `type` defaults to `'tablet'` in the app as a safe fallback.

### ClinicService (collection: `services`)
Clinic-level catalogue of services with prices. Populated and managed via the Settings page, Admin panel, or the `scripts/seed-services.ts` CLI seeder (imports from Excel).

```ts
interface ClinicService {
  id: string
  name: string
  price: number           // unit price in INR
  serviceType?: string    // free-text category (e.g. "Consultation", "Grooming"); drives accordion grouping in UI
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**`serviceType`**: optional free-text string. Services without it (or with an empty string) are grouped under "General" in the UI accordion. Written by the seeder tool and editable via admin catalog. The UI groups services alphabetically by type with "General" pinned last.

### GroomingService (collection: `groomingServices`)
Clinic-level grooming services catalogue. Same shape as regular services.

```ts
interface GroomingService {
  id: string
  name: string
  price: number
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### TokenCounter (branch subcollection: `tokenCounters/{date}`)
Branch-wide daily token counter. Replaces per-doctor queue docs.

```ts
interface TokenCounter {
  date: string          // YYYY-MM-DD (also the doc ID)
  currentToken: number  // branch-wide counter, resets daily
  updatedAt: Timestamp
}
```

**Token format**: `{PREFIX}-{NNNN}` where PREFIX = last 3 letters of doctor's last name (uppercase), NNNN = zero-padded branch-wide sequential number.
```
Doctor: "Dr. Rajesh" → last word "Rajesh" → last 3 → "ESH"
Patient 1 → Dr. Rajesh → ESH-0001
Patient 2 → Dr. Kumar  → MAR-0002
Patient 3 → Dr. Rajesh → ESH-0003
```
Derivation: `doctorName.split(/\s+/).pop()!.slice(-3).toUpperCase()`

The counter doc is created automatically on first check-in of the day. No seeding required.

### Visit
The core transactional record. Flat under Branch.

```ts
interface Visit {
  id: string
  branchId: string
  clinicId: string
  doctorId: string
  doctorName: string
  ownerId: string
  ownerName: string
  petId: string
  petName: string
  tokenNumber: number
  tokenDisplay: string    // e.g. "ESH-0001"
  service: string
  type: 'consultation' | 'vaccination' | 'emergency' | 'follow-up' | 'grooming'
  status: 'waiting' | 'in-progress' | 'completed' | 'billed' | 'cancelled'
  isEmergency: boolean
  complaints: string[]        // free-text strings; may include predefined labels or custom typed text
  otherComplaintText?: string // DEPRECATED — legacy field from before v1.1.3; new visits omit this
  groomingServices: string[]
  queuePosition: number
  date: string            // YYYY-MM-DD
  consultationNotes?: string
  services?: ServiceLineItem[]
  billAmount?: number     // sum of (quantity × price) for all service line items
  payments?: PaymentEntry[]  // up to 3 entries, each method at most once; sum equals billAmount when status is 'billed'
  amountPaid?: number     // denormalized sum of payments[].amount; used for queue filters and partial display
  petWeightKg?: number       // weight at time of consultation (kg); optional, entered by vet
  petTemperatureF?: number   // body temperature in Fahrenheit; optional, entered by vet
  billedAt?: Timestamp    // set when status transitions to 'billed'; preserved when payments are later edited
  consultationDraft?: ConsultationDraft  // vet's in-progress form state; cleared on completeVisit
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface ConsultationDraft {
  diagnoses: { diagnosisId: string | null; name: string; notes: string; isCustom: boolean }[]
  consultationNotes: string
  medicines: { medicineId: string | null; name: string; type: 'tablet'|'syrup'|'injection'; quantity: string; morning: boolean; afternoon: boolean; evening: boolean; night: boolean; days: number; isCustom: boolean; mealTiming?: 'before'|'after' }[]
  services: { serviceId: string; name: string; price: number; quantity: number }[]
  vaccines: { name: string; batch: string; nextDue: string }[]  // array — supports multiple vaccines per visit
  petWeightKg?: number
  petTemperatureF?: number   // body temperature in Fahrenheit
  savedAt: Timestamp
}

interface ServiceLineItem {
  serviceId: string
  name: string
  price: number           // unit price at time of visit (may differ from catalog price if edited)
  quantity: number        // defaults to 1; line total = quantity × price
}

interface PaymentEntry {
  method: 'cash' | 'card' | 'upi'
  amount: number          // INR integer; > 0
}
```

**Status flow**: `waiting` → `in-progress` → `completed` → `billed`

**Billing & partial payments**: at checkout the receptionist records one or more `PaymentEntry` rows.
- `sum(payments) === billAmount` → status flips to `billed`, `billedAt` set.
- `0 < sum(payments) < billAmount` → status stays `completed` (partial payment); the visit remains in the Checkout queue and **carries over across days** until fully paid.
- Receptionists may edit `payments` on a billed visit from the queue, but the new sum must equal `billAmount`. Zero-amount entries are dropped on save (so a 4500/0 split saves as a single-method visit).
- `billedAt` is preserved on edits.

**Checkout list semantics**: the Checkout page queries all branch visits with `status === 'completed'` (no date filter). Client-side it keeps (a) today's pending bills regardless of payment state, plus (b) any cross-day visit where `amountPaid > 0` (partial). Cross-day completed visits with no payment are dropped so abandoned consultations don't pile up. Carry-overs render in a separate "Pending from earlier days" section above today's pending list, sorted oldest-first.

**Consultation drafts**: while a vet is filling in diagnoses/notes/medicines/services/vaccine on a visit, the in-progress form is persisted to `visit.consultationDraft`. Two write paths:
- **Pause**: when the vet taps Pause, `pauseVisit()` writes the current draft alongside `status: 'waiting'` so resuming the patient (or switching back from another) restores the form.
- **Background autosave**: while a visit is `in-progress`, the `ConsultationView` component runs a debounced 30s autosave that writes the latest draft silently (no UI). Best-effort — failures are swallowed.

`ConsultationView` is keyed by `entry.id` in the vet page, so switching patients remounts the component and re-reads the draft from `entry.consultationDraft` (surfaced by `useVetQueue`). `completeVisit()` clears the draft via `deleteField()` on success so finished visits don't carry stale draft data.

### Diagnosis (Visit subcollection)

```ts
interface VisitDiagnosis {
  id: string
  diagnosisId: string | null  // ref to clinics/{clinicId}/diagnosisCatalog/{id}; null if custom
  name: string
  notes: string
  isCustom: boolean
  createdAt: Timestamp
}
```

### Prescription (Visit subcollection)

```ts
interface VisitPrescription {
  id: string
  medicineId: string | null  // ref to clinics/{clinicId}/medicinesCatalog/{id}; null if custom
  name: string
  type: 'tablet' | 'syrup' | 'injection'
  quantity: string           // "1" / "1/2" / "1/3" for tablets; "5" (ml) for syrups; free value for injections
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
  isCustom: boolean
  mealTiming?: 'before' | 'after'  // optional; whether medicine is taken before or after food
  createdAt: Timestamp
}
```

### Vaccine (Visit subcollection)

```ts
interface VisitVaccine {
  id: string
  name: string
  batch: string | null
  nextDue: string | null
  createdAt: Timestamp
}
```

## Auth & Role-Based Routing

### Login flow
1. User authenticates via Firebase Auth (email+password or Google OAuth)
2. App reads root `staff/{uid}` doc
3. If doc doesn't exist → error: "No account found. Contact your administrator."
4. Resolve role using `resolveRole()`:
   ```ts
   function resolveRole(staffDoc): string {
     if (staffDoc.role) return staffDoc.role
     return staffDoc.doctorId ? 'doctor' : 'receptionist'  // legacy fallback
   }
   ```
5. If `branchIds.length === 1` → auto-select branch, go to role destination
6. If `branchIds.length > 1` → go to `/select-branch`

### Role destinations
| Role | Destination |
|------|-------------|
| `doctor` | `/vet` |
| `receptionist` | `/reception/home` |
| `admin` or `owner` | `/admin` |

### Branch selector (`/select-branch`)
- Shows a card per branch (name, address, phone)
- Protected by AuthGuard
- After selection → navigates to role destination

## Admin Panel Routes

```
/admin                         → Dashboard
/admin/clinics                 → List clinics
/admin/clinics/:id             → Clinic detail + branding edit
/admin/clinics/:id/branches    → List/add branches
/admin/clinics/:id/doctors     → List/add doctors
/admin/clinics/:id/staff       → List/add staff
/admin/clinics/:id/catalogs    → Tabs: Diagnoses | Medicines | Services | Grooming
```

Admin can create users via the backend API (`POST /api/admin/users`). The backend creates the Firebase Auth account, `staff/{uid}` doc, and (for doctors) `clinics/{clinicId}/doctors/{uid}` doc. It returns a password reset link which the admin shares with the new user.

## Backend API

Base URL: `http://localhost:3000` (dev) or configurable via `PORT` env var.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/admin/users` | Admin token | Create user + staff doc + doctor doc |
| `PUT` | `/api/admin/users/:uid` | Admin token | Update branchIds/role/isActive |
| `DELETE` | `/api/admin/users/:uid` | Admin token | Disable user |
| `GET` | `/api/health` | None | Health check |

All endpoints except `/api/health` require `Authorization: Bearer <Firebase ID token>` where the token belongs to a staff member with `role: 'admin'` or `'owner'`.

## Environment Variables

### Frontend (`apps/shomer-app/.env`)
```
VITE_APP_DOMAIN=shomer-app-test    # or shomer-app-prod for production
```
Used to construct the consultation summary link shared via WhatsApp:
`https://${VITE_APP_DOMAIN}.web.app/visit/${visitId}/summary?clinicId=${clinicId}&branchId=${branchId}`

### Backend (`apps/backend/.env`)
```
FIREBASE_SERVICE_ACCOUNT_PATH=./shomer-xxxxx-firebase-adminsdk-xxxxx.json
PORT=3000
```

## Consultation Summary Page

Public (no auth) route: `/visit/:visitId/summary?clinicId=...&branchId=...`

Reads:
1. `clinics/{clinicId}` → name, logoUrl, branding
2. `clinics/{clinicId}/branches/{branchId}` → branch name, address, phone
3. `clinics/{clinicId}/branches/{branchId}/visits/{visitId}` → visit details
4. Sub-collections: `diagnoses/`, `prescriptions/`, `vaccines/`
5. `clinics/{clinicId}/doctors/{doctorId}` → doctor name, specialization

## Settings Page

Route: `/reception/settings` — accessible to receptionist staff.

Tabs:
- **Diagnoses**: CRUD for `clinics/{clinicId}/diagnosisCatalog`
- **Medicines**: CRUD for `clinics/{clinicId}/medicinesCatalog`
- **Services**: CRUD for `clinics/{clinicId}/services`

Admin panel provides full catalog management at `/admin/clinics/:id/catalogs` (adds Grooming tab).

## Visit History Page

Route: `/reception/history` — accessible to receptionist, admin, owner. Read-only.

Always restricted to finished visits (`status ∈ {billed, completed}`); waiting/in-progress/cancelled are excluded. Filters: date range (default today→today, presets Today / Last 7 days), search (pet/owner/token), services multi-select (from `clinics/{clinicId}/services`), payment method (All/Cash/Card/UPI/Split — same semantics as Queue). KPI strip shows Total Earned (sum of `amountPaid`), Visits Completed (count where status ∈ {billed, completed}), and per-method breakdown summing to total.

Query: range filter on `date` field (no composite index needed — single-field range). Capped at 200 most recent results sorted by `billedAt` desc with fallback to `updatedAt`/`createdAt`. Detail panel reuses `VisitDetailPanel` with `canEditPaymentMethod` omitted (read-only).

## Firestore Conventions

### Document IDs
- Firestore auto-IDs for most documents
- `tokenCounters` doc ID = `YYYY-MM-DD` date string
- Doctor and Staff IDs match Firebase Auth UIDs

### Field Conventions
- All documents include `createdAt` and `updatedAt` Timestamps
- `date` fields = YYYY-MM-DD strings for day-level grouping
- Subcollection documents carry ancestor IDs for denormalization

### Denormalization
- Visit carries `ownerName`, `petName`, `doctorName` — display without extra reads
- `services` and `billAmount` denormalized onto Visit at completion
- VisitDiagnosis/VisitPrescription denormalize `name` at write time — master list changes never break historical records

### Indexing
Composite indexes needed:
- `visits`: (`branchId`, `date`, `status`) — receptionist dashboard
- `visits`: (`doctorId`, `date`, `status`) — vet queue view
- `clinics/{id}/diagnosisCatalog`: `isActive`
- `clinics/{id}/medicinesCatalog`: `isActive`
- `clinics/{id}/services`: `isActive`

### Security Rules Pattern
- Branch-level documents: user's `clinicId` and `branchId` must match
- Clinic-level documents: user's `clinicId` must match
- Consultation summary page reads are public (no auth) — enforce via narrow read-only rules
