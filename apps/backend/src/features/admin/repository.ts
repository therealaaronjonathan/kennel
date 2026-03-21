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
    phone: string
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
