import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  endAt,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Pet, PetOwner } from '@/features/checkin/types'

const PAGE = 50

/**
 * Admin pet-owners list with cursor pagination.
 *
 * Two modes:
 *  - Browse: owners ordered by `name`, `limit(PAGE)`, with cursor-based
 *    "load more".
 *  - Phone search: prefix range on the indexed `phone` field (`phone` is the
 *    owner's identity everywhere in the app). Capped at PAGE — phone matches
 *    are few by nature, so no pagination there.
 *
 * Name search is intentionally NOT server-side (there is no name index); the
 * page filters the already-loaded rows by name client-side.
 */
export function useAdminPetOwners(clinicId: string | undefined) {
  const [owners, setOwners] = useState<PetOwner[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('') // active server-side phone search (digits only)
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)

  const run = useCallback(
    async (mode: 'reset' | 'more') => {
      if (!clinicId) return
      const isReset = mode === 'reset'
      if (isReset) setLoading(true)
      else setLoadingMore(true)
      setError(null)
      try {
        const col = collection(db, `clinics/${clinicId}/petOwners`)
        let q
        if (phone) {
          const prefix = '+91' + phone
          q = query(col, orderBy('phone'), startAt(prefix), endAt(prefix + ''), limit(PAGE))
        } else if (isReset || !cursorRef.current) {
          q = query(col, orderBy('name'), limit(PAGE))
        } else {
          q = query(col, orderBy('name'), startAfter(cursorRef.current), limit(PAGE))
        }
        const snap = await getDocs(q)
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PetOwner)
        cursorRef.current = snap.docs[snap.docs.length - 1] ?? cursorRef.current
        setHasMore(!phone && snap.size === PAGE)
        setOwners((prev) => (isReset ? docs : [...prev, ...docs]))
      } catch (e) {
        setError((e as Error)?.message ?? 'Could not load owners')
      } finally {
        if (isReset) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [clinicId, phone],
  )

  // Initial load + whenever the phone search term (or clinic) changes.
  useEffect(() => {
    cursorRef.current = null
    run('reset')
  }, [run])

  return {
    owners,
    loading,
    loadingMore,
    hasMore,
    error,
    phone,
    setPhone,
    loadMore: () => run('more'),
    reload: () => {
      cursorRef.current = null
      run('reset')
    },
    /** Optimistically patch a loaded owner after an inline edit. */
    patchOwner: (id: string, patch: Partial<PetOwner>) =>
      setOwners((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o))),
  }
}

/** One-shot fetch of a single owner's pets (lazy-loaded when a row expands). */
export async function fetchPetsByOwner(clinicId: string, ownerId: string): Promise<Pet[]> {
  const snap = await getDocs(
    query(collection(db, `clinics/${clinicId}/pets`), where('ownerId', '==', ownerId)),
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Pet)
    .sort((a, b) => a.name.localeCompare(b.name))
}
