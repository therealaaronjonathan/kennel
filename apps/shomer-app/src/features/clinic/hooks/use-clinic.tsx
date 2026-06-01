import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/features/auth'

export type StaffRole = 'doctor' | 'receptionist' | 'admin' | 'owner'

interface ClinicContextValue {
  clinicId: string | null
  branchId: string | null
  branchIds: string[]
  branchName: string | null
  branchNameMap: Record<string, string>
  doctorId: string | null
  role: StaffRole | null
  loading: boolean
  error: string | null
  selectBranch: (branchId: string) => void
}

const ClinicContext = createContext<ClinicContextValue>({
  clinicId: null,
  branchId: null,
  branchIds: [],
  branchName: null,
  branchNameMap: {},
  doctorId: null,
  role: null,
  loading: true,
  error: null,
  selectBranch: () => {},
})

function resolveRole(data: Record<string, unknown>): StaffRole {
  if (data.role) return data.role as StaffRole
  // Legacy fallback: no role field
  return data.doctorId ? 'doctor' : 'receptionist'
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()

  const [clinicId, setClinicId] = useState<string | null>(null)
  const [branchId, setBranchIdState] = useState<string | null>(
    () => sessionStorage.getItem('shomer:branchId'),
  )
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [branchName, setBranchName] = useState<string | null>(null)
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [role, setRole] = useState<StaffRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Holds resolved branch names keyed by branchId
  const [branchNameMap, setBranchNameMap] = useState<Record<string, string>>({})

  function setBranchId(id: string | null) {
    setBranchIdState(id)
    if (id) {
      sessionStorage.setItem('shomer:branchId', id)
    } else {
      sessionStorage.removeItem('shomer:branchId')
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setClinicId(null)
      setBranchId(null)
      setBranchIds([])
      setBranchName(null)
      setDoctorId(null)
      setRole(null)
      sessionStorage.removeItem('shomer:branchId')
      setLoading(false)
      return
    }

    const fetchStaff = async () => {
      try {
        console.log('[clinic] looking up staff uid:', user.uid)
        const staffSnap = await getDoc(doc(db, 'staff', user.uid))
        if (!staffSnap.exists()) {
          setError('No account found. Contact your administrator.')
          setLoading(false)
          return
        }

        const data = staffSnap.data() as Record<string, unknown>
        const cid = data.clinicId as string
        const ids: string[] = (data.branchIds as string[]) ?? []
        const did = (data.doctorId as string | undefined) ?? null
        const resolvedRole = resolveRole(data)

        setClinicId(cid)
        setBranchIds(ids)
        setDoctorId(did)
        setRole(resolvedRole)

        // Fetch branch names
        const nameMap: Record<string, string> = {}
        await Promise.all(
          ids.map(async (bid) => {
            try {
              const bSnap = await getDoc(doc(db, `clinics/${cid}/branches/${bid}`))
              if (bSnap.exists()) {
                nameMap[bid] = (bSnap.data().name as string) ?? bid
              } else {
                nameMap[bid] = bid
              }
            } catch {
              nameMap[bid] = bid
            }
          }),
        )
        setBranchNameMap(nameMap)

        // Auto-select: single branch, or restore persisted branch for multi-branch
        const saved = sessionStorage.getItem('shomer:branchId')
        if (ids.length === 1) {
          setBranchId(ids[0])
          setBranchName(nameMap[ids[0]] ?? null)
        } else if (saved && ids.includes(saved)) {
          setBranchId(saved)
          setBranchName(nameMap[saved] ?? null)
        }

        setError(null)
      } catch (err) {
        console.error('[clinic] error:', err)
        setError('Failed to load clinic info. Check your connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [user, authLoading])

  function selectBranch(bid: string) {
    setBranchId(bid)
    setBranchName(branchNameMap[bid] ?? bid)
  }

  return (
    <ClinicContext.Provider
      value={{ clinicId, branchId, branchIds, branchName, branchNameMap, doctorId, role, loading, error, selectBranch }}
    >
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  return useContext(ClinicContext)
}
