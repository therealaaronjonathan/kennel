---
description: Firestore data model — entities, relationships, subcollection hierarchy, and field conventions for Shomer.
---

# Data Model

## Firestore Collection Hierarchy

```
staff/{staffId}                       # ROOT level — auth bootstrap only (see note below)

clinics/{clinicId}
├── staff/{staffId}                   # clinic-level — full staff profile
├── doctors/{doctorId}                # clinic-level — branchIds for assignment
├── petOwners/{ownerId}               # clinic-level — branchIds for branches visited
├── pets/{petId}                      # clinic-level — not branch-specific
├── diagnoses/{diagnosisId}           # clinic-level — master diagnosis list
├── medicines/{medicineId}            # clinic-level — master medicine list
├── services/{serviceId}              # clinic-level — services with prices
├── branches/{branchId}
│   ├── queues/{queueId}              # one per doctor per day
│   └── visits/{visitId}              # flat under branch for cross-cutting queries
│       ├── diagnoses/{diagnosisId}   # one doc per selected diagnosis
│       ├── prescriptions/{prescriptionId}  # one doc per prescribed medicine
│       └── vaccines/{vaccineId}      # one doc per vaccine administered
```

**Root-level `staff/{uid}` — auth bootstrap**: A minimal lookup document exists at the root (outside any clinic) for every staff member. It contains only `{ clinicId, branchIds }`. This solves the chicken-and-egg problem — the app needs `clinicId` to read anything under `clinics/{clinicId}`, but can't know `clinicId` before authenticating. On login, the app reads `staff/{uid}` directly by path (no query needed), gets `clinicId` and `branchIds`, then uses those for all subsequent reads. The full staff profile lives at `clinics/{clinicId}/staff/{uid}`.

## Why This Shape

Firestore rewards nesting for ownership/security but punishes it for cross-cutting queries.

**Doctors, Pet Owners, and Staff at clinic level**: these entities can operate across multiple branches. A single source of truth at clinic level with a `branchIds` array avoids duplication and data drift. Branch-specific context (like which doctor is available where) is derived from `branchIds` — no separate assignment subcollection needed for V1.

**Master lists (diagnoses, medicines, services) at clinic level**: these are shared across all branches of the clinic. Vets can add to these lists inline during consultation. Settings page provides full CRUD. Each item has `isActive: boolean` for soft-delete — items are never hard deleted so historical visit data remains interpretable.

**Visits under Branch**: three different roles query them:

- **Receptionist**: "all visits today at this branch" → query `visits` where `date == today`
- **Vet**: "my visits today" → query `visits` where `doctorId == me && date == today`
- **Pet owner**: "my pet's history" → query `visits` where `petId == x`

All three work with Visit at the branch level using indexed fields. If Visit were nested under `petOwners/{id}/pets/{id}/visits`, only the pet owner query would be simple.

**Diagnosis, Prescription, and Vaccine** are subcollections of Visit because they are always accessed in the context of a specific visit — never queried across all visits in V1. One Firestore document per selected item (not a single doc with an array) for clean write semantics.

## Entity Definitions

### Clinic
Top-level entity. One per organization.

