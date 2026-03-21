import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, X, MapPin, Phone } from 'lucide-react'

interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  isActive?: boolean
}

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
const inputClass =
  'w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors'

export function AdminBranchesPage() {
  const { id: clinicId } = useParams<{ id: string }>()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  async function loadBranches() {
    if (!clinicId) return
    setLoading(true)
    try {

      const snap = await getDocs(collection(db, `clinics/${clinicId}/branches`))
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Branch)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranches()
  }, [clinicId])

  function resetForm() {
    setName('')
    setAddress('')
    setPhone('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clinicId || !name.trim()) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, `clinics/${clinicId}/branches`), {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      resetForm()
      setShowForm(false)
      await loadBranches()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Branches
        </h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[7px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            <Plus size={14} />
            Add Branch
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* Add form */}
          {showForm && (
            <div className="rounded-[4px] border border-border-base bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-foreground">New Branch</p>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Branch Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Koramangala Branch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Address</label>
                  <input
                    type="text"
                    placeholder="123 Main St, Koramangala"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!name.trim() || submitting}
                    className="rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating…' : 'Create Branch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List */}
          {loading ? (
            <p className="text-[13px] text-muted">Loading…</p>
          ) : branches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[28px]">🏢</p>
              <p className="text-[13px] font-semibold text-muted mt-2">No branches yet</p>
            </div>
          ) : (
            <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
              {branches.map((branch) => (
                <div key={branch.id} className="flex items-start justify-between px-5 py-4 bg-surface">
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold text-foreground">{branch.name}</p>
                    {branch.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={11} className="text-muted flex-shrink-0" />
                        <span className="text-[12px] text-muted">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-muted flex-shrink-0" />
                        <span className="text-[12px] text-muted">{branch.phone}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-[3px]"
                    style={{
                      color: branch.isActive !== false ? '#16A34A' : '#6B6478',
                      backgroundColor: branch.isActive !== false ? '#16A34A26' : '#6B647826',
                    }}
                  >
                    {branch.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
