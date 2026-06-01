import { t } from 'elysia'

export const CreateUserBody = t.Object({
  clinicId: t.String({ minLength: 1, error: 'clinicId is required' }),
  branchIds: t.Array(t.String()),
  name: t.String({ minLength: 1, error: 'name is required' }),
  email: t.String({ format: 'email', error: 'Valid email is required' }),
  phone: t.Optional(t.String()),
  role: t.Union([t.Literal('doctor'), t.Literal('receptionist'), t.Literal('admin')], {
    error: 'role must be doctor, receptionist, or admin',
  }),
  specialization: t.Optional(t.String()),
})

export const UpdateUserBody = t.Object({
  branchIds: t.Optional(t.Array(t.String())),
  role: t.Optional(
    t.Union([t.Literal('doctor'), t.Literal('receptionist'), t.Literal('admin')]),
  ),
  isActive: t.Optional(t.Boolean()),
  name: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  bio: t.Optional(t.String()),
  photoUrl: t.Optional(t.String()),
})

export type CreateUserBodyType = typeof CreateUserBody.static
export type UpdateUserBodyType = typeof UpdateUserBody.static
