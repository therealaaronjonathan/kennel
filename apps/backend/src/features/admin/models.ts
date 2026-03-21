import { t } from 'elysia'

export const CreateUserBody = t.Object({
  clinicId: t.String({ minLength: 1, error: 'clinicId is required' }),
  branchIds: t.Array(t.String(), { minItems: 1, error: 'At least one branchId is required' }),
  name: t.String({ minLength: 1, error: 'name is required' }),
  email: t.String({ format: 'email', error: 'Valid email is required' }),
  phone: t.String({ minLength: 1, error: 'phone is required' }),
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
})

export type CreateUserBodyType = typeof CreateUserBody.static
export type UpdateUserBodyType = typeof UpdateUserBody.static
