import { useEffect, useState } from 'react'
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatInr } from '@/lib/utils'
import {
  useBillingDefaults,
  type BillingDefaultEntry,
} from '@/features/checkout/services/use-billing-defaults'
import { removeFromBillingDefaults } from '@/features/checkout/services/billing-defaults-service'
import {
  amountDue,
  parseVisitDiscount,
  serviceSubtotal,
} from '@/features/checkout/services/discount'
import {
  sumPayments,
  type PaymentEntry,
} from '@/features/checkout/services/complete-billing'
import type { ServiceEntry } from '@/features/dashboard/services/use-completed-visits'

const IN_QUERY_LIMIT = 30
const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

interface VisitMoney {
  paid: number
  bill: number
}

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function relativeDate(visitDate: string, today: string): string {
  if (!visitDate) return ''
  const [y1, m1, d1] = visitDate.split('-').map(Number)
  const [y2, m2, d2] = today.split('-').map(Number)
  const n = Math.round(
    (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) /
      (1000 * 60 * 60 * 24),
  )
  if (n <= 0) return 'today'
  if (n === 1) return 'yesterday'
  return `${n} days ago`
}

function usePinnedVisitMoney(
  clinicId: string,
  branchId: string,
  visitIds: string[],
): Record<string, VisitMoney> {
  const [money, setMoney] = useState<Record<string, VisitMoney>>({})
  const idsKey = visitIds.slice().sort().join(',')

  useEffect(() => {
    if (!clinicId || !branchId || visitIds.length === 0) {
      setMoney({})
      return
    }

    let cancelled = false
    const visitsCol = collection(
      db,
      `clinics/${clinicId}/branches/${branchId}/visits`,
    )

    ;(async () => {
      const next: Record<string, VisitMoney> = {}
      for (const ids of chunkIds(visitIds, IN_QUERY_LIMIT)) {
        const snap = await getDocs(query(visitsCol, where(documentId(), 'in', ids)))
        for (const d of snap.docs) {
          const data = d.data()
          const payments = Array.isArray(data.payments)
            ? (data.payments as PaymentEntry[])
            : undefined
          const paid =
            typeof data.amountPaid === 'number'
              ? data.amountPaid
              : sumPayments(payments)
          const services = (data.services as ServiceEntry[] | undefined) ?? []
          const bill = amountDue(serviceSubtotal(services), parseVisitDiscount(data.discount))
          next[d.id] = { paid, bill }
        }
      }
      if (!cancelled) setMoney(next)
    })().catch((err) => {
      console.error('Pinned visit money query error:', err)
    })

    return () => {
      cancelled = true
    }
  }, [clinicId, branchId, idsKey])

  return money
}

function UnpinConfirmDialog({
  entry,
  due,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  entry: BillingDefaultEntry
  due: number
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onCancel])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={() => {
        if (!loading) onCancel()
      }}
    >
      <div
        className="w-full max-w-sm rounded-[4px] bg-surface border border-border-base"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-base px-5 py-4">
          <Trash2 size={14} className="text-danger flex-shrink-0" />
          <span className="text-[14px] font-bold text-foreground">Remove overdue?</span>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-[13px] text-foreground">
            <span className="font-bold text-primary">{entry.tokenDisplay}</span>
            {' · '}
            {entry.petName}
          </p>
          <p className="text-[13px] font-semibold tabular-nums text-warning">
            {formatInr(due)} due
          </p>
          <p className="text-[12px] text-muted">
            This takes the visit off Check-out Billing Defaults. The visit stays in History.
          </p>
          {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-border-base px-5 py-4">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-[4px] bg-danger px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OverdueVisitsTab({
  clinicId,
  branchId,
}: {
  clinicId: string
  branchId: string
}) {
  const { defaults, loading, error } = useBillingDefaults(clinicId, branchId)
  const money = usePinnedVisitMoney(
    clinicId,
    branchId,
    defaults.map((d) => d.visitId),
  )
  const [pending, setPending] = useState<BillingDefaultEntry | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const today = todayString()

  async function handleRemove() {
    if (!pending) return
    setRemoving(true)
    setRemoveError(null)
    try {
      await removeFromBillingDefaults(clinicId, branchId, pending.visitId)
      setPending(null)
    } catch {
      setRemoveError('Could not remove this overdue. Try again.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className={labelClass}>Pinned overdues</p>
        <p className="text-[12px] text-muted">
          Visits pinned to Billing Defaults on Check-out. Removing one takes it off
          that list. The visit stays in History.
        </p>
      </div>

      {loading ? (
        <p className="text-[12px] text-muted">Loading…</p>
      ) : error ? (
        <p className="text-[12px] text-danger">{error}</p>
      ) : defaults.length === 0 ? (
        <p className="text-[12px] text-muted">No pinned overdue visits for this branch.</p>
      ) : (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {defaults.map((entry) => {
            const live = money[entry.visitId]
            const bill = live && live.bill > 0 ? live.bill : entry.billAmount
            const paid = live?.paid ?? 0
            const due = Math.max(0, bill - paid)
            return (
              <div
                key={entry.visitId}
                className="flex items-start justify-between gap-3 px-4 py-3.5 bg-surface"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold text-primary">
                      {entry.tokenDisplay}
                    </span>
                    {entry.date && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                        {relativeDate(entry.date, today)}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-foreground mt-0.5 truncate">
                    {entry.petName}
                  </p>
                  <p className="text-[11px] text-muted truncate">{entry.ownerName}</p>
                </div>
                <div className="flex items-start gap-3 flex-shrink-0">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[13px] font-bold tabular-nums text-warning">
                      {formatInr(due)} Due
                    </span>
                    {paid > 0 && (
                      <span className="text-[13px] font-bold tabular-nums text-success">
                        {formatInr(paid)} Paid
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveError(null)
                      setPending(entry)
                    }}
                    className="flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-semibold text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 size={11} />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pending && (
        <UnpinConfirmDialog
          entry={pending}
          due={Math.max(
            0,
            (money[pending.visitId] && money[pending.visitId].bill > 0
              ? money[pending.visitId].bill
              : pending.billAmount) - (money[pending.visitId]?.paid ?? 0),
          )}
          loading={removing}
          error={removeError}
          onCancel={() => {
            if (!removing) {
              setPending(null)
              setRemoveError(null)
            }
          }}
          onConfirm={handleRemove}
        />
      )}
    </div>
  )
}
