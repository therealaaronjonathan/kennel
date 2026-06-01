import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { sendCheckInConfirmation } from '@/lib/email'
import type {
  PetOwner,
  CheckinFormData,
  NewOwnerFormData,
  CheckinResult,
} from '../types'

function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Derive token prefix from doctor name.
 * Takes the last word of the name, grabs the last 3 chars, uppercased.
 * e.g. "Dr. Rajesh" → "ESH", "Dr. Kumar" → "MAR", "Dr. Li" → "LI"
 */
function getTokenPrefix(doctorName: string): string {
  const lastWord = doctorName.trim().split(/\s+/).pop() ?? doctorName
  return lastWord.slice(-3).toUpperCase()
}

async function performCheckin(
  clinicId: string,
  branchId: string,
  ownerId: string,
  petId: string,
  ownerEmail: string | undefined,
  ownerName: string,
  ownerPhone: string | undefined,
  petName: string,
  formData: CheckinFormData,
  doctorName: string,
): Promise<CheckinResult> {
  const today = getTodayString()
  const tokenCounterRef = doc(
    db,
    `clinics/${clinicId}/branches/${branchId}/tokenCounters/${today}`,
  )
  const visitRef = doc(
    collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
  )

  const prefix = getTokenPrefix(doctorName)
  let tokenNumber = 0
  let tokenDisplay = ''

  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(tokenCounterRef)
    const nextToken = (counterSnap.exists() ? (counterSnap.data().currentToken as number) : 0) + 1
    tokenNumber = nextToken
    tokenDisplay = `${prefix}-${String(nextToken).padStart(4, '0')}`

    transaction.set(
      tokenCounterRef,
      {
        date: today,
        currentToken: nextToken,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    transaction.set(visitRef, {
      branchId,
      clinicId,
      doctorId: formData.doctorId,
      doctorName,
      ownerId,
      ownerName,
      ...(ownerPhone ? { ownerPhone } : {}),
      petId,
      petName,
      tokenNumber: nextToken,
      tokenDisplay,
      service: formData.service,
      complaints: formData.complaints,
      groomingServices: formData.groomingServices,
      type: formData.isEmergency ? 'emergency' : formData.service.toLowerCase(),
      status: 'waiting',
      isEmergency: formData.isEmergency,
      queuePosition: nextToken,
      date: today,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  const result: CheckinResult = {
    visitId: visitRef.id,
    tokenNumber,
    tokenDisplay,
    doctorName,
    doctorId: formData.doctorId,
    clinicId,
    branchId,
    complaints: formData.complaints,
    isEmergency: formData.isEmergency,
    ownerEmail,
    ownerName,
    ownerPhone,
    petName,
  }

  if (ownerEmail) {
    const queueLink = `${window.location.origin}/queue/${formData.doctorId}?token=${tokenDisplay}&clinicId=${clinicId}&branchId=${branchId}`
    await sendCheckInConfirmation({
      to: ownerEmail,
      doctorName,
      tokenDisplay,
      complaints: formData.complaints,
      queueLink,
    })
  }

  return result
}

export async function checkinExistingOwner(
  clinicId: string,
  branchId: string,
  owner: PetOwner,
  petName: string,
  formData: CheckinFormData,
  doctorName: string,
): Promise<CheckinResult> {
  return performCheckin(
    clinicId,
    branchId,
    owner.id,
    formData.petId,
    owner.email,
    owner.name,
    owner.phone,
    petName,
    formData,
    doctorName,
  )
}

export async function registerAndCheckin(
  clinicId: string,
  branchId: string,
  newOwner: NewOwnerFormData,
  formData: CheckinFormData,
  doctorName: string,
): Promise<CheckinResult> {
  const today = getTodayString()
  const tokenCounterRef = doc(
    db,
    `clinics/${clinicId}/branches/${branchId}/tokenCounters/${today}`,
  )
  const ownerRef = doc(collection(db, `clinics/${clinicId}/petOwners`))
  const petRef = doc(collection(db, `clinics/${clinicId}/pets`))
  const visitRef = doc(
    collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
  )

  const prefix = getTokenPrefix(doctorName)
  let tokenNumber = 0
  let tokenDisplay = ''

  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(tokenCounterRef)
    const nextToken = (counterSnap.exists() ? (counterSnap.data().currentToken as number) : 0) + 1
    tokenNumber = nextToken
    tokenDisplay = `${prefix}-${String(nextToken).padStart(4, '0')}`

    // Create owner
    transaction.set(ownerRef, {
      clinicId,
      branchIds: [branchId],
      name: newOwner.ownerName,
      phone: newOwner.phone,
      altPhone: newOwner.altPhone !== '+91' ? newOwner.altPhone : null,
      email: newOwner.email || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Create pet
    transaction.set(petRef, {
      clinicId,
      ownerId: ownerRef.id,
      name: newOwner.petName,
      petNameLower: newOwner.petName.toLowerCase().trim(),
      species: newOwner.species,
      ...(newOwner.species === 'other' && newOwner.speciesName.trim()
        ? { speciesName: newOwner.speciesName.trim() }
        : {}),
      breed: newOwner.breed || null,
      gender: newOwner.gender || null,
      dateOfBirth: newOwner.dateOfBirth || null,
      color: newOwner.color || null,
      microchipNumber: newOwner.microchipNumber || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Update branch-wide token counter
    transaction.set(
      tokenCounterRef,
      {
        date: today,
        currentToken: nextToken,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    // Create visit
    transaction.set(visitRef, {
      branchId,
      clinicId,
      doctorId: formData.doctorId,
      doctorName,
      ownerId: ownerRef.id,
      ownerName: newOwner.ownerName,
      petId: petRef.id,
      petName: newOwner.petName,
      tokenNumber: nextToken,
      tokenDisplay,
      service: formData.service,
      complaints: formData.complaints,
      groomingServices: formData.groomingServices,
      type: formData.isEmergency ? 'emergency' : formData.service.toLowerCase(),
      status: 'waiting',
      isEmergency: formData.isEmergency,
      queuePosition: nextToken,
      date: today,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  const result: CheckinResult = {
    visitId: visitRef.id,
    tokenNumber,
    tokenDisplay,
    doctorName,
    doctorId: formData.doctorId,
    clinicId,
    branchId,
    complaints: formData.complaints,
    isEmergency: formData.isEmergency,
    ownerEmail: newOwner.email || undefined,
    ownerName: newOwner.ownerName,
    ownerPhone: newOwner.phone,
    petName: newOwner.petName,
  }

  if (newOwner.email) {
    const queueLink = `${window.location.origin}/queue/${formData.doctorId}?token=${tokenDisplay}&clinicId=${clinicId}&branchId=${branchId}`
    await sendCheckInConfirmation({
      to: newOwner.email,
      doctorName,
      tokenDisplay,
      complaints: formData.complaints,
      queueLink,
    })
  }

  return result
}
