/**
 * seed-pet-owners.ts
 *
 * Imports pet owners and pets from "PET DETAILS.xlsx" into Firestore.
 *
 * Usage:
 *   # Dry-run preview against test DB:
 *   bun scripts/seed-pet-owners.ts --file "PET DETAILS.xlsx" --clinicId <id> --env test --dry-run
 *
 *   # Real write to test DB:
 *   bun scripts/seed-pet-owners.ts --file "PET DETAILS.xlsx" --clinicId <id> --env test
 *
 *   # Real write to prod DB (requires --confirm-prod and types out a 5s countdown):
 *   bun scripts/seed-pet-owners.ts --file "PET DETAILS.xlsx" --clinicId <id> --env prod --confirm-prod
 *
 * Behaviour:
 *   - Two-phase: build owner dedupe map (by phone), write owners, then write pets.
 *   - Dedupe by `+91XXXXXXXXXX`. On owner-name conflict, picks the most frequent name.
 *   - Skips rows with non-10-digit phones; reports them.
 *   - Skips owners that already exist (matched by phone) and pets that already exist
 *     (matched by petNameLower + ownerId) — re-run is safe.
 *   - Writes report to ./import-report.json.
 *
 * Auth:
 *   Reads FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON from env.
 *   --env test → connects to (default) Firestore database
 *   --env prod → connects to "prod" Firestore database
 */

import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync, existsSync } from 'fs'
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

loadEnv(resolve(import.meta.dir, '../apps/backend/.env'))
loadEnv(resolve(import.meta.dir, '../.env'))

function initFirebase(env: 'test' | 'prod'): FirebaseFirestore.Firestore {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

  let serviceAccount: admin.ServiceAccount

  if (jsonEnv) {
    serviceAccount = JSON.parse(jsonEnv)
  } else if (pathEnv) {
    const fromBackend = resolve(import.meta.dir, '../apps/backend', pathEnv)
    const fromCwd = resolve(pathEnv)
    const finalPath = pathEnv.startsWith('/')
      ? fromCwd
      : existsSync(fromBackend)
        ? fromBackend
        : fromCwd
    serviceAccount = JSON.parse(readFileSync(finalPath, 'utf-8'))
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

  // env=test → (default) database; env=prod → "prod" database
  const databaseId = env === 'prod' ? 'prod' : '(default)'
  return databaseId === '(default)'
    ? getFirestore()
    : getFirestore(admin.app(), databaseId)
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : undefined
  }
  const has = (flag: string) => args.includes(flag)

  const file = get('--file')
  const clinicId = get('--clinicId')
  const env = get('--env') as 'test' | 'prod' | undefined
  const dryRun = has('--dry-run')
  const confirmProd = has('--confirm-prod')

  if (!file || !clinicId || !env) {
    console.error('Usage: bun scripts/seed-pet-owners.ts --file <path.xlsx> --clinicId <id> --env test|prod [--dry-run] [--confirm-prod]')
    process.exit(1)
  }
  if (env !== 'test' && env !== 'prod') {
    console.error('❌  --env must be "test" or "prod"')
    process.exit(1)
  }
  if (env === 'prod' && !confirmProd) {
    console.error('❌  Writing to prod requires --confirm-prod for safety.')
    process.exit(1)
  }
  return { file, clinicId, env, dryRun, confirmProd }
}

// ── Excel parsing ─────────────────────────────────────────────────────────────

interface RawRow {
  rowIndex: number   // 0-based original row in the sheet (for reporting)
  dateOfBirth: string | null
  petName: string
  species: string
  breed: string | null
  color: string | null
  microchipNumber: string | null
  contactNo: string
  ownerName: string
}

const HEADER_ROW = 8  // 0-indexed; row 9 is first data row

function readRawXlsx(filePath: string): unknown[][] {
  const wb = XLSX.readFile(resolve(filePath))
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as unknown[][]
}

