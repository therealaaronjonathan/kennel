import { useEffect, useState } from 'react'
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { historyVisitFromDoc, type HistoryVisit } from './use-visit-history'

const IN_QUERY_LIMIT = 30

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}

function recencyMs(v: HistoryVisit): number {
  return v.billedAt?.toMillis() ?? v.updatedAt?.toMillis() ?? v.createdAt?.toMillis() ?? 0
}

/**
 * Visits from before the History From date that still received money inside
 * the selected range. That cash is already in Total Earned (ledger by payment
 * day). This list is the matching rows so the desk can see which overdues
 * were collected.
 */
export function useSettledOverdues(
  clinicId: string | null,
  branchId: string | null,
  fromDate: string,
  toDate: string,
  doctorId?: string | null,
) {
  const [visits, setVisits] = useState<HistoryVisit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId || !branchId || !fromDate || !toDate) {
      setVisits([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const paymentsCol = collection(
      db,
      `clinics/${clinicId}/branches/${branchId}/payments`,
    )
    const q = query(
      paymentsCol,
      where('date', '>=', fromDate),
      where('date', '<=', toDate),
    )

    getDocs(q)
      .then(async (snap) => {
        if (cancelled) return

        const visitIds = new Set<string>()
        for (const d of snap.docs) {
          const data = d.data()
          const visitId = typeof data.visitId === 'string' ? data.visitId : ''
          if (!visitId) continue
          const visitDate = typeof data.visitDate === 'string' ? data.visitDate : ''
          if (visitDate && visitDate >= fromDate) continue
          visitIds.add(visitId)
        }

        if (visitIds.size === 0) {
          setVisits([])
          setLoading(false)
          return
        }

        const visitsCol = collection(
          db,
          `clinics/${clinicId}/branches/${branchId}/visits`,
        )
        const all: HistoryVisit[] = []
        for (const ids of chunkIds([...visitIds], IN_QUERY_LIMIT)) {
          if (cancelled) return
          const visitSnap = await getDocs(
            query(visitsCol, where(documentId(), 'in', ids)),
          )
          for (const v of visitSnap.docs) {
            const visit = historyVisitFromDoc(v)
            if (!visit.date || visit.date >= fromDate) continue
            if (visit.status !== 'billed' && visit.status !== 'completed') continue
            if (doctorId && visit.doctorId !== doctorId) continue
            all.push(visit)
          }
        }
        if (cancelled) return

        all.sort((a, b) => recencyMs(b) - recencyMs(a))
        setVisits(all)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Settled overdues query error:', err)
        setError('Failed to load settled overdues.')
        setVisits([])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clinicId, branchId, fromDate, toDate, doctorId])

  return { visits, loading, error }
}
