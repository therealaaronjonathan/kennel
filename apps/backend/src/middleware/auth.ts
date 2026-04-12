import { Elysia } from 'elysia'
import { adminAuth, adminDb } from '../lib/firebase-admin'
import { fail } from '../lib/response'

export const authMiddleware = new Elysia({ name: 'auth' }).onBeforeHandle(
  { as: 'scoped' },
  async ({ headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return fail('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(7)
    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      set.status = 401
      return fail('Invalid or expired token')
    }

    // Check admin role in Firestore
    let staffSnap: FirebaseFirestore.DocumentSnapshot
    try {
      staffSnap = await adminDb.doc(`staff/${uid}`).get()
    } catch (err) {
      console.error('[auth] Firestore error:', err)
      set.status = 500
      return fail('Auth check failed')
    }

    if (!staffSnap.exists) {
      set.status = 403
      return fail('Staff profile not found')
    }

    const role = staffSnap.data()?.role as string | undefined
    if (role !== 'admin' && role !== 'owner') {
      set.status = 403
      return fail('Forbidden: admin or owner role required')
    }
  },
)
