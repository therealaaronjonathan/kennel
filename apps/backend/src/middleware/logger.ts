import { Elysia } from 'elysia'

export const logger = new Elysia({ name: 'logger' }).onRequest(({ request }) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${new URL(request.url).pathname}`)
})