function parseRows(filePath: string): RawRow[] {
  const all = readRawXlsx(filePath)
  const rows: RawRow[] = []
  for (let i = HEADER_ROW + 1; i < all.length; i++) {
    const r = all[i]
    if (!r || !r[3]) continue   // need Pet Name (col 3)
    rows.push({
      rowIndex: i,
      dateOfBirth: cellToString(r[1]),
      petName: cellToString(r[3]) ?? '',
      species: cellToString(r[4]) ?? '',
      breed: cellToString(r[5]),
      color: cellToString(r[6]),
      microchipNumber: cellToString(r[7]),
      contactNo: cellToString(r[11]) ?? '',
      ownerName: cellToString(r[12]) ?? '',
    })
  }
  return rows
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') {
    // Avoid scientific notation for big integer-like microchip numbers
    if (Number.isInteger(v)) return String(v)
    return String(v)
  }
  const s = String(v).trim()
  if (!s || s === 'NA' || s === 'NILL' || s === 'NIL') return null
  return s
}

// ── Normalisers ───────────────────────────────────────────────────────────────

function normalizePhone(raw: string): { phone: string | null; reason?: string } {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 10) {
    return { phone: null, reason: `phone has ${digits.length} digits (expected 10)` }
  }
  return { phone: '+91' + digits }
}

const SPECIES_MAP: Record<string, 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'> = {
  CANINE: 'dog',
  CANINIE: 'dog',
  CANINES: 'dog',
  DOG: 'dog',
  FELINE: 'cat',
  FELINW: 'cat',
  CAT: 'cat',
  AVIAN: 'bird',
  BIRD: 'bird',
  HEN: 'bird',
  RABBIT: 'rabbit',
}

function normalizeSpecies(raw: string): { species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'; speciesName?: string } {
  const key = raw.toUpperCase().trim()
  if (SPECIES_MAP[key]) return { species: SPECIES_MAP[key] }
  return { species: 'other', speciesName: raw.trim() || undefined }
}

/**
 * Parse DD/M/YY or DD/MM/YYYY into YYYY-MM-DD.
 * If the parsed date is in the future, returns null (invalid).
 */
