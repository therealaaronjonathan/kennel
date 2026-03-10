---
description: Firestore data model — entities, relationships, subcollection hierarchy, and field conventions for Shomer.
---

# Data Model

## Firestore Collection Hierarchy

```
clinics/{clinicId}
├── pets/{petId}                      # clinic-level — not branch-specific
├── branches/{branchId}
│   ├── doctors/{doctorId}
│   ├── petOwners/{ownerId}
│   ├── queues/{queueId}              # one per doctor per day
│   └── visits/{visitId}              # flat under branch for cross-cutting queries
│       ├── diagnoses/{diagnosisId}
│       ├── prescriptions/{prescriptionId}
│       └── bills/{billId}
```

## Why This Shape

Firestore rewards nesting for ownership/security but punishes it for cross-cutting queries. Visits sit under Branch (not under Pet) because three different roles query them:

- **Receptionist**: "all visits today at this branch" → query `visits` where `date == today`
- **Vet**: "my visits today" → query `visits` where `doctorId == me && date == today`
- **Pet owner**: "my pet's history" → query `visits` where `petId == x`

All three work with Visit at the branch level using indexed fields. If Visit were nested under `petOwners/{id}/pets/{id}/visits`, only the pet owner query would be simple.

Diagnosis, Prescription, and Bill are subcollections of Visit because they are always accessed in the context of a specific visit — never queried across all visits in V1.

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

### Doctor
A vet assigned to a branch.

```ts
interface Doctor {
  id: string            // matches Firebase Auth UID
  branchId: string
  clinicId: string
  name: string
  phone: string
  specialization?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Pet Owner

```ts
interface PetOwner {
  id: string
  branchId: string
  clinicId: string
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
  ownerId: string
  petId: string
  tokenNumber: number
  type: 'consultation' | 'vaccination' | 'emergency' | 'follow-up'
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  queuePosition: number  // position in doctor's queue at time of check-in
  date: string           // YYYY-MM-DD
  startedAt?: Timestamp  // when vet begins consultation
  completedAt?: Timestamp
  notes?: string         // vet's general notes
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Status flow**: `waiting` → `in-progress` → `completed`
Emergency visits skip the queue: they are inserted with `queuePosition: 0` and `type: 'emergency'`.

### Diagnosis
Subcollection of Visit. Skipped for vaccination-type visits.

```ts
interface Diagnosis {
  id: string
  visitId: string
  condition: string
  severity?: 'mild' | 'moderate' | 'severe'
  notes?: string
  createdAt: Timestamp
}
```

### Prescription
Subcollection of Visit. Present for all visit types (vaccinations include vaccine details here).

```ts
interface Prescription {
  id: string
  visitId: string
  items: PrescriptionItem[]
  notes?: string
  sentToOwner: boolean
  sentVia?: 'whatsapp' | 'sms' | 'email'
  sentAt?: Timestamp
  createdAt: Timestamp
}

interface PrescriptionItem {
  name: string           // medicine or vaccine name
  dosage?: string
  frequency?: string
  duration?: string
  batchNumber?: string   // for vaccines
  nextDueDate?: Timestamp // for vaccines
}
```

### Bill
Subcollection of Visit.

```ts
interface Bill {
  id: string
  visitId: string
  items: BillItem[]
  totalAmount: number
  currency: string       // default: 'INR'
  sentToOwner: boolean
  sentVia?: 'whatsapp' | 'sms' | 'email'
  sentAt?: Timestamp
  createdAt: Timestamp
}

interface BillItem {
  description: string
  amount: number
}
```

## Firestore Conventions

### Document IDs
- Use Firestore auto-generated IDs for most documents
- Queue IDs use composite format: `{doctorId}_{YYYY-MM-DD}` for easy lookup
- Doctor IDs match Firebase Auth UIDs

### Field Conventions
- All documents include `createdAt` and `updatedAt` Timestamps
- All subcollection documents carry ancestor IDs (`clinicId`, `branchId`) for denormalization — this enables collection group queries when needed
- Use `Timestamp` type (not strings or numbers) for all date-time fields
- `date` fields (YYYY-MM-DD strings) are for day-level grouping and querying

### Denormalization
Firestore is not relational — denormalize where it avoids extra reads:
- Visit carries `ownerId`, `petId`, `doctorId` as fields (not just path-based)
- Pet carries `clinicId` for security rules (no `branchId` — pet is clinic-level)
- Doctor carries `branchId` and `clinicId` for security rules
- Do NOT denormalize names or labels — fetch those via separate reads when displaying

### Indexing
Composite indexes needed for V1:
- `visits`: (`branchId`, `date`, `status`) — receptionist dashboard
- `visits`: (`doctorId`, `date`, `status`) — vet queue view
- `visits`: (`petId`, `date`) — pet history
- `pets`: `microchipNumber` — single field index for chip-based lookup

### Security Rules Pattern
- Branch-level documents (`visits`, `petOwners`, `doctors`, `queues`): user's `clinicId` and `branchId` must match the document's fields
- Clinic-level documents (`pets`): user's `clinicId` must match — any staff member across any branch of the clinic can access all pets

## Visit Type Flows

### Consultation / Follow-up
Check-in → Visit created (`waiting`) → Vet starts (`in-progress`) → Diagnosis recorded → Prescription recorded → Vet completes (`completed`) → Receptionist sends Bill + Prescription

### Vaccination
Check-in → Visit created (`waiting`, type `vaccination`) → Vet starts → **No diagnosis** → Prescription recorded (vaccine details) → Vet completes → Receptionist sends Bill + Prescription

### Emergency
Vet hits emergency button → Visit created (`in-progress`, type `emergency`, queuePosition `0`) → Owner details collected during/after → Diagnosis → Prescription → Bill
