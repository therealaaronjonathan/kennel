import { adminAuth } from '../../lib/firebase-admin'
import {
  createStaffDoc,
  createDoctorDoc,
  createClinicStaffDoc,
  updateStaffDoc,
  getStaffBootstrap,
  updateDoctorDocFields,
  updateClinicStaffDocFields,
} from './repository'
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
  //    Otherwise, create clinics/{clinicId}/staff/{uid} for listing on admin staff page
  if (body.role === 'doctor') {
    await createDoctorDoc(uid, {
      clinicId: body.clinicId,
      branchIds: body.branchIds,
      name: body.name,
      phone: body.phone,
      specialization: body.specialization ?? 'General',
    })
  } else {
    await createClinicStaffDoc(uid, {
      clinicId: body.clinicId,
      branchIds: body.branchIds,
      role: body.role,
      name: body.name,
      email: body.email,
      phone: body.phone,
    })
  }

  // 4. Generate password reset link (acts as invite link)
  let inviteLink: string | null = null
  let inviteLinkError: string | null = null
  try {
    inviteLink = await adminAuth.generatePasswordResetLink(body.email)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[createUser] failed to generate invite link:', msg)
    inviteLinkError = msg
  }

  return { uid, email: body.email, role: body.role, inviteLink, inviteLinkError }
}

export async function updateUser(uid: string, body: UpdateUserBodyType) {
  const bootstrap = await getStaffBootstrap(uid)
  if (!bootstrap) throw new Error('User not found')
  const { clinicId, role } = bootstrap

  // Update root auth-bootstrap doc (branchIds, role, isActive only)
  const rootFields: { branchIds?: string[]; role?: string; isActive?: boolean } = {}
  if (body.branchIds !== undefined) rootFields.branchIds = body.branchIds
  if (body.role !== undefined) rootFields.role = body.role
  if (body.isActive !== undefined) rootFields.isActive = body.isActive
  if (Object.keys(rootFields).length > 0) await updateStaffDoc(uid, rootFields)

  // Update clinic-level doc (all editable fields)
  if (role === 'doctor') {
    await updateDoctorDocFields(uid, clinicId, {
      branchIds: body.branchIds,
      name: body.name,
      phone: body.phone,
      bio: body.bio,
      photoUrl: body.photoUrl,
    })
  } else {
    await updateClinicStaffDocFields(uid, clinicId, {
      branchIds: body.branchIds,
      name: body.name,
      phone: body.phone,
    })
  }

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
