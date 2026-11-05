/**
 * Reclassify an already-collected visit across payment methods.
 *
 * Queue "Change" replaces the visit's payment split without taking new money.
 * The ledger is what History's By Method box sums, so those rows have to move
 * with the visit. Each day's net stays put: Total Earned for that day does not
 * change, only which method the money sits under.
 */

export const LEDGER_METHODS = ['cash', 'card', 'upi'] as const
export type LedgerMethod = (typeof LEDGER_METHODS)[number]

export interface LedgerSlice {
  id: string
  date: string
  amount: number
  method: LedgerMethod
}

export interface MethodAmount {
  method: LedgerMethod
  amount: number
}

export interface PlannedLedgerRow {
  date: string
  method: LedgerMethod
  amount: number
}

export type ReclassPlan =
  | { ok: true; changed: false }
  | { ok: true; changed: true; deleteIds: string[]; rows: PlannedLedgerRow[] }
  | { ok: false; reason: 'sum-mismatch' | 'unallocated' }

function methodTotals(entries: { method: string; amount: number }[]): Record<LedgerMethod, number> {
  const totals: Record<LedgerMethod, number> = { cash: 0, card: 0, upi: 0 }
  for (const entry of entries) {
    if (entry.method === 'cash' || entry.method === 'card' || entry.method === 'upi') {
      totals[entry.method] += entry.amount
    }
  }
  return totals
}

function totalsEqual(a: Record<LedgerMethod, number>, b: Record<LedgerMethod, number>): boolean {
  return LEDGER_METHODS.every((method) => a[method] === b[method])
}

function sumTotals(totals: Record<LedgerMethod, number>): number {
  return LEDGER_METHODS.reduce((sum, method) => sum + totals[method], 0)
}

/**
 * Plan the ledger rewrite for a billed-visit method edit.
 *
 * No-op when the ledger already matches the new split. Refuses when the
 * ledger total and the new total differ, so a method edit cannot create or
 * erase money. Day nets are kept: a ₹200 cash row on Monday and a ₹300 UPI
 * row on Tuesday, changed to all card, become card ₹200 and card ₹300 on
 * those same days.
 */
export function planMethodReclass(existing: LedgerSlice[], next: MethodAmount[]): ReclassPlan {
  const target = methodTotals(next)
  const current = methodTotals(existing)
  if (totalsEqual(current, target)) return { ok: true, changed: false }
  if (sumTotals(current) !== sumTotals(target)) return { ok: false, reason: 'sum-mismatch' }

  const nets = new Map<string, number>()
  for (const row of existing) nets.set(row.date, (nets.get(row.date) ?? 0) + row.amount)
  const dates = [...nets.entries()]
    .filter(([, net]) => net !== 0)
    .sort((a, b) => a[0].localeCompare(b[0]))

  const remaining: Record<LedgerMethod, number> = { ...target }
  const planned: PlannedLedgerRow[] = []

  for (const [date, net] of dates.filter(([, net]) => net < 0)) {
    let method: LedgerMethod = 'cash'
    let best = -Infinity
    for (const candidate of LEDGER_METHODS) {
      if (remaining[candidate] > best) {
        best = remaining[candidate]
        method = candidate
      }
    }
    planned.push({ date, method, amount: net })
    remaining[method] -= net
  }

  for (const [date, net] of dates.filter(([, net]) => net > 0)) {
    let need = net
    for (const method of LEDGER_METHODS) {
      if (need === 0) break
      const available = remaining[method]
      if (available <= 0) continue
      const take = Math.min(available, need)
      planned.push({ date, method, amount: take })
      remaining[method] -= take
      need -= take
    }
    if (need !== 0) return { ok: false, reason: 'unallocated' }
  }

  if (LEDGER_METHODS.some((method) => remaining[method] !== 0)) {
    return { ok: false, reason: 'unallocated' }
  }

  return {
    ok: true,
    changed: true,
    deleteIds: existing.map((row) => row.id),
    rows: planned,
  }
}
