import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useDutyRoster(clinicId: string | null, branchId: string | null) {
  const [onDuty, setOnDuty] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clinicId || !branchId) {
      setLoading(false)
      return
    }

    const today = todayString()
    const ref = doc(db, `clinics/${clinicId}/branches/${branchId}/dutyRoster/${today}`)

    const unsub = onSnapshot(ref, (snap) => {
      setOnDuty(snap.exists() ? ((snap.data().onDuty ?? []) as string[]) : [])
      setLoading(false)
    })

    return unsub
  }, [clinicId, branchId])

  return { onDuty, loading }
}
