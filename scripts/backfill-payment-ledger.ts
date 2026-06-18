/**
 * backfill-payment-ledger.ts
 *
 * Seeds the payment ledger (clinics/{clinicId}/branches/{branchId}/payments)
 * from existing visits, so historical totals don't go blank when the History
 * "Total Earned" KPI switches to reading the ledger.
 *
 * For every visit with amountPaid > 0, writes one ledger row per payments[]
 * entry (preserving the cash/card/upi split), dated at billedAt (→ visit.date
 * if absent). Legacy visits that have amountPaid but no payments[] get a single
 * row using the old `paymentMethod` field (→ 'cash' if absent).
 *
 * Idempotent: deterministic doc id `${visitId}_${method}` — re-running overwrites,
 * never duplicates.
 *
 * Usage:
 *   # Dry-run preview against test DB:
 *   bun scripts/backfill-payment-ledger.ts --clinicId <id> --env test --dry-run
 *
 *   # Real write to test DB:
 *   bun scripts/backfill-payment-ledger.ts --clinicId <id> --env test
 *
 *   # Real write to prod DB:
 *   bun scripts/backfill-payment-ledger.ts --clinicId <id> --env prod --confirm-prod
 *
 * Auth: reads FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.
 *   --env test → (default) Firestore database; --env prod → "prod" database.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import admin from 'firebase-admin'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const METHODS = ['cash', 'card', 'upi'] as const
type Method = (typeof METHODS)[number]

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
    const finalPath = pathEnv.startsWith('/') ? resolve(pathEnv) : existsSync(fromBackend) ? fromBackend : resolve(pathEnv)
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

  const databaseId = env === 'prod' ? 'prod' : '(default)'
  return databaseId === '(default)' ? getFirestore() : getFirestore(admin.app(), databaseId)
}

// ── Args ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : undefined
  }
  const has = (flag: string) => args.includes(flag)

  const clinicId = get('--clinicId')
  const env = get('--env') as 'test' | 'prod' | undefined
  const dryRun = has('--dry-run')
  const confirmProd = has('--confirm-prod')

  if (!clinicId || !env) {
    console.error('Usage: bun scripts/backfill-payment-ledger.ts --clinicId <id> --env test|prod [--dry-run] [--confirm-prod]')
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
  return { clinicId, env, dryRun, confirmProd }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in the clinic's timezone (Asia/Kolkata), so it lines up with how
 *  the app computes visit.date. */
