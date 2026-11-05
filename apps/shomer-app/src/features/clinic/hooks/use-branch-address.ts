import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/** Branch address line for the thermal bill. Empty until the branch doc loads. */
export function useBranchAddress(clinicId: string | null, branchId: string | null): string {
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (!clinicId || !branchId) {
      setAddress('')
      return
    }
    let cancelled = false
    getDoc(doc(db, `clinics/${clinicId}/branches/${branchId}`))
      .then((snap) => {
        if (!cancelled) setAddress((snap.data()?.address as string) ?? '')
      })
      .catch(() => {
        if (!cancelled) setAddress('')
      })
    return () => {
      cancelled = true
    }
  }, [clinicId, branchId])

  return address
}