```ts
interface Clinic {
  id: string
  name: string
  logoUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
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

### Staff
Clinic-level. Receptionists, admins, and other non-vet staff. `branchIds` determines which branches they can access.

```ts
interface Staff {
  id: string            // matches Firebase Auth UID
  clinicId: string
  branchIds: string[]   // branches this staff member works at
  name: string
  phone: string
  email?: string
  role: 'receptionist' | 'admin' | 'owner'
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Doctor
Clinic-level. `branchIds` determines which branches the doctor is assigned to — used to populate the doctor dropdown at check-in.

```ts
interface Doctor {
  id: string            // matches Firebase Auth UID
  clinicId: string
  branchIds: string[]   // branches this doctor works at
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
  branchIds: string[]   // branches where this owner has checked in
  name: string
  phone: string         // primary lookup field at check-in
  email?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Pet
Direct subcollection of Clinic — not branch-specific. A pet belongs to the clinic as a whole so its history is unified regardless of which branch it visits.

```ts
interface Pet {
  id: string             // Firestore auto-ID — internal use only
  clinicId: string
  ownerId: string        // primary owner (the person who registered the pet)
  name: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  breed?: string
  dateOfBirth?: Timestamp
  weight?: number        // kg
  sex?: 'male' | 'female'
  notes?: string
  microchipNumber?: string  // optional — indexed for lookup; front office instructed to enter for dogs
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Known limitation**: different people bringing the same pet under different phone numbers will create duplicate pet records. This is an accepted V1 trade-off — to be resolved with a pet merge feature in a future increment.

### ClinicDiagnosis
Clinic-level master list of diagnoses. Vets can add to this inline during consultation or via Settings. Soft-deleted via `isActive`.

```ts
interface ClinicDiagnosis {
  id: string
  name: string        // e.g. "Parvovirus", "Skin Allergy"
  isActive: boolean   // false = soft-deleted; hidden from vet console, shown in Settings for restore
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### ClinicMedicine
Clinic-level master list of medicines. Managed via Settings page.

```ts
interface ClinicMedicine {
  id: string
  name: string        // e.g. "Amoxicillin 250mg", "Metronidazole"
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### ClinicService
Clinic-level catalogue of services with fixed prices. Used for auto-billing.

```ts
interface ClinicService {
  id: string
  name: string        // e.g. "Consultation", "X-Ray", "Deworming"
  price: number       // fixed price in INR
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Queue
One per doctor per day. Tracks the ordered list of visits for real-time queue display.

```ts
interface Queue {
  id: string             // format: {doctorId}_{YYYY-MM-DD}
  doctorId: string
  branchId: string
  clinicId: string
  date: string           // YYYY-MM-DD
  currentToken: number   // last issued token for this branch today (shared counter)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Token numbering**: tokens are sequential per branch per day (T1, T2, T3...), reset daily. The branch-wide counter lives on the Queue docs — when issuing a token, read all queues for the branch on that date and increment from the highest `currentToken`.

### Visit
The core transactional record. Flat under Branch for cross-cutting queries.

```ts
interface Visit {
  id: string
  branchId: string
  clinicId: string
  doctorId: string
  doctorName: string      // denormalized for display
  ownerId: string
  ownerName: string       // denormalized for display
  petId: string
  petName: string         // denormalized for display
  tokenNumber: number
  tokenDisplay: string    // e.g. "D-0001"
  type: 'consultation' | 'vaccination' | 'emergency' | 'follow-up'
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  isEmergency: boolean
  complaints: string[]    // from check-in
  queuePosition: number   // position in doctor's queue at time of check-in
  date: string            // YYYY-MM-DD
  // Set on completion:
  consultationNotes?: string    // vet's overall free-text notes for the consultation
  services?: ServiceLineItem[]  // services availed (denormalized from ClinicService at time of visit)
  billAmount?: number           // sum of all service prices — auto-calculated on completion
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface ServiceLineItem {
  serviceId: string   // ref to clinics/{clinicId}/services/{serviceId}
  name: string        // denormalized at write time — survives master list changes
  price: number       // denormalized at write time — price locked at time of visit
}
```

**Status flow**: `waiting` → `in-progress` → `completed`
Emergency visits skip the queue: they are inserted with `queuePosition: 0` and `isEmergency: true`.

**Services and billing on the Visit doc**: `services` (array of ServiceLineItem) and `billAmount` are written directly to the visit document when the vet marks it complete. This allows the receptionist dashboard to read billing info from a single document without subcollection reads.

### Diagnosis (Visit subcollection)
One document per selected diagnosis per visit. Multiple diagnoses per visit are supported.

```ts
interface VisitDiagnosis {
  id: string
  diagnosisId: string | null  // ref to clinics/{clinicId}/diagnoses/{id}
                               // null if vet typed a custom diagnosis and chose not to save it
  name: string                 // denormalized at write time
  notes: string                // vet's per-diagnosis notes (may be empty)
  isCustom: boolean            // true if not from the master list
  createdAt: Timestamp
}
```

**Custom diagnoses**: when a vet types a diagnosis name not in the master list, they are prompted to save it to the clinic list. Whether they save it or not, the diagnosis is recorded on the visit with `isCustom: true` and `diagnosisId: null`.

### Prescription (Visit subcollection)
One document per prescribed medicine per visit.

```ts
interface VisitPrescription {
  id: string
  medicineId: string | null  // ref to clinics/{clinicId}/medicines/{id}; null if custom
  name: string               // denormalized at write time
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number               // number of days to take the medicine
  isCustom: boolean
  createdAt: Timestamp
}
```

### Vaccine (Visit subcollection)
One document per vaccine administered per visit.

```ts
interface VisitVaccine {
  id: string
  name: string           // vaccine name
  batch: string | null   // batch/lot number
  nextDue: string | null // next due date (YYYY-MM-DD string)
  createdAt: Timestamp
}
```

## Auth & Branch Selection Flow

1. User lands on login page and selects a branch from a dropdown
2. User authenticates via Firebase Auth
3. App validates the user's `branchIds` includes the selected branch
4. Selected branch is stored in app state for the session

Users with a single branch skip the branch selector. Clinic owners with access to all branches see the full list.

## Settings Page

Route: `/settings` — accessible to all authenticated staff.

Three tabs:
- **Diagnoses**: Add/restore items in `clinics/{clinicId}/diagnoses`. Vets can also add inline during consultation.
- **Medicines**: Add/restore items in `clinics/{clinicId}/medicines`.
- **Services**: Add/restore items in `clinics/{clinicId}/services` — includes price configuration.

Soft-delete pattern: toggling `isActive: false` hides an item from vet console dropdowns but keeps it visible in Settings (greyed out with a Restore button). Historical visit data always uses denormalized names so removing from master list never breaks old records.

## Firestore Conventions

### Document IDs
- Use Firestore auto-generated IDs for most documents
- Queue IDs use composite format: `{doctorId}_{YYYY-MM-DD}` for easy lookup
- Doctor and Staff IDs match Firebase Auth UIDs

### Field Conventions
- All documents include `createdAt` and `updatedAt` Timestamps
- All subcollection documents carry ancestor IDs (`clinicId`, `branchId`) for denormalization — this enables collection group queries when needed
- Use `Timestamp` type (not strings or numbers) for all date-time fields
- `date` fields (YYYY-MM-DD strings) are for day-level grouping and querying

### Denormalization
Firestore is not relational — denormalize where it avoids extra reads:
- Visit carries `ownerId`, `petId`, `doctorId`, `ownerName`, `petName`, `doctorName` for display without extra reads
- `services` and `billAmount` are denormalized onto the Visit doc at completion time
- VisitDiagnosis and VisitPrescription denormalize `name` from the master list at write time — master list deletes/changes never break historical records
- Pet carries `clinicId` for security rules (no `branchId` — pet is clinic-level)

### Indexing
Composite indexes needed for V1:
- `visits`: (`branchId`, `date`, `status`) — receptionist dashboard
- `visits`: (`doctorId`, `date`, `status`) — vet queue view
- `visits`: (`petId`, `date`) — pet history
- `pets`: `microchipNumber` — single field index for chip-based lookup
- `clinics/{id}/diagnoses`: `isActive` — vet console active filter
- `clinics/{id}/medicines`: `isActive` — vet console active filter
- `clinics/{id}/services`: `isActive` — vet console active filter

Collection group indexes needed for cross-branch pet history:
- `diagnoses`: `petId` (collection group scope)
- `prescriptions`: `petId` (collection group scope)

### Security Rules Pattern
- Branch-level documents (`visits`, `queues`): user's `clinicId` and selected `branchId` must match the document's fields
- Clinic-level documents (`pets`, `petOwners`, `doctors`, `staff`, `diagnoses`, `medicines`, `services`): user's `clinicId` must match — any staff member across any branch of the clinic can access these

## Visit Type Flows

### Consultation / Follow-up
Check-in → Visit created (`waiting`) → Vet starts (`in-progress`) → Selects diagnoses (from master list or custom) + writes consultation notes → Prescribes medicines (timing + days) → Selects services availed → Vet completes (`completed`) → `services[]` and `billAmount` written to visit doc → Receptionist sees itemized bill on dashboard → Sends Bill + Prescription

### Vaccination
Check-in → Visit created (`waiting`, type `vaccination`) → Vet starts → **No diagnosis** → Vaccine details recorded (name, batch, next due) → Services availed selected → Vet completes → Receptionist sends Bill

### Emergency
Vet hits emergency button → Visit created (`in-progress`, type `emergency`, `isEmergency: true`, `queuePosition: 0`) → Owner details collected during/after → Diagnosis → Prescription → Services + Bill
