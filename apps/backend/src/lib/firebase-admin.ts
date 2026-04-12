import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let serviceAccount: object

if (Bun.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Railway / production: JSON content passed as env var
  serviceAccount = JSON.parse(Bun.env.FIREBASE_SERVICE_ACCOUNT_JSON)
} else if (Bun.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  // Local dev: path to JSON file
  serviceAccount = JSON.parse(readFileSync(resolve(Bun.env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf-8'))
} else {
  throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH')
}

const sa = serviceAccount as admin.ServiceAccount & { project_id?: string }

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id,
  })
}

export const adminAuth = admin.auth()

const databaseId = Bun.env.FIREBASE_DATABASE_ID
const adminDb = databaseId && databaseId !== '(default)'
  ? getFirestore(admin.app(), databaseId)
  : getFirestore()

// Force REST transport — gRPC has connectivity issues in some container environments
// Also ignore undefined fields so optional TypeBox fields don't cause Firestore errors
adminDb.settings({ preferRest: true, ignoreUndefinedProperties: true })

export { adminDb }
