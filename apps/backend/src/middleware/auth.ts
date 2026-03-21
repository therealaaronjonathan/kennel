import { Elysia } from 'elysia'
import { adminAuth, adminDb } from '../lib/firebase-admin'
import { fail } from '../lib/response'

export const authMiddleware = new Elysia({ name: 'auth' }).derive(
  async ({ headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      throw new Error(JSON.stringify(fail('Missing or invalid Authorization header')))
    }

    const token = authHeader.slice(7)
    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      set.status = 401
      throw new Error(JSON.stringify(fail('Invalid or expired token')))
    }

    // Check admin role in Firestore
    const staffSnap = await adminDb.doc(`staff/${uid}`).get()
    if (!staffSnap.exists) {
      set.status = 403
      throw new Error(JSON.stringify(fail('Staff profile not found')))
    }

    const role = staffSnap.data()?.role as string | undefined
    if (role !== 'admin' && role !== 'owner') {
      set.status = 403
      throw new Error(JSON.stringify(fail('Forbidden: admin or owner role required')))
    }

    return { callerUid: uid, callerRole: role }
  },
)
