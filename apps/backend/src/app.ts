import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { errorHandler } from './middleware/error-handler'
import { logger } from './middleware/logger'
import { adminRoutes } from './features/admin/routes'

export const app = new Elysia({ prefix: '/api' })
  .use(cors())
  .use(logger)
  .use(errorHandler)
  .use(adminRoutes)
  .get('/health', () => ({ ok: true }))
