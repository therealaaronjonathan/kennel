import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { DocumentData, DocumentReference, UpdateData } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Pet } from '../types'

// Firestore caps a WriteBatch at 500 operations. A single pet's visit history
// fits easily, but a long-tenured owner with many visits can exceed it, so we
// commit in chunks. This is eventually-consistent across chunks, not atomic.
const BATCH_LIMIT = 500

interface PendingUpdate {
  ref: DocumentReference<DocumentData>
  data: UpdateData<DocumentData>
}

async function commitChunked(updates: PendingUpdate[]): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const u of updates.slice(i, i + BATCH_LIMIT)) {
      batch.update(u.ref, u.data)
    }
    await batch.commit()
  }
}

/**
 * Correct a pet's name everywhere it is stored:
 *  1. the canonical pet doc (`name` + `petNameLower` so search keeps working),
 *  2. the denormalized `petName` on every visit for that pet, across all branches,
 *  3. the `petName` snapshot on any matching `billingDefaults` doc.
 *
 * Queue/Checkout lists are real-time (onSnapshot) so they reflect the change
 * automatically; the History report and check-in search re-read on their own.
 */
export async function updatePetName(
  clinicId: string,
  branchIds: string[],
  petId: string,
  newNameRaw: string,
): Promise<void> {
  const name = newNameRaw.trim()
  if (!name) throw new Error('Pet name cannot be empty')

  await updateDoc(doc(db, `clinics/${clinicId}/pets/${petId}`), {
    name,
    petNameLower: name.toLowerCase(),
    updatedAt: serverTimestamp(),
  })

  const updates: PendingUpdate[] = []

  for (const branchId of branchIds) {
    const branchVisitIds = new Set<string>()

    const visitsSnap = await getDocs(
      query(
        collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
        where('petId', '==', petId),
      ),
    )
    for (const v of visitsSnap.docs) {
      branchVisitIds.add(v.id)
      updates.push({ ref: v.ref, data: { petName: name, updatedAt: serverTimestamp() } })
    }

    // billingDefaults doc id === visitId; the collection is tiny (capped ~50).
    const bdSnap = await getDocs(
      collection(db, `clinics/${clinicId}/branches/${branchId}/billingDefaults`),
    )
    for (const bd of bdSnap.docs) {
      if (branchVisitIds.has(bd.id)) {
        updates.push({ ref: bd.ref, data: { petName: name } })
      }
    }

    // Payment-ledger rows carry a petName snapshot; correct them too.
    const paySnap = await getDocs(
      query(
        collection(db, `clinics/${clinicId}/branches/${branchId}/payments`),
        where('petId', '==', petId),
      ),
    )
    for (const p of paySnap.docs) {
      updates.push({ ref: p.ref, data: { petName: name } })
    }
  }

  await commitChunked(updates)
}

export interface PetDetailsInput {
  name: string
  species: Pet['species']
  speciesName?: string
  breed?: string
  gender?: 'male' | 'female' | ''
  dateOfBirth?: string
  color?: string
  microchipNumber?: string
}

/**
 * Update a pet's full details. The non-denormalized fields (species, breed,
 * gender, dob, color, microchip) are a single doc update. A name change is
 * routed through `updatePetName` so the denormalized `petName` on every visit /
 * billing-default / ledger row is corrected too (and `petNameLower` for search).
 */
export async function updatePetDetails(
  clinicId: string,
  branchIds: string[],
  petId: string,
  currentName: string,
  data: PetDetailsInput,
): Promise<void> {
  const name = data.name.trim()
  if (!name) throw new Error('Pet name cannot be empty')

  await updateDoc(doc(db, `clinics/${clinicId}/pets/${petId}`), {
    species: data.species,
    speciesName: data.species === 'other' ? (data.speciesName?.trim() || null) : null,
    breed: data.breed?.trim() || null,
    gender: data.gender || null,
    dateOfBirth: data.dateOfBirth || null,
    color: data.color?.trim() || null,
    microchipNumber: data.microchipNumber?.trim() || null,
    updatedAt: serverTimestamp(),
  })

  if (name !== currentName.trim()) {
    await updatePetName(clinicId, branchIds, petId, name)
  }
}

/**
 * Update an owner's contact details (email / alternate phone).
 *
 * Unlike name, these fields are NOT denormalized onto visits/payments — they
 * live only on the canonical petOwners doc and are read fresh wherever needed
 * (e.g. the check-in confirmation email) — so a single doc update suffices, no
 * cascade required. Pass a field as `null` to clear it; omit it to leave it
 * untouched. The primary `phone` is intentionally not editable here: it is the
 * owner's lookup identity and is denormalized as `ownerPhone` on visits.
 */
export async function updateOwnerContact(
  clinicId: string,
  ownerId: string,
  data: { email?: string | null; altPhone?: string | null },
): Promise<void> {
  const patch: UpdateData<DocumentData> = { updatedAt: serverTimestamp() }
  if (data.email !== undefined) patch.email = data.email
  if (data.altPhone !== undefined) patch.altPhone = data.altPhone
  await updateDoc(doc(db, `clinics/${clinicId}/petOwners/${ownerId}`), patch)
}

/**
 * Correct an owner's name everywhere it is stored:
 *  1. the canonical petOwners doc,
 *  2. the denormalized `ownerName` on every visit for that owner, across branches,
 *  3. the `ownerName` snapshot on any matching `billingDefaults` doc.
 *
 * There is no `ownerNameLower` — owner lookup is phone-based — so no search
 * index needs updating here.
 */
export async function updateOwnerName(
  clinicId: string,
  branchIds: string[],
  ownerId: string,
  newNameRaw: string,
): Promise<void> {
  const name = newNameRaw.trim()
  if (!name) throw new Error('Owner name cannot be empty')

  await updateDoc(doc(db, `clinics/${clinicId}/petOwners/${ownerId}`), {
    name,
    updatedAt: serverTimestamp(),
  })

  const updates: PendingUpdate[] = []

  for (const branchId of branchIds) {
    const visitsSnap = await getDocs(
      query(
        collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
        where('ownerId', '==', ownerId),
      ),
    )
    for (const v of visitsSnap.docs) {
      updates.push({ ref: v.ref, data: { ownerName: name, updatedAt: serverTimestamp() } })
    }

    // billingDefaults stores ownerId, so match on it directly.
    const bdSnap = await getDocs(
      query(
        collection(db, `clinics/${clinicId}/branches/${branchId}/billingDefaults`),
        where('ownerId', '==', ownerId),
      ),
    )
    for (const bd of bdSnap.docs) {
      updates.push({ ref: bd.ref, data: { ownerName: name } })
    }

    // Payment-ledger rows carry an ownerName snapshot; correct them too.
    const paySnap = await getDocs(
      query(
        collection(db, `clinics/${clinicId}/branches/${branchId}/payments`),
        where('ownerId', '==', ownerId),
      ),
    )
    for (const p of paySnap.docs) {
      updates.push({ ref: p.ref, data: { ownerName: name } })
    }
  }

  await commitChunked(updates)
}