function parseDob(raw: string | null): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2}|\d{4})$/)
  if (!m) return null
  const day = parseInt(m[1])
  const month = parseInt(m[2])
  let year = parseInt(m[3])
  if (year < 100) {
    // 2-digit year — assume 19YY for years > current+1, else 20YY
    const currentYY = new Date().getFullYear() % 100
    year = year > currentYY + 1 ? 1900 + year : 2000 + year
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  if (d > new Date()) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface OwnerPlan {
  phone: string
  name: string
  rowIndices: number[]
}

interface PetPlan {
  phone: string         // owner foreign key (resolved to ownerId during write)
  name: string
  petNameLower: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  speciesName?: string
  breed?: string
  color?: string
  microchipNumber?: string
  dateOfBirth?: string
  rowIndex: number
}

interface SkippedRow {
  rowIndex: number
  petName: string
  ownerName: string
  contactNo: string
  reason: string
}

interface NameConflict {
  phone: string
  picked: string
  alternates: string[]
}

interface ImportReport {
  env: 'test' | 'prod'
  clinicId: string
  dryRun: boolean
  totals: {
    excelRows: number
    skipped: number
    plannedOwners: number
    plannedPets: number
    ownersCreated: number
    ownersExisting: number
    petsCreated: number
    petsExisting: number
  }
  skippedRows: SkippedRow[]
  nameConflicts: NameConflict[]
}

async function main() {
  const { file, clinicId, env, dryRun } = parseArgs()
  const rawRows = parseRows(file)

  console.log(`\n📄  ${rawRows.length} pet rows read from "${file}"`)
  console.log(`📍  Target: clinic="${clinicId}" env=${env}${dryRun ? ' [DRY RUN]' : ''}\n`)

  // Phase 1: build owner plans (dedupe by phone, resolve name conflicts)
  const skippedRows: SkippedRow[] = []
  const phoneToNames = new Map<string, Map<string, number>>()  // phone -> { name -> count }
  const phoneToRowIndices = new Map<string, number[]>()
  const validRows: { row: RawRow; phone: string }[] = []

  for (const row of rawRows) {
    const { phone, reason } = normalizePhone(row.contactNo)
    if (!phone) {
      skippedRows.push({
        rowIndex: row.rowIndex,
        petName: row.petName,
        ownerName: row.ownerName,
        contactNo: row.contactNo,
        reason: reason!,
      })
      continue
    }
    if (!row.ownerName) {
      skippedRows.push({
        rowIndex: row.rowIndex,
        petName: row.petName,
        ownerName: '',
        contactNo: row.contactNo,
        reason: 'missing owner name',
      })
      continue
    }
    validRows.push({ row, phone })

    const counts = phoneToNames.get(phone) ?? new Map<string, number>()
    counts.set(row.ownerName, (counts.get(row.ownerName) ?? 0) + 1)
    phoneToNames.set(phone, counts)

    const idxList = phoneToRowIndices.get(phone) ?? []
    idxList.push(row.rowIndex)
    phoneToRowIndices.set(phone, idxList)
  }

  // Resolve owners: most-frequent name wins
  const ownerPlans: OwnerPlan[] = []
  const nameConflicts: NameConflict[] = []
  for (const [phone, names] of phoneToNames) {
    const sorted = [...names.entries()].sort((a, b) => b[1] - a[1])
    const picked = sorted[0][0]
    if (sorted.length > 1) {
      nameConflicts.push({
        phone,
        picked,
        alternates: sorted.slice(1).map(([n]) => n),
      })
    }
    ownerPlans.push({
      phone,
      name: picked,
      rowIndices: phoneToRowIndices.get(phone) ?? [],
    })
  }

  // Pet plans
  const petPlans: PetPlan[] = []
  for (const { row, phone } of validRows) {
    const { species, speciesName } = normalizeSpecies(row.species)
    const plan: PetPlan = {
      phone,
      name: row.petName,
      petNameLower: row.petName.toLowerCase().trim(),
      species,
      rowIndex: row.rowIndex,
    }
    if (speciesName) plan.speciesName = speciesName
    if (row.breed) plan.breed = row.breed
    if (row.color) plan.color = row.color
    if (row.microchipNumber) plan.microchipNumber = row.microchipNumber
    const dob = parseDob(row.dateOfBirth)
    if (dob) plan.dateOfBirth = dob
    petPlans.push(plan)
  }

  console.log(`📊  Plan: ${ownerPlans.length} owners, ${petPlans.length} pets, ${skippedRows.length} skipped`)
  if (nameConflicts.length > 0) {
    console.log(`⚠  ${nameConflicts.length} phone(s) had multiple owner names — picked most frequent`)
  }

  if (dryRun) {
    const report: ImportReport = {
      env,
      clinicId,
      dryRun: true,
      totals: {
        excelRows: rawRows.length,
        skipped: skippedRows.length,
        plannedOwners: ownerPlans.length,
        plannedPets: petPlans.length,
        ownersCreated: 0,
        ownersExisting: 0,
        petsCreated: 0,
        petsExisting: 0,
      },
      skippedRows,
      nameConflicts,
    }
    writeFileSync('./import-report.json', JSON.stringify(report, null, 2))
    console.log(`\n💾  Wrote dry-run preview to ./import-report.json`)
    console.log('✅  Dry-run complete. No Firestore writes were made.\n')
    return
  }

  // Confirmation banner before any writes
  if (env === 'prod') {
    console.log('\n⚠  WRITING TO PRODUCTION DATABASE (shomer-b6212/prod)')
    console.log(`   ${ownerPlans.length} owners + ${petPlans.length} pets will be upserted.`)
    console.log('   Press Ctrl+C now to abort.')
    for (const n of [5, 4, 3, 2, 1]) {
      process.stdout.write(`   ${n}… `)
      await new Promise((r) => setTimeout(r, 1000))
    }
    console.log('\n')
  }

  // Phase 2: write to Firestore
  const db = initFirebase(env)
  const ownersRef = db.collection(`clinics/${clinicId}/petOwners`)
  const petsRef = db.collection(`clinics/${clinicId}/pets`)

  // Existing owners by phone
  console.log('🔍  Fetching existing owners…')
  const existingOwnersSnap = await ownersRef.get()
  const phoneToExistingOwnerId = new Map<string, string>()
  for (const doc of existingOwnersSnap.docs) {
    const phone = (doc.data().phone as string | undefined) ?? null
    if (phone) phoneToExistingOwnerId.set(phone, doc.id)
  }
  console.log(`    Found ${phoneToExistingOwnerId.size} existing owner(s)`)

  // Write owners (skip existing)
  let ownersCreated = 0
  let ownersExisting = 0
  const phoneToOwnerId = new Map<string, string>(phoneToExistingOwnerId)
  for (const plan of ownerPlans) {
    if (phoneToOwnerId.has(plan.phone)) {
      ownersExisting++
      continue
    }
    const ref = ownersRef.doc()
    await ref.set({
      clinicId,
      branchIds: [],
      name: plan.name,
      phone: plan.phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    phoneToOwnerId.set(plan.phone, ref.id)
    ownersCreated++
    if (ownersCreated % 50 === 0) console.log(`    +${ownersCreated} owners…`)
  }
  console.log(`✅  Owners: ${ownersCreated} created, ${ownersExisting} already existed`)

  // Existing pets by petNameLower + ownerId
  console.log('🔍  Fetching existing pets…')
  const existingPetsSnap = await petsRef.get()
  const existingPetKeys = new Set<string>()
  for (const doc of existingPetsSnap.docs) {
    const data = doc.data()
    const k = `${data.petNameLower}__${data.ownerId}`
    existingPetKeys.add(k)
  }
  console.log(`    Found ${existingPetsSnap.size} existing pet(s)`)

  // Write pets (skip existing)
  let petsCreated = 0
  let petsExisting = 0
  for (const plan of petPlans) {
    const ownerId = phoneToOwnerId.get(plan.phone)
    if (!ownerId) {
      // shouldn't happen since every plan came from a valid row whose owner was seeded
      continue
    }
    const key = `${plan.petNameLower}__${ownerId}`
    if (existingPetKeys.has(key)) {
      petsExisting++
      continue
    }
    const ref = petsRef.doc()
    const doc: Record<string, unknown> = {
      clinicId,
      ownerId,
      name: plan.name,
      petNameLower: plan.petNameLower,
      species: plan.species,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (plan.speciesName) doc.speciesName = plan.speciesName
    if (plan.breed) doc.breed = plan.breed
    if (plan.color) doc.color = plan.color
    if (plan.microchipNumber) doc.microchipNumber = plan.microchipNumber
    if (plan.dateOfBirth) doc.dateOfBirth = plan.dateOfBirth
    await ref.set(doc)
    existingPetKeys.add(key)
    petsCreated++
    if (petsCreated % 50 === 0) console.log(`    +${petsCreated} pets…`)
  }
  console.log(`✅  Pets: ${petsCreated} created, ${petsExisting} already existed`)

  const report: ImportReport = {
    env,
    clinicId,
    dryRun: false,
    totals: {
      excelRows: rawRows.length,
      skipped: skippedRows.length,
      plannedOwners: ownerPlans.length,
      plannedPets: petPlans.length,
      ownersCreated,
      ownersExisting,
      petsCreated,
      petsExisting,
    },
    skippedRows,
    nameConflicts,
  }
  writeFileSync('./import-report.json', JSON.stringify(report, null, 2))
  console.log(`\n💾  Wrote import report to ./import-report.json`)
  console.log('🎉  Done.\n')
}

main().catch((err) => {
  console.error('❌  Import failed:', err)
  process.exit(1)
})
