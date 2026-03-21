import { Elysia } from 'elysia'
import { authMiddleware } from '../../middleware/auth'
import { CreateUserBody, UpdateUserBody } from './models'
import { createUser, updateUser, deleteUser } from './service'
import { ok, fail } from '../../lib/response'

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(authMiddleware)
  .post(
    '/users',
    async ({ body, set }) => {
      try {
        const result = await createUser(body)
        set.status = 201
        return ok(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create user'
        set.status = 400
        return fail(msg)
      }
    },
    { body: CreateUserBody },
  )
  .put(
    '/users/:uid',
    async ({ params, body, set }) => {
      try {
        await updateUser(params.uid, body)
        return ok({ uid: params.uid })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update user'
        set.status = 400
        return fail(msg)
      }
    },
    { body: UpdateUserBody },
  )
  .delete('/users/:uid', async ({ params, set }) => {
    try {
      await deleteUser(params.uid)
      return ok({ uid: params.uid })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user'
      set.status = 400
      return fail(msg)
    }
  })
