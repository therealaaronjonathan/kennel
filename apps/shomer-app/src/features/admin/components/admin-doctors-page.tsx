import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, auth, storage } from '@/lib/firebase'
import { Plus, X, Copy, Check, Pencil, Upload, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface Doctor {
  id: string
  name: string
  email?: string
  phone?: string
  specialization?: string
  bio?: string
  photoUrl?: string
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

function DoctorAvatar({ name, photoUrl, size = 36 }: { name: string; photoUrl?: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-[11px] font-bold text-primary">{initials}</span>
    </div>
  )
}

export function AdminDoctorsPage() {
  const { id: clinicId } = useParams<{ id: string }>()
  const [doctors, setDoctors] = useState<Doctor[]>([])
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
  const [addSpecialization, setAddSpecialization] = useState('')
  const [addBranchIds, setAddBranchIds] = useState<string[]>([])

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPhotoUrl, setEditPhotoUrl] = useState('')
  const [editBranchIds, setEditBranchIds] = useState<string[]>([])
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadData() {
    if (!clinicId) return
    setLoading(true)
    try {
      const [doctorsSnap, branchesSnap] = await Promise.all([
        getDocs(collection(db, `clinics/${clinicId}/doctors`)),
        getDocs(collection(db, `clinics/${clinicId}/branches`)),
      ])
      setDoctors(doctorsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor)))
      setBranches(branchesSnap.docs.map((d) => ({ id: d.id, name: (d.data() as Branch).name })))
    } catch {
      // silently ignore
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
    setAddSpecialization('')
    setAddBranchIds([])
    setError(null)
  }

  function openEdit(doctor: Doctor) {
    setEditingId(doctor.id)
    setEditName(doctor.name ?? '')
    setEditPhone(doctor.phone ?? '')
    setEditBio(doctor.bio ?? '')
    setEditPhotoUrl(doctor.photoUrl ?? '')
    setEditBranchIds(doctor.branchIds ?? [])
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
    setUploadProgress(null)
  }

  function toggleAddBranch(id: string) {
    setAddBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  function toggleEditBranch(id: string) {
    setEditBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  async function handlePhotoUpload(file: File, doctorId: string) {
    if (!clinicId) return
    const ext = file.name.split('.').pop() ?? 'jpg'
    const storageRef = ref(storage, `clinics/${clinicId}/doctors/${doctorId}/profile.${ext}`)
    return new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file)
      task.on(
        'state_changed',
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          setUploadProgress(null)
          resolve(url)
        },
      )
    })
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editingId) return
    if (!file.type.startsWith('image/')) {
      setEditError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditError('Image must be under 5MB')
      return
    }
    setEditError(null)
    try {
      const url = await handlePhotoUpload(file, editingId)
      if (url) setEditPhotoUrl(url)
    } catch {
      setEditError('Photo upload failed. Please try again.')
    }
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
          role: 'doctor',
          specialization: addSpecialization.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to create doctor')
        return
      }
      if (json.data.inviteLink) {
        setInviteLink(json.data.inviteLink)
      } else if (json.data.inviteLinkError) {
        setError(`Doctor created, but invite link failed: ${json.data.inviteLinkError}`)
      }
      resetAddForm()
      setShowAddForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSave(doctorId: string) {
    if (!clinicId) return
    setEditSaving(true)
    setEditError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_URL}/api/admin/users/${doctorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          bio: editBio.trim(),
          photoUrl: editPhotoUrl.trim(),
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
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">Doctors</h1>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => { setShowAddForm(true); setInviteLink(null) }}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[7px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            <Plus size={14} />
            Add Doctor
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* Invite link banner */}
          {inviteLink && (
            <div className="rounded-[4px] border border-success/30 bg-success/5 px-4 py-3 space-y-2">
              <p className="text-[12px] font-bold text-success">Doctor created successfully!</p>
              <p className="text-[12px] text-muted">Share this invite link with the doctor:</p>
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
                <p className="text-[13px] font-bold text-foreground">New Doctor</p>
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
                    <input type="text" placeholder="Dr. Rajesh Kumar" value={addName} onChange={(e) => setAddName(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Email *</label>
                    <input type="email" placeholder="doctor@clinic.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Phone</label>
                    <input type="tel" placeholder="+91 9876543210" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className={labelClass}>Specialization</label>
                    <input type="text" placeholder="e.g. General, Surgery, Dermatology" value={addSpecialization} onChange={(e) => setAddSpecialization(e.target.value)} className={inputClass} />
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
                    {submitting ? 'Creating…' : 'Create Doctor'}
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
          ) : doctors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[28px]">🩺</p>
              <p className="text-[13px] font-semibold text-muted mt-2">No doctors yet</p>
            </div>
          ) : (
            <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
              {doctors.map((doctor) => (
                <div key={doctor.id}>
                  {/* Row */}
                  <div className="flex items-center gap-3 px-5 py-4 bg-surface">
                    <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-foreground">{doctor.name}</p>
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-[3px]"
                          style={{
                            color: doctor.isActive !== false ? '#16A34A' : '#D97706',
                            backgroundColor: doctor.isActive !== false ? '#16A34A26' : '#D9770626',
                          }}
                        >
                          {doctor.isActive !== false ? 'Active' : 'Invited'}
                        </span>
                      </div>
                      {doctor.email && <p className="text-[12px] text-muted">{doctor.email}</p>}
                      {doctor.specialization && <p className="text-[11px] text-muted">{doctor.specialization}</p>}
                      {doctor.branchIds && doctor.branchIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {doctor.branchIds.map((bid) => (
                            <span key={bid} className="text-[10px] font-medium px-1.5 py-0.5 rounded-[3px] bg-surface-2 text-muted border border-border-base">
                              {branchName(bid)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => editingId === doctor.id ? cancelEdit() : openEdit(doctor)}
                      className="flex items-center gap-1.5 rounded-[4px] border border-border-base px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground transition-colors flex-shrink-0"
                    >
                      <Pencil size={12} />
                      {editingId === doctor.id ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {/* Inline edit form */}
                  {editingId === doctor.id && (
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
                        <div className="space-y-1.5 col-span-2">
                          <label className={labelClass}>Bio</label>
                          <textarea
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            rows={3}
                            placeholder="Short bio or description…"
                            className={`${inputClass} resize-none`}
                          />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <label className={labelClass}>Profile Photo</label>
                          <div className="flex items-center gap-2">
                            {editPhotoUrl && (
                              <img src={editPhotoUrl} alt="Preview" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border-base" />
                            )}
                            <input
                              type="text"
                              value={editPhotoUrl}
                              onChange={(e) => setEditPhotoUrl(e.target.value)}
                              placeholder="Photo URL"
                              className={`${inputClass} flex-1`}
                            />
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadProgress !== null}
                              className="flex items-center gap-1.5 rounded-[4px] border border-border-base px-3 py-[9px] text-[12px] font-semibold text-muted hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50"
                            >
                              {uploadProgress !== null ? (
                                <><Loader2 size={12} className="animate-spin" />{uploadProgress}%</>
                              ) : (
                                <><Upload size={12} />Upload</>
                              )}
                            </button>
                          </div>
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
                          onClick={() => handleEditSave(doctor.id)}
                          disabled={!editName.trim() || editSaving || uploadProgress !== null}
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
