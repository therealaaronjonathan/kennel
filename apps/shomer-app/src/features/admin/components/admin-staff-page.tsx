import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { Plus, X, Copy, Check } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface StaffMember {
  id: string
  name?: string
  email?: string
  role?: string
  branchIds?: string[]
  isActive?: boolean
}

interface Branch {
  id: string
  name: string
}

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
const inputClass =
  'w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors'

export function AdminStaffPage() {
  const { id: clinicId } = useParams<{ id: string }>()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])

  async function loadData() {
    if (!clinicId) return
    setLoading(true)
    try {
      const [branchesSnap, staffSnap] = await Promise.all([
        getDocs(collection(db, `clinics/${clinicId}/branches`)),
        getDocs(collection(db, `clinics/${clinicId}/staff`)),
      ])
      setBranches(branchesSnap.docs.map((d) => ({ id: d.id, name: (d.data() as Branch).name })))
      setStaffList(
        staffSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StaffMember, 'id'>),
        })),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [clinicId])

  function resetForm() {
    setName('')
    setEmail('')
    setPhone('')
    setSelectedBranchIds([])
    setError(null)
  }

  function toggleBranch(branchId: string) {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clinicId || !name.trim() || !email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinicId,
          branchIds: selectedBranchIds,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: 'receptionist',
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to create staff member')
        return
      }

      setInviteLink(json.data.inviteLink)
      resetForm()
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Staff
        </h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setInviteLink(null) }}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[7px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            <Plus size={14} />
            Add Staff
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* Invite link banner */}
          {inviteLink && (
            <div className="rounded-[4px] border border-success/30 bg-success/5 px-4 py-3 space-y-2">
              <p className="text-[12px] font-bold text-success">Staff member created successfully!</p>
              <p className="text-[12px] text-muted">Share this invite link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-surface rounded-[3px] px-2 py-1.5 text-foreground font-mono break-all">
                  {inviteLink}
                </code>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="flex items-center gap-1.5 rounded-[4px] border border-border-base px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground transition-colors flex-shrink-0"
                >
                  {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Add form */}
          {showForm && (
            <div className="rounded-[4px] border border-border-base bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-foreground">New Staff Member</p>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <label className={labelClass}>Full Name *</label>
                    <input
                      type="text"
                      placeholder="Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelClass}>Email *</label>
                    <input
                      type="email"
                      placeholder="priya@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
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

                </div>

                {branches.length > 0 && (
                  <div className="space-y-2">
                    <label className={labelClass}>Branch Assignment</label>
                    <div className="space-y-1.5">
                      {branches.map((branch) => (
                        <label
                          key={branch.id}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBranchIds.includes(branch.id)}
                            onChange={() => toggleBranch(branch.id)}
                            className="rounded-[2px] border-border-base accent-primary"
                          />
                          <span className="text-[13px] text-foreground group-hover:text-primary transition-colors">
                            {branch.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-[12px] font-semibold text-danger">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!name.trim() || !email.trim() || submitting}
                    className="rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating…' : 'Create Staff Member'}
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
          ) : staffList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[28px]">👥</p>
              <p className="text-[13px] font-semibold text-muted mt-2">No staff members yet</p>
              <p className="text-[12px] text-muted mt-1">
                Use "Add Staff" to invite receptionists and admins.
              </p>
            </div>
          ) : (
            <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
              {staffList.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-5 py-4 bg-surface">
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-semibold text-foreground">{member.name}</p>
                    {member.email && (
                      <p className="text-[12px] text-muted">{member.email}</p>
                    )}
                    {member.role && (
                      <p className="text-[11px] text-muted">Receptionist</p>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-[3px]"
                    style={{
                      color: member.isActive !== false ? '#16A34A' : '#D97706',
                      backgroundColor: member.isActive !== false ? '#16A34A26' : '#D9770626',
                    }}
                  >
                    {member.isActive !== false ? 'Active' : 'Invited'}
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
