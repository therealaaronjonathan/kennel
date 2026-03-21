import admin from 'firebase-admin'
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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
