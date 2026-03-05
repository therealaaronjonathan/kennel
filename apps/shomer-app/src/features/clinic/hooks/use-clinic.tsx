import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/features/auth'

interface ClinicContextValue {
  clinicId: string | null
  branchId: string | null
  loading: boolean
  error: string | null
}

const ClinicContext = createContext<ClinicContextValue>({
  clinicId: null,
  branchId: null,
  loading: true,
  error: null,
})

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setClinicId(null)
      setBranchId(null)
      setLoading(false)
      return
    }

    const fetchStaff = async () => {
      try {
        const staffSnap = await getDoc(doc(db, 'staff', user.uid))
        if (staffSnap.exists()) {
          const data = staffSnap.data()
          setClinicId(data.clinicId ?? null)
          setBranchId(data.branchId ?? null)
          setError(null)
        } else {
          setError('Staff profile not found. Contact your administrator.')
        }
      } catch {
        setError('Failed to load clinic info. Check your connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [user, authLoading])

  return (
    <ClinicContext.Provider value={{ clinicId, branchId, loading, error }}>
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  return useContext(ClinicContext)
}
