import { adminAuth } from '../../lib/firebase-admin'
import { createStaffDoc, createDoctorDoc, updateStaffDoc } from './repository'
import type { CreateUserBodyType, UpdateUserBodyType } from './models'

export async function createUser(body: CreateUserBodyType) {
  // 1. Create Firebase Auth user
  const userRecord = await adminAuth.createUser({
    email: body.email,
    displayName: body.name,
  })
  const uid = userRecord.uid

  // 2. Create staff/{uid} doc
  await createStaffDoc(uid, {
    clinicId: body.clinicId,
    branchIds: body.branchIds,
    role: body.role,
    email: body.email,
    ...(body.role === 'doctor' ? { doctorId: uid } : {}),
  })

  // 3. If doctor, create clinics/{clinicId}/doctors/{uid}
  if (body.role === 'doctor') {
    await createDoctorDoc(uid, {
      clinicId: body.clinicId,
      branchIds: body.branchIds,
      name: body.name,
      phone: body.phone,
      specialization: body.specialization ?? 'General',
    })
  }

  // 4. Generate password reset link (acts as invite link)
  const inviteLink = await adminAuth.generatePasswordResetLink(body.email)

  return { uid, email: body.email, role: body.role, inviteLink }
}

export async function updateUser(uid: string, body: UpdateUserBodyType) {
  await updateStaffDoc(uid, body)

  if (body.isActive === false) {
    await adminAuth.updateUser(uid, { disabled: true })
  } else if (body.isActive === true) {
    await adminAuth.updateUser(uid, { disabled: false })
  }
}

export async function deleteUser(uid: string) {
  await updateStaffDoc(uid, { isActive: false })
  await adminAuth.updateUser(uid, { disabled: true })
}