function tsToDateString(ts: Timestamp): string {
  // en-CA formats as YYYY-MM-DD.
  return ts.toDate().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

interface PaymentEntry {
  method: Method
  amount: number
}

interface PlannedRow {
  id: string
  visitId: string
  method: Method
  amount: number
  date: string
}

function planRowsForVisit(visitId: string, data: FirebaseFirestore.DocumentData): PlannedRow[] {
  const amountPaid = typeof data.amountPaid === 'number' ? data.amountPaid : 0
  if (amountPaid <= 0) return []

  // Use visit.date so the backfill reproduces the OLD visit-based KPI exactly —
  // a clean cutover where nothing about historical totals shifts. Only NEW
  // payments (post-migration, via recordPayments) get dated to the actual day
  // money was received. billedAt is only a fallback for the rare visit with no
  // date string. (Historical per-payment dates were never recorded, so we don't
  // pretend to reconstruct them.)
  const date =
    typeof data.date === 'string' && data.date
      ? data.date
      : data.billedAt instanceof Timestamp
        ? tsToDateString(data.billedAt)
        : null
  if (!date) return [] // can't attribute without a date

  const payments: PaymentEntry[] = Array.isArray(data.payments)
    ? (data.payments as PaymentEntry[]).filter((p) => METHODS.includes(p.method) && p.amount > 0)
    : []

  if (payments.length > 0) {
    return payments.map((p) => ({
      id: `${visitId}_${p.method}`,
      visitId,
      method: p.method,
      amount: Math.round(p.amount),
      date,
    }))
  }

  // Legacy fallback: amountPaid but no payments[] — use old paymentMethod field.
  const legacyMethod: Method = METHODS.includes(data.paymentMethod) ? data.paymentMethod : 'cash'
  return [{ id: `${visitId}_${legacyMethod}`, visitId, method: legacyMethod, amount: Math.round(amountPaid), date }]
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { clinicId, env, dryRun } = parseArgs()
  const db = initFirebase(env)

  console.log(`\n🔁  Backfilling payment ledger — clinic ${clinicId}, env ${env}${dryRun ? ' (DRY RUN)' : ''}\n`)

  if (env === 'prod' && !dryRun) {
    console.log('⚠️   Writing to PROD in 5 seconds — Ctrl-C to abort…')
    await new Promise((r) => setTimeout(r, 5000))
  }

  const branchesSnap = await db.collection(`clinics/${clinicId}/branches`).get()
  if (branchesSnap.empty) {
    console.error(`❌  No branches found under clinic ${clinicId}.`)
    process.exit(1)
  }

  let totalRows = 0
  let totalAmount = 0
  const sample: PlannedRow[] = []

  let totalSkipped = 0

  for (const branch of branchesSnap.docs) {
    const branchId = branch.id
    const visitsSnap = await db
      .collection(`clinics/${clinicId}/branches/${branchId}/visits`)
      .where('amountPaid', '>', 0)
      .get()

    // Skip-guard: any visit that already has a ledger row is left alone. This
    // makes the backfill safe to re-run alongside the live app — it will never
    // write a full-amount row on top of the per-payment delta rows the new app
    // writes (which would double-count).
    const existingSnap = await db.collection(`clinics/${clinicId}/branches/${branchId}/payments`).get()
    const visitsWithLedger = new Set<string>()
    for (const p of existingSnap.docs) {
      const vid = p.data().visitId
      if (typeof vid === 'string') visitsWithLedger.add(vid)
    }

    const planned: { ref: FirebaseFirestore.DocumentReference; row: PlannedRow; data: FirebaseFirestore.DocumentData }[] = []
    for (const v of visitsSnap.docs) {
      if (visitsWithLedger.has(v.id)) {
        totalSkipped++
        continue
      }
      const data = v.data()
      for (const row of planRowsForVisit(v.id, data)) {
        planned.push({
          ref: db.doc(`clinics/${clinicId}/branches/${branchId}/payments/${row.id}`),
          row,
          data,
        })
      }
    }

    console.log(`  branch ${branchId}: ${visitsSnap.size} paid visits → ${planned.length} ledger rows`)
    totalRows += planned.length
    totalAmount += planned.reduce((s, p) => s + p.row.amount, 0)
    for (const p of planned) if (sample.length < 5) sample.push(p.row)

    if (!dryRun) {
      // Commit in chunks of 450 (well under the 500 batch limit).
      for (let i = 0; i < planned.length; i += 450) {
        const batch = db.batch()
        for (const p of planned.slice(i, i + 450)) {
          batch.set(p.ref, {
            visitId: p.row.visitId,
            petId: p.data.petId ?? '',
            ownerId: p.data.ownerId ?? '',
            amount: p.row.amount,
            method: p.row.method,
            date: p.row.date,
            recordedAt: p.data.billedAt instanceof Timestamp ? p.data.billedAt : admin.firestore.FieldValue.serverTimestamp(),
            recordedBy: 'backfill',
            petName: p.data.petName ?? '',
            ownerName: p.data.ownerName ?? '',
            tokenDisplay: p.data.tokenDisplay ?? '',
            visitDate: p.data.date ?? '',
            source: 'backfill',
          })
        }
        await batch.commit()
      }
    }
  }

  console.log(`\n📊  ${totalRows} ledger rows, total ₹${totalAmount.toLocaleString('en-IN')}  (${totalSkipped} visits skipped — already ledgered)`)
  if (sample.length) {
    console.log('   sample:')
    for (const s of sample) console.log(`     ${s.id}  ${s.method} ₹${s.amount}  @ ${s.date}`)
  }
  console.log(dryRun ? '\n✅  Dry run complete — no writes.\n' : '\n✅  Backfill complete.\n')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌  Backfill failed:', err)
  process.exit(1)
})
