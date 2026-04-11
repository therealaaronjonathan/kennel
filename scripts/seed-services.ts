/**
 * seed-services.ts
 *
 * Imports services from an Excel file into Firestore.
 *
 * Usage:
 *   bun scripts/seed-services.ts --file path/to/services.xlsx --clinicId <clinicId>
 *
 * Excel columns (row 1 = header, case-insensitive):
 *   S.No | Service Type | Service Name | Price
 *
 * Behaviour:
 *   - Matches existing services by name (case-insensitive).
 *   - Overwrites if matched, creates new doc if not.
 *   - Price defaults to 0 if blank.
 *   - Rows missing Service Name are skipped with a warning.
 *
 * Auth:
 *   Reads FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON from env.
 *   Optionally reads FIREBASE_DATABASE_ID for non-default Firestore instances.
 *   Tip: create a .env file in the repo root or pass vars inline:
 *     FIREBASE_SERVICE_ACCOUNT_PATH=./apps/backend/key.json bun scripts/seed-services.ts ...
 */

import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import admin from 'firebase-admin'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

// ── Env / Firebase init ───────────────────────────────────────────────────────

function loadEnv(path: string) {
  try {
    const lines = readFileSync(path, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) process.env[key] = val
    }
  } catch {
    // .env is optional
  }
}

// Try to load .env from backend (where the service account path typically lives)
loadEnv(resolve(import.meta.dir, '../apps/backend/.env'))
loadEnv(resolve(import.meta.dir, '../.env'))

function initFirebase() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

  let serviceAccount: admin.ServiceAccount

  if (jsonEnv) {
    serviceAccount = JSON.parse(jsonEnv)
  } else if (pathEnv) {
    serviceAccount = JSON.parse(readFileSync(resolve(pathEnv), 'utf-8'))
  } else {
    console.error('❌  Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH')
    process.exit(1)
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: (serviceAccount as Record<string, string>).project_id,
    })
  }

  const dbId = process.env.FIREBASE_DATABASE_ID
  return dbId && dbId !== '(default)'
    ? getFirestore(admin.app(), dbId)
    : getFirestore()
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : undefined
  }
  const file = get('--file')
  const clinicId = get('--clinicId')

  if (!file || !clinicId) {
    console.error('Usage: bun scripts/seed-services.ts --file <path.xlsx> --clinicId <clinicId>')
    process.exit(1)
  }
  return { file, clinicId }
}

// ── Excel parsing ─────────────────────────────────────────────────────────────

interface ExcelRow {
  sNo: number
  serviceType: string
  serviceName: string
  price: number
}

function parseExcel(filePath: string): ExcelRow[] {
  const absPath = resolve(filePath)
  const workbook = XLSX.readFile(absPath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rawRows.length === 0) {
    console.error('❌  Excel sheet is empty or has no data rows.')
    process.exit(1)
  }

  // Normalise header keys: lowercase + trim
  function pick(row: Record<string, unknown>, ...keys: string[]): string {
    for (const key of Object.keys(row)) {
      if (keys.includes(key.toLowerCase().trim())) {
        return String(row[key] ?? '').trim()
      }
    }
    return ''
  }

  return rawRows.map((row, i) => ({
    sNo: Number(pick(row, 's.no', 'sno', 's no', 'serial no')) || i + 1,
    serviceType: pick(row, 'service type', 'servicetype', 'type'),
    serviceName: pick(row, 'service name', 'servicename', 'name'),
    price: parseFloat(pick(row, 'price')) || 0,
  }))
}

// ── Firestore upsert ──────────────────────────────────────────────────────────

async function seedServices(db: FirebaseFirestore.Firestore, clinicId: string, rows: ExcelRow[]) {
  const collectionRef = db.collection(`clinics/${clinicId}/services`)

  // Fetch existing services to match by name
  console.log(`\n🔍  Fetching existing services for clinic "${clinicId}"…`)
  const snapshot = await collectionRef.get()
  const existingByName = new Map<string, FirebaseFirestore.DocumentReference>()
  for (const doc of snapshot.docs) {
    const name = (doc.data().name as string ?? '').toLowerCase().trim()
    existingByName.set(name, doc.ref)
  }
  console.log(`    Found ${existingByName.size} existing service(s).\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  const warnings: string[] = []

  for (const row of rows) {
    // Validate
    if (!row.serviceName) {
      warnings.push(`Row ${row.sNo}: missing Service Name — skipped`)
      skipped++
      continue
    }

    const nameKey = row.serviceName.toLowerCase().trim()
    const existingRef = existingByName.get(nameKey)

    const payload = {
      name: row.serviceName,
      serviceType: row.serviceType,
      price: row.price,
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (existingRef) {
      await existingRef.update(payload)
      console.log(`  ✏️   Updated  "${row.serviceName}" (type: ${row.serviceType || '—'}, price: ${row.price})`)
      updated++
    } else {
      const newRef = await collectionRef.add({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
      })
      console.log(`  ✅  Created  "${row.serviceName}" (type: ${row.serviceType || '—'}, price: ${row.price})`)
      created++
      // Track newly created doc so duplicate rows in the same file don't re-create
      existingByName.set(nameKey, newRef)
    }
  }

  // Summary
  console.log('\n─────────────────────────────────────')
  console.log(`  ✅  Created : ${created}`)
  console.log(`  ✏️   Updated : ${updated}`)
  console.log(`  ⚠️   Skipped : ${skipped}`)
  console.log('─────────────────────────────────────\n')

  if (warnings.length > 0) {
    console.log('Warnings:')
    for (const w of warnings) console.log(`  ⚠️   ${w}`)
    console.log()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { file, clinicId } = parseArgs()

console.log(`\n📄  File     : ${file}`)
console.log(`🏥  Clinic ID: ${clinicId}`)

const rows = parseExcel(file)
console.log(`📊  Rows parsed: ${rows.length}`)

const db = initFirebase()
await seedServices(db, clinicId, rows)

process.exit(0)
