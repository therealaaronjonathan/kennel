import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { Plus, X, Copy, Check, Pencil } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface StaffMember {
  id: string
  name?: string
  email?: string
  phone?: string
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add form state
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addBranchIds, setAddBranchIds] = useState<string[]>([])

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBranchIds, setEditBranchIds] = useState<string[]>([])
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  async function loadData() {
    if (!clinicId) return
    setLoading(true)
    try {
      const [branchesSnap, staffSnap] = await Promise.all([
        getDocs(collection(db, `clinics/${clinicId}/branches`)),
        getDocs(collection(db, `clinics/${clinicId}/staff`)),
      ])
      setBranches(branchesSnap.docs.map((d) => ({ id: d.id, name: (d.data() as Branch).name })))
      setStaffList(staffSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffMember, 'id'>) })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [clinicId])

  function resetAddForm() {
    setAddName('')
    setAddEmail('')
    setAddPhone('')
    setAddBranchIds([])
    setError(null)
  }

  function openEdit(member: StaffMember) {
    setEditingId(member.id)
    setEditName(member.name ?? '')
    setEditPhone(member.phone ?? '')
    setEditBranchIds(member.branchIds ?? [])
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  function toggleAddBranch(id: string) {
    setAddBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  function toggleEditBranch(id: string) {
    setEditBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clinicId || !addName.trim() || !addEmail.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          branchIds: addBranchIds,
          name: addName.trim(),
          email: addEmail.trim(),
          phone: addPhone.trim(),
          role: 'receptionist',
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to create staff member')
        return
      }
      setInviteLink(json.data.inviteLink)
      resetAddForm()
      setShowAddForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSave(memberId: string) {
    if (!clinicId) return
    setEditSaving(true)
    setEditError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_URL}/api/admin/users/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          branchIds: editBranchIds,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setEditError(json.error ?? 'Failed to save changes')
        return
      }
      cancelEdit()
      await loadData()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setEditSaving(false)
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">Staff</h1>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => { setShowAddForm(true); setInviteLink(null) }}
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
          {showAddForm && (
            <div className="rounded-[4px] border border-border-base bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-foreground">New Staff Member</p>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); resetAddForm() }}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <label className={labelClass}>Full Name *</label>
                    <input type="text" placeholder="Priya Sharma" value={addName} onChange={(e) => setAddName(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Email *</label>
                    <input type="email" placeholder="priya@clinic.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Phone</label>
                    <input type="tel" placeholder="+91 9876543210" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} className={inputClass} />
                  </div>
                </div>
                {branches.length > 0 && (
                  <div className="space-y-2">
                    <label className={labelClass}>Branch Assignment</label>
                    <div className="space-y-1.5">
                      {branches.map((branch) => (
                        <label key={branch.id} className="flex items-center gap-2.5 cursor-pointer group">
                          <input type="checkbox" checked={addBranchIds.includes(branch.id)} onChange={() => toggleAddBranch(branch.id)} className="rounded-[2px] border-border-base accent-primary" />
                          <span className="text-[13px] text-foreground group-hover:text-primary transition-colors">{branch.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={!addName.trim() || !addEmail.trim() || submitting} className="rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Creating…' : 'Create Staff Member'}
                  </button>
                  <button type="button" onClick={() => { setShowAddForm(false); resetAddForm() }} className="rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground transition-colors">
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
              <p className="text-[12px] text-muted mt-1">Use "Add Staff" to invite receptionists and admins.</p>
            </div>
          ) : (
            <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
              {staffList.map((member) => (
                <div key={member.id}>
                  {/* Row */}
                  <div className="flex items-center gap-3 px-5 py-4 bg-surface">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-foreground">{member.name}</p>
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
                      {member.email && <p className="text-[12px] text-muted">{member.email}</p>}
                      {member.role && <p className="text-[11px] text-muted capitalize">{member.role}</p>}
                      {member.branchIds && member.branchIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {member.branchIds.map((bid) => (
                            <span key={bid} className="text-[10px] font-medium px-1.5 py-0.5 rounded-[3px] bg-surface-2 text-muted border border-border-base">
                              {branchName(bid)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => editingId === member.id ? cancelEdit() : openEdit(member)}
                      className="flex items-center gap-1.5 rounded-[4px] border border-border-base px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground transition-colors flex-shrink-0"
                    >
                      <Pencil size={12} />
                      {editingId === member.id ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {/* Inline edit form */}
                  {editingId === member.id && (
                    <div className="px-5 pb-5 pt-4 bg-surface-2 border-t border-border-base space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2">
                          <label className={labelClass}>Full Name</label>
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <label className={labelClass}>Phone</label>
                          <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputClass} />
                        </div>
                      </div>

                      {branches.length > 0 && (
                        <div className="space-y-2">
                          <label className={labelClass}>Branch Assignment</label>
                          <div className="space-y-1.5">
                            {branches.map((branch) => (
                              <label key={branch.id} className="flex items-center gap-2.5 cursor-pointer group">
                                <input type="checkbox" checked={editBranchIds.includes(branch.id)} onChange={() => toggleEditBranch(branch.id)} className="rounded-[2px] border-border-base accent-primary" />
                                <span className="text-[13px] text-foreground group-hover:text-primary transition-colors">{branch.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {editError && <p className="text-[12px] font-semibold text-danger">{editError}</p>}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleEditSave(member.id)}
                          disabled={!editName.trim() || editSaving}
                          className="rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {editSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
