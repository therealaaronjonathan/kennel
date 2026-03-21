import { Elysia } from 'elysia'
import { fail } from '../lib/response'

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  ({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return fail(error.message)
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return fail('Route not found')
    }
    console.error('[error]', error)
    set.status = 500
    return fail('Internal server error')
  },
)
