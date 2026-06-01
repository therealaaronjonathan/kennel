import { adminDb } from '../../lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function createStaffDoc(
  uid: string,
  data: {
    clinicId: string
    branchIds: string[]
    role: string
    email: string
    doctorId?: string
  },
): Promise<void> {
  await adminDb.doc(`staff/${uid}`).set({
    clinicId: data.clinicId,
    branchIds: data.branchIds,
    role: data.role,
    email: data.email,
    ...(data.doctorId ? { doctorId: data.doctorId } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function createDoctorDoc(
  uid: string,
  data: {
    clinicId: string
    branchIds: string[]
    name: string
    phone?: string
    specialization: string
  },
): Promise<void> {
  await adminDb.doc(`clinics/${data.clinicId}/doctors/${uid}`).set({
    clinicId: data.clinicId,
    branchIds: data.branchIds,
    name: data.name,
    phone: data.phone,
    specialization: data.specialization || 'General',
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function createClinicStaffDoc(
  uid: string,
  data: {
    clinicId: string
    branchIds: string[]
    role: string
    name: string
    email: string
    phone?: string
  },
): Promise<void> {
  await adminDb.doc(`clinics/${data.clinicId}/staff/${uid}`).set({
    clinicId: data.clinicId,
    branchIds: data.branchIds,
    role: data.role,
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function updateStaffDoc(
  uid: string,
  data: {
    branchIds?: string[]
    role?: string
    isActive?: boolean
  },
): Promise<void> {
  await adminDb.doc(`staff/${uid}`).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function getStaffBootstrap(
  uid: string,
): Promise<{ clinicId: string; role: string } | null> {
  const snap = await adminDb.doc(`staff/${uid}`).get()
  if (!snap.exists) return null
  const data = snap.data() as { clinicId: string; role: string; doctorId?: string }
  return {
    clinicId: data.clinicId,
    role: data.role ?? (data.doctorId ? 'doctor' : 'receptionist'),
  }
}

export async function updateDoctorDocFields(
  uid: string,
  clinicId: string,
  data: {
    branchIds?: string[]
    name?: string
    phone?: string
    bio?: string
    photoUrl?: string
  },
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  if (data.branchIds !== undefined) payload.branchIds = data.branchIds
  if (data.name !== undefined) payload.name = data.name
  if (data.phone !== undefined) payload.phone = data.phone
  if (data.bio !== undefined) payload.bio = data.bio
  if (data.photoUrl !== undefined) payload.photoUrl = data.photoUrl
  await adminDb.doc(`clinics/${clinicId}/doctors/${uid}`).update(payload)
}

export async function updateClinicStaffDocFields(
  uid: string,
  clinicId: string,
  data: {
    branchIds?: string[]
    name?: string
    phone?: string
  },
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  if (data.branchIds !== undefined) payload.branchIds = data.branchIds
  if (data.name !== undefined) payload.name = data.name
  if (data.phone !== undefined) payload.phone = data.phone
  await adminDb.doc(`clinics/${clinicId}/staff/${uid}`).update(payload)
}
