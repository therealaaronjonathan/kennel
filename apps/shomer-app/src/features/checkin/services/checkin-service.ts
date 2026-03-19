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

async function performCheckin(
  clinicId: string,
  branchId: string,
  ownerId: string,
  petId: string,
  ownerEmail: string | undefined,
  ownerName: string,
  petName: string,
  formData: CheckinFormData,
  doctorName: string,
): Promise<CheckinResult> {
  const today = getTodayString()
  const queueDocId = `${formData.doctorId}_${today}`
  const queueDocRef = doc(
    db,
    `clinics/${clinicId}/branches/${branchId}/queues/${queueDocId}`,
  )
  const visitRef = doc(
    collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
  )

  const doctorInitial = doctorName.charAt(0).toUpperCase()
  let tokenNumber = 0
  let tokenDisplay = ''

  await runTransaction(db, async (transaction) => {
    const queueSnap = await transaction.get(queueDocRef)
    const nextToken = (queueSnap.exists() ? (queueSnap.data().currentToken as number) : 0) + 1
    tokenNumber = nextToken
    tokenDisplay = `${doctorInitial}-${String(nextToken).padStart(4, '0')}`

    transaction.set(
      queueDocRef,
      {
        doctorId: formData.doctorId,
        branchId,
        clinicId,
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
      petId,
      petName,
      tokenNumber: nextToken,
      tokenDisplay,
      service: formData.service,
      complaints: formData.complaints,
      ...(formData.otherComplaintText ? { otherComplaintText: formData.otherComplaintText } : {}),
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
  const queueDocId = `${formData.doctorId}_${today}`
  const queueDocRef = doc(
    db,
    `clinics/${clinicId}/branches/${branchId}/queues/${queueDocId}`,
  )
  const ownerRef = doc(collection(db, `clinics/${clinicId}/petOwners`))
  const petRef = doc(collection(db, `clinics/${clinicId}/pets`))
  const visitRef = doc(
    collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
  )

  const doctorInitial = doctorName.charAt(0).toUpperCase()
  let tokenNumber = 0
  let tokenDisplay = ''

  await runTransaction(db, async (transaction) => {
    const queueSnap = await transaction.get(queueDocRef)
    const nextToken = (queueSnap.exists() ? (queueSnap.data().currentToken as number) : 0) + 1
    tokenNumber = nextToken
    tokenDisplay = `${doctorInitial}-${String(nextToken).padStart(4, '0')}`

    // Create owner
    transaction.set(ownerRef, {
      clinicId,
      branchIds: [branchId],
      name: newOwner.ownerName,
      phone: newOwner.phone,
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
      age: newOwner.age ? parseInt(newOwner.age) : null,
      microchipNumber: newOwner.microchipNumber || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Update queue counter
    transaction.set(
      queueDocRef,
      {
        doctorId: formData.doctorId,
        branchId,
        clinicId,
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
      ...(formData.otherComplaintText ? { otherComplaintText: formData.otherComplaintText } : {}),
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
